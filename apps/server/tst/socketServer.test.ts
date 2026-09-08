import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { Server } from "socket.io";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { attachGameServer } from "../src/socketServer.js";

function waitFor<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

type MatchStart = { passage: string; startAt: number; round: number; bestOf: number };
type RoundOver = {
  status: "won" | "lost";
  round: number;
  wins: { you: number; opponent: number };
  matchOver: boolean;
};

async function waitOutCountdown(startAt: number) {
  const msUntilStart = startAt - Date.now();
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, msUntilStart) + 50));
}

describe("socket server", () => {
  let httpServer: ReturnType<typeof createServer>;
  let port: number;

  beforeEach(async () => {
    httpServer = createServer();
    const io = new Server(httpServer);
    attachGameServer(io, {
      countdownMs: 50,
      tickIntervalMs: 20,
      reconnectGraceMs: 150,
      nextRoundDelayMs: 50,
    });
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(() => {
    httpServer.close();
  });

  it("plays a best-of-3 match to completion over the network", async () => {
    const url = `http://localhost:${port}`;
    const clientA = ioClient(url);
    const clientB = ioClient(url);

    try {
      await Promise.all([waitFor(clientA, "connect"), waitFor(clientB, "connect")]);

      const matchStartA1 = waitFor<MatchStart>(clientA, "match-start");
      const matchStartB1 = waitFor<MatchStart>(clientB, "match-start");

      const { roomCode } = await new Promise<{ roomCode: string }>((resolve) => {
        clientA.emit("create-room", { sessionId: "session-a", bestOf: 3 }, resolve);
      });
      expect(roomCode).toMatch(/^[A-Z0-9]{5}$/);

      const joinResult = await new Promise<{ ok: boolean }>((resolve) => {
        clientB.emit("join-room", { sessionId: "session-b", roomCode }, resolve);
      });
      expect(joinResult.ok).toBe(true);

      let [startA, startB] = await Promise.all([matchStartA1, matchStartB1]);

      // A wins two rounds in a row; best-of-3 needs 2 wins, so the match
      // should end after the second round without a third being started.
      for (let round = 1; round <= 2; round++) {
        expect(startA.round).toBe(round);
        expect(startA.passage).toBe(startB.passage);

        const roundOverA = waitFor<RoundOver>(clientA, "round-over");
        const roundOverB = waitFor<RoundOver>(clientB, "round-over");

        await waitOutCountdown(startA.startAt);
        clientA.emit("progress", { cursorIndex: startA.passage.length });

        const [overA, overB] = await Promise.all([roundOverA, roundOverB]);
        expect(overA.status).toBe("won");
        expect(overB.status).toBe("lost");
        expect(overA.wins).toEqual({ you: round, opponent: 0 });
        expect(overA.matchOver).toBe(round === 2);

        if (round === 1) {
          [startA, startB] = await Promise.all([
            waitFor<MatchStart>(clientA, "match-start"),
            waitFor<MatchStart>(clientB, "match-start"),
          ]);
        }
      }

      // confirm no third round gets started
      let gotThirdRound = false;
      clientA.once("match-start", () => {
        gotThirdRound = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(gotThirdRound).toBe(false);
    } finally {
      clientA.close();
      clientB.close();
    }
  });

  it("resumes a round after a reconnect within the grace period", async () => {
    const url = `http://localhost:${port}`;
    const clientA = ioClient(url);
    const clientB = ioClient(url);

    try {
      await Promise.all([waitFor(clientA, "connect"), waitFor(clientB, "connect")]);

      const matchStartA = waitFor<MatchStart>(clientA, "match-start");
      const matchStartB = waitFor<MatchStart>(clientB, "match-start");

      const { roomCode } = await new Promise<{ roomCode: string }>((resolve) => {
        clientA.emit("create-room", { sessionId: "session-a", bestOf: 3 }, resolve);
      });
      await new Promise<{ ok: boolean }>((resolve) => {
        clientB.emit("join-room", { sessionId: "session-b", roomCode }, resolve);
      });

      const [startA] = await Promise.all([matchStartA, matchStartB]);
      await waitOutCountdown(startA.startAt);

      // A makes some progress before dropping
      clientA.emit("progress", { cursorIndex: 5 });
      await new Promise((resolve) => setTimeout(resolve, 60));

      const opponentDisconnected = waitFor(clientB, "opponent-disconnected");
      clientA.disconnect();
      await opponentDisconnected;

      // reconnect well within the 150ms grace period configured above
      clientA.connect();
      await waitFor(clientA, "connect");

      const opponentReconnected = waitFor(clientB, "opponent-reconnected");
      const resumeResult = await new Promise<{
        ok: boolean;
        passage?: string;
        you?: { cursorIndex: number };
      }>((resolve) => {
        clientA.emit("reconnect-session", { sessionId: "session-a" }, resolve);
      });
      await opponentReconnected;

      expect(resumeResult.ok).toBe(true);
      expect(resumeResult.passage).toBe(startA.passage);
      expect(resumeResult.you?.cursorIndex).toBeGreaterThan(0);

      // round should still be alive and completable after resuming
      const roundOverA = waitFor<RoundOver>(clientA, "round-over");
      const roundOverB = waitFor<RoundOver>(clientB, "round-over");
      clientA.emit("progress", { cursorIndex: startA.passage.length });
      const [overA, overB] = await Promise.all([roundOverA, roundOverB]);
      expect(overA.status).toBe("won");
      expect(overB.status).toBe("lost");
    } finally {
      clientA.close();
      clientB.close();
    }
  });

  it("forfeits only the round, not the match, when the grace period expires", async () => {
    const url = `http://localhost:${port}`;
    const clientA = ioClient(url);
    const clientB = ioClient(url);

    try {
      await Promise.all([waitFor(clientA, "connect"), waitFor(clientB, "connect")]);

      const matchStartA = waitFor<MatchStart>(clientA, "match-start");
      const matchStartB = waitFor<MatchStart>(clientB, "match-start");

      const { roomCode } = await new Promise<{ roomCode: string }>((resolve) => {
        clientA.emit("create-room", { sessionId: "session-a2", bestOf: 3 }, resolve);
      });
      await new Promise<{ ok: boolean }>((resolve) => {
        clientB.emit("join-room", { sessionId: "session-b2", roomCode }, resolve);
      });

      await Promise.all([matchStartA, matchStartB]);

      const roundOverB = waitFor<RoundOver>(clientB, "round-over");
      const nextMatchStartB = waitFor<MatchStart>(clientB, "match-start");

      clientA.disconnect();

      const overB = await roundOverB;
      expect(overB.status).toBe("won");
      expect(overB.wins).toEqual({ you: 1, opponent: 0 });
      expect(overB.matchOver).toBe(false);

      // match continues - a new round starts for the remaining player
      const nextStart = await nextMatchStartB;
      expect(nextStart.round).toBe(2);
    } finally {
      clientA.close();
      clientB.close();
    }
  });

  it("rejects joining a room that doesn't exist", async () => {
    const url = `http://localhost:${port}`;
    const client = ioClient(url);

    try {
      await waitFor(client, "connect");
      const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        client.emit("join-room", { sessionId: "session-x", roomCode: "ZZZZZ" }, resolve);
      });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Room not found");
    } finally {
      client.close();
    }
  });

  it("rejects joining a room that already has two players", async () => {
    const url = `http://localhost:${port}`;
    const clientA = ioClient(url);
    const clientB = ioClient(url);
    const clientC = ioClient(url);

    try {
      await Promise.all([
        waitFor(clientA, "connect"),
        waitFor(clientB, "connect"),
        waitFor(clientC, "connect"),
      ]);

      const { roomCode } = await new Promise<{ roomCode: string }>((resolve) => {
        clientA.emit("create-room", { sessionId: "session-a3", bestOf: 3 }, resolve);
      });
      await new Promise<{ ok: boolean }>((resolve) => {
        clientB.emit("join-room", { sessionId: "session-b3", roomCode }, resolve);
      });

      const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        clientC.emit("join-room", { sessionId: "session-c3", roomCode }, resolve);
      });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Room is full");
    } finally {
      clientA.close();
      clientB.close();
      clientC.close();
    }
  });

  it("rejects reconnecting with an unknown session id", async () => {
    const url = `http://localhost:${port}`;
    const client = ioClient(url);

    try {
      await waitFor(client, "connect");
      const result = await new Promise<{ ok: boolean }>((resolve) => {
        client.emit("reconnect-session", { sessionId: "nonexistent" }, resolve);
      });
      expect(result.ok).toBe(false);
    } finally {
      client.close();
    }
  });
});

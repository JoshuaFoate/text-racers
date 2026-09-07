import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { Server } from "socket.io";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { attachGameServer } from "../src/socketServer.js";

function waitFor<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

describe("socket server", () => {
  let httpServer: ReturnType<typeof createServer>;
  let port: number;

  beforeEach(async () => {
    httpServer = createServer();
    const io = new Server(httpServer);
    attachGameServer(io, { countdownMs: 50, tickIntervalMs: 20 });
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(() => {
    httpServer.close();
  });

  it("lets two clients join by code and complete one authoritative round", async () => {
    const url = `http://localhost:${port}`;
    const clientA = ioClient(url);
    const clientB = ioClient(url);

    try {
      await Promise.all([waitFor(clientA, "connect"), waitFor(clientB, "connect")]);

      const { roomCode } = await new Promise<{ roomCode: string }>((resolve) => {
        clientA.emit("create-room", resolve);
      });
      expect(roomCode).toMatch(/^[A-Z0-9]{5}$/);

      // Registered before join-room fires so a match-start emitted the instant
      // both players are present can't be missed by a listener attached too late.
      const matchStartA = waitFor<{ passage: string; startAt: number }>(clientA, "match-start");
      const matchStartB = waitFor<{ passage: string; startAt: number }>(clientB, "match-start");
      const roundOverA = waitFor<{ status: string }>(clientA, "round-over");
      const roundOverB = waitFor<{ status: string }>(clientB, "round-over");

      const joinResult = await new Promise<{ ok: boolean }>((resolve) => {
        clientB.emit("join-room", { roomCode }, resolve);
      });
      expect(joinResult.ok).toBe(true);

      const [startA, startB] = await Promise.all([matchStartA, matchStartB]);
      expect(startA.passage).toBe(startB.passage);
      expect(startA.passage.length).toBeGreaterThan(0);

      const msUntilStart = startA.startAt - Date.now();
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, msUntilStart) + 50));

      clientA.emit("progress", { cursorIndex: startA.passage.length });

      const [statusA, statusB] = await Promise.all([roundOverA, roundOverB]);

      expect(statusA.status).toBe("won");
      expect(statusB.status).toBe("lost");
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
        client.emit("join-room", { roomCode: "ZZZZZ" }, resolve);
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
        clientA.emit("create-room", resolve);
      });
      await new Promise<{ ok: boolean }>((resolve) => {
        clientB.emit("join-room", { roomCode }, resolve);
      });

      const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        clientC.emit("join-room", { roomCode }, resolve);
      });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Room is full");
    } finally {
      clientA.close();
      clientB.close();
      clientC.close();
    }
  });
});

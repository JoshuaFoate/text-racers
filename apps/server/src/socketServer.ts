import { generatePassage, type PassageLength } from "content";
import {
  computeLiveWpm,
  createRoundState,
  DEFAULT_WPM_WINDOW_MS,
  resolveRaceStatus,
  stepRound,
  type ProgressSample,
  type RoundState,
} from "game-core";
import type { Server, Socket } from "socket.io";

const DEFAULT_COUNTDOWN_MS = 3000;
const DEFAULT_TICK_INTERVAL_MS = 100;
const DEFAULT_RECONNECT_GRACE_MS = 15000;
const DEFAULT_NEXT_ROUND_DELAY_MS = 3000;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 5;

export type BestOf = 3 | 5;

export type GameServerOptions = {
  countdownMs?: number;
  tickIntervalMs?: number;
  reconnectGraceMs?: number;
  nextRoundDelayMs?: number;
};

type Player = {
  socket: Socket | null;
  sessionId: string;
  round: RoundState;
  samples: ProgressSample[];
  latestCursorIndex: number;
  wins: number;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
};

type Room = {
  code: string;
  bestOf: BestOf;
  roundNumber: number;
  passage: string;
  players: Player[];
  tickInterval: ReturnType<typeof setInterval> | null;
  lastTickAt: number;
  paused: boolean;
};

type SessionRecord = { roomCode: string; playerIndex: 0 | 1 };

type ServerContext = {
  rooms: Map<string, Room>;
  sessions: Map<string, SessionRecord>;
  options: Required<GameServerOptions>;
};

function lengthForRound(round: number): PassageLength {
  if (round === 1) return "short";
  if (round === 2) return "medium";
  return "long";
}

function generateRoomCode(rooms: Map<string, Room>): string {
  let code: string;
  do {
    code = Array.from(
      { length: ROOM_CODE_LENGTH },
      () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

function createPlayer(socket: Socket, sessionId: string): Player {
  return {
    socket,
    sessionId,
    round: createRoundState(""),
    samples: [],
    latestCursorIndex: 0,
    wins: 0,
    disconnectTimer: null,
  };
}

function toClientRound(round: RoundState) {
  return { cursorIndex: round.cursorIndex, eraseIndex: round.eraseIndex, status: round.status };
}

function opponentOf(room: Room, player: Player): Player | undefined {
  return room.players.find((p) => p !== player);
}

function cleanupRoom(room: Room, ctx: ServerContext) {
  ctx.rooms.delete(room.code);
  for (const player of room.players) {
    if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
    ctx.sessions.delete(player.sessionId);
  }
}

function startRound(room: Room, ctx: ServerContext) {
  const passage = generatePassage(lengthForRound(room.roundNumber));
  room.passage = passage;
  for (const player of room.players) {
    player.round = createRoundState(passage);
    player.samples = [];
    player.latestCursorIndex = 0;
  }

  const [a, b] = room.players;
  const startAt = Date.now() + ctx.options.countdownMs;
  a.socket?.emit("match-start", {
    passage,
    startAt,
    round: room.roundNumber,
    bestOf: room.bestOf,
    wins: { you: a.wins, opponent: b.wins },
  });
  b.socket?.emit("match-start", {
    passage,
    startAt,
    round: room.roundNumber,
    bestOf: room.bestOf,
    wins: { you: b.wins, opponent: a.wins },
  });

  setTimeout(() => {
    room.lastTickAt = Date.now();
    room.tickInterval = setInterval(() => tickRoom(room, ctx), ctx.options.tickIntervalMs);
  }, ctx.options.countdownMs);
}

function concludeRound(room: Room, ctx: ServerContext) {
  if (room.tickInterval) clearInterval(room.tickInterval);
  room.tickInterval = null;
  room.paused = false;

  const [a, b] = room.players;
  const aStatus = resolveRaceStatus(a.round, b.round);
  const bStatus = resolveRaceStatus(b.round, a.round);

  if (aStatus === "won") a.wins++;
  if (bStatus === "won") b.wins++;

  const winsNeeded = Math.ceil(room.bestOf / 2);
  const matchOver = a.wins >= winsNeeded || b.wins >= winsNeeded;

  a.socket?.emit("round-over", {
    status: aStatus,
    round: room.roundNumber,
    wins: { you: a.wins, opponent: b.wins },
    matchOver,
  });
  b.socket?.emit("round-over", {
    status: bStatus,
    round: room.roundNumber,
    wins: { you: b.wins, opponent: a.wins },
    matchOver,
  });

  if (matchOver) {
    cleanupRoom(room, ctx);
  } else {
    room.roundNumber += 1;
    setTimeout(() => startRound(room, ctx), ctx.options.nextRoundDelayMs);
  }
}

function tickRoom(room: Room, ctx: ServerContext) {
  const now = Date.now();
  const dtMs = now - room.lastTickAt;
  room.lastTickAt = now;

  const [a, b] = room.players;
  if (!a || !b) return;

  const aWpm = computeLiveWpm(a.samples, now, DEFAULT_WPM_WINDOW_MS);
  const bWpm = computeLiveWpm(b.samples, now, DEFAULT_WPM_WINDOW_MS);

  a.round = stepRound(a.round, {
    typed: room.passage.slice(0, a.latestCursorIndex),
    opponentWpm: bWpm,
    dtMs,
  });
  b.round = stepRound(b.round, {
    typed: room.passage.slice(0, b.latestCursorIndex),
    opponentWpm: aWpm,
    dtMs,
  });

  a.socket?.emit("state", { you: toClientRound(a.round), opponent: toClientRound(b.round) });
  b.socket?.emit("state", { you: toClientRound(b.round), opponent: toClientRound(a.round) });

  if (resolveRaceStatus(a.round, b.round) !== "in-progress") {
    concludeRound(room, ctx);
  }
}

function forfeitRound(room: Room, player: Player, ctx: ServerContext) {
  player.disconnectTimer = null;
  if (!ctx.rooms.has(room.code)) return;
  player.round = { ...player.round, status: "lost" };
  concludeRound(room, ctx);
}

function handleDisconnect(room: Room, player: Player, ctx: ServerContext) {
  const wasTicking = room.tickInterval !== null;
  if (wasTicking) {
    clearInterval(room.tickInterval!);
    room.tickInterval = null;
    room.paused = true;
  }
  player.socket = null;

  opponentOf(room, player)?.socket?.emit("opponent-disconnected");

  player.disconnectTimer = setTimeout(() => {
    forfeitRound(room, player, ctx);
  }, ctx.options.reconnectGraceMs);
}

export function attachGameServer(io: Server, options: GameServerOptions = {}): void {
  const ctx: ServerContext = {
    rooms: new Map(),
    sessions: new Map(),
    options: {
      countdownMs: options.countdownMs ?? DEFAULT_COUNTDOWN_MS,
      tickIntervalMs: options.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS,
      reconnectGraceMs: options.reconnectGraceMs ?? DEFAULT_RECONNECT_GRACE_MS,
      nextRoundDelayMs: options.nextRoundDelayMs ?? DEFAULT_NEXT_ROUND_DELAY_MS,
    },
  };

  io.on("connection", (socket) => {
    let currentRoom: Room | null = null;
    let me: Player | null = null;

    socket.on(
      "create-room",
      (
        payload: { sessionId: string; bestOf: BestOf },
        ack: (res: { roomCode: string }) => void
      ) => {
        const code = generateRoomCode(ctx.rooms);
        me = createPlayer(socket, payload.sessionId);
        currentRoom = {
          code,
          bestOf: payload.bestOf,
          roundNumber: 1,
          passage: "",
          players: [me],
          tickInterval: null,
          lastTickAt: 0,
          paused: false,
        };
        ctx.rooms.set(code, currentRoom);
        ctx.sessions.set(payload.sessionId, { roomCode: code, playerIndex: 0 });
        ack({ roomCode: code });
      }
    );

    socket.on(
      "join-room",
      (
        payload: { sessionId: string; roomCode: string },
        ack: (res: { ok: boolean; error?: string }) => void
      ) => {
        const room = ctx.rooms.get(payload.roomCode);
        if (!room) {
          ack({ ok: false, error: "Room not found" });
          return;
        }
        if (room.players.length >= 2) {
          ack({ ok: false, error: "Room is full" });
          return;
        }

        me = createPlayer(socket, payload.sessionId);
        room.players.push(me);
        currentRoom = room;
        ctx.sessions.set(payload.sessionId, { roomCode: room.code, playerIndex: 1 });
        ack({ ok: true });

        room.players[0].socket?.emit("opponent-joined");
        startRound(room, ctx);
      }
    );

    socket.on(
      "reconnect-session",
      (payload: { sessionId: string }, ack: (res: { ok: boolean } & Record<string, unknown>) => void) => {
        const record = ctx.sessions.get(payload.sessionId);
        if (!record) {
          ack({ ok: false });
          return;
        }
        const room = ctx.rooms.get(record.roomCode);
        const player = room?.players[record.playerIndex];
        if (!room || !player) {
          ctx.sessions.delete(payload.sessionId);
          ack({ ok: false });
          return;
        }

        if (player.disconnectTimer) {
          clearTimeout(player.disconnectTimer);
          player.disconnectTimer = null;
        }

        player.socket = socket;
        me = player;
        currentRoom = room;

        const opponent = opponentOf(room, player);
        opponent?.socket?.emit("opponent-reconnected");

        if (
          room.paused &&
          opponent?.socket &&
          resolveRaceStatus(player.round, opponent.round) === "in-progress"
        ) {
          room.paused = false;
          room.lastTickAt = Date.now();
          room.tickInterval = setInterval(() => tickRoom(room, ctx), ctx.options.tickIntervalMs);
        }

        ack({
          ok: true,
          passage: room.passage,
          round: room.roundNumber,
          bestOf: room.bestOf,
          wins: { you: player.wins, opponent: opponent?.wins ?? 0 },
          you: toClientRound(player.round),
          opponent: toClientRound(opponent?.round ?? createRoundState("")),
        });
      }
    );

    socket.on("progress", (payload: { cursorIndex: number }) => {
      if (!me || !currentRoom) return;
      const clamped = Math.max(0, Math.min(payload.cursorIndex, currentRoom.passage.length));
      me.latestCursorIndex = clamped;
      me.samples.push({ cursorIndex: clamped, t: Date.now() });
    });

    socket.on("disconnect", () => {
      if (!currentRoom || !me) return;
      handleDisconnect(currentRoom, me, ctx);
    });
  });
}

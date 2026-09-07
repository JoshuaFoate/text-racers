import { generatePassage } from "content";
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
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 5;

export type GameServerOptions = {
  countdownMs?: number;
  tickIntervalMs?: number;
};

type Player = {
  socket: Socket;
  round: RoundState;
  samples: ProgressSample[];
  latestCursorIndex: number;
};

type Room = {
  code: string;
  passage: string;
  players: Player[];
  tickInterval: ReturnType<typeof setInterval> | null;
  lastTickAt: number;
};

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

function toClientRound(round: RoundState) {
  return { cursorIndex: round.cursorIndex, eraseIndex: round.eraseIndex, status: round.status };
}

function startRound(room: Room, options: Required<GameServerOptions>) {
  const passage = generatePassage("medium");
  room.passage = passage;
  for (const player of room.players) {
    player.round = createRoundState(passage);
    player.samples = [];
    player.latestCursorIndex = 0;
  }

  const startAt = Date.now() + options.countdownMs;
  for (const player of room.players) {
    player.socket.emit("match-start", { passage, startAt });
  }

  setTimeout(() => {
    room.lastTickAt = Date.now();
    room.tickInterval = setInterval(() => tickRoom(room), options.tickIntervalMs);
  }, options.countdownMs);
}

function tickRoom(room: Room) {
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

  a.socket.emit("state", { you: toClientRound(a.round), opponent: toClientRound(b.round) });
  b.socket.emit("state", { you: toClientRound(b.round), opponent: toClientRound(a.round) });

  const aStatus = resolveRaceStatus(a.round, b.round);
  if (aStatus !== "in-progress") {
    if (room.tickInterval) clearInterval(room.tickInterval);
    room.tickInterval = null;
    const bStatus = resolveRaceStatus(b.round, a.round);
    a.socket.emit("round-over", { status: aStatus });
    b.socket.emit("round-over", { status: bStatus });
  }
}

export function attachGameServer(io: Server, options: GameServerOptions = {}): void {
  const resolvedOptions: Required<GameServerOptions> = {
    countdownMs: options.countdownMs ?? DEFAULT_COUNTDOWN_MS,
    tickIntervalMs: options.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS,
  };
  const rooms = new Map<string, Room>();

  io.on("connection", (socket) => {
    let currentRoom: Room | null = null;
    let me: Player | null = null;

    socket.on("create-room", (ack: (res: { roomCode: string }) => void) => {
      const code = generateRoomCode(rooms);
      me = { socket, round: createRoundState(""), samples: [], latestCursorIndex: 0 };
      currentRoom = { code, passage: "", players: [me], tickInterval: null, lastTickAt: 0 };
      rooms.set(code, currentRoom);
      ack({ roomCode: code });
    });

    socket.on(
      "join-room",
      (payload: { roomCode: string }, ack: (res: { ok: boolean; error?: string }) => void) => {
        const room = rooms.get(payload.roomCode);
        if (!room) {
          ack({ ok: false, error: "Room not found" });
          return;
        }
        if (room.players.length >= 2) {
          ack({ ok: false, error: "Room is full" });
          return;
        }

        me = { socket, round: createRoundState(""), samples: [], latestCursorIndex: 0 };
        room.players.push(me);
        currentRoom = room;
        ack({ ok: true });

        room.players[0].socket.emit("opponent-joined");
        startRound(room, resolvedOptions);
      }
    );

    socket.on("progress", (payload: { cursorIndex: number }) => {
      if (!me || !currentRoom) return;
      const clamped = Math.max(0, Math.min(payload.cursorIndex, currentRoom.passage.length));
      me.latestCursorIndex = clamped;
      me.samples.push({ cursorIndex: clamped, t: Date.now() });
    });

    socket.on("disconnect", () => {
      if (!currentRoom) return;
      if (currentRoom.tickInterval) clearInterval(currentRoom.tickInterval);
      rooms.delete(currentRoom.code);
    });
  });
}

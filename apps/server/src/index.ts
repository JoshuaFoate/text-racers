import { createServer } from "node:http";
import { Server } from "socket.io";
import { attachGameServer } from "./socketServer.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

attachGameServer(io);

httpServer.listen(PORT, () => {
  console.log(`text-racers server listening on port ${PORT}`);
});

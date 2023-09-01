import { Server, ServerOptions } from 'socket.io';

let io: Server;

export function initializeSocket(server: ServerOptions): Server {
  io = new Server(server);
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}
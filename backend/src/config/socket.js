import { Server } from 'socket.io';
import { jwtProvider } from '~/providers/jwtProvider';
import { env } from '~/config/enviroment';
import { corsOptions } from '~/config/cors';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: corsOptions
  });

  // Middleware xác thực JWT cho Socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = await jwtProvider.verifyToken(token, env.ACCESS_TOKEN_SECRET_SIGNATURE);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    // console.log(`User connected to Socket.IO: ${socket.id}, User ID: ${socket.user._id}`);
    
    // Join vào room mang tên của chính user (chứa _id) để dễ dàng bắn thông báo riêng
    socket.join(socket.user._id.toString());

    socket.on('disconnect', () => {
      // console.log(`User disconnected from Socket.IO: ${socket.id}`);
    });
  });

  console.log('Socket.io đã khởi tạo');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io chưa được khởi tạo!');
  }
  return io;
};

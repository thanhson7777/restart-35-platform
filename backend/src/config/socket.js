import { Server } from 'socket.io';
import { jwtProvider } from '~/providers/jwtProvider';
import { env } from '~/config/enviroment';
import { corsOptions } from '~/config/cors';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: corsOptions
  });

  // Middleware xác thực JWT cho Socket (hoặc ẩn danh)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token || token === 'null') {
        socket.user = null; // Khách vãng lai (Anonymous)
        return next();
      }

      const decoded = await jwtProvider.verifyToken(token, env.ACCESS_TOKEN_SECRET_SIGNATURE);
      socket.user = decoded;
      next();
    } catch (err) {
      // Token sai thì vẫn cho vào với quyền ẩn danh
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    // Join vào room mang tên của chính user (chứa _id) để dễ dàng bắn thông báo riêng
    if (socket.user && socket.user._id) {
      socket.join(socket.user._id.toString());
    }

    socket.on('disconnect', () => {
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

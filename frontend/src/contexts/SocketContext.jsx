import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { API_ROOT } from '@/utils/constants';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const currentUser = useSelector(selectCurrentUser);

  useEffect(() => {
    // Chỉ kết nối khi có thông tin user (đã đăng nhập)
    if (currentUser) {
      const token = localStorage.getItem('accessToken');
      
      const socketInstance = io(API_ROOT || 'http://localhost:8017', {
        auth: {
          token
        }
      });

      socketInstance.on('connect', () => {
        console.log('Đã kết nối Socket.io:', socketInstance.id);
      });

      socketInstance.on('connect_error', (err) => {
        console.error('Lỗi kết nối Socket:', err.message);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    } else {
      // Nếu đăng xuất, ngắt kết nối
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [currentUser]); // Chạy lại hiệu ứng nếu currentUser thay đổi (login/logout)

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

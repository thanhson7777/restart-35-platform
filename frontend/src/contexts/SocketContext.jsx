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
    // Luôn kết nối Socket.io để nhận broadcast event
    const token = currentUser ? localStorage.getItem('accessToken') : 'null';
    
    const socketInstance = io(API_ROOT || 'http://localhost:8017', {
      auth: {
        token
      }
    });

    socketInstance.on('connect', () => {
      console.log('Đã kết nối Socket.io (Anonymous/User):', socketInstance.id);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Lỗi kết nối Socket:', err.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [currentUser]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

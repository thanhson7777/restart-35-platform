import { authorizeAxiosInstance } from '~/utils/authorizeAxios';

export const getNotifications = (params) => {
  return authorizeAxiosInstance.get('/v1/notifications', { params });
};

export const markAsRead = (id) => {
  return authorizeAxiosInstance.put(`/v1/notifications/${id}/read`);
};

export const markAllAsRead = () => {
  return authorizeAxiosInstance.put('/v1/notifications/read-all');
};

export const notificationApi = {
  getNotifications,
  markAsRead,
  markAllAsRead
};

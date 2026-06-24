import { publicAxiosInstance, authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

export const sendContact = (data) =>
  publicAxiosInstance.post(`${API_ROOT}/v1/contacts`, data);

export const getContactsAdmin = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/contacts`, { params });

export const markContactReplied = (id) =>
  authorizeAxiosInstance.patch(`${API_ROOT}/v1/contacts/${id}/reply`);

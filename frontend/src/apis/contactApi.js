import { publicAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

export const sendContact = (data) =>
  publicAxiosInstance.post(`${API_ROOT}/v1/contacts`, data);

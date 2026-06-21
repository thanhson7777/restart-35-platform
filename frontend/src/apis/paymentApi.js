import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// ─── Payments Admin ────────────────────────────────────────────────────────────

export const getPayments = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/payments`, { params });

export const getAdminPaymentStats = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/payments/stats`);

export const getPaymentById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/payments/${id}`);

export const updatePaymentStatus = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/payments/${id}/status`, data);

export const refundPayment = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/payments/${id}/refund`, data);

export const getMyPayments = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/payments/my`, { params });

export const getPaymentInvoice = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/payments/${id}/invoice`);

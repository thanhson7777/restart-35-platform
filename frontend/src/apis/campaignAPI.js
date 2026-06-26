import { authorizeAxiosInstance, publicAxiosInstance } from '~/utils/authorizeAxios';

// ============ GENERAL/PUBLIC ============
export const getCampaigns = (params) => {
  return publicAxiosInstance.get('/v1/campaigns', { params });
};

export const getCampaignById = (id) => {
  return publicAxiosInstance.get(`/v1/campaigns/${id}`);
};

export const donateToCampaign = (campaignId, data) => {
  return authorizeAxiosInstance.post(`/v1/campaigns/${campaignId}/donate`, data);
};

// ============ WORKER ============
export const createCampaign = (data) => {
  return authorizeAxiosInstance.post('/v1/campaigns', data);
};

// ============ NGO ============
export const approveCampaign = (campaignId) => {
  return authorizeAxiosInstance.put(`/v1/campaigns/${campaignId}/approve`);
};

export const addCampaignMilestone = (campaignId, data) => {
  return authorizeAxiosInstance.post(`/v1/campaigns/${campaignId}/milestones`, data);
};

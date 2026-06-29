import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  approveCampaign,
  rejectCampaign,
  donateToCampaign,
  addCampaignMilestone
} from '~/apis/campaignAPI';

// Thunks
export const fetchCampaigns = createAsyncThunk(
  'campaign/fetchCampaigns',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await getCampaigns(params);
      const data = response?.data?.data || response?.data || [];
      const pagination = response?.data?.pagination || {};
      return {
        campaigns: data,
        total: pagination.totalItems || data.length || 0,
        page: pagination.page || 1,
        pages: pagination.totalPages || 1,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Lỗi lấy danh sách dự án');
    }
  }
);

export const fetchCampaignDetails = createAsyncThunk(
  'campaign/fetchCampaignDetails',
  async (id, { rejectWithValue }) => {
    try {
      const response = await getCampaignById(id);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Lỗi lấy chi tiết dự án');
    }
  }
);

export const submitCampaign = createAsyncThunk(
  'campaign/submitCampaign',
  async (data, { rejectWithValue }) => {
    try {
      const response = await createCampaign(data);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Lỗi tạo dự án');
    }
  }
);

export const ngoApproveCampaign = createAsyncThunk(
  'campaign/ngoApproveCampaign',
  async (campaignId, { rejectWithValue }) => {
    try {
      const response = await approveCampaign(campaignId);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Lỗi duyệt dự án');
    }
  }
);

export const ngoRejectCampaign = createAsyncThunk(
  'campaign/ngoRejectCampaign',
  async (campaignId, { rejectWithValue }) => {
    try {
      const response = await rejectCampaign(campaignId);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Lỗi từ chối dự án');
    }
  }
);

export const submitDonation = createAsyncThunk(
  'campaign/submitDonation',
  async ({ campaignId, data }, { rejectWithValue }) => {
    try {
      const response = await donateToCampaign(campaignId, data);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Lỗi đóng góp');
    }
  }
);

export const submitMilestone = createAsyncThunk(
  'campaign/submitMilestone',
  async ({ campaignId, data }, { rejectWithValue }) => {
    try {
      const response = await addCampaignMilestone(campaignId, data);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Lỗi thêm tiến độ');
    }
  }
);

const initialState = {
  campaigns: [],
  totalCampaigns: 0,
  currentPage: 1,
  totalPages: 1,
  campaignDetails: null,
  
  loading: false,
  error: null,
  
  createLoading: false,
  createSuccess: false,
  
  actionLoading: false,
  actionSuccess: false,
};

const campaignSlice = createSlice({
  name: 'campaign',
  initialState,
  reducers: {
    clearCampaignState: (state) => {
      state.error = null;
      state.createSuccess = false;
      state.actionSuccess = false;
    },
    clearCampaignDetails: (state) => {
      state.campaignDetails = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Campaigns
      .addCase(fetchCampaigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.loading = false;
        state.campaigns = action.payload.campaigns;
        state.totalCampaigns = action.payload.total;
        state.currentPage = action.payload.page;
        state.totalPages = action.payload.pages;
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Details
      .addCase(fetchCampaignDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaignDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.campaignDetails = action.payload;
      })
      .addCase(fetchCampaignDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create Campaign
      .addCase(submitCampaign.pending, (state) => {
        state.createLoading = true;
        state.createSuccess = false;
        state.error = null;
      })
      .addCase(submitCampaign.fulfilled, (state) => {
        state.createLoading = false;
        state.createSuccess = true;
      })
      .addCase(submitCampaign.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
      })
      
      // NGO Approve
      .addCase(ngoApproveCampaign.pending, (state) => {
        state.actionLoading = true;
        state.actionSuccess = false;
        state.error = null;
      })
      .addCase(ngoApproveCampaign.fulfilled, (state) => {
        state.actionLoading = false;
        state.actionSuccess = true;
      })
      .addCase(ngoApproveCampaign.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      
      // Donate
      .addCase(submitDonation.pending, (state) => {
        state.actionLoading = true;
        state.actionSuccess = false;
        state.error = null;
      })
      .addCase(submitDonation.fulfilled, (state) => {
        state.actionLoading = false;
        state.actionSuccess = true;
      })
      .addCase(submitDonation.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      
      // Milestone
      .addCase(submitMilestone.pending, (state) => {
        state.actionLoading = true;
        state.actionSuccess = false;
        state.error = null;
      })
      .addCase(submitMilestone.fulfilled, (state) => {
        state.actionLoading = false;
        state.actionSuccess = true;
      })
      .addCase(submitMilestone.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCampaignState, clearCampaignDetails } = campaignSlice.actions;

// Selectors
export const selectCampaigns = (state) => state.campaign.campaigns;
export const selectCampaignsPagination = (state) => ({
  total: state.campaign.totalCampaigns,
  page: state.campaign.currentPage,
  pages: state.campaign.totalPages
});
export const selectCampaignDetails = (state) => state.campaign.campaignDetails;
export const selectCampaignLoading = (state) => state.campaign.loading;
export const selectCampaignActionLoading = (state) => state.campaign.actionLoading;
export const selectCampaignCreateLoading = (state) => state.campaign.createLoading;

export default campaignSlice.reducer;

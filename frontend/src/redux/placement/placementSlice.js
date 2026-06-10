import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as placementApi from '../../apis/placementApi';

export const fetchMyPlacements = createAsyncThunk(
  'placement/fetchMy',
  async (_, { rejectWithValue }) => {
    try {
      const res = await placementApi.getMyPlacements();
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);

export const fetchPlacementById = createAsyncThunk(
  'placement/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await placementApi.getPlacementById(id);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);

export const submitPlacementFeedback = createAsyncThunk(
  'placement/submitFeedback',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await placementApi.givePlacementFeedback(id, data);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);

const placementInitialState = {
  items: [],
  currentPlacement: null,
  loading: false,
  error: null,
};

const placementSlice = createSlice({
  name: 'placement',
  initialState: placementInitialState,
  reducers: {
    resetPlacement: () => placementInitialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchMyPlacements
      .addCase(fetchMyPlacements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyPlacements.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.data || action.payload || [];
      })
      .addCase(fetchMyPlacements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Lỗi khi tải danh sách placements';
      })
      // fetchPlacementById
      .addCase(fetchPlacementById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlacementById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPlacement = action.payload?.data || action.payload;
      })
      .addCase(fetchPlacementById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Lỗi khi tải chi tiết placement';
      })
      // submitPlacementFeedback
      .addCase(submitPlacementFeedback.rejected, (state, action) => {
        state.error = action.payload?.message || 'Gửi feedback thất bại';
      });
  },
});

export default placementSlice.reducer;
export const { resetPlacement } = placementSlice.actions;
export const selectPlacements = (state) => state.placement.items;
export const selectCurrentPlacement = (state) => state.placement.currentPlacement;
export const selectPlacementsLoading = (state) => state.placement.loading;
export const selectPlacementsError = (state) => state.placement.error;

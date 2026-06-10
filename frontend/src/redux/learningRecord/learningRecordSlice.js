import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as lrApi from '../../apis/learningRecordApi';

export const fetchMyLearningRecords = createAsyncThunk(
  'learningRecord/fetchMy',
  async (_, { rejectWithValue }) => {
    try {
      const res = await lrApi.getMyLearningRecords();
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);

const learningRecordInitialState = {
  items: [],
  loading: false,
  error: null,
};

const learningRecordSlice = createSlice({
  name: 'learningRecord',
  initialState: learningRecordInitialState,
  reducers: {
    resetLearningRecord: () => learningRecordInitialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyLearningRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyLearningRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.data || action.payload || [];
      })
      .addCase(fetchMyLearningRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Lỗi khi tải bản ghi học tập';
      });
  },
});

export default learningRecordSlice.reducer;
export const { resetLearningRecord } = learningRecordSlice.actions;
export const selectLearningRecords = (state) => state.learningRecord.items;
export const selectLearningRecordsLoading = (state) => state.learningRecord.loading;
export const selectLearningRecordsError = (state) => state.learningRecord.error;

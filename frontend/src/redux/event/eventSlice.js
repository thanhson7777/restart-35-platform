import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  createEventAPI,
  fetchEventsAPI,
  fetchEventByIdAPI,
  joinEventAPI,
  fetchEventParticipantsAPI
} from '~/apis/eventAPI'

export const createEvent = createAsyncThunk(
  'event/createEvent',
  async (data, { rejectWithValue }) => {
    try {
      const response = await createEventAPI(data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }
)

export const fetchEvents = createAsyncThunk(
  'event/fetchEvents',
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetchEventsAPI(params)
      return response
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }
)

export const fetchEventById = createAsyncThunk(
  'event/fetchEventById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetchEventByIdAPI(id)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }
)

export const joinEvent = createAsyncThunk(
  'event/joinEvent',
  async (id, { rejectWithValue }) => {
    try {
      const response = await joinEventAPI(id)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }
)

export const fetchEventParticipants = createAsyncThunk(
  'event/fetchEventParticipants',
  async ({ id, params }, { rejectWithValue }) => {
    try {
      const response = await fetchEventParticipantsAPI(id, params)
      return response
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }
)

const initialState = {
  events: [],
  totalEvents: 0,
  currentEvent: null,
  participants: [],
  totalParticipants: 0,
  loading: false,
  detailLoading: false,
  actionLoading: false,
  error: null
}

const eventSlice = createSlice({
  name: 'event',
  initialState,
  reducers: {
    clearCurrentEvent: (state) => {
      state.currentEvent = null
    }
  },
  extraReducers: (builder) => {
    // fetchEvents
    builder.addCase(fetchEvents.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchEvents.fulfilled, (state, action) => {
      state.loading = false
      state.events = action.payload.data
      state.totalEvents = action.payload.totalCount
    })
    builder.addCase(fetchEvents.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload
    })

    // fetchEventById
    builder.addCase(fetchEventById.pending, (state) => {
      state.detailLoading = true
      state.error = null
    })
    builder.addCase(fetchEventById.fulfilled, (state, action) => {
      state.detailLoading = false
      state.currentEvent = action.payload
    })
    builder.addCase(fetchEventById.rejected, (state, action) => {
      state.detailLoading = false
      state.error = action.payload
    })

    // createEvent
    builder.addCase(createEvent.pending, (state) => {
      state.actionLoading = true
    })
    builder.addCase(createEvent.fulfilled, (state, action) => {
      state.actionLoading = false
      state.events.unshift(action.payload)
    })
    builder.addCase(createEvent.rejected, (state) => {
      state.actionLoading = false
    })

    // joinEvent
    builder.addCase(joinEvent.pending, (state) => {
      state.actionLoading = true
    })
    builder.addCase(joinEvent.fulfilled, (state) => {
      state.actionLoading = false
      if (state.currentEvent) {
        state.currentEvent.isJoined = true
        state.currentEvent.participantCount += 1
      }
    })
    builder.addCase(joinEvent.rejected, (state) => {
      state.actionLoading = false
    })

    // fetchEventParticipants
    builder.addCase(fetchEventParticipants.pending, (state) => {
      state.loading = true
    })
    builder.addCase(fetchEventParticipants.fulfilled, (state, action) => {
      state.loading = false
      state.participants = action.payload.data
      state.totalParticipants = action.payload.totalCount
    })
    builder.addCase(fetchEventParticipants.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload
    })
  }
})

export const { clearCurrentEvent } = eventSlice.actions

export const selectEvents = (state) => state.event.events
export const selectEventsLoading = (state) => state.event.loading
export const selectEventsTotal = (state) => state.event.totalEvents
export const selectCurrentEvent = (state) => state.event.currentEvent
export const selectEventDetailLoading = (state) => state.event.detailLoading
export const selectEventActionLoading = (state) => state.event.actionLoading
export const selectEventParticipants = (state) => state.event.participants
export const selectEventParticipantsTotal = (state) => state.event.totalParticipants

export default eventSlice.reducer

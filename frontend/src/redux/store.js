import { configureStore } from '@reduxjs/toolkit'
import { combineReducers } from '@reduxjs/toolkit'
import { persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import userReducer from './user/userSlice'
import profileReducer from './profile/profileSlice'
import aiReducer from './ai/aiSlice'
import jobReducer from './job/jobSlice'
import outcomeReducer from './outcome/outcomeSlice'
import placementReducer from './placement/placementSlice'
import learningRecordReducer from './learningRecord/learningRecordSlice'
import recruitmentReducer from './recruitment/recruitmentSlice'
import eventReducer from './event/eventSlice'
import campaignReducer from './campaign/campaignSlice'

const rootPersistConfig = {
  key: 'root',
  storage: storage,
  whitelist: []
}

const reducers = combineReducers({
  user: userReducer,
  profile: profileReducer,
  ai: aiReducer,
  job: jobReducer,
  outcome: outcomeReducer,
  placement: placementReducer,
  learningRecord: learningRecordReducer,
  recruitment: recruitmentReducer,
  event: eventReducer,
  campaign: campaignReducer
})

const persistedReducers = persistReducer(rootPersistConfig, reducers)

export const store = configureStore({
  reducer: persistedReducers,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false })
})

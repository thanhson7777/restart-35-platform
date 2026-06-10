import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

const SCHEDULE_URL = `${API_ROOT}/v1/schedules`

// Worker: Lấy tất cả lịch của mình (có phân trang)
export const getMySchedules = (params) =>
  authorizeAxiosInstance.get(`${SCHEDULE_URL}/my`, { params })

// Worker: Lấy lịch sắp tới
export const getWorkerUpcomingSchedule = (params) =>
  authorizeAxiosInstance.get(`${SCHEDULE_URL}/upcoming`, { params })

// Worker: Check-in buổi học
export const studentCheckin = (scheduleId, sessionNumber) =>
  authorizeAxiosInstance.post(`${SCHEDULE_URL}/${scheduleId}/sessions/${sessionNumber}/checkin`)

/**
 * Unified logout helper
 * Dùng để clear tất cả session data khi user đăng xuất.
 * Gọi hàm này kèm dispatch(logoutUser()) trong mọi location logout.
 */

import { sessionTracker } from './sessionTracker'

export const clearAllSessionData = () => {
  // 1. ML/session trackers
  sessionStorage.removeItem('ml_session_id')
  if (sessionTracker?.reset) {
    sessionTracker.reset()
  }

  // 2. Interaction tracker state — tạo session manager mới
  // Singleton không reset được dễ dàng, nhưng sessionId đã bị xoá ở trên
}

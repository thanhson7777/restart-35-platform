/**
 * Session Interaction Tracker
 * Dùng để track số lượng interactions trong một session
 * để tính spam quality score (Phase 2).
 *
 * Usage:
 *   import { sessionTracker } from '~/utils/sessionTracker'
 *   sessionTracker.increment() // Khi có interaction
 *   sessionTracker.getCount() // Lấy số interactions
 */

let _sessionInteractions = 0
let _sessionStartTime = Date.now()
let _sessionId = null

const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 phút không active = session mới

function _checkSession() {
  const now = Date.now()
  if (now - _sessionStartTime > SESSION_TIMEOUT_MS) {
    // Session hết hạn, reset
    _sessionInteractions = 0
    _sessionStartTime = now
    _sessionId = null
  }
}

function _generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const sessionTracker = {
  /**
   * Tăng counter khi có interaction mới
   */
  increment() {
    _checkSession()
    _sessionInteractions += 1
    if (!_sessionId) {
      _sessionId = _generateSessionId()
    }
    return _sessionInteractions
  },

  /**
   * Lấy số interactions trong session
   */
  getCount() {
    _checkSession()
    return _sessionInteractions
  },

  /**
   * Lấy session ID
   */
  getSessionId() {
    _checkSession()
    return _sessionId || 'unknown'
  },

  /**
   * Reset session (gọi khi logout)
   */
  reset() {
    _sessionInteractions = 0
    _sessionStartTime = Date.now()
    _sessionId = null
  },

  /**
   * Tính spam probability dựa trên số interactions
   * > 20: high spam probability
   * > 10: medium spam probability
   * <= 10: normal
   */
  getSpamLevel() {
    _checkSession()
    if (_sessionInteractions > 20) return 'high'
    if (_sessionInteractions > 10) return 'medium'
    return 'normal'
  }
}

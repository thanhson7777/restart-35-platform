/**
 * InteractionTracker - Unified Tracking Service cho ML Data Collection
 * 
 * Features:
 * - Auto-capture implicit feedback (scroll, view duration, etc.)
 * - Session management
 * - Debounced tracking
 * - Error handling with retry
 * 
 * Usage:
 *   import { interactionTracker } from '~/utils/interactionTracker'
 *   interactionTracker.trackView(userId, jobId, options)
 */

import { trackInteractionAPI, INTERACTION_ACTIONS } from '~/apis/interactionAPI'

// ============================================================
// SESSION MANAGER
// ============================================================

class SessionManager {
  constructor() {
    this.sessionId = this.getOrCreateSessionId()
    this.sessionStart = Date.now()
    this.hiddenTimeAccumulated = 0
    this.lastVisibleTime = Date.now()
    
    this.setupVisibilityTracking()
  }
  
  getOrCreateSessionId() {
    const storageKey = 'ml_session_id'
    let sessionId = sessionStorage.getItem(storageKey)
    
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem(storageKey, sessionId)
    }
    
    return sessionId
  }
  
  getSessionId() {
    return this.sessionId
  }
  
  getSessionDuration() {
    return Math.floor((Date.now() - this.sessionStart) / 1000)
  }
  
  getTimeOfDay() {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    if (hour >= 18 && hour < 22) return 'evening'
    return 'night'
  }
  
  getDayOfWeek() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return days[new Date().getDay()]
  }
  
  getDeviceInfo() {
    const userAgent = navigator.userAgent
    return {
      platform: navigator.platform,
      browser: userAgent,
      mobile: /Mobile|Android|iPhone|iPad/i.test(userAgent)
    }
  }
  
  setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.hiddenStartTime = Date.now()
      } else {
        if (this.hiddenStartTime) {
          this.hiddenTimeAccumulated += Date.now() - this.hiddenStartTime
          this.hiddenStartTime = null
        }
        this.lastVisibleTime = Date.now()
      }
    })
  }
}

// ============================================================
// INTERACTION TRACKER
// ============================================================

class InteractionTracker {
  constructor() {
    this.session = new SessionManager()
    this.viewStartTimes = new Map()      // jobId -> start timestamp
    this.trackedJobs = new Set()         // Jobs already viewed this session
    this.scrollDepths = new Map()        // jobId -> scroll depth
    this.currentScrollDepth = 0
    this.debounceTimers = new Map()      // For debounced calls
    this.pendingQueue = []               // Failed requests queue
    
    this.setupScrollTracking()
    this.setupPageHide()
    
    console.log('[InteractionTracker] Initialized with session:', this.session.getSessionId())
  }
  
  // ============================================================
  // SCROLL TRACKING
  // ============================================================
  
  setupScrollTracking() {
    let ticking = false
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateScrollDepth()
          ticking = false
        })
        ticking = true
      }
    }, { passive: true })
  }
  
  updateScrollDepth() {
    const scrollY = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    
    if (docHeight > 0) {
      this.currentScrollDepth = Math.min(1, Math.max(0, scrollY / docHeight))
    }
  }
  
  setupPageHide() {
    // Save session data before page unloads
    window.addEventListener('pagehide', () => {
      this.flushPending()
    })
  }
  
  // ============================================================
  // CORE TRACKING METHOD
  // ============================================================
  
  async track(userId, jobId, action, options = {}) {
    const {
      jobTitle = '',
      companyName = '',
      position = 1,
      method = 'content',
      variant = null,
      metadata = {},
      jobCategory = null,
      jobLocation = null,
      salaryMin = null,
      salaryMax = null,
      jobType = null
    } = options
    
    // Calculate view duration for view/click actions
    let viewDuration = 0
    if (action === INTERACTION_ACTIONS.VIEW || action === INTERACTION_ACTIONS.CLICK) {
      viewDuration = this.getViewDuration(jobId)
    }
    
    // Check if this is a return visit
    const isReturnVisit = this.trackedJobs.has(jobId)
    
    const payload = {
      userId,
      jobId,
      jobTitle,
      companyName,
      action,
      
      // Context
      context: {
        page: window.location.pathname,
        position,
        sessionId: this.session.getSessionId(),
        referrer: document.referrer || ''
      },
      
      // Duration & implicit feedback
      viewDuration,
      scrollDepth: this.currentScrollDepth,
      returnVisit: isReturnVisit,
      hoverDuration: 0,
      searchRefine: false,
      
      // Enhanced context
      timeOfDay: this.session.getTimeOfDay(),
      dayOfWeek: this.session.getDayOfWeek(),
      sessionDuration: this.session.getSessionDuration(),
      previousInteractionsCount: this.trackedJobs.size,
      
      // Feature flags (for ML & A/B testing)
      recommendationPosition: position,
      recommendationMethod: method,
      experimentVariant: variant,
      
      // Device info
      device: this.session.getDeviceInfo(),
      
      // Metadata
      metadata: {
        jobCategory: jobCategory,
        jobLocation: jobLocation,
        salaryMin,
        salaryMax,
        jobType,
        scrollDepth: this.currentScrollDepth
      }
    }
    
    // Track to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[InteractionTracker]', action, { userId, jobId, position, method })
    }
    
    try {
      await trackInteractionAPI(payload)
      
      // Clear from pending queue if exists
      this.removeFromPendingQueue(jobId, action)
      
    } catch (error) {
      console.error('[InteractionTracker] Failed to track:', error)
      // Queue for retry
      this.addToPendingQueue(payload)
    }
  }
  
  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================
  
  /**
   * Track job view - call when job card becomes visible
   */
  trackView(userId, jobId, options = {}) {
    // Mark as viewed
    this.viewStartTimes.set(jobId, Date.now())
    this.trackedJobs.add(jobId)
    
    return this.track(userId, jobId, INTERACTION_ACTIONS.VIEW, options)
  }
  
  /**
   * Track job click - call when user clicks on job
   */
  trackClick(userId, jobId, options = {}) {
    return this.track(userId, jobId, INTERACTION_ACTIONS.CLICK, options)
  }
  
  /**
   * Track job apply - call when user applies to job
   */
  trackApply(userId, jobId, options = {}) {
    return this.track(userId, jobId, INTERACTION_ACTIONS.APPLY, options)
  }
  
  /**
   * Track bookmark - call when user bookmarks a job
   */
  trackBookmark(userId, jobId, options = {}) {
    return this.track(userId, jobId, INTERACTION_ACTIONS.BOOKMARK, options)
  }
  
  /**
   * Track skip - call when user scrolls past job without interaction
   */
  trackSkip(userId, jobId, options = {}) {
    return this.track(userId, jobId, INTERACTION_ACTIONS.SKIP, options)
  }
  
  /**
   * Debounced view tracking - prevents multiple rapid calls
   */
  debouncedTrackView(userId, jobId, options = {}, delay = 2000) {
    const key = `${userId}_${jobId}_view`
    
    // Clear existing timer
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key))
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.trackView(userId, jobId, options)
      this.debounceTimers.delete(key)
    }, delay)
    
    this.debounceTimers.set(key, timer)
  }
  
  // ============================================================
  // HELPERS
  // ============================================================
  
  getViewDuration(jobId) {
    const startTime = this.viewStartTimes.get(jobId)
    if (!startTime) return 0
    
    // Calculate visible time (exclude hidden time)
    const totalTime = Date.now() - startTime
    const visibleTime = totalTime - this.session.hiddenTimeAccumulated
    
    return Math.max(0, Math.floor(visibleTime / 1000))
  }
  
  getScrollDepth(jobId) {
    return this.scrollDepths.get(jobId) || this.currentScrollDepth
  }
  
  getTrackedJobCount() {
    return this.trackedJobs.size
  }
  
  getSessionInfo() {
    return {
      sessionId: this.session.getSessionId(),
      sessionDuration: this.session.getSessionDuration(),
      jobsTracked: this.trackedJobs.size,
      pendingRequests: this.pendingQueue.length
    }
  }
  
  // ============================================================
  // PENDING QUEUE (Retry Logic)
  // ============================================================
  
  addToPendingQueue(payload) {
    // Keep max 50 pending items
    if (this.pendingQueue.length >= 50) {
      this.pendingQueue.shift() // Remove oldest
    }
    this.pendingQueue.push(payload)
  }
  
  removeFromPendingQueue(jobId, action) {
    this.pendingQueue = this.pendingQueue.filter(
      item => !(item.jobId === jobId && item.action === action)
    )
  }
  
  async flushPending() {
    // Try to send pending items
    const pending = [...this.pendingQueue]
    this.pendingQueue = []
    
    for (const payload of pending) {
      try {
        await trackInteractionAPI(payload)
      } catch (error) {
        // Re-add to queue if still fails
        this.addToPendingQueue(payload)
      }
    }
  }
  
  async retryPending() {
    if (this.pendingQueue.length === 0) return
    
    console.log(`[InteractionTracker] Retrying ${this.pendingQueue.length} pending items...`)
    await this.flushPending()
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const interactionTracker = new InteractionTracker()

// ============================================================
// REACT HOOK (Optional)
// ============================================================

/**
 * React hook for using interaction tracker
 * 
 * Usage:
 *   const { trackView, trackClick, trackApply } = useInteractionTracker()
 * 
 *   // In component
 *   trackView(userId, job.id, { position: 1, method: 'hybrid' })
 */
import { useCallback } from 'react'

export const useInteractionTracker = () => {
  const trackView = useCallback((userId, jobId, options = {}) => {
    return interactionTracker.trackView(userId, jobId, options)
  }, [])
  
  const trackClick = useCallback((userId, jobId, options = {}) => {
    return interactionTracker.trackClick(userId, jobId, options)
  }, [])
  
  const trackApply = useCallback((userId, jobId, options = {}) => {
    return interactionTracker.trackApply(userId, jobId, options)
  }, [])
  
  const trackBookmark = useCallback((userId, jobId, options = {}) => {
    return interactionTracker.trackBookmark(userId, jobId, options)
  }, [])
  
  const trackSkip = useCallback((userId, jobId, options = {}) => {
    return interactionTracker.trackSkip(userId, jobId, options)
  }, [])
  
  const debouncedTrackView = useCallback((userId, jobId, options = {}, delay = 2000) => {
    return interactionTracker.debouncedTrackView(userId, jobId, options, delay)
  }, [])
  
  return {
    trackView,
    trackClick,
    trackApply,
    trackBookmark,
    trackSkip,
    debouncedTrackView,
    getSessionInfo: interactionTracker.getSessionInfo.bind(interactionTracker)
  }
}

// ============================================================
// INTERSECTION OBSERVER HELPER
// ============================================================

/**
 * Hook để track khi element visible trong viewport
 * 
 * Usage:
 *   const { ref, isVisible } = useIntersectionTracker()
 *   
 *   <div ref={ref}>
 *     <JobCard onVisible={() => trackView(userId, job.id)} />
 *   </div>
 */
import { useState, useEffect, useRef } from 'react'

export const useIntersectionTracker = (options = {}) => {
  const { threshold = 0.5, rootMargin = '0px' } = options
  const [isVisible, setIsVisible] = useState(false)
  const [hasTracked, setHasTracked] = useState(false)
  const ref = useRef(null)
  
  useEffect(() => {
    const element = ref.current
    if (!element) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked) {
            setIsVisible(true)
            setHasTracked(true)
          } else if (!entry.isIntersecting) {
            setIsVisible(false)
          }
        })
      },
      { threshold, rootMargin }
    )
    
    observer.observe(element)
    
    return () => observer.disconnect()
  }, [threshold, rootMargin, hasTracked])
  
  const reset = () => {
    setIsVisible(false)
    setHasTracked(false)
  }
  
  return { ref, isVisible, hasTracked, reset }
}

export default interactionTracker

/**
 * Feature Flags Configuration
 *
 * Controls which features are enabled/disabled in the application.
 * Feature flags can be toggled via environment variables.
 *
 * Usage in code:
 *   import { featureFlags } from '~/config/features'
 *   if (featureFlags.enableCaching) { ... }
 *
 * Environment variables (.env):
 *   VITE_ENABLE_CACHING=true|false
 *
 * Author: Restart-35
 * Date: 2026-06-01
 */

/**
 * Feature flags object
 *
 * Each flag:
 * - enabled: boolean - whether the feature is active
 * - label: string - human-readable name
 * - description: string - what this feature does
 */
export const featureFlags = {
  /**
   * Enable caching for analysis results.
   */
  enableCaching: import.meta.env.VITE_ENABLE_CACHING !== 'false'
}

/**
 * Check if a feature is enabled
 *
 * @param {string} featureName - Name of the feature flag
 * @returns {boolean} - Whether the feature is enabled
 */
export const isFeatureEnabled = (featureName) => {
  if (!(featureName in featureFlags)) {
    console.warn(`Unknown feature flag: ${featureName}`)
    return false
  }
  return featureFlags[featureName]
}

/**
 * Get all feature flags as an object (for debugging)
 */
export const getAllFeatureFlags = () => ({
  ...featureFlags,
  _timestamp: new Date().toISOString()
})

/**
 * Development helpers
 */
export const featureFlagHelpers = {
  /**
   * Enable all features (for development)
   */
  enableAll: () => {
    Object.keys(featureFlags).forEach(key => {
      if (typeof featureFlags[key] === 'boolean') {
        featureFlags[key] = true
      }
    })
  },

  /**
   * Disable all features (for testing)
   */
  disableAll: () => {
    Object.keys(featureFlags).forEach(key => {
      if (typeof featureFlags[key] === 'boolean') {
        featureFlags[key] = false
      }
    })
  }
}

export default featureFlags

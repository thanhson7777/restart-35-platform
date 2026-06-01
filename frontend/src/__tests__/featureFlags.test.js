/**
 * Feature Flags Tests
 *
 * Tests for feature flags configuration and helpers.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { featureFlags, isFeatureEnabled, featureFlagHelpers } from '~/config/features'

describe('Feature Flags', () => {
  describe('featureFlags object', () => {
    it('should have required flags', () => {
      expect(featureFlags).toBeDefined()
      expect(featureFlags.enableCaching).toBeDefined()
      expect(typeof featureFlags.enableCaching).toBe('boolean')
    })
  })

  describe('isFeatureEnabled', () => {
    it('should return true for enabled feature', () => {
      // Default caching should be enabled
      expect(isFeatureEnabled('enableCaching')).toBe(true)
    })

    it('should return false for unknown feature', () => {
      expect(isFeatureEnabled('unknownFeature')).toBe(false)
    })
  })

  describe('featureFlagHelpers', () => {
    it('enableAll should enable all boolean flags', () => {
      featureFlagHelpers.enableAll()
      expect(featureFlags.enableCaching).toBe(true)
    })

    it('disableAll should disable all boolean flags', () => {
      featureFlagHelpers.disableAll()
      expect(featureFlags.enableCaching).toBe(false)
    })
  })
})

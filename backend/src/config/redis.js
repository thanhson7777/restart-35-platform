import Redis from 'ioredis'
import { env } from '~/config/enviroment'

let redisClient = null
let redisAvailable = false

export const connectRedis = async () => {
  if (redisClient) return redisClient

  // Check if Redis is disabled
  if (process.env.REDIS_ENABLED === 'false') {
    console.log('[Redis] Disabled via REDIS_ENABLED=false')
    return null
  }

  const redisConfig = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    retryStrategy: (times) => {
      if (times > 1) {
        // Stop retrying after first failure
        return null
      }
      return 100
    }
  }

  if (env.REDIS_PASSWORD) {
    redisConfig.password = env.REDIS_PASSWORD
  }

  redisClient = new Redis(redisConfig)

  redisClient.on('error', (err) => {
    // Only log first error to avoid spam
    if (!redisAvailable) {
      console.warn('[Redis] Not available:', err.message)
    }
  })

  redisClient.on('connect', () => {
    console.log('[Redis] Connected successfully')
    redisAvailable = true
  })

  try {
    await redisClient.connect()
    await redisClient.ping()
    redisAvailable = true
    console.log('[Redis] Ready to use')
  } catch (error) {
    redisAvailable = false
    console.warn('[Redis] Connection failed - caching disabled, using MongoDB only')
  }

  return redisClient
}

export const getRedis = () => redisClient

export const isRedisAvailable = () => redisAvailable

export const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit()
    } catch (e) {
      // Ignore errors when closing
    }
    redisClient = null
    redisAvailable = false
    console.log('[Redis] Connection closed')
  }
}

// Cache key generators
export const CACHE_KEYS = {
  careerPath: (userId) => `career:path:${userId}`,
  careerTransitions: (userId) => `career:transitions:${userId}`,
  generationStatus: (userId) => `career:status:${userId}`
}

export default redisClient

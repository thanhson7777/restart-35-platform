/* eslint-disable no-console */
import express from 'express'
import http from 'http'
import exitHook from 'async-exit-hook'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { connectRedis, closeRedis, getRedis, isRedisAvailable } from '~/config/redis'
import { env } from './config/enviroment'
import { APIS_V1 } from './routes/v1'
import { errorHandlingMiddleware } from './middlewares/errorHandlingMiddleware'
import { corsOptions } from './config/cors'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { initJobScheduler } from './services/jobScheduler.js'
import { initSocket } from './config/socket'
import { startInterviewCron } from './crons/interviewCron.js'

const START_SERVER = () => {
  const app = express()
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  app.use(cookieParser())
  app.use(cors(corsOptions))

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.use('/v1', APIS_V1)

  // Health check endpoint - check both MongoDB and Redis
  app.get('/health', async (req, res) => {
    const checks = { mongodb: false, redis: false }
    let mongoError = null
    let redisError = null

    // Check MongoDB
    try {
      const db = GET_DB()
      if (db) {
        await db.command({ ping: 1 })
        checks.mongodb = true
      }
    } catch (e) {
      mongoError = e.message
      checks.mongodb = false
    }

    // Check Redis
    try {
      if (isRedisAvailable()) {
        const redisClient = getRedis()
        if (redisClient) {
          await redisClient.ping()
          checks.redis = true
        }
      }
    } catch (e) {
      redisError = e.message
      checks.redis = false
    }

    const healthy = checks.mongodb && checks.redis
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'degraded',
      service: 'backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      checks: {
        mongodb: { status: checks.mongodb ? 'ok' : 'error', error: mongoError },
        redis: { status: checks.redis ? 'ok' : 'error', error: redisError }
      }
    })
  })

  app.use(errorHandlingMiddleware)

  const server = http.createServer(app)
  initSocket(server)

  server.listen(env.LOCAL_DEV_APP_PORT, env.LOCAL_DEV_APP_HOST, () => {
    console.log(`Xin chào ${env.AUTHOR}, Server đang chạy thành công trên cổng: http://${env.LOCAL_DEV_APP_HOST}:${env.LOCAL_DEV_APP_PORT}/ `)
  })

  // clean up trước khi dừng server
  exitHook(() => {
    console.log('Server đang tắt')
    CLOSE_DB()
    closeRedis()
    console.log('Server đã tắt')
  })
}

// Khi kết nối thành công tới database mới chạy server backend lên
(async () => {
  try {
    console.log('Đang kết nối tới mongoDB cloud atlas')
    await CONNECT_DB()
    console.log('Đã kết nối tới mongoDB cloud atlas')

    console.log('Đang kết nối tới Redis...')
    await connectRedis()
    console.log('Đã kết nối tới Redis')

    START_SERVER()

    // Khoi tao job scheduler
    initJobScheduler()

    // Khởi tạo tiến trình chạy ngầm gửi nhắc nhở phỏng vấn
    startInterviewCron()
  } catch (error) {
    console.log(error)
    process.exit(0)
  }
})()

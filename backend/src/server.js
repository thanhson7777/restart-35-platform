/* eslint-disable no-console */
import express from 'express'
import exitHook from 'async-exit-hook'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { env } from './config/enviroment'
import { APIS_V1 } from './routes/v1'
import { errorHandlingMiddleware } from './middlewares/errorHandlingMiddleware'
import { corsOptions } from './config/cors'
import cors from 'cors'
import cookieParser from 'cookie-parser'

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

  app.use(errorHandlingMiddleware)

  app.listen(env.LOCAL_DEV_APP_PORT, env.LOCAL_DEV_APP_HOST, () => {
    console.log(`Xin chào ${env.AUTHOR}, Server đang chạy thành công trên cổng: http://${env.LOCAL_DEV_APP_HOST}:${env.LOCAL_DEV_APP_PORT}/ `)
  })

  // clean up trước khi dừng server
  exitHook(() => {
    console.log('Server đang tắt')
    CLOSE_DB()
    console.log('Server đã tắt')
  })
}

// Khi kết nối thành công tới database mới chạy server backend lên
(async () => {
  try {
    console.log('Đang kết nối tới mongoDB cloud atlas')
    await CONNECT_DB()
    console.log('Đã kêt nối tới mongoDB cloud atlas')
    START_SERVER()
  } catch (error) {
    console.log(error)
    process.exit(0)
  }
})()

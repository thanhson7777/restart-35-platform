import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/enviroment'

export const errorHandlingMiddleware = (err, req, res, next) => {
  // Nếu không có statuscode thì trả về lỗi 500
  if (!err.statusCode) err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  const responseError = {
    statusCode: err.statusCode,
    message: err.message || StatusCodes[err.statusCode],
    stack: err.stack
  }

  // trong môi trường dev thì mới để lại stack trace
  if (env.BUILD_MODE !== 'dev') delete responseError.stack
  // Trả về cho frontend
  res.status(responseError.statusCode).json(responseError)
}

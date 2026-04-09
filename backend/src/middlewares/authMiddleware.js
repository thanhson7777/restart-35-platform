import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/enviroment'
import ApiError from '~/utils/ApiError'
import { jwtProvider } from '~/providers/jwtProvider'
import { USER_ROLE } from '~/utils/constants'

const isAuthorized = async (req, res, next) => {
  const clientAccessToken = req.cookies?.clientAccessToken || req.headers.authorization?.split(' ')[1]
  // console.log('=== Auth Middleware Debug ===')
  // console.log('Token exists:', !!clientAccessToken)
  // console.log('Token value:', clientAccessToken ? clientAccessToken.substring(0, 20) + '...' : 'none')
  // console.log('==============================')
  if (!clientAccessToken) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Không tồn tại token này!'))
    return
  }

  try {
    const accessTokenDecoded = await jwtProvider.verifyToken(clientAccessToken, env.ACCESS_TOKEN_SECRET_SIGNATURE)
    req.jwtDecoded = accessTokenDecoded
    // console.log('Auth passed, user:', accessTokenDecoded)
    next()
  } catch (error) {
    // Nếu access tokenn hết hạn thì trả về lỗi 410
    if (error?.message?.includes('jwt expired')) {
      next(new ApiError(StatusCodes.GONE, 'Cần làm mới token!'))
      return
    }
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized!'))
  }
}

const isAuthorizedAdmin = async (req, res, next) => {
  const clientAccessToken = req.cookies?.clientAccessToken || req.headers.authorization?.split(' ')[1]
  if (!clientAccessToken) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Không tồn tại token này!'))
    return
  }

  try {
    const accessTokenDecoded = await jwtProvider.verifyToken(clientAccessToken, env.ACCESS_TOKEN_SECRET_SIGNATURE)

    if (!accessTokenDecoded || accessTokenDecoded.role !== USER_ROLE.ADMIN) {
      next(new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền truy cập!'))
      return
    }
    req.jwtDecoded = accessTokenDecoded
    next()
  } catch (error) {
    // Nếu access tokenn hết hạn thì trả về lỗi 410
    if (error?.message?.includes('jwt expired')) {
      next(new ApiError(StatusCodes.GONE, 'Cần làm mới token!'))
      return
    }
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized!'))
  }
}

export const authMiddleware = {
  isAuthorized,
  isAuthorizedAdmin
}

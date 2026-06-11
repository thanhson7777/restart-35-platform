import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/enviroment'
import ApiError from '~/utils/ApiError'
import { jwtProvider } from '~/providers/jwtProvider'
import { USER_ROLES } from '~/utils/constants'

const isAuthorized = async (req, res, next) => {
  // console.log('[Auth Middleware] Request URL:', req.originalUrl)
  // console.log('[Auth Middleware] Headers:', req.headers.authorization ? 'Has Authorization' : 'NO Authorization')
  // console.log('[Auth Middleware] Cookies:', req.cookies)

  const clientAccessToken = req.cookies?.clientAccessToken || req.headers.authorization?.split(' ')[1]

  if (!clientAccessToken) {
    // console.log('[Auth Middleware] No token found - rejecting')
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Không tồn tại token này!'))
    return
  }

  console.log('[Auth Middleware] Token found:', clientAccessToken.substring(0, 30) + '...')

  try {
    const accessTokenDecoded = await jwtProvider.verifyToken(clientAccessToken, env.ACCESS_TOKEN_SECRET_SIGNATURE)
    req.user = accessTokenDecoded
    req.jwtDecoded = accessTokenDecoded
    // console.log('[Auth Middleware] Token verified successfully, user:', accessTokenDecoded)
    next()
  } catch (error) {
    // console.log('[Auth Middleware] Token verification failed:', error.message)
    // Nếu access tokenn hết hạn thì trả về lỗi 410
    if (error?.message?.includes('jwt expired')) {
      next(new ApiError(StatusCodes.GONE, 'Cần làm mới token!'))
      return
    }
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized!'))
  }
}

const verifyRoleAccess = async (allowedRoles, req, next) => {
  const clientAccessToken = req.cookies?.clientAccessToken || req.headers.authorization?.split(' ')[1]
  if (!clientAccessToken) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Không tồn tại token này!'))
    return
  }

  try {
    const accessTokenDecoded = await jwtProvider.verifyToken(clientAccessToken, env.ACCESS_TOKEN_SECRET_SIGNATURE)

    if (!accessTokenDecoded || !allowedRoles.includes(accessTokenDecoded.role)) {
      next(new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền truy cập!'))
      return
    }

    req.user = accessTokenDecoded
    req.jwtDecoded = accessTokenDecoded
    next()
  } catch (error) {
    if (error?.message?.includes('jwt expired')) {
      next(new ApiError(StatusCodes.GONE, 'Cần làm mới token!'))
      return
    }
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized!'))
  }
}

const isAuthorizedAdmin = async (req, res, next) => {
  return await verifyRoleAccess([USER_ROLES.ADMIN], req, next)
}

const isAuthorizedNGO = async (req, res, next) => {
  return await verifyRoleAccess([USER_ROLES.NGO], req, next)
}

const isAuthorizedEnterprise = async (req, res, next) => {
  return await verifyRoleAccess([USER_ROLES.ENTERPRISE], req, next)
}

const isAuthorizedTrainer = async (req, res, next) => {
  return await verifyRoleAccess([USER_ROLES.TRAINER], req, next)
}

const isAuthorizedTrainerOrAdmin = async (req, res, next) => {
  return await verifyRoleAccess([USER_ROLES.TRAINER, USER_ROLES.ADMIN], req, next)
}

const isAuthorizedEnterpriseOrAdmin = async (req, res, next) => {
  return await verifyRoleAccess([USER_ROLES.ENTERPRISE, USER_ROLES.ADMIN], req, next)
}

const isAuthorizedEnterpriseOrNGOOrAdmin = async (req, res, next) => {
  return await verifyRoleAccess([USER_ROLES.ENTERPRISE, USER_ROLES.NGO, USER_ROLES.ADMIN], req, next)
}

const isAuthorizedWorker = async (req, res, next) => {
  return await verifyRoleAccess([USER_ROLES.WORKER], req, next)
}

const isAuthorizedWorkerOrAdmin = async (req, res, next) => {
  return await verifyRoleAccess([USER_ROLES.WORKER, USER_ROLES.ADMIN], req, next)
}

export const authMiddleware = {
  isAuthorized,
  isAuthorizedAdmin,
  isAuthorizedNGO,
  isAuthorizedEnterprise,
  isAuthorizedTrainer,
  isAuthorizedTrainerOrAdmin,
  isAuthorizedEnterpriseOrAdmin,
  isAuthorizedEnterpriseOrNGOOrAdmin,
  isAuthorizedWorker,
  isAuthorizedWorkerOrAdmin
}

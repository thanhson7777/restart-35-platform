import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
import ms from 'ms'
import ApiError from '~/utils/ApiError'

const createNew = async (req, res, next) => {
  try {
    const createdUser = await userService.createNew(req.body)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo tài khoản thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
      data: createdUser
    })
  } catch (error) { next(error) }
}

const verifyAccount = async (req, res, next) => {
  try {
    const result = await userService.verifyAccount(req.body)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const login = async (req, res, next) => {
  try {
    const result = await userService.login(req.body)

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const logout = async (req, res, next) => {
  try {
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đăng xuất thành công!',
      loggedOut: true
    })
  } catch (error) { next(error) }
}

const refreshToken = async (req, res, next) => {
  try {
    // Frontend sends refresh token via Authorization: Bearer <token> header
    const clientRefreshToken = req.headers.authorization?.split(' ')[1]
    const result = await userService.verifyToken(clientRefreshToken)
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Làm mới token thành công!',
      data: result
    })
  } catch (error) {
    next(new ApiError(StatusCodes.FORBIDDEN, 'Vui lòng đăng nhập!'))
  }
}

const update = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const reqFile = req.file
    const updatedUser = await userService.update(userId, req.body, reqFile)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật thông tin tài khoản thành công!',
      data: updatedUser
    })
  } catch (error) { next(error) }
}

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, role, isActive, organizationId } = req.query
    const result = await userService.getAdminUsers({ page, limit, role, isActive, organizationId })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách người dùng thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const updateUserStatus = async (req, res, next) => {
  try {
    const userId = req.params.id
    const updateData = req.body

    const result = await userService.updateUserStatus(userId, updateData)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật trạng thái người dùng thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getMe = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const user = await userService.getMe(userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin người dùng thành công',
      data: user
    })
  } catch (error) {
    next(error)
  }
}

const changePassword = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const result = await userService.changePassword(userId, req.body)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đổi mật khẩu thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const updateOrganizationId = async (req, res, next) => {
  try {
    const userId = req.params.id
    const { organizationId } = req.body
    const result = await userService.updateOrganizationId(userId, organizationId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật tổ chức người dùng thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getUserStats = async (req, res, next) => {
  try {
    const stats = await userService.getUserStats()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê người dùng thành công',
      data: stats
    })
  } catch (error) {
    next(error)
  }
}

export const userController = {
  createNew,
  verifyAccount,
  login,
  logout,
  refreshToken,
  update,
  getUsers,
  updateUserStatus,
  changePassword,
  getMe,
  getUserStats,
  updateOrganizationId
}

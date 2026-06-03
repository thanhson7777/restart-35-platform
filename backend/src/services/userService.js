import { userModel } from '~/models/userModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { env } from '~/config/enviroment'
import { jwtProvider } from '~/providers/jwtProvider'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { BrevoProvider } from '~/providers/BrevoProvider'
import { WEBSITE_DOMAIN } from '~/utils/constants'
import { v4 as uuidv4 } from 'uuid'
import { pickUser } from '~/utils/formatter'
import bcryptjs from 'bcryptjs'
import { USER_ROLES } from '~/utils/constants'
import { DEFAULT_PAGE, DEFAULT_ITEM_PER_PAGE } from '~/utils/constants'

const createNew = async (reqBody) => {
  try {
    const existUser = await userModel.findOneByEmail(reqBody.email)
    if (existUser) throw new ApiError(StatusCodes.CONFLICT, 'Email đã tồn tại!')

    const name = reqBody.email.split('@')[0]

    const newUser = {
      email: reqBody.email,
      password: bcryptjs.hashSync(reqBody.password, 10),
      username: name,
      phone: reqBody.phone,
      displayName: name,
      verifyToken: uuidv4(),
      role: USER_ROLES.WORKER
    }

    const createdUser = await userModel.createNew(newUser)
    const getNewUser = await userModel.findOneById(createdUser.insertedId)

    const verificationLink = `${WEBSITE_DOMAIN}/account/verification?email=${getNewUser.email}&token=${getNewUser.verifyToken}`
    const customSubject = 'Restart-35: Xác thực tài khoản của bạn'

    const userName = createdUser.displayName || 'bạn'

    const htmlContent = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.8; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #2563eb; padding: 35px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: 'Arial', sans-serif; letter-spacing: 2px; text-transform: uppercase;">
            Restart-35
          </h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 14px;">Nền tảng hỗ trợ tái hòa nhập và lập nghiệp</p>
        </div>
        <div style="padding: 50px 30px; background-color: #ffffff; text-align: center;">
          <h2 style="color: #2563eb; margin-top: 0; font-size: 22px;">
            Xác thực tài khoản của bạn
          </h2>
          <p style="font-size: 15px; color: #555555; margin-bottom: 25px;">Kính chào <strong>${userName}</strong>,</p>
          <p style="font-size: 15px; color: #555555;">
            Cảm ơn bạn đã đồng hành cùng <strong>Restart-35</strong>.
            Để bắt đầu hành trình tái hòa nhập và lập nghiệp, vui lòng xác thực email của bạn.
          </p>
          <div style="margin: 40px 0;">
            <a href="${verificationLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 36px; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-block; border-radius: 6px;">
              Xác Thực Tài Khoản
            </a>
          </div>
          <p style="font-size: 13px; color: #888888; font-style: italic;">Liên kết này sẽ bảo mật và tự động hết hạn sau 24 giờ.</p>
          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #f0f0f0;">
            <p style="font-size: 13px; color: #888888; margin-bottom: 5px;">Nếu nút bấm không hoạt động, vui lòng truy cập đường dẫn sau:</p>
            <p style="background-color: #fafafa; padding: 15px; word-break: break-all; color: #555555; font-size: 12px; margin: 0;">
              ${verificationLink}
            </p>
          </div>
        </div>
        <div style="background-color: #fafafa; padding: 30px 20px; text-align: center; font-size: 11px; color: #999999; letter-spacing: 0.5px;">
          <p style="margin-bottom: 10px;">Nếu bạn không yêu cầu tạo tài khoản này, xin vui lòng bỏ qua email.</p>
          <p style="margin: 5px 0;">&copy; 2024 Restart-35 Platform.</p>
        </div>
      </div>
      `

    await BrevoProvider.sendEmail(getNewUser.email, customSubject, htmlContent)
    return pickUser(getNewUser)
  } catch (error) { throw error }
}

const verifyAccount = async (reqBody) => {
  try {
    const existUser = await userModel.findOneByEmail(reqBody.email)

    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tài khoản!')
    if (existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Tài khoản đã được kích hoạt từ trước!')
    if (reqBody.token !== existUser.verifyToken) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Token xác thực không hợp lệ!')

    const updateData = {
      isActive: true,
      verifyToken: null
    }

    const updatedUser = await userModel.update(existUser._id, updateData)

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

const login = async (reqBody) => {
  try {
    const existUser = await userModel.findOneByEmail(reqBody.email)
    if (!existUser) throw new ApiError(StatusCodes.UNAUTHORIZED, 'Email hoặc mật khẩu không chính xác!')

    if (!existUser.isActive) throw new ApiError(StatusCodes.FORBIDDEN, 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email!')

    const isMatch = await bcryptjs.compare(reqBody.password, existUser.password)
    if (!isMatch) throw new ApiError(StatusCodes.UNAUTHORIZED, 'Email hoặc mật khẩu không chính xác!')

    const userInfo = {
      _id: existUser._id,
      email: existUser.email,
      role: existUser.role
    }

    const accessToken = await jwtProvider.generateToken(userInfo, env.ACCESS_TOKEN_SECRET_SIGNATURE, env.ACCESS_TOKEN_LIFE)
    const refreshToken = await jwtProvider.generateToken(userInfo, env.REFRESH_TOKEN_SECRET_SIGNATURE, env.REFRESH_TOKEN_LIFE)

    return {
      accessToken,
      refreshToken,
      ...pickUser(existUser)
    }
  } catch (error) { throw error }
}

const verifyToken = async (clientRefreshToken) => {
  try {
    const refreshTokenDecoded = await jwtProvider.verifyToken(clientRefreshToken, env.REFRESH_TOKEN_SECRET_SIGNATURE)

    const existUser = await userModel.findOneById(refreshTokenDecoded._id)
    if (!existUser) throw new ApiError(StatusCodes.UNAUTHORIZED, 'User không tồn tại!')

    const userInfo = {
      _id: existUser._id,
      email: existUser.email,
      role: existUser.role
    }

    const accessToken = await jwtProvider.generateToken(userInfo, env.ACCESS_TOKEN_SECRET_SIGNATURE, env.ACCESS_TOKEN_LIFE)

    return { accessToken }
  } catch (error) { throw error }
}

const update = async (userId, reqBody, reqFile) => {
  try {
    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Tài khoản không tồn tại!')

    const updateData = { ...reqBody }

    if (reqBody.current_password && reqBody.new_password) {
      const isMatch = await bcryptjs.compare(reqBody.current_password, existUser.password)
      if (!isMatch) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Mật khẩu hiện tại không chính xác!')

      updateData.password = bcryptjs.hashSync(reqBody.new_password, 10)

      delete updateData.current_password
      delete updateData.new_password
    }

    if (reqFile) {
      const uploadResult = await CloudinaryProvider.streamUpload(reqFile.buffer, 'user-builMaterial')
      updateData.avatar = uploadResult.secure_url
    }

    if (!reqBody.current_password || !reqBody.new_password) {
      delete updateData.password
    }
    delete updateData.email
    delete updateData.role
    delete updateData.isActive

    const updatedUser = await userModel.update(userId, updateData)

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

const getAdminUsers = async ({ page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, role, isActive, organizationId }) => {
  try {
    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    let matchCondition = { _destroy: false }

    if (role && role !== 'ALL') {
      matchCondition.role = role
    }

    if (isActive !== undefined && isActive !== 'ALL') {
      matchCondition.isActive = isActive === 'true'
    }

    if (organizationId) {
      if (organizationId === 'null' || organizationId === 'none') {
        matchCondition.organizationId = null
      } else {
        matchCondition.organizationId = organizationId
      }
    }

    const { users, totalUsers } = await userModel.getUsers(matchCondition, skip, recordLimit)

    return {
      users,
      pagination: {
        totalRecords: totalUsers,
        totalPages: Math.ceil(totalUsers / recordLimit),
        currentPage: currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

const updateUserStatus = async (userId, updateData) => {
  try {
    const dataToUpdate = {}
    if (updateData.role !== undefined) dataToUpdate.role = updateData.role
    if (updateData.isActive !== undefined) dataToUpdate.isActive = updateData.isActive

    if (Object.keys(dataToUpdate).length === 0) {
      throw new Error('Không có dữ liệu hợp lệ để cập nhật!')
    }

    const updatedUser = await userModel.updateUserStatus(userId, dataToUpdate)

    return updatedUser
  } catch (error) { throw error }
}

const getMe = async (userId) => {
  try {
    const user = await userModel.findOneById(userId)
    if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'Tài khoản không tồn tại!')
    return pickUser(user)
  } catch (error) { throw error }
}

const changePassword = async (userId, reqBody) => {
  try {
    const { currentPassword, newPassword } = reqBody

    if (!currentPassword || !newPassword) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới!')
    }

    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Tài khoản không tồn tại!')

    const isMatch = await bcryptjs.compare(currentPassword, existUser.password)
    if (!isMatch) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Mật khẩu hiện tại không chính xác!')

    if (newPassword.length < 6) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Mật khẩu mới phải có ít nhất 6 ký tự!')
    }

    const updatedUser = await userModel.update(userId, {
      password: bcryptjs.hashSync(newPassword, 10)
    })

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

const getUserStats = async () => {
  try {
    const stats = await userModel.getUserStats()
    return stats
  } catch (error) {
    throw error
  }
}

const updateOrganizationId = async (userId, organizationId) => {
  try {
    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Tài khoản không tồn tại!')

    const updateData = {}
    if (organizationId === null || organizationId === '' || organizationId === undefined) {
      updateData.organizationId = null
    } else {
      const { organizationModel } = await import('~/models/organizationModel')
      const org = await organizationModel.findOneById(organizationId)
      if (!org) throw new ApiError(StatusCodes.NOT_FOUND, 'Tổ chức không tồn tại!')
      updateData.organizationId = organizationId
    }

    const updatedUser = await userModel.update(userId, updateData)
    return updatedUser
  } catch (error) {
    throw error
  }
}

export const userService = {
  createNew,
  verifyAccount,
  login,
  verifyToken,
  update,
  getAdminUsers,
  updateUserStatus,
  changePassword,
  getMe,
  getUserStats,
  updateOrganizationId
}
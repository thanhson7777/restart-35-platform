import { userModel } from '~/models/userModel'
import crypto from 'crypto'
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
import { normalize } from '~/utils/provinceMap'

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
      displayName: reqBody.displayName || name,
      verifyToken: uuidv4(),
      role: reqBody.role || USER_ROLES.WORKER,
      isActive: false,
      adminApprovalStatus: 'approved',
      ...(reqBody.basicInfo && {
        age: reqBody.basicInfo.age,
        gender: reqBody.basicInfo.gender,
        province: normalize(reqBody.basicInfo.province) || '',
        district: reqBody.basicInfo.district || '',
        education: reqBody.basicInfo.education,
        maritalStatus: reqBody.basicInfo.maritalStatus
      })
    }

    if (newUser.age !== undefined && newUser.age !== null && (newUser.age < 35 || newUser.age > 65)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tuổi phải từ 35 đến 65')
    }

    const createdUser = await userModel.createNew(newUser)
    const getNewUser = await userModel.findOneById(createdUser.insertedId)

    const verificationLink = `${WEBSITE_DOMAIN}/account/verification?email=${encodeURIComponent(getNewUser.email)}&token=${encodeURIComponent(getNewUser.verifyToken)}`
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

const partnerRegister = async (reqBody) => {
  try {
    const existUser = await userModel.findOneByEmail(reqBody.email)
    if (existUser) throw new ApiError(StatusCodes.CONFLICT, 'Email đã tồn tại!')

    // Determine organization type from role
    let orgType = 'enterprise'
    if (reqBody.role === USER_ROLES.NGO) orgType = 'ngo'
    if (reqBody.role === USER_ROLES.TRAINER) orgType = 'training_center'

    const { organizationModel } = await import('~/models/organizationModel')

    // Create Organization first
    const newOrg = {
      name: reqBody.organization.name,
      taxCode: reqBody.organization.taxCode,
      address: reqBody.organization.address,
      type: orgType,
      ...(reqBody.organization.trainerType && { trainerType: reqBody.organization.trainerType }),
      ...(reqBody.organization.identityNumber && { identityNumber: reqBody.organization.identityNumber }),
      ...(reqBody.organization.industry && { industry: reqBody.organization.industry }),
      ...(reqBody.organization.size && { size: reqBody.organization.size }),
      ...(reqBody.organization.focusAreas && { focusAreas: reqBody.organization.focusAreas }),
      ...(reqBody.organization.operatingRegions && { operatingRegions: reqBody.organization.operatingRegions }),
      ...(reqBody.organization.trainingCategories && { trainingCategories: reqBody.organization.trainingCategories })
    }
    const createdOrgResult = await organizationModel.createNew(newOrg)
    const orgId = createdOrgResult.insertedId.toString()

    const name = reqBody.email.split('@')[0]

    // Create User
    const newUser = {
      email: reqBody.email,
      password: bcryptjs.hashSync(reqBody.password, 10),
      username: name,
      phone: reqBody.phone,
      displayName: reqBody.displayName || name,
      verifyToken: uuidv4(),
      role: reqBody.role,
      isActive: false, // Must be verified by email and admin
      adminApprovalStatus: 'pending', // Needs admin approval
      organizationId: orgId
    }

    const createdUser = await userModel.createNew(newUser)
    const getNewUser = await userModel.findOneById(createdUser.insertedId)

    const verificationLink = `${WEBSITE_DOMAIN}/account/verification?email=${encodeURIComponent(getNewUser.email)}&token=${encodeURIComponent(getNewUser.verifyToken)}`
    const customSubject = 'Restart-35: Xác nhận đăng ký tài khoản Đối tác'

    const userName = createdUser.displayName || 'bạn'

    const htmlContent = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.8; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #2563eb; padding: 35px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: 'Arial', sans-serif; letter-spacing: 2px; text-transform: uppercase;">
            Restart-35
          </h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 14px;">Hệ thống tài khoản Đối tác</p>
        </div>
        <div style="padding: 50px 30px; background-color: #ffffff; text-align: center;">
          <h2 style="color: #2563eb; margin-top: 0; font-size: 22px;">
            Xác thực email đăng ký Đối tác
          </h2>
          <p style="font-size: 15px; color: #555555; margin-bottom: 25px;">Kính chào <strong>${userName}</strong>,</p>
          <p style="font-size: 15px; color: #555555;">
            Cảm ơn bạn đã đăng ký tài khoản Đối tác trên <strong>Restart-35</strong>.
            Để hoàn tất bước đăng ký ban đầu, vui lòng xác thực email của bạn. Sau đó tài khoản sẽ được Ban quản trị phê duyệt trước khi sử dụng.
          </p>
          <div style="margin: 40px 0;">
            <a href="${verificationLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 36px; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-block; border-radius: 6px;">
              Xác Thực
            </a>
          </div>
          <p style="font-size: 13px; color: #888888; font-style: italic;">Liên kết này sẽ bảo mật và tự động hết hạn sau 24 giờ.</p>
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
      isActive: existUser.adminApprovalStatus === 'approved', // Only activate if admin already approved (or if worker)
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

    if (!existUser.isActive) {
      if (existUser.verifyToken) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email!')
      }
      if (existUser.adminApprovalStatus === 'pending') {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Tài khoản của bạn đã xác thực email và đang trong quá trình chờ Admin phê duyệt (dự kiến 1-2 ngày làm việc).')
      }
      if (existUser.adminApprovalStatus === 'rejected') {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Tài khoản của bạn đã bị từ chối phê duyệt. Vui lòng liên hệ Admin để biết thêm chi tiết.')
      }
      throw new ApiError(StatusCodes.FORBIDDEN, 'Tài khoản của bạn hiện đang bị khóa!')
    }

    const isMatch = await bcryptjs.compare(reqBody.password, existUser.password)
    if (!isMatch) throw new ApiError(StatusCodes.UNAUTHORIZED, 'Email hoặc mật khẩu không chính xác!')

    const userInfo = {
      _id: existUser._id,
      email: existUser.email,
      role: existUser.role
    }

    const accessToken = await jwtProvider.generateToken(userInfo, env.ACCESS_TOKEN_SECRET_SIGNATURE, env.ACCESS_TOKEN_LIFE)
    const refreshToken = await jwtProvider.generateToken(userInfo, env.REFRESH_TOKEN_SECRET_SIGNATURE, env.REFRESH_TOKEN_LIFE)

    await userModel.update(existUser._id, { lastLoginAt: Date.now() })

    if (existUser.organizationId) {
      const { organizationModel } = await import('~/models/organizationModel')
      const org = await organizationModel.findOneById(existUser.organizationId)
      if (org) {
        existUser.organization = org
      }
    }

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

    if (updatedUser && updatedUser.organizationId) {
      const { organizationModel } = await import('~/models/organizationModel')
      const org = await organizationModel.findOneById(updatedUser.organizationId)
      if (org) {
        updatedUser.organization = org
      }
    }

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

const getPublicTrainers = async ({ page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE }) => {
  try {
    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const { users, totalUsers } = await userModel.getPublicTrainers(skip, recordLimit)

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
    if (updateData.adminApprovalStatus !== undefined) dataToUpdate.adminApprovalStatus = updateData.adminApprovalStatus

    if (Object.keys(dataToUpdate).length === 0) {
      throw new Error('Không có dữ liệu hợp lệ để cập nhật!')
    }

    const user = await userModel.findOneById(userId)
    if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')

    // Handle admin approval status email sending
    if (dataToUpdate.adminApprovalStatus && dataToUpdate.adminApprovalStatus !== user.adminApprovalStatus) {
      if (dataToUpdate.adminApprovalStatus === 'approved') {
        dataToUpdate.isActive = true // Activate user when approved
        
        // Cấp gói Free mặc định cho tổ chức nếu chưa có gói
        if (user.organizationId) {
          try {
            const { servicePackageModel } = await import('~/models/servicePackageModel')
            const { servicePackageService } = await import('~/services/servicePackageService')
            const { organizationModel } = await import('~/models/organizationModel')
            
            const org = await organizationModel.findOneById(user.organizationId)
            // Nếu tổ chức chưa được áp dụng gói nào
            if (org && !org.currentPackageId) {
              const activePackages = await servicePackageModel.findAll(false)
              const freePackage = activePackages.find(p => p.price === 0)
              if (freePackage) {
                await servicePackageService.applyPackageToOrganization(String(user.organizationId), freePackage)
              }
            }
          } catch (err) {
            console.error('Lỗi khi cấp gói Free mặc định:', err)
          }
        }

        // Send approval email
        const approvalSubject = 'Restart-35: Chúc mừng! Tài khoản của bạn đã được phê duyệt 🎉'
        const approvalHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">Chào ${user.displayName || 'bạn'},</h2>
            <p>Tuyệt vời! Hồ sơ Đối tác của bạn đã được Admin xác thực thành công.</p>
            <p>Giờ đây bạn đã có thể đăng nhập vào nền tảng và bắt đầu sử dụng các tính năng dành cho Đối tác.</p>
            <div style="margin: 30px 0;">
              <a href="${WEBSITE_DOMAIN}/login" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Đăng nhập ngay</a>
            </div>
            <p>Trân trọng,<br>Ban quản trị Restart-35</p>
          </div>
        `
        BrevoProvider.sendEmail(user.email, approvalSubject, approvalHtml).catch(console.error)

      } else if (dataToUpdate.adminApprovalStatus === 'rejected') {
        dataToUpdate.isActive = false // Deactivate user
        
        // Send rejection email
        const rejectSubject = 'Restart-35: Cập nhật yêu cầu xác thực tài khoản ⚠️'
        const rejectHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #ea580c;">Chào ${user.displayName || 'bạn'},</h2>
            <p>Cảm ơn bạn đã gửi thông tin đăng ký Đối tác trên hệ thống Restart-35.</p>
            <p>Tuy nhiên, chúng tôi chưa thể phê duyệt hồ sơ của bạn lúc này. Vui lòng kiểm tra lại thông tin tổ chức/giấy tờ liên quan và liên hệ với chúng tôi để được hỗ trợ thêm.</p>
            <p>Trân trọng,<br>Ban quản trị Restart-35</p>
          </div>
        `
        BrevoProvider.sendEmail(user.email, rejectSubject, rejectHtml).catch(console.error)
      }
    }

    const updatedUser = await userModel.updateUserStatus(userId, dataToUpdate)

    return updatedUser
  } catch (error) { throw error }
}

const getMe = async (userId) => {
  try {
    const user = await userModel.findOneById(userId)
    if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'Tài khoản không tồn tại!')
    if (user.organizationId) {
      const { organizationModel } = await import('~/models/organizationModel')
      const org = await organizationModel.findOneById(user.organizationId)
      if (org) {
        user.organization = org
      }
    }
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

const forgotPassword = async (email) => {
  try {
    const user = await userModel.findOneByEmail(email)
    if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tài khoản với email này!')

    // Create reset token
    const resetToken = crypto.randomBytes(20).toString('hex')

    // Hash token to save in DB for security
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    // Set expire (15 minutes)
    const resetPasswordExpire = Date.now() + 15 * 60 * 1000

    await userModel.update(user._id, {
      resetPasswordToken,
      resetPasswordExpire
    })

    const resetUrl = `${WEBSITE_DOMAIN}/reset-password/${resetToken}`
    const customSubject = 'Restart-35: Yêu cầu đặt lại mật khẩu'
    const userName = user.displayName || 'bạn'

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.8; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #2563eb; padding: 35px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: 'Arial', sans-serif; letter-spacing: 2px; text-transform: uppercase;">
            Restart-35
          </h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 14px;">Khôi phục mật khẩu</p>
        </div>
        <div style="padding: 50px 30px; background-color: #ffffff; text-align: center;">
          <h2 style="color: #2563eb; margin-top: 0; font-size: 22px;">
            Yêu cầu đặt lại mật khẩu
          </h2>
          <p style="font-size: 15px; color: #555555; margin-bottom: 25px;">Kính chào <strong>${userName}</strong>,</p>
          <p style="font-size: 15px; color: #555555;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn trên <strong>Restart-35</strong>.
            Nếu bạn đã yêu cầu điều này, vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu.
          </p>
          <div style="margin: 40px 0;">
            <a href="${resetUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 36px; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-block; border-radius: 6px;">
              Đặt Lại Mật Khẩu
            </a>
          </div>
          <p style="font-size: 13px; color: #888888; font-style: italic;">Liên kết này sẽ tự động hết hạn sau 15 phút vì lý do bảo mật.</p>
          <p style="font-size: 13px; color: #888888; font-style: italic;">Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
      </div>
    `

    await BrevoProvider.sendEmail(user.email, customSubject, htmlContent)
    return { message: 'Đã gửi email khôi phục mật khẩu!' }
  } catch (error) { throw error }
}

const resetPassword = async (resetToken, newPassword) => {
  try {
    // Hash token to compare with DB
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    const user = await userModel.findOneByResetToken(resetPasswordToken)
    if (!user) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Token không hợp lệ hoặc đã hết hạn!')
    }

    if (newPassword.length < 6) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Mật khẩu mới phải có ít nhất 6 ký tự!')
    }

    const newHashedPassword = bcryptjs.hashSync(newPassword, 10)

    await userModel.update(user._id, {
      password: newHashedPassword,
      resetPasswordToken: null,
      resetPasswordExpire: null
    })

    return { message: 'Đặt lại mật khẩu thành công!' }
  } catch (error) { throw error }
}

export const userService = {
  createNew,
  partnerRegister,
  verifyAccount,
  login,
  verifyToken,
  update,
  getAdminUsers,
  getPublicTrainers,
  updateUserStatus,
  changePassword,
  getMe,
  getUserStats,
  updateOrganizationId,
  forgotPassword,
  resetPassword
}
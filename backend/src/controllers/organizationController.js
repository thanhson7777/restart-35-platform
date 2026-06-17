import { organizationService } from '~/services/organizationService'
import { userModel } from '~/models/userModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

// ============ CREATE ============
const createOrganization = async (req, res, next) => {
  try {
    const adminId = req.user._id.toString()
    const organization = await organizationService.createOrganization(adminId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo tổ chức thành công!',
      data: organization
    })
  } catch (error) {
    next(error)
  }
}

// ============ READ ============
const getOrganizations = async (req, res, next) => {
  try {
    const result = await organizationService.getOrganizations(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách tổ chức thành công!',
      data: result.organizations,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

const getOrganizationById = async (req, res, next) => {
  try {
    const { id } = req.params

    // Check permission
    const currentUser = await userModel.findOneById(req.user._id)
    if (req.user.role !== 'admin' && currentUser?.organizationId?.toString() !== id) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền truy cập tổ chức này!')
    }

    const organization = await organizationService.getOrganizationById(id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin tổ chức thành công!',
      data: organization
    })
  } catch (error) {
    next(error)
  }
}

// ============ UPDATE ============
const updateOrganization = async (req, res, next) => {
  try {
    const { id } = req.params
    const adminId = req.user._id.toString()

    // Check permission
    const currentUser = await userModel.findOneById(req.user._id)
    if (req.user.role !== 'admin' && currentUser?.organizationId?.toString() !== id) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền cập nhật tổ chức này!')
    }

    const organization = await organizationService.updateOrganization(id, adminId, req.body)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật tổ chức thành công!',
      data: organization
    })
  } catch (error) {
    next(error)
  }
}

// ============ DELETE ============
const deleteOrganization = async (req, res, next) => {
  try {
    const { id } = req.params
    const adminId = req.user._id.toString()
    await organizationService.deleteOrganization(id, adminId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xóa tổ chức thành công!'
    })
  } catch (error) {
    next(error)
  }
}

// ============ MEMBERS ============
const getOrganizationMembers = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await organizationService.getOrganizationMembers(id, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách thành viên thành công!',
      data: result.members,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

// ============ QUOTA ============
const getOrganizationQuota = async (req, res, next) => {
  try {
    const { id } = req.params
    const quotaInfo = await organizationService.getOrganizationQuota(id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy quota tổ chức thành công!',
      data: quotaInfo
    })
  } catch (error) {
    next(error)
  }
}

const updateOrganizationQuota = async (req, res, next) => {
  try {
    const { id } = req.params
    const adminId = req.user._id.toString()
    const { quota } = req.body
    const organization = await organizationService.updateOrganizationQuota(id, adminId, quota)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật quota tổ chức thành công!',
      data: organization
    })
  } catch (error) {
    next(error)
  }
}

export const organizationController = {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
  getOrganizationQuota,
  updateOrganizationQuota
}

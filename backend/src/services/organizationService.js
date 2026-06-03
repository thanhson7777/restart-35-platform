import { organizationModel } from '~/models/organizationModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE
} from '~/utils/constants'

// ============ CREATE ============
const createOrganization = async (adminId, data) => {
  try {
    const organizationData = {
      ...data
    }
    const result = await organizationModel.createNew(organizationData)
    const organization = await organizationModel.findOneById(result.insertedId)
    return organization
  } catch (error) {
    throw error
  }
}

// ============ READ ============
const getOrganizations = async (query) => {
  try {
    const {
      page = DEFAULT_PAGE,
      item_per_page = DEFAULT_ITEM_PER_PAGE,
      type,
      search
    } = query

    const skip = (page - 1) * item_per_page
    const limit = parseInt(item_per_page)

    const matchCondition = { _destroy: false }

    if (type) {
      matchCondition.type = type
    }

    if (search) {
      matchCondition.$or = [
        { name: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } }
      ]
    }

    const result = await organizationModel.findByPaginate(matchCondition, skip, limit)

    return {
      organizations: result.organizations,
      pagination: {
        page: parseInt(page),
        item_per_page: limit,
        total: result.totalOrganizations,
        total_pages: Math.ceil(result.totalOrganizations / limit)
      }
    }
  } catch (error) {
    throw error
  }
}

const getOrganizationById = async (id) => {
  try {
    const organization = await organizationModel.findOneById(id)
    if (!organization) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tổ chức không tồn tại!')
    }
    const memberCount = await organizationModel.countMembers(id)
    return {
      ...organization,
      memberCount
    }
  } catch (error) {
    throw error
  }
}

// ============ UPDATE ============
const updateOrganization = async (id, adminId, data) => {
  try {
    const organization = await organizationModel.findOneById(id)
    if (!organization) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tổ chức không tồn tại!')
    }

    const updatedOrganization = await organizationModel.update(id, data)
    return updatedOrganization
  } catch (error) {
    throw error
  }
}

// ============ DELETE ============
const deleteOrganization = async (id, adminId) => {
  try {
    const organization = await organizationModel.findOneById(id)
    if (!organization) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tổ chức không tồn tại!')
    }

    await organizationModel.softDelete(id)
    return { deletedId: id }
  } catch (error) {
    throw error
  }
}

// ============ MEMBERS ============
const getOrganizationMembers = async (id, query) => {
  try {
    const organization = await organizationModel.findOneById(id)
    if (!organization) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tổ chức không tồn tại!')
    }

    const { page = DEFAULT_PAGE, item_per_page = DEFAULT_ITEM_PER_PAGE } = query
    const skip = (page - 1) * item_per_page
    const limit = parseInt(item_per_page)

    const { GET_DB } = await import('~/config/mongodb')
    const { ObjectId } = await import('mongodb')

    const db = await GET_DB()
    const [members, totalMembers] = await Promise.all([
      db.collection('users')
        .find(
          { organizationId: new ObjectId(String(id)), _destroy: false },
          { projection: { password: 0 } }
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('users').countDocuments({
        organizationId: new ObjectId(String(id)),
        _destroy: false
      })
    ])

    return {
      members,
      pagination: {
        page: parseInt(page),
        item_per_page: limit,
        total: totalMembers,
        total_pages: Math.ceil(totalMembers / limit)
      }
    }
  } catch (error) {
    throw error
  }
}

// ============ QUOTA ============
const getOrganizationQuota = async (id) => {
  try {
    const organization = await organizationModel.findOneById(id)
    if (!organization) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tổ chức không tồn tại!')
    }
    return {
      quota: organization.quota,
      used: organization.usedQuota || 0,
      remaining: organization.quota - (organization.usedQuota || 0)
    }
  } catch (error) {
    throw error
  }
}

const updateOrganizationQuota = async (id, adminId, newQuota) => {
  try {
    const organization = await organizationModel.findOneById(id)
    if (!organization) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tổ chức không tồn tại!')
    }

    const updatedOrganization = await organizationModel.update(id, { quota: newQuota })
    return updatedOrganization
  } catch (error) {
    throw error
  }
}

export const organizationService = {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
  getOrganizationQuota,
  updateOrganizationQuota
}

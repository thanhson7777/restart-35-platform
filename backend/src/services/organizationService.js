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

    try {
      const { servicePackageModel } = await import('~/models/servicePackageModel')
      const { servicePackageService } = await import('~/services/servicePackageService')
      const activePackages = await servicePackageModel.findAll(false)
      const freePackage = activePackages.find(p => p.price === 0)
      if (freePackage) {
        await servicePackageService.applyPackageToOrganization(String(organization._id), freePackage)
      }
    } catch (err) {
      console.error('Lỗi khi cấp gói Free mặc định cho tổ chức:', err)
    }

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

    const { GET_DB } = await import('~/config/mongodb')
    const db = await GET_DB()
    const pipeline = []
    
    if (matchCondition.type || matchCondition.$or) {
      pipeline.push({ $match: matchCondition })
    } else {
      pipeline.push({ $match: { _destroy: false } })
    }

    // Join users to calculate memberCount and status
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          let: { orgId: { $toString: '$_id' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$organizationId', '$$orgId'] } } }
          ],
          as: 'members'
        }
      },
      {
        $addFields: {
          memberCount: {
            $size: {
              $filter: {
                input: '$members',
                as: 'member',
                cond: { $eq: ['$$member._destroy', false] }
              }
            }
          },
          ownerId: {
            $let: {
              vars: {
                owner: { $arrayElemAt: ['$members', 0] }
              },
              in: '$$owner._id'
            }
          },
          ownerEmail: {
            $let: {
              vars: {
                owner: { $arrayElemAt: ['$members', 0] }
              },
              in: '$$owner.email'
            }
          },
          status: {
            $let: {
              vars: {
                owner: { $arrayElemAt: ['$members', 0] }
              },
              in: {
                $cond: {
                  if: { $not: ['$$owner'] },
                  then: 'active', // fallback if no owner
                  else: {
                    $cond: {
                      if: { $eq: ['$$owner.adminApprovalStatus', 'pending'] },
                      then: 'pending',
                      else: {
                        $cond: {
                          if: { $eq: ['$$owner.isActive', false] },
                          then: 'inactive',
                          else: 'active'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    )

    // Apply status filter if provided
    if (query.status) {
      pipeline.push({ $match: { status: query.status } })
    }

    // Sorting
    const sortField = query.sortBy || 'createdAt'
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1
    pipeline.push({ $sort: { [sortField]: sortDirection } })

    // Pagination using $facet
    pipeline.push(
      {
        $facet: {
          metadata: [ { $count: "total" } ],
          data: [ 
            { $skip: skip }, 
            { $limit: limit }, 
            { $project: { members: 0 } } 
          ]
        }
      }
    )

    const [result] = await db.collection('organizations').aggregate(pipeline).toArray()
    const totalCountResult = result?.metadata?.[0]?.total || 0
    const organizations = result?.data || []

    return {
      organizations,
      pagination: {
        page: parseInt(page),
        item_per_page: limit,
        total: totalCountResult,
        total_pages: Math.ceil(totalCountResult / limit)
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

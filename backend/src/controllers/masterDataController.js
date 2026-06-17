import { StatusCodes } from 'http-status-codes'
import { masterDataModel } from '~/models/masterDataModel'

const createNew = async (req, res, next) => {
  try {
    const createdData = await masterDataModel.createNew(req.body)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo master data thành công',
      data: createdData
    })
  } catch (error) {
    next(error)
  }
}

const getByType = async (req, res, next) => {
  try {
    const { type } = req.query
    if (!type) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Thiếu tham số type'
      })
    }
    const data = await masterDataModel.findByType(type)
    res.status(StatusCodes.OK).json({
      success: true,
      data
    })
  } catch (error) {
    next(error)
  }
}

const getAllForAdmin = async (req, res, next) => {
  try {
    const data = await masterDataModel.findAllForAdmin()
    res.status(StatusCodes.OK).json({
      success: true,
      data
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const { id } = req.params
    const updatedData = await masterDataModel.update(id, req.body)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật master data thành công',
      data: updatedData
    })
  } catch (error) {
    next(error)
  }
}

const deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params
    await masterDataModel.deleteItem(id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xóa master data thành công'
    })
  } catch (error) {
    next(error)
  }
}

export const masterDataController = {
  createNew,
  getByType,
  getAllForAdmin,
  update,
  deleteItem
}

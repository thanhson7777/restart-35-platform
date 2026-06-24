import { contactService } from '~/services/contactService'
import { StatusCodes } from 'http-status-codes'

const createContact = async (req, res, next) => {
  try {
    await contactService.createContact(req.body)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Gửi liên hệ thành công! Chúng tôi sẽ phản hồi trong 24 giờ.'
    })
  } catch (error) {
    next(error)
  }
}

const getContacts = async (req, res, next) => {
  try {
    const result = await contactService.getContacts(req.query)
    res.status(StatusCodes.OK).json({
      success: true,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const markReplied = async (req, res, next) => {
  try {
    await contactService.markReplied(req.params.id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã đánh dấu phản hồi liên hệ'
    })
  } catch (error) {
    next(error)
  }
}

export const contactController = {
  createContact,
  getContacts,
  markReplied
}

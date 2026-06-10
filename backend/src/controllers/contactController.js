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

export const contactController = {
  createContact
}

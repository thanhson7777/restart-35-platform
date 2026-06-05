import { videoNoteService } from '~/services/videoNoteService'
import { StatusCodes } from 'http-status-codes'

const createVideoNote = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const note = await videoNoteService.createVideoNote(userId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo ghi chú thành công!',
      data: note
    })
  } catch (error) {
    next(error)
  }
}

const getNotesByEnrollment = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { enrollmentId } = req.params
    const notes = await videoNoteService.getNotesByEnrollment(enrollmentId, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách ghi chú thành công!',
      data: notes
    })
  } catch (error) {
    next(error)
  }
}

const updateVideoNote = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { id } = req.params
    const note = await videoNoteService.updateVideoNote(id, userId, req.body)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật ghi chú thành công!',
      data: note
    })
  } catch (error) {
    next(error)
  }
}

const deleteVideoNote = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { id } = req.params
    await videoNoteService.deleteVideoNote(id, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xóa ghi chú thành công!'
    })
  } catch (error) {
    next(error)
  }
}

export const videoNoteController = {
  createVideoNote,
  getNotesByEnrollment,
  updateVideoNote,
  deleteVideoNote
}

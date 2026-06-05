import { videoNoteModel } from '~/models/videoNoteModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const createVideoNote = async (userId, data) => {
  try {
    const { enrollmentId } = data

    // Verify enrollment exists and belongs to the user
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký học không tồn tại!')
    }
    if (enrollment.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền thêm ghi chú cho đăng ký này!')
    }

    return await videoNoteModel.createNew({
      ...data,
      userId: String(userId)
    })
  } catch (error) {
    throw error
  }
}

const getNotesByEnrollment = async (enrollmentId, userId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký học không tồn tại!')
    }
    if (enrollment.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem ghi chú của đăng ký này!')
    }

    return await videoNoteModel.findByEnrollment(enrollmentId)
  } catch (error) {
    throw error
  }
}

const updateVideoNote = async (noteId, userId, updateData) => {
  try {
    const note = await videoNoteModel.findOneById(noteId)
    if (!note) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Ghi chú không tồn tại!')
    }
    if (note.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền chỉnh sửa ghi chú này!')
    }

    // Only allow updating content, tags, and color
    const allowedUpdates = {
      content: updateData.content,
      tags: updateData.tags,
      color: updateData.color
    }

    return await videoNoteModel.update(noteId, allowedUpdates)
  } catch (error) {
    throw error
  }
}

const deleteVideoNote = async (noteId, userId) => {
  try {
    const note = await videoNoteModel.findOneById(noteId)
    if (!note) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Ghi chú không tồn tại!')
    }
    if (note.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xóa ghi chú này!')
    }

    return await videoNoteModel.deleteNote(noteId)
  } catch (error) {
    throw error
  }
}

export const videoNoteService = {
  createVideoNote,
  getNotesByEnrollment,
  updateVideoNote,
  deleteVideoNote
}

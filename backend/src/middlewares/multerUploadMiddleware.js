import multer from 'multer'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { LIMIT_COMMON_FILE_SIZE, ALLOW_COMMON_FILE_TYPES } from '~/utils/validator'

// Kiểm tra file hợp lệ
const customFileFilter = (req, file, callback) => {
  if (!ALLOW_COMMON_FILE_TYPES.includes(file.mimetype)) {
    const errorMessage = 'File không hợp lệ, chỉ chấp nhận file jpg, jpeg và png'
    return callback(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage), null)
  }

  return callback(null, true)
}

// upload file - dùng memory storage để có buffer
const uploadMulter = multer({
  storage: multer.memoryStorage(),
  limit: { fileSize: LIMIT_COMMON_FILE_SIZE },
  fileFilter: customFileFilter
})

export const multerUploadMiddleware = { uploadMulter }

export const FIELD_REQUIRED_MESSAGE = 'Trường này là bắt buộc.'
export const EMAIL_RULE = /^\S+@\S+\.\S+$/
export const EMAIL_RULE_MESSAGE = 'Email không hợp lệ.'
export const PASSWORD_RULE = /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d\W]{8,256}$/
export const PASSWORD_RULE_MESSAGE = 'Mật khẩu phải bao gồm ít nhất 1 chữ cái, một số và ít nhất 8 ký tự.'
export const PASSWORD_CONFIRMATION_MESSAGE = 'Xác nhận mật khẩu không khớp!'
export const PHONE_RULE = /^[0-9]{10,11}$/
export const PHONE_RULE_MESSAGE = 'Số điện thoại không hợp lệ'

export const LIMIT_COMMON_FILE_SIZE = 10485760 // byte = 10 MB
export const ALLOW_COMMON_FILE_TYPES = ['image/jpg', 'image/jpeg', 'image/png']
export const singleFileValidator = (file) => {
  if (!file || !file.name || !file.size || !file.type) {
    return 'Tệp không thể trống.'
  }
  if (file.size > LIMIT_COMMON_FILE_SIZE) {
    return 'Đã vượt quá kích thước tệp tối đa. (10MB)'
  }
  if (!ALLOW_COMMON_FILE_TYPES.includes(file.type)) {
    return 'Loại tệp không hợp lệ. Chỉ chấp nhận jpg, jpeg và png'
  }
  return null
}
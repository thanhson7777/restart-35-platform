export const LIMIT_COMMON_FILE_SIZE = 10485760
export const ALLOW_COMMON_FILE_TYPES = ['image/jpg', 'image/jpeg', 'image/png']

export const EMAIL_RULE = /^\S+@\S+\.\S+$/
export const EMAIL_RULE_MESSAGE = 'Email không hợp lệ.'
export const PASSWORD_RULE = /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d\W]{8,256}$/
export const PASSWORD_RULE_MESSAGE = 'Mật khẩu phải bao gồm ít nhất 1 chữ cái, một số và ít nhất 8 ký tự.'
export const PASSWORD_CONFIRMATION_MESSAGE = 'Xác nhận mật khẩu không khớp!'

export const OBJECT_ID_RULE = /^[0-9a-fA-F]{24}$/
export const OBJECT_ID_RULE_MESSAGE = 'Chuỗi của bạn không khớp với mẫu ObjectId'

export const PHONE_RULE = /^[0-9]{10,11}$/
export const PHONE_RULE_MESSAGE = 'Số điện thoại không hợp lệ'

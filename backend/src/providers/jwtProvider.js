import JWT from 'jsonwebtoken'

// Tạo một token
const generateToken = async (userInfo, secrectSignature, tokenLife) => {
  try {
    return JWT.sign(userInfo, secrectSignature, { algorithm: 'HS256', expiresIn: tokenLife })
  } catch (error) { throw new Error(error) }
}

// Kiểm tra token hợp lệ
const verifyToken = async (token, secrectSignature) => {
  try {
    return JWT.verify(token, secrectSignature)
  } catch (error) { throw new Error(error) }
}

export const jwtProvider = {
  generateToken,
  verifyToken
}

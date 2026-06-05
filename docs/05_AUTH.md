# 05. Authentication & JWT

> **Cập nhật:** 2026-04-10

## 6.1 Token

| Token | Thời hạn | Lưu trữ | Mô tả |
|-------|-----------|---------|-------|
| **Access Token** | 15 phút | Client (localStorage) | Gửi qua `Authorization: Bearer <token>` |
| **Refresh Token** | 14 ngày | HTTPOnly Cookie | Tự động gửi kèm request |

**Algorithm:** HS256

**Payload:**
```javascript
{
  _id: "user_id_string",
  email: "user@example.com",
  role: "worker" | "admin"
}
```

---

## 6.2 Middleware

```javascript
// Kiểm tra token
authMiddleware.isAuthorized  // → req.user = { _id, email, role }

// Kiểm tra token + Admin role
authMiddleware.isAuthorizedAdmin

// Kiểm tra token + Worker role
authMiddleware.isAuthorizedWorker
```

---

## 6.3 Error codes

| Code | Ý nghĩa | Xử lý |
|------|---------|-------|
| `401` | Không có token / Token không hợp lệ | Redirect to login |
| `403` | Không có quyền (sai role) | Hiển thị "Không có quyền truy cập" |
| `409` | Trùng lặp (VD: hồ sơ đã tồn tại) | Thông báo cho user |
| `410` | Token hết hạn (cần refresh) | Tự động gọi refresh_token |

---

## 6.4 Auth Flow

### 6.4.1 Đăng ký

```
1. User gửi POST /v1/auth/register { email, password, username, role }
2. Backend tạo user với isActive: false
3. Backend gửi email xác thực với verifyToken
4. User click link → PUT /v1/auth/verify { verifyToken }
5. Backend set isActive: true, xóa verifyToken
```

### 6.4.2 Đăng nhập

```
1. User gửi POST /v1/auth/login { email, password }
2. Backend verify password → tạo accessToken + refreshToken
3. Backend set refreshToken vào HTTPOnly cookie
4. Backend trả accessToken về client
5. Client lưu accessToken vào localStorage
```

### 6.4.3 Refresh Token

```
1. AccessToken hết hạn (401)
2. Client tự động gọi GET /v1/auth/refresh_token
3. Backend đọc refreshToken từ cookie
4. Backend tạo accessToken mới
5. Backend trả accessToken mới
```

---

## 6.5 JWT Provider

```javascript
// backend/src/providers/jwtProvider.js

const generateAccessToken = (payload, expiresIn = '15m') => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn })
}

const generateRefreshToken = (payload, expiresIn = '14d') => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn })
}

const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET)
}

const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET)
}
```

---

## 6.6 Protected Route Pattern

```javascript
// routes/v1/workerProfileRoute.js
Router.route('/me')
  .get(
    authMiddleware.isAuthorized,                    // 1. Check token
    workerProfileController.getMyProfile            // 2. Xử lý
  )

Router.route('/')
  .get(
    authMiddleware.isAuthorizedAdmin,               // 1. Check token + Admin
    workerProfileController.getAllProfiles          // 2. Xử lý
  )
```

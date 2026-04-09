import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUserAPI } from '~/apis'
import Button from '~/components/common/Button'

const RegisterPage = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setLoading(true)

    try {
      await registerUserAPI({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName,
        role: 'worker' // Mặc định là worker
      })
      navigate('/login')
    } catch (err) {
      setError(err?.response?.data?.message || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-6">Đăng ký tài khoản</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Họ và tên
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="w-full h-12 px-4 text-lg rounded-lg border-2 border-gray-300 
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
                           focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full h-12 px-4 text-lg rounded-lg border-2 border-gray-300 
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
                           focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Mật khẩu
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full h-12 px-4 text-lg rounded-lg border-2 border-gray-300 
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
                           focus:outline-none transition-all"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full h-12 px-4 text-lg rounded-lg border-2 border-gray-300 
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
                           focus:outline-none transition-all"
                required
              />
            </div>

            {error && (
              <p className="text-red-600 text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Đăng ký
            </Button>

            <p className="text-center text-gray-600">
              Đã có tài khoản?{' '}
              <a href="/login" className="text-blue-600 hover:underline">
                Đăng nhập
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
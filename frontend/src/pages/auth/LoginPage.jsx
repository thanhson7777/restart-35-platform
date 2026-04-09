import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { loginUserAPI } from '~/redux/user/userSlice'
import Button from '~/components/common/Button'

const LoginPage = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [email, setEmail] = useState('thanhson11052003@gmail.com')
  const [password, setPassword] = useState('12345678a')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await dispatch(loginUserAPI({ email, password })).unwrap()
      navigate('/profile/create')
    } catch (err) {
      setError(err || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-6">Đăng nhập</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              Đăng nhập
            </Button>
          </form>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Demo:</strong><br />
              Email: thanhson11052003@gmail.com<br />
              Mật khẩu: 12345678a
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { PASSWORD_RULE, PASSWORD_RULE_MESSAGE } from '~/utils/validators'
import { publicAxiosInstance } from '~/utils/authorizeAxios'

const RestartIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
    <path d="M24 8C24 8 16 16 16 24C16 32 24 40 24 40C24 40 32 32 32 24C32 16 24 8 24 8Z" fill="currentColor" opacity="0.2" />
    <path d="M24 12C24 12 18 18 18 24C18 30 24 36 24 36C24 36 30 30 30 24C30 18 24 12 24 12Z" stroke="currentColor" strokeWidth="2" />
    <circle cx="24" cy="24" r="4" fill="currentColor" />
  </svg>
)

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}

function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const validate = () => {
    const newErrors = {}

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc.'
    } else if (!PASSWORD_RULE.test(formData.password)) {
      newErrors.password = PASSWORD_RULE_MESSAGE
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const res = await publicAxiosInstance.post(`/v1/users/reset-password/${token}`, {
        password: formData.password
      })
      
      if (res.data.success) {
        toast.success(res.data.message || 'Đặt lại mật khẩu thành công!')
        navigate('/auth')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-sm border border-border p-8">
        <div className="flex items-center gap-2 justify-center mb-6">
          <RestartIcon className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold text-foreground tracking-tight">RESTART-35</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Đặt lại mật khẩu</h1>
          <p className="text-sm text-muted-foreground">
            Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        <motion.form
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
          onSubmit={handleSubmit}
        >
          <motion.div variants={itemVariants}>
            <Label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
              Mật khẩu mới
            </Label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Nhập mật khẩu mới"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              inputSize="lg"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-foreground">
              Xác nhận mật khẩu
            </Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Nhập lại mật khẩu mới"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              inputSize="lg"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="pt-2">
            <Button
              type="submit"
              isLoading={isLoading}
              size="xl"
              className="w-full"
            >
              Lưu thay đổi
            </Button>
          </motion.div>

          <motion.div variants={itemVariants} className="text-center mt-6">
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline transition-colors"
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Quay lại đăng nhập
            </Link>
          </motion.div>
        </motion.form>
      </div>
    </div>
  )
}

export default ResetPasswordPage

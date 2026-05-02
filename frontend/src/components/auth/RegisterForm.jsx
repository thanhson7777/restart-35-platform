import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { registerUserAPI } from '@/redux/user/userSlice'
import {
  EMAIL_RULE,
  EMAIL_RULE_MESSAGE,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
  PHONE_RULE,
  PHONE_RULE_MESSAGE
} from '~/utils/validators'

const UserIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const MailIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

const PhoneIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 }
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}

const PasswordStrengthIndicator = ({ password }) => {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels = [
    { label: 'Yếu', color: 'bg-destructive' },
    { label: 'Trung bình', color: 'bg-warning' },
    { label: 'Mạnh', color: 'bg-secondary' }
  ]
  const levelIndex = Math.min(Math.floor(score / 2), 2)

  if (!password) return null

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= levelIndex ? levels[levelIndex].color : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${levelIndex === 0 ? 'text-destructive' : levelIndex === 1 ? 'text-warning' : 'text-secondary'}`}>
        {levels[levelIndex].label}
      </p>
    </div>
  )
}

function RegisterForm({ onSwitchTab }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading } = useSelector((state) => state.user)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phone: ''
  })
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  const validate = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc.'
    } else if (!EMAIL_RULE.test(formData.email)) {
      newErrors.email = EMAIL_RULE_MESSAGE
    }

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

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Họ tên là bắt buộc.'
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Họ tên phải có ít nhất 2 ký tự.'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại là bắt buộc.'
    } else if (!PHONE_RULE.test(formData.phone)) {
      newErrors.phone = PHONE_RULE_MESSAGE
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
    setSuccessMessage('')
    if (!validate()) return

    const result = await dispatch(
      registerUserAPI({
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        displayName: formData.displayName
      })
    )

    if (registerUserAPI.fulfilled.match(result)) {
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.')
      setSuccessMessage('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.')
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        phone: ''
      })
      setTimeout(() => onSwitchTab(), 2500)
    } else {
      toast.error(typeof result.payload === 'string' ? result.payload : result.payload?.message || 'Đăng ký thất bại.')
    }
  }

  return (
    <motion.div
      key="register"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-4"
    >
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-sm"
        >
          {successMessage}
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Label htmlFor="displayName" required>
          Họ và tên
        </Label>
        <div className="relative mt-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            id="displayName"
            name="displayName"
            placeholder="Nguyễn Văn A"
            value={formData.displayName}
            onChange={handleChange}
            error={errors.displayName}
            className="pl-10"
            inputSize="lg"
            autoComplete="name"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Label htmlFor="email" required>
          Email
        </Label>
        <div className="relative mt-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <MailIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="email@example.com"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            className="pl-10"
            inputSize="lg"
            autoComplete="email"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Label htmlFor="phone" required>
          Số điện thoại
        </Label>
        <div className="relative mt-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <PhoneIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="0xxxxxxxxx"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            className="pl-10"
            inputSize="lg"
            autoComplete="tel"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Label htmlFor="password" required>
          Mật khẩu
        </Label>
        <div className="mt-1">
          <PasswordInput
            id="password"
            name="password"
            placeholder="Ít nhất 8 ký tự, có chữ và số"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            inputSize="lg"
            autoComplete="new-password"
          />
        </div>
        <PasswordStrengthIndicator password={formData.password} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Label htmlFor="confirmPassword" required>
          Xác nhận mật khẩu
        </Label>
        <div className="mt-1">
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            inputSize="lg"
            autoComplete="new-password"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Button
          type="submit"
          onClick={handleSubmit}
          isLoading={isLoading}
          size="xl"
          className="w-full"
        >
          Tạo tài khoản
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="text-center">
        <p className="text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <button
            type="button"
            onClick={onSwitchTab}
            className="text-primary font-medium hover:underline bg-transparent border-none cursor-pointer p-0"
          >
            Đăng nhập
          </button>
        </p>
      </motion.div>
    </motion.div>
  )
}

export default RegisterForm

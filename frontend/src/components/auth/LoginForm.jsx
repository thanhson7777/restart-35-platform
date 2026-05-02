import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { loginUserAPI, selectCurrentUser } from '@/redux/user/userSlice'
import { EMAIL_RULE, EMAIL_RULE_MESSAGE } from '~/utils/validators'

const MailIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
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

function LoginForm({ onSwitchTab }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading } = useSelector((state) => state.user)

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc.'
    } else if (!EMAIL_RULE.test(formData.email)) {
      newErrors.email = EMAIL_RULE_MESSAGE
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc.'
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

    const result = await dispatch(loginUserAPI(formData))
    if (loginUserAPI.fulfilled.match(result)) {
      toast.success('Đăng nhập thành công!')
      navigate('/')
    } else {
      toast.error(typeof result.payload === 'string' ? result.payload : result.payload?.message || 'Đăng nhập thất bại.')
    }
  }

  return (
    <motion.div
      key="login"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      <motion.div variants={itemVariants}>
        <Label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
          Email
        </Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <MailIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Email của bạn"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            className="pl-10"
            autoComplete="email"
            inputSize="lg"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Mật khẩu
          </Label>
          <Link
            to="/forgot-password"
            className="text-xs text-primary hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          placeholder="Mật khẩu"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          inputSize="lg"
          autoComplete="current-password"
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Button
          type="submit"
          onClick={handleSubmit}
          isLoading={isLoading}
          size="xl"
          className="w-full"
        >
          Đăng nhập
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="text-center">
        <p className="text-sm text-muted-foreground">
          Chưa có tài khoản?{' '}
          <button
            type="button"
            onClick={onSwitchTab}
            className="text-primary font-medium hover:underline bg-transparent border-none cursor-pointer p-0"
          >
            Đăng ký ngay
          </button>
        </p>
      </motion.div>
    </motion.div>
  )
}

export default LoginForm

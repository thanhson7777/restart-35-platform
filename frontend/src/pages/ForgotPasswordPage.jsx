import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { EMAIL_RULE, EMAIL_RULE_MESSAGE } from '~/utils/validators'
import { publicAxiosInstance } from '~/utils/authorizeAxios'

const MailIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

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

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validate = () => {
    let isValid = true
    if (!email.trim()) {
      setError('Email là bắt buộc.')
      isValid = false
    } else if (!EMAIL_RULE.test(email)) {
      setError(EMAIL_RULE_MESSAGE)
      isValid = false
    } else {
      setError('')
    }
    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const res = await publicAxiosInstance.post('/v1/users/forgot-password', { email })
      if (res.data.success) {
        setIsSuccess(true)
        toast.success(res.data.message || 'Đã gửi liên kết khôi phục!')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.')
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Quên mật khẩu</h1>
          <p className="text-sm text-muted-foreground">
            Nhập email đã đăng ký của bạn. Chúng tôi sẽ gửi cho bạn một liên kết để đặt lại mật khẩu.
          </p>
        </div>

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground">Đã gửi email khôi phục</h3>
            <p className="text-sm text-muted-foreground">
              Vui lòng kiểm tra hộp thư đến của bạn tại <strong>{email}</strong> và làm theo hướng dẫn.
            </p>
            <div className="pt-4">
              <Link to="/auth">
                <Button variant="outline" className="w-full">
                  Quay lại đăng nhập
                </Button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.form
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-5"
            onSubmit={handleSubmit}
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
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError('')
                  }}
                  error={error}
                  className="pl-10"
                  autoComplete="email"
                  inputSize="lg"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-2">
              <Button
                type="submit"
                isLoading={isLoading}
                size="xl"
                className="w-full"
              >
                Gửi liên kết khôi phục
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
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordPage

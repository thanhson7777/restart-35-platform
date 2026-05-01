import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthSidebar } from '@/components/auth/AuthSidebar'
import LoginForm from '@/components/auth/LoginForm'
import RegisterForm from '@/components/auth/RegisterForm'
import SocialLogin from '@/components/auth/SocialLogin'
import { clearError } from '@/redux/user/userSlice'

const RestartIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
    <path d="M24 8C24 8 16 16 16 24C16 32 24 40 24 40C24 40 32 32 32 24C32 16 24 8 24 8Z" fill="currentColor" opacity="0.2" />
    <path d="M24 12C24 12 18 18 18 24C18 30 24 36 24 36C24 36 30 30 30 24C30 18 24 12 24 12Z" stroke="currentColor" strokeWidth="2" />
    <circle cx="24" cy="24" r="4" fill="currentColor" />
  </svg>
)

const tabs = [
  { id: 'login', label: 'Đăng nhập' },
  { id: 'register', label: 'Đăng ký' }
]

function AuthPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('login')

  // Global error from Redux
  const { error, isAuthenticated, isLoading } = useSelector((state) => state.user)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  // Clear error when switching tabs
  const handleSwitchTab = (tabId) => {
    if (error) dispatch(clearError())
    setActiveTab(tabId)
  }

  // Form title content per tab
  const formContent = {
    login: {
      title: 'Chào mừng trở lại!',
      subtitle: 'Đăng nhập để tiếp tục hành trình của bạn'
    },
    register: {
      title: 'Tạo tài khoản mới',
      subtitle: 'Tham gia cộng đồng RESTART-35 ngay hôm nay'
    }
  }

  const content = formContent[activeTab]

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex lg:flex-col lg:w-2/5 xl:w-2/5 flex-shrink-0">
        <AuthSidebar />
      </div>

      {/* Right Content */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-8 lg:px-12 py-10 bg-background">
        <div className="w-full max-w-md">

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <RestartIcon className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-foreground tracking-tight">RESTART-35</span>
          </div>

          {/* Tab Navigation */}
          <div className="relative mb-8">
            <div className="flex bg-muted rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSwitchTab(tab.id)}
                  className={`
                    flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative z-10
                    ${activeTab === tab.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground cursor-pointer'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-foreground mb-1.5">
              {content.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {content.subtitle}
            </p>
          </div>

          {/* Global Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="error-banner"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <div className="relative min-h-[340px]">
            <AnimatePresence mode="wait">
              {activeTab === 'login' && (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <LoginForm onSwitchTab={() => handleSwitchTab('register')} />
                </motion.div>
              )}

              {activeTab === 'register' && (
                <motion.div
                  key="register-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <RegisterForm onSwitchTab={() => handleSwitchTab('login')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Social Login */}
          <div className="mt-6 space-y-4">
            <SocialLogin />
          </div>

          {/* Back to home */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              Quay về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage

import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthSidebar } from '@/components/auth/AuthSidebar'
import LoginForm from '@/components/auth/LoginForm'
import RegisterForm from '@/components/auth/RegisterForm'
import { clearError } from '@/redux/user/userSlice'

const RestartIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
    <path d="M24 8C24 8 16 16 16 24C16 32 24 40 24 40C24 40 32 32 32 24C32 16 24 8 24 8Z" fill="currentColor" opacity="0.2" />
    <path d="M24 12C24 12 18 18 18 24C18 30 24 36 24 36C24 36 30 30 30 24C30 18 24 12 24 12Z" stroke="currentColor" strokeWidth="2" />
    <circle cx="24" cy="24" r="4" fill="currentColor" />
  </svg>
)

// ===== Role Selection Step =====
const ROLE_OPTIONS = [
  {
    id: 'worker',
    label: 'Người lao động',
    description: 'Tìm việc làm phù hợp sau tuổi 35',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  },
  {
    id: 'trainer',
    label: 'Huấn luyện viên',
    description: 'Đào tạo và hướng dẫn người lao động',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    )
  },
  {
    id: 'enterprise',
    label: 'Doanh nghiệp',
    description: 'Tuyển dụng và hợp tác cùng RESTART-35',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    )
  },
  {
    id: 'ngo',
    label: 'Tổ chức phi chính phủ',
    description: 'Đồng hành cùng người lao động',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }
]

function RoleSelectionStep({ onSelectRole }) {
  return (
    <motion.div
      key="role-selection"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground">
          Bạn đăng ký với vai trò gì?
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ROLE_OPTIONS.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => onSelectRole(role.id)}
            className="
              flex items-center gap-3 p-4 rounded-xl border border-border
              bg-background hover:bg-muted/50 hover:border-primary/50
              text-left transition-all duration-200 cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            "
          >
            <div className="text-primary flex-shrink-0">{role.icon}</div>
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm">{role.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{role.description}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

const tabs = [
  { id: 'login', label: 'Đăng nhập' },
  { id: 'register', label: 'Đăng ký' }
]

function AuthPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('login')
  const [selectedRole, setSelectedRole] = useState(null)

  // Support redirect after login via query param, e.g. /auth?redirect=/jobs
  const rawRedirect = new URLSearchParams(location.search).get('redirect')
  const redirectAfterLogin = (rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//'))
    ? rawRedirect
    : null

  // Global error from Redux
  const { error, isAuthenticated, isLoading } = useSelector((state) => state.user)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectAfterLogin || '/')
    }
  }, [isAuthenticated, navigate, redirectAfterLogin])

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
                  <LoginForm onSwitchTab={() => handleSwitchTab('register')} redirectAfterLogin={redirectAfterLogin} />
                </motion.div>
              )}

              {activeTab === 'register' && !selectedRole && (
                <RoleSelectionStep onSelectRole={setSelectedRole} />
              )}

              {activeTab === 'register' && selectedRole && (
                <motion.div
                  key="register-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <RegisterForm
                    onSwitchTab={() => handleSwitchTab('login')}
                    selectedRole={selectedRole}
                    onBackToRoleSelection={() => setSelectedRole(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
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

import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import StepIndicator from '@/components/worker-profile/StepIndicator'
import BasicInfoForm from '@/components/worker-profile/BasicInfoForm'
import EmploymentForm from '@/components/worker-profile/EmploymentForm'
import BarriersForm from '@/components/worker-profile/BarriersForm'
import AspirationsForm from '@/components/worker-profile/AspirationsForm'
import {
  fetchMyProfile,
  createProfile,
  selectProfile,
  selectIsLoading,
  selectCurrentStep,
  selectIsCompleted,
  setCurrentStep
} from '@/redux/profile/profileSlice'
import { selectCurrentUser } from '@/redux/user/userSlice'
import { STEP_LABELS } from '~/data/profileData'

const LOGO_ICON = () => (
  <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" />
    <path d="M10 16L14 20L22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const UserIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

function WorkerProfilePage() {
  const dispatch = useDispatch()
  const currentUser = useSelector(selectCurrentUser)
  const profile = useSelector(selectProfile)
  const isLoading = useSelector(selectIsLoading)
  const currentStep = useSelector(selectCurrentStep)
  const isCompleted = useSelector(selectIsCompleted)

  const [activeStep, setActiveStep] = useState(1)

  // Redirect if not logged in
  useEffect(() => {
    if (!currentUser && !isLoading) {
      return
    }
  }, [currentUser, isLoading])

  // Load profile on mount
  useEffect(() => {
    dispatch(fetchMyProfile())
      .unwrap()
      .then((data) => {
        if (!data) {
          dispatch(createProfile())
        }
      })
      .catch(() => {
        // No profile exists, create one
        dispatch(createProfile())
      })
  }, [dispatch])

  // Sync active step with Redux
  useEffect(() => {
    setActiveStep(currentStep || 1)
  }, [currentStep])

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, 4))
  }

  const handlePrev = () => {
    setActiveStep((prev) => Math.max(prev - 1, 1))
    dispatch(setCurrentStep(activeStep - 1))
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return <BasicInfoForm onNext={handleNext} />
      case 2:
        return <EmploymentForm onNext={handleNext} />
      case 3:
        return <BarriersForm onNext={handleNext} />
      case 4:
        return <AspirationsForm />
      default:
        return <BasicInfoForm onNext={handleNext} />
    }
  }

  const getStepTitle = () => {
    return STEP_LABELS[activeStep - 1] || 'Hồ sơ người lao động'
  }

  const getStepDescription = () => {
    const descriptions = [
      'Tuổi, giới tính, địa chỉ, trình độ học vấn',
      'Các công việc đã làm trước đây',
      'Những khó khăn bạn đang gặp phải',
      'Công việc và môi trường bạn mong muốn'
    ]
    return descriptions[activeStep - 1] || ''
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <LOGO_ICON />
            <span>RESTART-35</span>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3">
            {currentUser?.avatar ? (
              <Avatar src={currentUser.avatar} size="sm" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <UserIcon />
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground leading-none">
                {currentUser?.displayName || currentUser?.username || 'Người dùng'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentUser?.email}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-6 sm:py-10 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Page title */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Hồ sơ người lao động
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Hoàn thành hồ sơ để nhận gợi ý việc làm phù hợp
            </p>
          </motion.div>

          {/* Step Indicator */}
          <StepIndicator currentStep={activeStep} isProfileCompleted={isCompleted} />

          {/* Form Card */}
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card variant="elevated" className="shadow-md border border-border/50">
              <CardContent className="p-6 sm:p-8">
                {/* Step header */}
                <div className="mb-6 pb-4 border-b border-border">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                    {getStepTitle()}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getStepDescription()}
                  </p>
                </div>

                {/* Step content */}
                {renderStepContent()}

                {/* Navigation buttons */}
                {activeStep > 1 && (
                  <div className="mt-4 pt-4 border-t border-border flex justify-between">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                      Quay lại
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Help text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-muted-foreground mt-6"
          >
            Thông tin của bạn được bảo mật và chỉ dùng để gợi ý việc làm phù hợp
          </motion.p>
        </div>
      </main>
    </div>
  )
}

export default WorkerProfilePage

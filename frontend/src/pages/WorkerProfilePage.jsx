import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import StepIndicator from '@/components/worker-profile/StepIndicator'
import EmploymentForm from '@/components/worker-profile/EmploymentForm'
import InterestsStep from '@/components/worker-profile/InterestsStep'
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
import { reopenWorkerProfile } from '@/apis/courseApi'
import toast from 'react-hot-toast'

function WorkerProfilePage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
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
        dispatch(createProfile())
      })
  }, [dispatch, currentUser?._id])

  // Sync active step with Redux (offset by 1 since BasicInfo is now step 0)
  useEffect(() => {
    // currentStep from backend is 1=Employment, 2=Interests, 3=Barriers, 4=Aspirations
    // activeStep in UI is 1, 2, 3, 4
    setActiveStep(currentStep || 1)
  }, [currentStep])

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, 4))
  }

  const handlePrev = () => {
    setActiveStep((prev) => Math.max(prev - 1, 1))
  }

  const renderStepContent = () => {
    // Hiển thị loading khi đang fetch profile
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      )
    }

    switch (activeStep) {
      case 1:
        return <EmploymentForm onNext={handleNext} />
      case 2:
        return <InterestsStep onNext={handleNext} />
      case 3:
        return <BarriersForm onNext={handleNext} />
      case 4:
        return <AspirationsForm />
      default:
        return <EmploymentForm onNext={handleNext} />
    }
  }

  const getStepTitle = () => {
    return STEP_LABELS[activeStep - 1] || 'Hồ sơ người lao động'
  }

  const getStepDescription = () => {
    const descriptions = [
      'Các công việc đã làm trước đây',
      'Sở thích và đam mê của bạn',
      'Những khó khăn bạn đang gặp phải',
      'Công việc và môi trường bạn mong muốn'
    ]
    return descriptions[activeStep - 1] || ''
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-blue-50 flex flex-col">
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
          <StepIndicator currentStep={activeStep} totalSteps={4} isProfileCompleted={isCompleted} />

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
                <div className="mt-4 pt-4 border-t border-border flex justify-between">
                  {/* Back button */}
                  {activeStep > 1 && (
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
                  )}

                  {/* Back to results - chỉ hiện khi đã hoàn thành */}
                  {isCompleted && (
                    <button
                      type="button"
                      onClick={() => navigate('/results')}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors ml-auto"
                    >
                      Xem kết quả
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Reopen Profile Banner */}
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl"
            >
              <p className="text-sm text-blue-700 mb-3">
                Hồ sơ của bạn đã hoàn thành. Bạn có thể mở lại để chỉnh sửa thông tin.
              </p>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                onClick={async () => {
                  try {
                    await reopenWorkerProfile();
                    toast.success('Đã mở lại hồ sơ để chỉnh sửa');
                    dispatch(fetchMyProfile());
                  } catch (error) {
                    toast.error(error?.response?.data?.message || 'Không thể mở lại hồ sơ');
                  }
                }}
              >
                Chỉnh sửa hồ sơ
              </button>
            </motion.div>
          )}

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

import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import ProgressBar from '~/components/common/ProgressBar'
import Button from '~/components/common/Button'
import StepBasicInfo from './StepBasicInfo'
import StepEmployment from './StepEmployment'
import StepBarriers from './StepBarriers'
import StepAspirations from './StepAspirations'
import {
  setCurrentStep,
  updateFormData,
  autosave,
  saveStep,
  completeProfile,
  fetchMyProfile,
  createProfile,
  selectCurrentStep,
  selectFormData,
  selectIsSaving,
  selectLastSavedAt,
  selectErrors,
  clearStepErrors
} from '~/redux/profile/profileSlice'
import { STEP_LABELS, STEP_DESCRIPTIONS } from '~/data/profileData'

const TOTAL_STEPS = 4
const AUTOSAVE_DELAY = 1000 // 1 second debounce

const MultiStepForm = ({ onComplete }) => {
  const dispatch = useDispatch()
  const currentStep = useSelector(selectCurrentStep)
  const formData = useSelector(selectFormData)
  const isSaving = useSelector(selectIsSaving)
  const lastSavedAt = useSelector(selectLastSavedAt)
  const errors = useSelector(selectErrors)

  const [localErrors, setLocalErrors] = useState({})
  const [isInitialized, setIsInitialized] = useState(false)

  const formRef = useRef(null)
  const autosaveTimerRef = useRef(null)
  const stepRef = useRef(null)

  // Initialize: fetch existing profile or create new one
  useEffect(() => {
    const init = async () => {
      try {
        const result = await dispatch(fetchMyProfile()).unwrap()
        setIsInitialized(true)
      } catch (error) {
        // Profile doesn't exist, that's okay
        setIsInitialized(true)
      }
    }
    init()
  }, [dispatch])

  // Autosave effect with debounce
  const triggerAutosave = useCallback((step, data) => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = setTimeout(() => {
      dispatch(autosave({ step, data }))
    }, AUTOSAVE_DELAY)
  }, [dispatch])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [])

  // Autofocus & scroll when step changes
  useEffect(() => {
    if (stepRef.current) {
      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' })

      // Focus first input
      const firstInput = stepRef.current.querySelector('input, select, textarea')
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100)
      }
    }
  }, [currentStep])

  const getStepData = () => {
    switch (currentStep) {
      case 1: return formData.basicInfo
      case 2: return formData.employmentHistory
      case 3: return formData.barriers
      case 4: return formData.aspirations
      default: return {}
    }
  }

  const handleStepDataChange = (data) => {
    dispatch(updateFormData({ step: currentStep, data }))
    setLocalErrors({})
    dispatch(clearStepErrors())

    // Trigger autosave
    triggerAutosave(currentStep, data)
  }

  const validateStep = () => {
    const data = getStepData()
    const newErrors = {}

    switch (currentStep) {
      case 1: // BasicInfo
        if (!data.age) newErrors.age = 'Vui lòng nhập tuổi'
        else if (data.age < 35 || data.age > 65) newErrors.age = 'Tuổi phải từ 35 đến 65'
        if (!data.gender) newErrors.gender = 'Vui lòng chọn giới tính'
        if (!data.province) newErrors.province = 'Vui lòng chọn tỉnh/thành phố'
        if (!data.education) newErrors.education = 'Vui lòng chọn trình độ học vấn'
        if (!data.maritalStatus) newErrors.maritalStatus = 'Vui lòng chọn tình trạng hôn nhân'
        break

      case 4: // Aspirations
        if (!data.targetJob) newErrors.targetJob = 'Vui lòng nhập công việc mong muốn'
        break

      default:
        break
    }

    setLocalErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    if (!validateStep()) {
      return
    }

    const data = getStepData()

    try {
      if (currentStep === TOTAL_STEPS) {
        // Complete profile
        await dispatch(completeProfile()).unwrap()
        if (onComplete) {
          onComplete()
        }
      } else {
        // Save and move to next step
        await dispatch(saveStep({ step: currentStep, data })).unwrap()
        dispatch(setCurrentStep(currentStep + 1))
      }
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      dispatch(setCurrentStep(currentStep - 1))
    }
  }

  const handleStepClick = (step) => {
    if (step < currentStep) {
      dispatch(setCurrentStep(step))
    }
  }

  const formatLastSaved = () => {
    if (!lastSavedAt) return null
    const date = new Date(lastSavedAt)
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  const renderStep = () => {
    const data = getStepData()

    switch (currentStep) {
      case 1:
        return (
          <StepBasicInfo
            data={data}
            errors={localErrors}
            onChange={handleStepDataChange}
            stepRef={stepRef}
          />
        )
      case 2:
        return (
          <StepEmployment
            data={data}
            errors={localErrors}
            onChange={handleStepDataChange}
            stepRef={stepRef}
          />
        )
      case 3:
        return (
          <StepBarriers
            data={data}
            errors={localErrors}
            onChange={handleStepDataChange}
            stepRef={stepRef}
          />
        )
      case 4:
        return (
          <StepAspirations
            data={data}
            errors={localErrors}
            onChange={handleStepDataChange}
            stepRef={stepRef}
          />
        )
      default:
        return null
    }
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Auto-save status */}
      <div className="mb-6 min-h-[24px]">
        {isSaving && (
          <p className="text-base text-gray-500 flex items-center">
            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Đang lưu...
          </p>
        )}
        {!isSaving && lastSavedAt && (
          <p className="text-base text-green-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Đã lưu tạm thời lúc {formatLastSaved()}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <ProgressBar
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Form Container */}
      <div
        ref={formRef}
        className="bg-white rounded-2xl shadow-lg p-6 md:p-8"
      >
        {/* Step Header */}
        <div className="mb-6 pb-4 border-b-2 border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">
            Bước {currentStep}: {STEP_LABELS[currentStep - 1]}
          </h2>
          <p className="text-lg text-gray-600 mt-1">
            {STEP_DESCRIPTIONS[currentStep - 1]}
          </p>
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 pt-6 border-t-2 border-gray-100 flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={currentStep === 1 ? 'invisible' : ''}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleNext}
          >
            {currentStep === TOTAL_STEPS ? (
              <>
                Hoàn thành
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            ) : (
              <>
                Tiếp tục
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default MultiStepForm
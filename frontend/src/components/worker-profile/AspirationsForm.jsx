import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { MapPin, Lightbulb, Sparkles, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Input'
import { SelectField } from '@/components/ui/SelectField'
import { OccupationSelect } from '@/components/ui/OccupationSelect'
import SalaryInput from './SalaryInput'
import JobTypeSelector from './JobTypeSelector'
import { VIETNAM_PROVINCES } from '~/data/profileData'
import {
  autosave,
  updateFormData,
  setCurrentStep,
  completeProfile,
  selectFormData,
  selectIsSaving,
  selectLastSavedAt,
  selectIsCompleting,
  selectIsCompleted
} from '@/redux/profile/profileSlice'
import { clearRAGRecommendation, clearStartupIdeas } from '@/redux/ai/aiSlice'
import { invalidateCareerPathCacheAPI, invalidateRAGCacheAPI } from '@/apis/aiAPI'

const STEP_NUMBER = 4
const AUTOSAVE_DELAY = 1500

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 }
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}

// Initial state for aspirations
const initialAspirations = {
  targetJob: null, // Object format: { uri, code, titleEn, titleVi }
  targetJobNoPreference: false,
  targetSalary: 0,
  targetProvince: '',
  preferredJobType: '',
  skills: [],
  wantsToStartBusiness: false
}

function AspirationsForm({ onComplete }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const savedData = useSelector(selectFormData)
  const isSaving = useSelector(selectIsSaving)
  const lastSavedAt = useSelector(selectLastSavedAt)
  const isCompleting = useSelector(selectIsCompleting)
  const isProfileCompleted = useSelector(selectIsCompleted)

  // Get basicInfo province as default
  const basicInfoProvince = savedData.basicInfo?.province || ''

  const [aspirations, setAspirations] = useState(() => {
    const saved = savedData.aspirations
    if (saved && Object.keys(saved).length > 0) {
      return { ...initialAspirations, ...saved }
    }
    return { ...initialAspirations, targetProvince: basicInfoProvince }
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const autosaveTimerRef = useRef(null)
  const toastShownRef = useRef(false)
  const formRef = useRef(null)

  // Sync from Redux on mount
  useEffect(() => {
    if (savedData.aspirations && Object.keys(savedData.aspirations).length > 0) {
      setAspirations({ ...initialAspirations, ...savedData.aspirations })
    } else if (basicInfoProvince) {
      setAspirations(prev => ({ ...prev, targetProvince: basicInfoProvince }))
    }
  }, [])

  // Autosave toast
  useEffect(() => {
    if (lastSavedAt && !toastShownRef.current) {
      toastShownRef.current = true
      toast.success('Đã lưu tự động', { id: 'autosave', duration: 1500 })
    }
    if (!isSaving) {
      toastShownRef.current = false
    }
  }, [lastSavedAt, isSaving])

  // Sync isCompleted from Redux
  useEffect(() => {
    setIsCompleted(isProfileCompleted ?? false)
  }, [isProfileCompleted])

  // Debounced autosave
  const triggerAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }
    autosaveTimerRef.current = setTimeout(() => {
      dispatch(autosave({ step: STEP_NUMBER, data: aspirations }))
    }, AUTOSAVE_DELAY)
  }, [dispatch, aspirations])

  // Field update handler
  const updateField = (field, value) => {
    setAspirations(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    triggerAutosave()
  }

  // Handle targetJob change from OccupationSelect
  const handleTargetJobChange = (occupation) => {
    setAspirations(prev => ({ ...prev, targetJob: occupation }))
    if (errors.targetJob) {
      setErrors(prev => ({ ...prev, targetJob: '' }))
    }
    triggerAutosave()
  }

  // Validation
  const validate = () => {
    const newErrors = {}

    // Skills validation (optional but max 10)
    if (aspirations.skills?.length > 10) {
      newErrors.skills = 'Tối đa 10 kỹ năng'
    }

    // Salary validation
    if (aspirations.targetSalary > 1000000000) {
      newErrors.targetSalary = 'Lương không quá 1 tỷ đồng'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle submit - Complete profile
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0]
      if (firstErrorField && formRef.current) {
        const errorElement = formRef.current.querySelector(`[data-error="${firstErrorField}"]`)
        errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    setIsSubmitting(true)

    try {
      // Sync to Redux
      dispatch(updateFormData({ step: STEP_NUMBER, data: aspirations }))

      // Auto-save aspirations data
      await dispatch(autosave({ step: STEP_NUMBER, data: aspirations }))

      // Nếu chưa hoàn thành -> hoàn thành
      if (!isCompleted) {
        const result = await dispatch(completeProfile())

        if (completeProfile.fulfilled.match(result)) {
          // Clear career path cache vì aspirations đã thay đổi
          dispatch(clearRAGRecommendation())
          dispatch(clearStartupIdeas())
          invalidateCareerPathCacheAPI().catch(err => {
            console.error('[AspirationsForm] Failed to invalidate career path cache:', err)
          })
          invalidateRAGCacheAPI().catch(err => {
            console.error('[AspirationsForm] Failed to invalidate RAG cache:', err)
          })
          setIsCompleted(true)
          toast.success('Chúc mừng! Bạn đã hoàn thành hồ sơ!')
          dispatch(setCurrentStep(STEP_NUMBER))
          onComplete?.()
          setIsRedirecting(true)
          setTimeout(() => navigate('/jobs'), 1500)
        } else {
          toast.error(typeof result.payload === 'string' ? result.payload : result.payload?.message || 'Hoàn thành thất bại. Vui lòng thử lại.')
        }
      } else {
        // Nếu đã hoàn thành -> chỉ thông báo (đã autosave)
        // Vẫn invalidate cache vì aspirations đã thay đổi
        dispatch(clearRAGRecommendation())
        dispatch(clearStartupIdeas())
        invalidateCareerPathCacheAPI().catch(err => {
          console.error('[AspirationsForm] Failed to invalidate career path cache:', err)
        })
        invalidateRAGCacheAPI().catch(err => {
          console.error('[AspirationsForm] Failed to invalidate RAG cache:', err)
        })
        toast.success('Đã cập nhật thay đổi!')
      }
    } catch (err) {
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle update profile (khi đã hoàn thành)
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    if (!validate()) return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    setIsSubmitting(true)
    try {
      dispatch(updateFormData({ step: STEP_NUMBER, data: aspirations }))
      await dispatch(autosave({ step: STEP_NUMBER, data: aspirations }))
      toast.success('Đã cập nhật hồ sơ!')
      setIsRedirecting(true)
      setTimeout(() => navigate('/jobs'), 1500)
    } catch (err) {
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      ref={formRef}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      {/* Redirecting overlay */}
      <AnimatePresence>
        {isRedirecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-foreground font-medium">Đang chuyển trang...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hint card */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-3 rounded-xl bg-primary/5 border border-primary/20 p-4">
          <div className="flex-shrink-0 mt-0.5">
            <Lightbulb size={20} className="text-primary" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Chọn đúng kỹ năng giúp nhận gợi ý việc làm chính xác hơn
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target Job - Using ESCO Search + Autocomplete */}
        <motion.div variants={itemVariants} data-error="targetJob">
          <div className="space-y-1.5">
            <Label htmlFor="targetJob" className="text-foreground">
              Công việc mong muốn
            </Label>
            <OccupationSelect
              value={aspirations.targetJob}
              onChange={handleTargetJobChange}
              placeholder="Tìm và chọn nghề nghiệp..."
              error={errors.targetJob}
            />
            <div className="mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aspirations.targetJobNoPreference || false}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAspirations(prev => ({ ...prev, targetJob: null }))
                    }
                    updateField('targetJobNoPreference', e.target.checked)
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">Không có</span>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Salary & Province - 2 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Salary */}
          <motion.div variants={itemVariants} data-error="targetSalary">
            <SalaryInput
              value={aspirations.targetSalary}
              onChange={(value) => updateField('targetSalary', value)}
              label="Mức lương kỳ vọng"
              placeholder="VD: 5.000.000"
              error={errors.targetSalary}
            />
          </motion.div>

          {/* Target Province */}
          <motion.div variants={itemVariants} data-error="targetProvince">
            <SelectField
              label="Địa điểm làm việc"
              value={aspirations.targetProvince}
              options={VIETNAM_PROVINCES}
              onChange={(value) => updateField('targetProvince', value)}
              placeholder="-- Chọn tỉnh/thành --"
              icon={<MapPin size={18} className="text-muted-foreground" />}
              error={errors.targetProvince}
              id="targetProvince"
            />
          </motion.div>
        </div>

        {/* Preferred Job Type */}
        <motion.div variants={itemVariants} data-error="preferredJobType">
          <JobTypeSelector
            value={aspirations.preferredJobType}
            onChange={(value) => updateField('preferredJobType', value)}
            label="Loại công việc"
            error={errors.preferredJobType}
          />
        </motion.div>

        {/* Wants to start business */}
        <motion.div variants={itemVariants}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aspirations.wantsToStartBusiness || false}
              onChange={(e) => updateField('wantsToStartBusiness', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">
              Bạn có muốn lập nghiệp?
            </span>
          </label>
        </motion.div>

        {/* Submit Buttons */}
        <motion.div variants={itemVariants} className="space-y-3 pt-2">
          {/* Nút Hoàn thành hồ sơ - disabled khi đã hoàn thành */}
          <Button
            type="submit"
            isLoading={isSubmitting || isCompleting}
            disabled={isCompleted}
            size="xl"
            className={cn(
              "w-full transition-all duration-300",
              isCompleted && "opacity-50 cursor-not-allowed"
            )}
          >
            <Sparkles size={18} className="mr-2" />
            Hoàn thành hồ sơ
            {!isCompleted && (
              <svg className="w-4 h-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
              </svg>
            )}
          </Button>

          {/* Nút Cập nhật hồ sơ - chỉ hiện khi đã hoàn thành */}
          {isProfileCompleted && (
            <Button
              type="button"
              onClick={handleUpdateProfile}
              isLoading={isSubmitting}
              size="xl"
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Cập nhật hồ sơ
            </Button>
          )}
        </motion.div>
      </form>

      {/* Autosave indicator */}
      <AnimatePresence>
        {isSaving && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs text-muted-foreground"
          >
            Đang lưu...
          </motion.p>
        )}
      </AnimatePresence>

      {/* Success state */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-sm mx-4 text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Chúc mừng bạn!
              </h3>
              <p className="text-muted-foreground mb-6">
                Hồ sơ của bạn đã hoàn thành. Chúng tôi sẽ gửi gợi ý việc làm phù hợp sớm nhất.
              </p>
              <Button
                onClick={() => setIsCompleted(false)}
                variant="outline"
                className="w-full"
              >
                Đóng
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default AspirationsForm

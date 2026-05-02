import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { MapPin, Lightbulb, Sparkles, Check } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input, Label, Textarea } from '@/components/ui/Input'
import { SelectField } from '@/components/ui/SelectField'
import SalaryInput from './SalaryInput'
import JobTypeSelector from './JobTypeSelector'
import SkillsSelector from './SkillsSelector'
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
  targetJob: '',
  targetSalary: 0,
  targetProvince: '',
  preferredJobType: '',
  skills: [],
  description: ''
}

function AspirationsForm({ onComplete }) {
  const dispatch = useDispatch()
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
    if (isProfileCompleted) {
      setIsCompleted(true)
    }
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

    // Check if already completed and compare with saved data
    if (isCompleted) {
      const savedAspirations = savedData.aspirations || {}
      
      // Compare current data with saved data
      const hasChanges = 
        aspirations.targetJob !== savedAspirations.targetJob ||
        aspirations.targetSalary !== savedAspirations.targetSalary ||
        aspirations.targetProvince !== savedAspirations.targetProvince ||
        aspirations.preferredJobType !== savedAspirations.preferredJobType ||
        aspirations.description !== savedAspirations.description ||
        JSON.stringify(aspirations.skills) !== JSON.stringify(savedAspirations.skills || [])

      if (!hasChanges) {
        toast('Hồ sơ của bạn đã hoàn thành từ trước', {
          duration: 3000,
          icon: '✓'
        })
        return
      }
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    setIsSubmitting(true)

    try {
      // Sync to Redux
      dispatch(updateFormData({ step: STEP_NUMBER, data: aspirations }))

      // Complete the profile directly (step 4 doesn't need saveStep)
      const result = await dispatch(completeProfile())

      if (completeProfile.fulfilled.match(result)) {
        setIsCompleted(true)
        toast.success('Chúc mừng! Bạn đã hoàn thành hồ sơ!')
        dispatch(setCurrentStep(STEP_NUMBER))
        onComplete?.()
      } else {
        // Check if error message indicates already completed
        const errorMessage = typeof result.payload === 'string'
          ? result.payload
          : result.payload?.message || ''

        if (errorMessage.toLowerCase().includes('hoàn thành') ||
            errorMessage.toLowerCase().includes('completed')) {
          // Backend says already completed - update local state
          setIsCompleted(true)
          toast.success('Hồ sơ đã hoàn thành trước đó', {
            duration: 3000,
            icon: '✓'
          })
        } else {
          toast.error(errorMessage || 'Hoàn thành thất bại. Vui lòng thử lại.')
        }
      }
    } catch (err) {
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Suggested job based on selected skills
  const suggestedJobs = aspirations.skills.slice(0, 3)

  return (
    <motion.div
      ref={formRef}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
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
        {/* Target Job */}
        <motion.div variants={itemVariants} data-error="targetJob">
          <div className="space-y-1.5">
            <Label htmlFor="targetJob" className="text-foreground">
              Công việc mong muốn
            </Label>
            <Input
              id="targetJob"
              value={aspirations.targetJob}
              onChange={(e) => updateField('targetJob', e.target.value)}
              placeholder="VD: Phục vụ bàn, Lái xe, Nấu ăn..."
              error={errors.targetJob}
              list="suggested-jobs"
            />
            <datalist id="suggested-jobs">
              {suggestedJobs.map((skill) => (
                <option key={skill} value={skill} />
              ))}
            </datalist>
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

        {/* Skills */}
        <motion.div variants={itemVariants} data-error="skills">
          <SkillsSelector
            value={aspirations.skills}
            onChange={(value) => updateField('skills', value)}
            label="Kỹ năng"
            error={errors.skills}
          />
        </motion.div>

        {/* Description */}
        <motion.div variants={itemVariants} data-error="description">
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-foreground">
              Mô tả thêm
            </Label>
            <Textarea
              id="description"
              value={aspirations.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Mô tả thêm về công việc mong muốn, môi trường làm việc lý tưởng..."
              rows={3}
              error={errors.description}
              className="resize-none"
            />
          </div>
        </motion.div>

        {/* Submit Button */}
        <motion.div variants={itemVariants} className="pt-2">
          <Button
            type="submit"
            isLoading={isSubmitting || isCompleting}
            disabled={false}
            size="xl"
            className={cn(
              "w-full transition-all duration-300",
              isCompleted && "bg-green-500 hover:bg-green-600 border-green-500"
            )}
          >
            {isCompleted ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Đã hoàn thành
              </>
            ) : (
              <>
                <Sparkles size={18} className="mr-2" />
                Hoàn thành hồ sơ
                <svg className="w-4 h-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            )}
          </Button>
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

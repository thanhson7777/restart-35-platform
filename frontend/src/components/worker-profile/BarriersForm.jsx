import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Heart, Users, Laptop, MapPin, MoreHorizontal, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea, Label } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { BARRIER_OPTIONS } from '~/data/profileData'
import {
  saveStep,
  autosave,
  updateFormData,
  setCurrentStep,
  selectFormData,
  selectIsSaving,
  selectLastSavedAt
} from '@/redux/profile/profileSlice'
import { clearRAGRecommendation, clearStartupIdeas } from '@/redux/ai/aiSlice'
import { invalidateCareerPathCacheAPI, invalidateRAGCacheAPI } from '@/apis/aiAPI'

const STEP_NUMBER = 3
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

const ICON_MAP = {
  health: Heart,
  family: Users,
  techGap: Laptop,
  location: MapPin,
  other: MoreHorizontal
}

const initialBarriers = {
  health: false,
  family: false,
  techGap: false,
  location: false,
  other: false,
  otherDescription: ''
}

function BarriersForm({ onNext }) {
  const dispatch = useDispatch()
  const savedData = useSelector(selectFormData)
  const isSaving = useSelector(selectIsSaving)
  const lastSavedAt = useSelector(selectLastSavedAt)

  const [barriers, setBarriers] = useState(() => {
    const saved = savedData.barriers
    if (saved && Object.keys(saved).length > 0) {
      return { ...initialBarriers, ...saved }
    }
    return initialBarriers
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const autosaveTimerRef = useRef(null)
  const toastShownRef = useRef(false)

  // Sync from Redux on mount (handles page reload / navigation back)
  useEffect(() => {
    if (savedData.barriers && Object.keys(savedData.barriers).length > 0) {
      setBarriers({ ...initialBarriers, ...savedData.barriers })
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

  // Debounced autosave
  const triggerAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }
    autosaveTimerRef.current = setTimeout(() => {
      dispatch(autosave({ step: STEP_NUMBER, data: barriers }))
    }, AUTOSAVE_DELAY)
  }, [dispatch, barriers])

  // Toggle a barrier checkbox
  const handleBarrierChange = (key, value) => {
    setBarriers((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }))
    }
    triggerAutosave()
  }

  // Update other description
  const handleDescriptionChange = (value) => {
    setBarriers((prev) => ({ ...prev, otherDescription: value }))
    if (errors.otherDescription) {
      setErrors((prev) => ({ ...prev, otherDescription: '' }))
    }
    triggerAutosave()
  }

  // Validate before submit
  const validate = () => {
    const newErrors = {}

    if (barriers.other && !barriers.otherDescription.trim()) {
      newErrors.otherDescription = 'Vui lòng mô tả rào cản khác của bạn'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    setIsSubmitting(true)

    try {
      // Sync to Redux
      dispatch(updateFormData({ step: STEP_NUMBER, data: barriers }))

      // Save to backend
      const result = await dispatch(saveStep({ step: STEP_NUMBER, data: barriers }))

      if (saveStep.fulfilled.match(result)) {
        // Clear career path cache vì barriers đã thay đổi
        dispatch(clearRAGRecommendation())
        dispatch(clearStartupIdeas())
        invalidateCareerPathCacheAPI().catch(err => {
          console.error('[BarriersForm] Failed to invalidate career path cache:', err)
        })
        invalidateRAGCacheAPI().catch(err => {
          console.error('[BarriersForm] Failed to invalidate RAG cache:', err)
        })
        dispatch(setCurrentStep(STEP_NUMBER + 1))
        toast.success('Đã lưu rào cản & thách thức!')
        onNext?.()
      } else {
        toast.error(
          typeof result.payload === 'string'
            ? result.payload
            : result.payload?.message || 'Lưu thất bại. Vui lòng thử lại.'
        )
      }
    } catch (err) {
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Count selected barriers
  const selectedCount = Object.entries(barriers).filter(
    ([key, value]) => key !== 'otherDescription' && value === true
  ).length

  return (
    <motion.div
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
            Không cần chọn tất cả, hãy chọn những rào cản phù hợp với bạn.
            Thông tin này giúp chúng tôi gợi ý việc làm phù hợp nhất.
          </p>
        </div>
      </motion.div>

      {/* Barrier items grid */}
      <div className="grid grid-cols-1 gap-3">
        {BARRIER_OPTIONS.map((option) => {
          const Icon = ICON_MAP[option.value] || MoreHorizontal
          const isSelected = barriers[option.value] === true

          return (
            <motion.div key={option.value} variants={itemVariants}>
              <Checkbox
                checked={isSelected}
                onChange={(value) => handleBarrierChange(option.value, value)}
                label={option.label}
                description={option.description}
                icon={Icon}
              />
            </motion.div>
          )
        })}
      </div>

      {/* Other description textarea — only shown when "Khác" is selected */}
      <AnimatePresence>
        {barriers.other && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pl-4 border-l-2 border-primary/30 ml-3">
              <Label
                htmlFor="otherDescription"
                required
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Mô tả rào cản khác
              </Label>
              <Textarea
                id="otherDescription"
                value={barriers.otherDescription}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Nhập rào cản khác mà bạn đang gặp phải..."
                error={errors.otherDescription}
                rows={3}
                className="bg-background"
              />
              {errors.otherDescription && (
                <p className="mt-1.5 text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
                  {errors.otherDescription}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected summary */}
      {selectedCount > 0 && (
        <motion.p
          variants={itemVariants}
          className="text-xs text-muted-foreground text-center"
        >
          Đã chọn {selectedCount} rào cản
        </motion.p>
      )}

      {/* Submit Button */}
      <motion.div variants={itemVariants} className="pt-2">
        <Button
          type="button"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          size="xl"
          className="w-full"
        >
          Tiếp tục
          <svg className="w-4 h-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
              clipRule="evenodd"
            />
          </svg>
        </Button>
      </motion.div>

      {/* Autosave indicator */}
      {isSaving && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-muted-foreground"
        >
          Đang lưu...
        </motion.p>
      )}
    </motion.div>
  )
}

export default BarriersForm

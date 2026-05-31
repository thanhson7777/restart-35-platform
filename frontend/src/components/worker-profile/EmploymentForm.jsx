import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import JobCard from './JobCard'
import {
  saveStep,
  autosave,
  updateFormData,
  setCurrentStep,
  selectFormData,
  selectIsSaving,
  selectLastSavedAt
} from '@/redux/profile/profileSlice'
import {
  clearCareerPath,
  clearRAGRecommendation,
  clearStartupIdeas
} from '@/redux/ai/aiSlice'
import { invalidateCareerPathCacheAPI, invalidateRAGCacheAPI } from '@/apis/aiAPI'

const MAX_JOBS = 3

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}

const cardVariants = {
  hidden: { opacity: 0, y: -16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, scale: 0.97, transition: { duration: 0.2, ease: 'easeIn' } }
}

const STEP_NUMBER = 2

function createEmptyJob() {
  return {
    companyName: '',
    position: '',
    duration: 0,
    jobType: '',
    description: '',
    industry: '',
    skills: []
  }
}

function EmploymentForm({ onNext }) {
  const dispatch = useDispatch()
  const savedData = useSelector(selectFormData)
  const isSaving = useSelector(selectIsSaving)
  const lastSavedAt = useSelector(selectLastSavedAt)

  const [jobs, setJobs] = useState(() => {
    const saved = savedData.employmentHistory
    if (saved && saved.length > 0) {
      return saved
    }
    return [createEmptyJob()]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const autosaveTimerRef = useRef(null)
  const toastShownRef = useRef(false)
  const lastAddedRef = useRef(null)

  // Sync from Redux on mount (handles page reload / navigation back)
  useEffect(() => {
    if (savedData.employmentHistory && savedData.employmentHistory.length > 0) {
      setJobs(savedData.employmentHistory)
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
      dispatch(autosave({ step: STEP_NUMBER, data: jobs }))
    }, 1500)
  }, [dispatch, jobs])

  // Thêm công việc
  const addJob = () => {
    if (jobs.length >= MAX_JOBS) return
    setJobs((prev) => [...prev, createEmptyJob()])
  }

  // Xóa công việc
  const removeJob = (index) => {
    setJobs((prev) => prev.filter((_, i) => i !== index))
  }

  // Cập nhật 1 field trong 1 job
  const updateJob = (index, field, value) => {
    setJobs((prev) => {
      const updated = prev.map((job, i) =>
        i === index ? { ...job, [field]: value } : job
      )
      return updated
    })
    triggerAutosave()
  }

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate: nếu có job nào có dữ liệu thì duration > 0 là tốt, không thì cũng ok (all optional)
    // Chỉ cảnh báo nếu có field nhưng duration = 0
    const hasFilledJob = jobs.some(
      (j) => j.companyName || j.position || j.description || j.jobType
    )
    const hasDurationWarning = jobs.some(
      (j) => (j.companyName || j.position) && j.duration === 0
    )

    if (hasDurationWarning) {
      toast.error('Vui lòng chọn thời gian làm việc cho công việc đã nhập.')
      return
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    setIsSubmitting(true)

    try {
      // Sync to Redux
      dispatch(updateFormData({ step: STEP_NUMBER, data: jobs }))

      // Save to backend
      const result = await dispatch(saveStep({ step: STEP_NUMBER, data: jobs }))

      if (saveStep.fulfilled.match(result)) {
        // Clear career path cache vì employment history đã thay đổi
        dispatch(clearCareerPath())
        dispatch(clearRAGRecommendation())
        dispatch(clearStartupIdeas())

        // Invalidate cache ở backend (async, không block UI)
        invalidateCareerPathCacheAPI().catch(err => {
          console.error('[EmploymentForm] Failed to invalidate career path cache:', err)
        })
        invalidateRAGCacheAPI().catch(err => {
          console.error('[EmploymentForm] Failed to invalidate RAG cache:', err)
        })

        // Advance to step 3
        dispatch(setCurrentStep(STEP_NUMBER + 1))
        toast.success('Đã lưu kinh nghiệm làm việc!')
        onNext?.()
      } else {
        toast.error(typeof result.payload === 'string' ? result.payload : result.payload?.message || 'Lưu thất bại. Vui lòng thử lại.')
      }
    } catch (err) {
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canAddMore = jobs.length < MAX_JOBS

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-bold text-foreground">
          Kinh nghiệm làm việc
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Liệt kê các công việc bạn đã làm trước đây (tối đa {MAX_JOBS} công việc)
        </p>
      </motion.div>

      {/* Danh sách JobCard */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {jobs.map((job, index) => (
            <motion.div
              key={`job-${index}`}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
              layoutId={`job-${index}`}
            >
              <JobCard
                index={index}
                job={job}
                onChange={(field, value) => updateJob(index, field, value)}
                onRemove={() => removeJob(index)}
                canRemove={jobs.length > 1}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Nút thêm công việc */}
      {canAddMore && (
        <motion.div variants={itemVariants}>
          <button
            type="button"
            onClick={addJob}
            className="
              w-full py-3 px-4 rounded-xl border-2 border-dashed border-border
              text-sm font-medium text-muted-foreground
              hover:border-primary/50 hover:text-primary hover:bg-primary/5
              transition-all duration-200 cursor-pointer
              flex items-center justify-center gap-2
            "
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
            </svg>
            Thêm công việc
          </button>
        </motion.div>
      )}

      {/* Giới hạn */}
      {!canAddMore && (
        <motion.p
          variants={itemVariants}
          className="text-xs text-muted-foreground text-center"
        >
          Đã đạt giới hạn {MAX_JOBS} công việc
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
            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd"/>
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

export default EmploymentForm

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SelectField } from '@/components/ui/SelectField'
import GenderField from './GenderField'
import ProvinceField from './ProvinceField'
import {
  saveStep,
  autosave,
  updateFormData,
  setCurrentStep,
  selectFormData,
  selectIsSaving,
  selectLastSavedAt,
  selectCurrentStep
} from '@/redux/profile/profileSlice'
import { clearRAGRecommendation, clearStartupIdeas } from '@/redux/ai/aiSlice'
import { invalidateCareerPathCacheAPI, invalidateRAGCacheAPI } from '@/apis/aiAPI'
import { EDUCATION_OPTIONS, MARITAL_STATUS_OPTIONS } from '~/data/profileData'

const PHONE_ICON = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.07 1.11h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"/>
  </svg>
)

const BOOK_ICON = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
)

const HEART_ICON = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

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

const AUTOSAVE_DELAY = 1500

const initialFormData = {
  age: '',
  gender: '',
  province: '01',
  district: '',
  education: '',
  maritalStatus: '',
  phone: ''
}

function BasicInfoForm({ onNext }) {
  const dispatch = useDispatch()
  const savedData = useSelector(selectFormData)
  const isSaving = useSelector(selectIsSaving)
  const lastSavedAt = useSelector(selectLastSavedAt)
  const globalStep = useSelector(selectCurrentStep)

  const [formData, setLocalFormData] = useState({
    ...initialFormData,
    ...(savedData.basicInfo || {})
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const autosaveTimerRef = useRef(null)
  const toastShownRef = useRef(false)

  // Sync with Redux state when it changes from outside (e.g., page load)
  useEffect(() => {
    if (savedData.basicInfo && Object.keys(savedData.basicInfo).length > 0) {
      setLocalFormData((prev) => ({ ...prev, ...savedData.basicInfo }))
    }
  }, [])

  // Autosave: show toast once after successful save
  useEffect(() => {
    if (lastSavedAt && !toastShownRef.current) {
      toastShownRef.current = true
      toast.success('Đã lưu tự động', { id: 'autosave', duration: 1500 })
    }
    if (!isSaving) {
      toastShownRef.current = false
    }
  }, [lastSavedAt, isSaving])

  const triggerAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }
    autosaveTimerRef.current = setTimeout(() => {
      dispatch(autosave({ step: 1, data: formData }))
    }, AUTOSAVE_DELAY)
  }, [dispatch, formData])

  const handleChange = (field, value) => {
    setLocalFormData((prev) => ({ ...prev, [field]: value }))

    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }

    triggerAutosave()
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const validate = (data = formData) => {
    const newErrors = {}

    const ageStr = String(data.age ?? '').trim()
    if (!ageStr) {
      newErrors.age = 'Tuổi là bắt buộc.'
    } else {
      const ageNum = parseInt(ageStr, 10)
      if (isNaN(ageNum) || ageNum < 35 || ageNum > 65) {
        newErrors.age = 'Tuổi phải từ 35 đến 65.'
      }
    }

    if (!data.gender) {
      newErrors.gender = 'Vui lòng chọn giới tính.'
    }

    if (!data.province) {
      newErrors.province = 'Vui lòng chọn tỉnh/thành.'
    }

    if (!data.education) {
      newErrors.education = 'Vui lòng chọn trình độ học vấn.'
    }

    if (!data.maritalStatus) {
      newErrors.maritalStatus = 'Vui lòng chọn tình trạng hôn nhân.'
    }

    const phoneStr = String(data.phone ?? '').trim()
    if (phoneStr && !/^0[0-9]{9,10}$/.test(phoneStr)) {
      newErrors.phone = 'Số điện thoại không hợp lệ (VD: 0912345678).'
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Mark all as touched to show errors
    setTouched({
      age: true, gender: true, province: true, education: true, maritalStatus: true, phone: true
    })

    const validationErrors = validate()
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Vui lòng kiểm tra lại thông tin.')
      return
    }

    // Clear timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    setIsSubmitting(true)

    try {
      // Sync to Redux
      dispatch(updateFormData({ step: 1, data: formData }))

      // Save to backend
      const result = await dispatch(saveStep({ step: 1, data: formData }))

      if (saveStep.fulfilled.match(result)) {
        // Clear career path cache vì basicInfo đã thay đổi
        dispatch(clearRAGRecommendation())
        dispatch(clearStartupIdeas())
        invalidateCareerPathCacheAPI().catch(err => {
          console.error('[BasicInfoForm] Failed to invalidate career path cache:', err)
        })
        invalidateRAGCacheAPI().catch(err => {
          console.error('[BasicInfoForm] Failed to invalidate RAG cache:', err)
        })
        dispatch(setCurrentStep(2))
        toast.success('Đã lưu thông tin cơ bản!')
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

  const isValid = Object.keys(validate()).length === 0

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      {/* Age + Gender row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Age */}
        <div className="space-y-1.5">
          <label htmlFor="age" className="block text-sm font-medium text-foreground">
            Tuổi <span className="text-destructive">*</span>
          </label>
          <input
            id="age"
            type="number"
            min="35"
            max="65"
            placeholder="35 - 65"
            value={formData.age}
            onChange={(e) => handleChange('age', e.target.value)}
            onBlur={() => handleBlur('age')}
            className={`
              w-full bg-background border rounded-lg px-4 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
              transition-colors duration-200
              placeholder:text-muted-foreground/60
              ${touched.age && errors.age ? 'border-destructive' : 'border-input'}
            `}
          />
          {touched.age && errors.age && (
            <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
              {errors.age}
            </p>
          )}
        </div>

        {/* Gender */}
        <GenderField
          value={formData.gender}
          onChange={(value) => handleChange('gender', value)}
          error={touched.gender ? errors.gender : ''}
        />
      </motion.div>

      {/* Province + District row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProvinceField
          province={formData.province}
          district={formData.district}
          onProvinceChange={(value) => {
            handleChange('province', value)
            handleChange('district', '')
          }}
          onDistrictChange={(value) => handleChange('district', value)}
          errors={errors}
        />
      </motion.div>

      {/* Education + Marital Status row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Education */}
        <SelectField
          id="education"
          label="Trình độ học vấn"
          value={formData.education}
          options={EDUCATION_OPTIONS}
          onChange={(val) => handleChange('education', val)}
          placeholder="-- Chọn trình độ --"
          icon={<BOOK_ICON />}
          error={touched.education ? errors.education : ''}
          required
        />

        {/* Marital Status */}
        <SelectField
          id="maritalStatus"
          label="Tình trạng hôn nhân"
          value={formData.maritalStatus}
          options={MARITAL_STATUS_OPTIONS}
          onChange={(val) => handleChange('maritalStatus', val)}
          placeholder="-- Chọn tình trạng --"
          icon={<HEART_ICON />}
          error={touched.maritalStatus ? errors.maritalStatus : ''}
          required
        />
      </motion.div>

      {/* Phone (full width) */}
      <motion.div variants={itemVariants} className="space-y-1.5">
        <label htmlFor="phone" className="block text-sm font-medium text-foreground">
          Số điện thoại
          <span className="ml-1 text-xs text-muted-foreground font-normal">(tùy chọn)</span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            <PHONE_ICON />
          </div>
          <input
            id="phone"
            type="tel"
            placeholder="VD: 0912345678"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            className={`
              w-full bg-background border rounded-lg
              pl-10 pr-4 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
              transition-colors duration-200
              placeholder:text-muted-foreground/60
              ${touched.phone && errors.phone ? 'border-destructive' : 'border-input'}
            `}
          />
        </div>
        {touched.phone && errors.phone && (
          <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
            {errors.phone}
          </p>
        )}
      </motion.div>

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

export default BasicInfoForm

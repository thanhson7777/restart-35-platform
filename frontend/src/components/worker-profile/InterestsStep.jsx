import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { selectFormData, selectIsSaving, selectLastSavedAt, updateFormData, saveStep, setCurrentStep } from '@/redux/profile/profileSlice'
import { clearCareerPath, clearRAGRecommendation, clearStartupIdeas } from '@/redux/ai/aiSlice'
import { invalidateCareerPathCacheAPI, invalidateRAGCacheAPI } from '@/apis/aiAPI'
import { cn } from '@/lib/utils'

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

const INTEREST_CATEGORIES = [
  {
    category: 'Công nghệ & Số',
    icon: '💻',
    items: ['Công nghệ', 'Máy tính', 'Điện thoại', 'Internet', 'AI & Tự động hóa']
  },
  {
    category: 'Ẩm thực & Nấu ăn',
    icon: '🍳',
    items: ['Nấu ăn', 'Pha chế', 'Ẩm thực Việt', 'Bánh ngọt', 'Đồ uống']
  },
  {
    category: 'Kinh doanh & Bán hàng',
    icon: '💰',
    items: ['Kinh doanh', 'Bán hàng', 'Marketing', 'Quản lý tài chính', 'Khởi nghiệp']
  },
  {
    category: 'Sức khỏe & Chăm sóc',
    icon: '🏥',
    items: ['Sức khỏe', 'Thể thao', 'Chăm sóc người già', 'Dinh dưỡng', 'Yoga & Thiền']
  },
  {
    category: 'Giáo dục & Đào tạo',
    icon: '📚',
    items: ['Giáo dục', 'Dạy học', 'Học ngoại ngữ', 'Kỹ năng mềm', 'Phát triển bản thân']
  },
  {
    category: 'Nghệ thuật & Sáng tạo',
    icon: '🎨',
    items: ['Nghệ thuật', 'Thủ công', 'Viết lách', 'Âm nhạc', 'Thiết kế']
  },
  {
    category: 'Nông nghiệp & Thiên nhiên',
    icon: '🌾',
    items: ['Nông nghiệp', 'Trồng trọt', 'Chăn nuôi', 'Cây cảnh', 'Môi trường']
  },
  {
    category: 'Xây dựng & Cơ khí',
    icon: '🔧',
    items: ['Xây dựng', 'Cơ khí', 'Điện nước', 'Sửa chữa', 'Lắp đặt']
  },
  {
    category: 'Dịch vụ & Phục vụ',
    icon: '🤝',
    items: ['Phục vụ', 'Hành chính', 'Kế toán', 'Nhân sự', 'Dịch vụ khách hàng']
  },
  {
    category: 'Vận chuyển & Di chuyển',
    icon: '🚗',
    items: ['Lái xe', 'Vận chuyển', 'Giao hàng', 'Logistics', 'Quản lý kho']
  }
]

function InterestsStep({ onNext }) {
  const dispatch = useDispatch()
  const savedData = useSelector(selectFormData)
  const isSaving = useSelector(selectIsSaving)
  const lastSavedAt = useSelector(selectLastSavedAt)

  // Parse saved interests from Redux
  const getInitialInterests = () => {
    const saved = savedData.interests
    if (!saved) return []
    if (Array.isArray(saved)) return saved
    if (typeof saved === 'object' && saved.interests) return saved.interests
    return []
  }

  const [selectedInterests, setSelectedInterests] = useState(getInitialInterests)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const autosaveTimerRef = useRef(null)
  const toastShownRef = useRef(false)

  // Sync from Redux on mount
  useEffect(() => {
    const interests = getInitialInterests()
    if (interests.length > 0) {
      setSelectedInterests(interests)
    }
  }, [savedData.interests])

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
      const payload = selectedInterests.length > 0
        ? { interests: selectedInterests }
        : { status: 'không có', interests: [] }
      dispatch(updateFormData({ step: STEP_NUMBER, data: payload }))
      dispatch(saveStep({ step: STEP_NUMBER, data: payload })).catch(() => {})
    }, AUTOSAVE_DELAY)
  }, [dispatch, selectedInterests])

  // Toggle interest
  const toggleInterest = (interest) => {
    setSelectedInterests((prev) => {
      const exists = prev.includes(interest)
      if (exists) {
        return prev.filter((i) => i !== interest)
      }
      return [...prev, interest]
    })
    triggerAutosave()
  }

  // Filter categories by search
  const filteredCategories = INTEREST_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter((cat) => cat.items.length > 0)

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    setIsSubmitting(true)

    try {
      const payload = selectedInterests.length > 0
        ? { interests: selectedInterests }
        : { status: 'không có', interests: [] }

      dispatch(updateFormData({ step: STEP_NUMBER, data: payload }))

      const result = await dispatch(saveStep({ step: STEP_NUMBER, data: payload }))

      if (saveStep.fulfilled.match(result)) {
        dispatch(clearCareerPath())
        dispatch(clearRAGRecommendation())
        dispatch(clearStartupIdeas())
        invalidateCareerPathCacheAPI().catch((err) => {
          console.error('[InterestsStep] Failed to invalidate career path cache:', err)
        })
        invalidateRAGCacheAPI().catch((err) => {
          console.error('[InterestsStep] Failed to invalidate RAG cache:', err)
        })

        dispatch(setCurrentStep(STEP_NUMBER + 1))

        if (selectedInterests.length > 0) {
          toast.success(`Đã lưu ${selectedInterests.length} sở thích!`)
        } else {
          toast.success('Đã lưu thông tin sở thích!')
        }

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
            <Sparkles size={20} className="text-primary" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Chọn những sở thích giúp chúng tôi hiểu bạn hơn và gợi ý việc làm phù hợp.
            Bạn có thể chọn nhiều sở thích hoặc bỏ qua bước này.
          </p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm sở thích..."
          className={cn(
            "w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
            "transition-colors"
          )}
        />
      </motion.div>

      {/* Selected count summary */}
      {selectedInterests.length > 0 && (
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
          {selectedInterests.map((interest) => (
            <span
              key={interest}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
            >
              {interest}
              <button
                type="button"
                onClick={() => toggleInterest(interest)}
                className="ml-1 hover:text-primary/70 transition-colors"
                aria-label={`Xóa ${interest}`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </span>
          ))}
        </motion.div>
      )}

      {/* Interest categories grid */}
      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-1">
        {filteredCategories.map((category) => (
          <motion.div key={category.category} variants={itemVariants}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{category.icon}</span>
              <h3 className="text-sm font-semibold text-foreground">
                {category.category}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {category.items.map((item) => {
                const isSelected = selectedInterests.includes(item)
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInterest(item)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
                      isSelected
                        ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>

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

      {/* Submit Button */}
      <motion.div variants={itemVariants} className="pt-2">
        <Button
          type="button"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          size="xl"
          className="w-full"
        >
          {selectedInterests.length > 0
            ? `Tiếp tục (${selectedInterests.length} sở thích)`
            : 'Tiếp tục (không có sở thích)'}
          <svg className="w-4 h-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
              clipRule="evenodd"
            />
          </svg>
        </Button>
      </motion.div>
    </motion.div>
  )
}

export default InterestsStep

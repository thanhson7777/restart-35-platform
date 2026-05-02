import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Search, X, ChevronDown } from 'lucide-react'

/**
 * SkillsSelector Component
 * - Multi-select với max 10 skills
 * - Search input với debounce 300ms
 * - Grouped by category (collapsible)
 * - Sticky selected skills area
 */
const MAX_SKILLS = 10

// Skills categorized data
const SKILLS_CATEGORIES = [
  {
    category: 'Phục vụ & Ẩm thực',
    skills: [
      'Nấu ăn',
      'Phục vụ bàn',
      'Pha chế đồ uống',
      'Bartender',
      'Bếp trưởng',
      'Đầu bếp',
      'Giặt ủi',
      'Dọn dẹp'
    ]
  },
  {
    category: 'Bán lẻ & Kinh doanh',
    skills: [
      'Bán hàng',
      'Thu ngân',
      'Kế toán',
      'Nhập liệu',
      'Quản lý kho',
      'Tư vấn khách hàng',
      'Marketing cơ bản'
    ]
  },
  {
    category: 'Xây dựng & Sửa chữa',
    skills: [
      'Xây dựng',
      'Sơn sửa nhà',
      'Điện nước',
      'Lắp đặt',
      'Trang trí nội thất',
      'Làm mộc',
      'Hàn'
    ]
  },
  {
    category: 'Nông nghiệp',
    skills: [
      'Trồng trọt',
      'Chăn nuôi',
      'Chế biến thực phẩm',
      'Bán hàng nông sản',
      'Nông nghiệp hữu cơ',
      'Thu hoạch'
    ]
  },
  {
    category: 'Vận chuyển & Kho vận',
    skills: [
      'Lái xe',
      'Giao hàng',
      'Kho vận',
      'Lái xe tải',
      'Lái xe bus',
      'Shipper'
    ]
  },
  {
    category: 'Chăm sóc & Giáo dục',
    skills: [
      'Giữ trẻ',
      'Chăm sóc người già',
      'Giáo viên mầm non',
      'Gia sư',
      'Trông trẻ',
      'Chăm sóc sức khỏe'
    ]
  },
  {
    category: 'Công nghiệp & Sản xuất',
    skills: [
      'May mặc',
      'Lắp ráp',
      'Đóng gói',
      'Vận hành máy móc',
      'Kiểm tra chất lượng',
      'Nghề mộc',
      'Thợ cơ khí'
    ]
  },
  {
    category: 'Kỹ năng mềm',
    skills: [
      'Giao tiếp',
      'Chịu áp lực',
      'Làm việc nhóm',
      'Quản lý thời gian',
      'Giải quyết vấn đề',
      'Lãnh đạo'
    ]
  }
]

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

function SkillsSelector({
  value = [],
  onChange,
  label = 'Kỹ năng',
  error,
  required,
  id = 'skills'
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState({})
  const searchInputRef = useRef(null)
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Initialize: expand first 3 categories
  useEffect(() => {
    const initial = {}
    SKILLS_CATEGORIES.slice(0, 3).forEach((cat, i) => {
      initial[cat.category] = true
    })
    setExpandedCategories(initial)
  }, [])

  // Filter skills by search term
  const filteredCategories = useMemo(() => {
    if (!debouncedSearch) return SKILLS_CATEGORIES

    return SKILLS_CATEGORIES.map(category => ({
      ...category,
      skills: category.skills.filter(skill =>
        skill.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    })).filter(category => category.skills.length > 0)
  }, [debouncedSearch])

  // Toggle category expansion
  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }))
  }

  // Add skill
  const addSkill = useCallback((skill) => {
    if (value.length >= MAX_SKILLS) return
    if (value.includes(skill)) return
    onChange?.([...value, skill])
  }, [value, onChange])

  // Remove skill
  const removeSkill = useCallback((skill) => {
    onChange?.(value.filter(s => s !== skill))
  }, [value, onChange])

  // Toggle skill (add if not exists, remove if exists)
  const toggleSkill = useCallback((skill) => {
    if (value.includes(skill)) {
      removeSkill(skill)
    } else {
      addSkill(skill)
    }
  }, [value, addSkill, removeSkill])

  const isMaxReached = value.length >= MAX_SKILLS

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
      )}

      <div className="rounded-xl border border-input bg-background overflow-hidden">
        {/* Search input */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm kỹ năng..."
              className={cn(
                'w-full h-10 pl-10 pr-4 rounded-lg',
                'bg-muted/50 border-0 text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/50',
                'transition-colors duration-200'
              )}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Selected skills (sticky area) */}
        <AnimatePresence>
          {value.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 border-b border-border bg-primary/[0.02]">
                <div className="flex flex-wrap gap-2">
                  {value.map((skill) => (
                    <motion.span
                      key={skill}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                        'bg-primary text-primary-foreground text-xs font-medium',
                        'group'
                      )}
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-0.5 hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </motion.span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {value.length}/{MAX_SKILLS} kỹ năng
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories & Skills list */}
        <div className="max-h-64 overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Không tìm thấy kỹ năng phù hợp
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {filteredCategories.map((category) => {
                const isExpanded = expandedCategories[category.category]
                const selectedInCategory = category.skills.filter(s => value.includes(s)).length

                return (
                  <div key={category.category}>
                    {/* Category header */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.category)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2',
                        'rounded-lg text-sm font-medium',
                        'hover:bg-muted/50 transition-colors duration-150',
                        'text-foreground'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {category.category}
                        {selectedInCategory > 0 && (
                          <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {selectedInCategory}
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          'text-muted-foreground transition-transform duration-200',
                          isExpanded ? 'rotate-180' : ''
                        )}
                      />
                    </button>

                    {/* Skills grid */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-1 pb-2 px-1">
                            <div className="flex flex-wrap gap-1.5">
                              {category.skills.map((skill) => {
                                const isSelected = value.includes(skill)
                                const isDisabled = isMaxReached && !isSelected

                                return (
                                  <motion.button
                                    key={skill}
                                    type="button"
                                    onClick={() => !isDisabled && toggleSkill(skill)}
                                    disabled={isDisabled}
                                    whileTap={!isDisabled ? { scale: 0.95 } : {}}
                                    className={cn(
                                      'px-3 py-1.5 rounded-lg text-xs font-medium',
                                      'transition-all duration-150',
                                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                                      isSelected
                                        ? 'bg-primary text-primary-foreground'
                                        : isDisabled
                                          ? 'bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50'
                                          : 'bg-muted text-foreground hover:bg-primary/10 hover:text-primary'
                                    )}
                                  >
                                    {skill}
                                  </motion.button>
                                )
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}

      {/* Help text */}
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Chọn tối đa {MAX_SKILLS} kỹ năng phù hợp với bạn
        </p>
      )}
    </div>
  )
}

export default SkillsSelector

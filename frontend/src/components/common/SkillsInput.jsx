import { useState, useRef } from 'react'
import { cn } from '~/lib/utils'
import { SKILLS_OPTIONS } from '~/data/profileData'

/**
 * SkillsInput - Hybrid component (Dropdown + Tag Input)
 * Cho phép chọn từ dropdown hoặc nhập tự do
 */
const SkillsInput = ({
  label,
  name,
  value = [],
  onChange,
  options = SKILLS_OPTIONS,
  maxSkills = 10,
  error = '',
  required = false,
  placeholder = 'Nhập hoặc chọn kỹ năng...',
  className = ''
}) => {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef(null)

  // Filter suggestions based on input
  const filteredSuggestions = options.filter(
    (skill) =>
      skill.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(skill)
  )

  // Get custom skills (not in predefined list)
  const customSkills = value.filter((skill) => !options.includes(skill))

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    setShowSuggestions(true)
    setHighlightedIndex(-1)
  }

  const addSkill = (skill) => {
    if (value.length >= maxSkills) return
    if (!skill.trim()) return
    if (value.includes(skill)) return

    onChange([...value, skill.trim()])
    setInputValue('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeSkill = (skillToRemove) => {
    onChange(value.filter((skill) => skill !== skillToRemove))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        addSkill(filteredSuggestions[highlightedIndex])
      } else if (inputValue.trim()) {
        addSkill(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeSkill(value[value.length - 1])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-lg font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Container */}
      <div className="relative">
        <div
          className={cn(
            'min-h-12 w-full px-3 py-2 rounded-lg border-2 transition-all',
            'flex flex-wrap gap-2 items-start',
            error
              ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-200'
              : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200',
            showSuggestions && 'rounded-b-none'
          )}
        >
          {/* Selected skills as tags */}
          {value.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-base"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="ml-2 w-5 h-5 rounded-full hover:bg-blue-200 flex items-center justify-center"
                aria-label={`Xóa ${skill}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : 'Nhập thêm...'}
            disabled={value.length >= maxSkills}
            className={cn(
              'flex-1 min-w-[150px] h-10 text-lg outline-none bg-transparent',
              value.length >= maxSkills && 'opacity-50'
            )}
          />
        </div>

        {/* Counter */}
        <div className="mt-1 text-base text-gray-500">
          {value.length} / {maxSkills} kỹ năng
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            className={cn(
              'absolute z-10 w-full bg-white border-2 border-t-0 border-gray-300 rounded-b-lg shadow-lg max-h-60 overflow-y-auto'
            )}
          >
            {filteredSuggestions.slice(0, 10).map((skill, index) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className={cn(
                  'w-full px-4 py-3 text-lg text-left hover:bg-blue-50 transition-colors',
                  index === highlightedIndex && 'bg-blue-50'
                )}
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-base text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

export default SkillsInput
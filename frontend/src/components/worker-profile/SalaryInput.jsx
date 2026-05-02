import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * SalaryInput Component
 * - Number input với format tiền Việt (Intl.NumberFormat 'vi-VN')
 * - Preset buttons: 3-5M, 5-10M, 10-15M, 15M+
 * - Validation: 0 ≤ salary ≤ 1,000,000,000
 */

// Format number to Vietnamese currency format
const formatNumber = (num) => {
  if (!num && num !== 0) return ''
  return new Intl.NumberFormat('vi-VN').format(num)
}

// Parse formatted string back to number
const parseNumber = (str) => {
  if (!str) return 0
  const cleaned = str.replace(/[.\s]/g, '')
  return parseInt(cleaned, 10) || 0
}

function SalaryInput ({
  value = 0,
  onChange,
  label = 'Mức lương kỳ vọng',
  placeholder = 'VD: 5.000.000',
  error,
  required,
  id = 'targetSalary'
}) {
  // Preset ranges: [min, max] triệu VND
  const PRESETS = [
    { label: '3-5M', min: 3, max: 5, value: 4 },
    { label: '5-10M', min: 5, max: 10, value: 7.5 },
    { label: '10-15M', min: 10, max: 15, value: 12.5 },
    { label: '15M+', min: 15, max: Infinity, value: 20 }
  ]

  const [inputValue, setInputValue] = useState(() => {
    // Initialize from value (convert from number to formatted string)
    if (value && value > 0) {
      return formatNumber(value)
    }
    return ''
  })

  // Determine which preset is active based on current value
  const activePreset = useMemo(() => {
    if (!value || value === 0) return null
    return PRESETS.find(p => {
      if (p.max === Infinity) {
        return value >= p.min * 1000000
      }
      return value >= p.min * 1000000 && value <= p.max * 1000000
    })?.label || null
  }, [value])

  // Handle input change
  const handleInputChange = (e) => {
    const rawValue = e.target.value
    // Only allow numbers
    if (rawValue && !/^\d*$/.test(rawValue.replace(/[.\s]/g, ''))) {
      return
    }
    setInputValue(rawValue)
    
    // Parse and update parent
    const numValue = parseNumber(rawValue)
    onChange?.(numValue)
  }

  // Handle preset click
  const handlePresetClick = (preset) => {
    const salaryValue = Math.round(preset.value * 1000000) // Convert to VND
    setInputValue(formatNumber(salaryValue))
    onChange?.(salaryValue)
  }

  // Handle blur - format the number
  const handleBlur = () => {
    const numValue = parseNumber(inputValue)
    if (numValue > 0) {
      setInputValue(formatNumber(numValue))
    }
  }

  // Handle focus - allow raw input
  const handleFocus = () => {
    if (inputValue) {
      const numValue = parseNumber(inputValue)
      setInputValue(numValue > 0 ? numValue.toString() : '')
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
      )}

      <div className="space-y-3">
        {/* Input field with VND suffix */}
        <div className="relative">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            className={cn(
              'w-full h-12 px-4 pr-14 rounded-lg border bg-background',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'focus:ring-primary/50 focus:border-primary',
              'transition-colors duration-200',
              error ? 'border-destructive focus:ring-destructive' : 'border-input'
            )}
          />
          {/* VND suffix */}
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
            VND
          </span>
        </div>

        {/* Preset buttons */}
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((preset) => {
            const isActive = activePreset === preset.label
            return (
              <motion.button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'py-2 px-3 rounded-lg border-2 text-xs font-medium',
                  'transition-all duration-200 cursor-pointer select-none',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  isActive
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {preset.label}
              </motion.button>
            )
          })}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  )
}

export default SalaryInput

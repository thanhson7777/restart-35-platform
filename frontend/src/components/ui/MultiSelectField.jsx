import React, { useState, useRef, useEffect } from 'react'

const ChevronIcon = ({ open }) => (
  <svg
    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
  </svg>
)

function MultiSelectField({
  label,
  options = [],
  selectedValues = [],
  onChange,
  placeholder = '-- Chọn --',
  icon,
  error,
  required,
  disabled,
  hint,
  id,
  loading,
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = (optValue) => {
    if (selectedValues.includes(optValue)) {
      onChange(selectedValues.filter(v => v !== optValue))
    } else {
      onChange([...selectedValues, optValue])
    }
  }

  const handleOpen = () => {
    if (!disabled) {
      setOpen(!open)
    }
  }

  // Generate display text
  let displayText = placeholder
  if (selectedValues.length > 0) {
    if (selectedValues.length === 1) {
      const selectedOpt = options.find(o => o.value === selectedValues[0])
      displayText = selectedOpt ? selectedOpt.label : placeholder
    } else if (selectedValues.length === options.length && options.length > 0) {
      displayText = 'Đã chọn tất cả'
    } else {
      displayText = `Đã chọn ${selectedValues.length} mục`
    }
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
          {hint && <span className="ml-1 text-xs text-muted-foreground font-normal">{hint}</span>}
        </label>
      )}
      <div ref={wrapperRef} className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground z-10">
            {icon}
          </div>
        )}
        <button
          type="button"
          id={id}
          onClick={handleOpen}
          disabled={disabled}
          className={`
            w-full bg-background border rounded-lg
            ${icon ? 'pl-10' : 'pl-4'} pr-8 py-2.5 text-sm text-left
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            transition-colors duration-200 cursor-pointer
            flex items-center justify-between
            disabled:opacity-40 disabled:cursor-not-allowed
            ${error ? 'border-destructive' : 'border-input'}
          `}
        >
          <span className={selectedValues.length > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
            {displayText}
          </span>
          <ChevronIcon open={open} />
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-lg shadow-lg z-50 overflow-hidden">
            <ul className="max-h-56 overflow-y-auto py-1">
              {loading ? (
                <li className="px-3 py-2 text-sm text-muted-foreground text-center">
                  Đang tải...
                </li>
              ) : options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground text-center">
                  Không có lựa chọn
                </li>
              ) : (
                options.map((opt) => {
                  const isSelected = selectedValues.includes(opt.value)
                  return (
                    <li key={opt.value}>
                      <label className={`
                        flex items-center gap-3 w-full px-3 py-2 text-sm text-left cursor-pointer
                        hover:bg-primary/5 transition-colors duration-150
                      `}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(opt.value)}
                          className="w-4 h-4 text-primary rounded border-input focus:ring-primary"
                        />
                        <span className={isSelected ? 'text-primary font-medium' : 'text-foreground'}>
                          {opt.label}
                        </span>
                      </label>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  )
}

export { MultiSelectField }

import React from 'react'

const MaleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="14" r="5" />
    <path d="M19 5l-5.4 5.4M15 5h4v4" />
  </svg>
)

const FemaleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="9" r="5" />
    <path d="M12 14v7M9 18h6" />
  </svg>
)

const OtherIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8M8 12h8" />
  </svg>
)

const GENDER_ICONS = {
  male: MaleIcon,
  female: FemaleIcon,
  other: OtherIcon
}

function GenderField({ value, onChange, error }) {
  const options = [
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Khác' }
  ]

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Giới tính <span className="text-destructive">*</span>
      </label>

      <div className="grid grid-cols-3 gap-3">
        {options.map((option) => {
          const Icon = GENDER_ICONS[option.value]
          const isSelected = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`
                relative flex flex-col items-center justify-center gap-1.5 p-3
                rounded-xl border-2 transition-all duration-200 cursor-pointer select-none
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                ${isSelected
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/2'
                }
                ${error ? 'border-destructive' : ''}
              `}
            >
              <Icon />
              <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                {option.label}
              </span>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-xs text-destructive mt-1 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  )
}

export default GenderField

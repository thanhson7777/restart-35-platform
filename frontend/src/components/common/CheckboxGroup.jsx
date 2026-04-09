import { cn } from '~/lib/utils'

/**
 * CheckboxGroup - Component với clickable area bao trọn cả label + description
 * Phù hợp cho người lớn tuổi (accessible)
 */
const CheckboxGroup = ({
  label,
  name,
  options = [],
  value = [], // Array of selected values
  onChange,
  error = '',
  required = false,
  className = '',
  direction = 'vertical' // 'horizontal' | 'vertical'
}) => {
  const handleChange = (optionValue, checked) => {
    if (checked) {
      onChange([...value, optionValue])
    } else {
      onChange(value.filter((v) => v !== optionValue))
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-lg font-medium text-gray-700 mb-3">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div
        className={cn(
          direction === 'horizontal'
            ? 'flex flex-wrap gap-3'
            : 'flex flex-col gap-3'
        )}
      >
        {options.map((option) => {
          const isSelected = value.includes(option.value)
          return (
            <label
              key={option.value}
              className={cn(
                'relative flex items-start p-4 rounded-xl cursor-pointer transition-all duration-200',
                'border-2',
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300',
                'focus-within:ring-2 focus-within:ring-blue-200 focus-within:ring-offset-2'
              )}
            >
              {/* Hidden native checkbox */}
              <input
                type="checkbox"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={(e) => handleChange(option.value, e.target.checked)}
                className="sr-only"
              />

              {/* Custom checkbox indicator */}
              <div
                className={cn(
                  'w-6 h-6 rounded-md border-2 mr-3 mt-0.5 flex items-center justify-center flex-shrink-0 transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                )}
              >
                {isSelected && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <span
                  className={cn(
                    'block text-lg select-none',
                    isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'
                  )}
                >
                  {option.label}
                </span>
                {option.description && (
                  <span
                    className={cn(
                      'block text-base mt-1',
                      isSelected ? 'text-blue-600' : 'text-gray-500'
                    )}
                  >
                    {option.description}
                  </span>
                )}
              </div>
            </label>
          )
        })}
      </div>

      {error && typeof error === 'string' && (
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

export default CheckboxGroup
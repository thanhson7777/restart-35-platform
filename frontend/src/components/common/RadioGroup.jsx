import { cn } from '~/lib/utils'

/**
 * RadioGroup - Component với clickable area bao trọn cả label
 * Phù hợp cho người lớn tuổi (accessible)
 */
const RadioGroup = ({
  label,
  name,
  options = [],
  value,
  onChange,
  error = '',
  required = false,
  className = '',
  direction = 'horizontal' // 'horizontal' | 'vertical'
}) => {
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
          const isSelected = value === option.value
          return (
            <label
              key={option.value}
              className={cn(
                'relative flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200',
                'border-2',
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300',
                'focus-within:ring-2 focus-within:ring-blue-200 focus-within:ring-offset-2'
              )}
            >
              {/* Hidden native radio - vẫn hoạt động với keyboard navigation */}
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only" // Visually hidden nhưng vẫn accessible
              />

              {/* Custom radio indicator */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                )}
              >
                {isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                )}
              </div>

              {/* Label text */}
              <span
                className={cn(
                  'text-lg select-none',
                  isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'
                )}
              >
                {option.label}
              </span>
            </label>
          )
        })}
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

export default RadioGroup
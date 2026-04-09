import { cn } from '~/lib/utils'
import { STEP_LABELS } from '~/data/profileData'

/**
 * ProgressBar - Hiển thị tiến trình các bước
 * Với clickable area để navigate giữa các step (nếu đã hoàn thành)
 */
const ProgressBar = ({
  currentStep = 1,
  totalSteps = 4,
  completedSteps = [],
  onStepClick = null,
  className = ''
}) => {
  return (
    <div className={cn('w-full', className)}>
      {/* Desktop View */}
      <div className="hidden md:flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1
          const isCompleted = completedSteps.includes(stepNumber) || stepNumber < currentStep
          const isCurrent = stepNumber === currentStep

          return (
            <div key={stepNumber} className="flex items-center">
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onStepClick && isCompleted && onStepClick(stepNumber)}
                  disabled={!onStepClick || !isCompleted}
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300',
                    isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : isCompleted
                      ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                      : 'bg-gray-200 text-gray-500',
                    onStepClick && isCompleted && 'hover:scale-110'
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </button>
                <span
                  className={cn(
                    'mt-2 text-base font-medium text-center max-w-24',
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  )}
                >
                  {STEP_LABELS[index]}
                </span>
              </div>

              {/* Connector line */}
              {stepNumber < totalSteps && (
                <div
                  className={cn(
                    'flex-1 h-2 mx-4 rounded-full transition-all duration-500',
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  )}
                  style={{ minWidth: '60px' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile View - Compact */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-medium text-blue-600">
            Bước {currentStep} / {totalSteps}
          </span>
          <span className="text-lg text-gray-600">
            {STEP_LABELS[currentStep - 1]}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default ProgressBar
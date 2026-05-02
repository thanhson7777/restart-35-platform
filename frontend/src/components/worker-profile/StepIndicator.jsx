import React from 'react'
import { motion } from 'framer-motion'
import { STEP_LABELS } from '~/data/profileData'

const CheckIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

function StepIndicator({ currentStep = 1, totalSteps = 4, isProfileCompleted = false }) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1)

  return (
    <div className="w-full mb-8">
      {/* Mobile: vertical layout */}
      <div className="hidden max-w-md mx-auto sm:block">
        {/* Desktop horizontal */}
        <div className="flex items-center justify-between relative">
          {/* Completed badge */}
          {isProfileCompleted && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Đã hoàn thành
            </div>
          )}

          {/* Connecting line bg */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-border -z-0 mx-8" />

          {steps.map((step) => {
            const isCompleted = step < currentStep
            const isActive = step === currentStep
            const isPending = step > currentStep

            return (
              <motion.div
                key={step}
                className="relative z-10 flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: step * 0.1, duration: 0.3 }}
              >
                {/* Circle */}
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-all duration-300
                    ${isCompleted
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isActive
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-background border-2 border-border text-muted-foreground'
                    }
                  `}
                >
                  {isCompleted ? <CheckIcon /> : step}
                </div>

                {/* Label */}
                <span
                  className={`
                    text-xs font-medium text-center leading-tight max-w-[80px]
                    transition-colors duration-300
                    ${isActive
                      ? 'text-primary font-semibold'
                      : isCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }
                  `}
                >
                  {STEP_LABELS[step - 1]}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Mobile: compact horizontal step bar */}
      <div className="sm:hidden px-4">
        <div className="flex items-center gap-3">
          {steps.map((step) => {
            const isCompleted = step < currentStep
            const isActive = step === currentStep
            return (
              <React.Fragment key={step}>
                <div
                  className={`
                    flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                    transition-all duration-300
                    ${isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                        ? 'bg-primary text-primary-foreground ring-3 ring-primary/20'
                        : 'bg-muted text-muted-foreground border border-border'
                    }
                  `}
                >
                  {isCompleted ? <CheckIcon /> : step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                      step < currentStep ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
        <p className="mt-3 text-center text-sm font-medium text-primary">
          Bước {currentStep}: {STEP_LABELS[currentStep - 1]}
        </p>
      </div>
    </div>
  )
}

export default StepIndicator

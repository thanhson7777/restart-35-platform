import { useEffect, useRef } from 'react'
import InputField from '~/components/common/InputField'
import CheckboxGroup from '~/components/common/CheckboxGroup'
import { BARRIER_OPTIONS } from '~/data/profileData'

const StepBarriers = ({
  data,
  errors,
  onChange,
  stepRef
}) => {
  const firstInputRef = useRef(null)

  // Autofocus on mount
  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus()
    }
  }, [])

  const handleCheckboxChange = (selectedValues) => {
    // Ensure otherDescription is preserved
    onChange({
      ...data,
      health: selectedValues.includes('health'),
      family: selectedValues.includes('family'),
      techGap: selectedValues.includes('techGap'),
      location: selectedValues.includes('location'),
      other: selectedValues.includes('other')
    })
  }

  const handleOtherDescriptionChange = (value) => {
    onChange({
      ...data,
      otherDescription: value
    })
  }

  // Convert barrier flags to array for CheckboxGroup
  const selectedBarriers = Object.entries(data || {})
    .filter(([key, value]) => value === true && key !== 'otherDescription')
    .map(([key]) => key)

  return (
    <div ref={stepRef} className="space-y-6">
      <div className="mb-4">
        <h3 className="text-xl font-medium text-gray-800 mb-2">
          Bạn đang gặp những khó khăn nào?
        </h3>
        <p className="text-lg text-gray-600">
          Chọn tất cả những rào cản mà bạn đang đối mặt khi tìm việc làm
        </p>
      </div>

      <CheckboxGroup
        label=""
        name="barriers"
        options={BARRIER_OPTIONS}
        value={selectedBarriers}
        onChange={handleCheckboxChange}
        error={errors}
      />

      {/* Other description */}
      {data?.other && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
          <InputField
            ref={firstInputRef}
            label="Mô tả rào cản khác"
            name="otherDescription"
            value={data.otherDescription || ''}
            onChange={(e) => handleOtherDescriptionChange(e.target.value)}
            placeholder="VD: Tôi cần chăm sóc vợ đang bệnh..."
            required={data?.other}
            error={errors?.otherDescription}
          />
        </div>
      )}

      {/* Helper text */}
      <div className="bg-blue-50 p-4 rounded-xl">
        <p className="text-lg text-blue-700">
          <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Những thông tin này giúp chúng tôi hiểu rõ hơn về hoàn cảnh của bạn 
          và đề xuất những giải pháp phù hợp nhất.
        </p>
      </div>
    </div>
  )
}

export default StepBarriers
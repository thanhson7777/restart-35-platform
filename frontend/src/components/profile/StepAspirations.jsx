import { useEffect, useRef } from 'react'
import InputField from '~/components/common/InputField'
import SelectField from '~/components/common/SelectField'
import RadioGroup from '~/components/common/RadioGroup'
import SkillsInput from '~/components/common/SkillsInput'
import { JOB_TYPE_OPTIONS, VIETNAM_PROVINCES } from '~/data/profileData'

const StepAspirations = ({
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

  const handleChange = (field, value) => {
    onChange({
      ...data,
      [field]: value
    })
  }

  const handleSalaryChange = (value) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '')
    onChange({
      ...data,
      targetSalary: numericValue ? parseInt(numericValue) : ''
    })
  }

  const formatSalary = (value) => {
    if (!value) return ''
    return new Intl.NumberFormat('vi-VN').format(value)
  }

  return (
    <div ref={stepRef} className="space-y-6">
      <div className="mb-4">
        <h3 className="text-xl font-medium text-gray-800 mb-2">
          Bạn mong muốn điều gì?
        </h3>
        <p className="text-lg text-gray-600">
          Chia sẻ về công việc và môi trường làm việc mà bạn mong muốn
        </p>
      </div>

      {/* Target Job */}
      <InputField
        ref={firstInputRef}
        label="Công việc mong muốn"
        name="targetJob"
        value={data.targetJob || ''}
        onChange={(e) => handleChange('targetJob', e.target.value)}
        placeholder="VD: Nhân viên bán hàng, Phụ bếp, Bảo vệ..."
        error={errors?.targetJob}
      />

      {/* Target Salary */}
      <div>
        <InputField
          label="Mức lương mong muốn (VND / tháng)"
          name="targetSalary"
          value={formatSalary(data.targetSalary) || ''}
          onChange={(e) => handleSalaryChange(e.target.value)}
          placeholder="VD: 8.000.000"
          error={errors?.targetSalary}
        />
        {data.targetSalary && (
          <p className="mt-2 text-lg text-green-600 font-medium">
            = {formatSalary(data.targetSalary)} VNĐ/tháng
          </p>
        )}
      </div>

      {/* Target Province */}
      <SelectField
        label="Tỉnh / Thành phố làm việc"
        name="targetProvince"
        value={data.targetProvince || ''}
        onChange={(e) => handleChange('targetProvince', e.target.value)}
        options={VIETNAM_PROVINCES.map((p) => ({ value: p, label: p }))}
        placeholder="Chọn tỉnh/thành phố bạn muốn làm việc..."
        error={errors?.targetProvince}
      />

      {/* Preferred Job Type */}
      <RadioGroup
        label="Loại công việc ưa thích"
        name="preferredJobType"
        options={JOB_TYPE_OPTIONS}
        value={data.preferredJobType || ''}
        onChange={(value) => handleChange('preferredJobType', value)}
        error={errors?.preferredJobType}
      />

      {/* Skills */}
      <SkillsInput
        label="Kỹ năng của bạn"
        name="skills"
        value={data.skills || []}
        onChange={(value) => handleChange('skills', value)}
        error={errors?.skills}
      />

      {/* Additional Description */}
      <div>
        <label className="block text-lg font-medium text-gray-700 mb-2">
          Mô tả thêm
        </label>
        <textarea
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Chia sẻ thêm về mong muốn, điều kiện làm việc, hoặc bất kỳ điều gì khác..."
          rows={4}
          className="w-full px-4 py-3 text-lg rounded-lg border-2 border-gray-300 
                     focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
                     focus:outline-none transition-all resize-none"
        />
      </div>

      {/* Helper text */}
      <div className="bg-green-50 p-4 rounded-xl">
        <p className="text-lg text-green-700">
          <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Dựa trên thông tin này, hệ thống sẽ gợi ý những công việc phù hợp nhất với bạn!
        </p>
      </div>
    </div>
  )
}

export default StepAspirations
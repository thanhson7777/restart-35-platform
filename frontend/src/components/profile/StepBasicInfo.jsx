import { useEffect, useRef } from 'react'
import InputField from '~/components/common/InputField'
import SelectField from '~/components/common/SelectField'
import RadioGroup from '~/components/common/RadioGroup'
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, EDUCATION_OPTIONS, VIETNAM_PROVINCES } from '~/data/profileData'

const StepBasicInfo = ({
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

  return (
    <div ref={stepRef} className="space-y-6">
      {/* Age */}
      <InputField
        ref={firstInputRef}
        label="Tuổi"
        name="age"
        type="number"
        min="35"
        max="65"
        value={data.age || ''}
        onChange={(e) => handleChange('age', parseInt(e.target.value) || '')}
        placeholder="Nhập tuổi của bạn (35-65)"
        error={errors?.age}
        required
      />

      {/* Gender */}
      <RadioGroup
        label="Giới tính"
        name="gender"
        options={GENDER_OPTIONS}
        value={data.gender || ''}
        onChange={(value) => handleChange('gender', value)}
        error={errors?.gender}
        required
      />

      {/* Province */}
      <SelectField
        label="Tỉnh / Thành phố"
        name="province"
        value={data.province || ''}
        onChange={(e) => handleChange('province', e.target.value)}
        options={VIETNAM_PROVINCES.map((p) => ({ value: p, label: p }))}
        placeholder="Chọn tỉnh/thành phố..."
        error={errors?.province}
        required
      />

      {/* Education */}
      <SelectField
        label="Trình độ học vấn"
        name="education"
        value={data.education || ''}
        onChange={(e) => handleChange('education', e.target.value)}
        options={EDUCATION_OPTIONS}
        placeholder="Chọn trình độ học vấn..."
        error={errors?.education}
        required
      />

      {/* Marital Status */}
      <RadioGroup
        label="Tình trạng hôn nhân"
        name="maritalStatus"
        options={MARITAL_STATUS_OPTIONS}
        value={data.maritalStatus || ''}
        onChange={(value) => handleChange('maritalStatus', value)}
        error={errors?.maritalStatus}
        required
      />

      {/* Phone (optional) */}
      <InputField
        label="Số điện thoại"
        name="phone"
        type="tel"
        value={data.phone || ''}
        onChange={(e) => handleChange('phone', e.target.value)}
        placeholder="Nhập số điện thoại (không bắt buộc)"
        error={errors?.phone}
      />
    </div>
  )
}

export default StepBasicInfo
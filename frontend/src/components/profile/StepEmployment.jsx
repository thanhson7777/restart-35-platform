import { useEffect, useRef } from 'react'
import InputField from '~/components/common/InputField'
import SelectField from '~/components/common/SelectField'
import Button from '~/components/common/Button'
import { JOB_TYPE_OPTIONS } from '~/data/profileData'

const MAX_JOBS = 3

const EmploymentItem = ({ index, data, onChange, onRemove, errors, canRemove }) => {
  const firstInputRef = useRef(null)

  useEffect(() => {
    if (index === 0 && firstInputRef.current) {
      firstInputRef.current.focus()
    }
  }, [index])

  const handleChange = (field, value) => {
    onChange({
      ...data,
      [field]: value
    })
  }

  return (
    <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-lg font-medium text-gray-700">
          Công việc {index + 1}
        </h4>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-500 hover:text-red-500 transition-colors"
            aria-label={`Xóa công việc ${index + 1}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          ref={index === 0 ? firstInputRef : null}
          label="Tên công ty"
          name={`companyName-${index}`}
          value={data.companyName || ''}
          onChange={(e) => handleChange('companyName', e.target.value)}
          placeholder="VD: Công ty ABC"
        />

        <InputField
          label="Vị trí / Chức danh"
          name={`position-${index}`}
          value={data.position || ''}
          onChange={(e) => handleChange('position', e.target.value)}
          placeholder="VD: Nhân viên bán hàng"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          label="Thời gian làm việc (tháng)"
          name={`duration-${index}`}
          type="number"
          min="0"
          max="600"
          value={data.duration || ''}
          onChange={(e) => handleChange('duration', parseInt(e.target.value) || '')}
          placeholder="VD: 24 (tức 2 năm)"
        />

        <SelectField
          label="Loại công việc"
          name={`jobType-${index}`}
          value={data.jobType || ''}
          onChange={(e) => handleChange('jobType', e.target.value)}
          options={JOB_TYPE_OPTIONS}
          placeholder="Chọn loại..."
        />
      </div>

      <div>
        <label className="block text-lg font-medium text-gray-700 mb-2">
          Mô tả công việc
        </label>
        <textarea
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Mô tả ngắn gọn công việc đã làm..."
          rows={3}
          className="w-full px-4 py-3 text-lg rounded-lg border-2 border-gray-300 
                     focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
                     focus:outline-none transition-all resize-none"
        />
      </div>

      {errors && (
        <p className="text-base text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errors}
        </p>
      )}
    </div>
  )
}

const StepEmployment = ({
  data = [],
  errors,
  onChange,
  stepRef
}) => {
  const handleAddJob = () => {
    if (data.length >= MAX_JOBS) return
    onChange([
      ...data,
      {
        companyName: '',
        position: '',
        duration: '',
        jobType: '',
        description: ''
      }
    ])
  }

  const handleRemoveJob = (index) => {
    onChange(data.filter((_, i) => i !== index))
  }

  const handleJobChange = (index, updatedJob) => {
    const newData = [...data]
    newData[index] = updatedJob
    onChange(newData)
  }

  return (
    <div ref={stepRef} className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-lg text-gray-600">
          Số công việc: <strong>{data.length}</strong> / {MAX_JOBS}
        </p>
      </div>

      {/* Employment list */}
      <div className="space-y-4">
        {data.map((job, index) => (
          <EmploymentItem
            key={index}
            index={index}
            data={job}
            onChange={(updatedJob) => handleJobChange(index, updatedJob)}
            onRemove={() => handleRemoveJob(index)}
            canRemove={data.length > 0}
            errors={errors?.[index]}
          />
        ))}
      </div>

      {/* Add job button */}
      {data.length < MAX_JOBS && (
        <Button
          type="button"
          variant="outline"
          onClick={handleAddJob}
          className="w-full"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm công việc
        </Button>
      )}

      {/* No experience option */}
      {data.length === 0 && (
        <div className="text-center py-6">
          <p className="text-lg text-gray-500 mb-4">
            Bạn chưa có công việc nào để khai báo?
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddJob}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Tôi chưa có công việc nào
          </Button>
        </div>
      )}
    </div>
  )
}

export default StepEmployment
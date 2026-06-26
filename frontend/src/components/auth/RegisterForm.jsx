import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { SelectField } from '@/components/ui/SelectField'
import { MultiSelectField } from '@/components/ui/index'
import GenderField from '@/components/worker-profile/GenderField'
import ProvinceField from '@/components/worker-profile/ProvinceField'
import { registerUserAPI } from '@/redux/user/userSlice'
import { publicAxiosInstance } from '~/utils/authorizeAxios'
import { fetchProvinces } from '~/services/locationService'
import {
  EMAIL_RULE,
  EMAIL_RULE_MESSAGE,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
  PHONE_RULE,
  PHONE_RULE_MESSAGE
} from '~/utils/validators'
import { 
  EDUCATION_OPTIONS, 
  MARITAL_STATUS_OPTIONS,
  INDUSTRY_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  TRAINER_EXPERIENCE_OPTIONS,
  TRAINING_CATEGORIES_OPTIONS,
  NGO_FOCUS_AREAS_OPTIONS,
  VIETNAM_PROVINCES
} from '~/data/profileData'

const UserIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const MailIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

const PhoneIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 }
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}

const PasswordStrengthIndicator = ({ password }) => {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels = [
    { label: 'Yếu', color: 'bg-destructive' },
    { label: 'Trung bình', color: 'bg-warning' },
    { label: 'Mạnh', color: 'bg-secondary' }
  ]
  const levelIndex = Math.min(Math.floor(score / 2), 2)

  if (!password) return null

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= levelIndex ? levels[levelIndex].color : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${levelIndex === 0 ? 'text-destructive' : levelIndex === 1 ? 'text-warning' : 'text-secondary'}`}>
        {levels[levelIndex].label}
      </p>
    </div>
  )
}

const CheckboxGroup = ({ options, selectedValues, onChange, error, label }) => {
  const toggleValue = (val) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val))
    } else {
      onChange([...selectedValues, val])
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label} <span className="text-destructive">*</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={selectedValues.includes(opt.value)}
              onChange={() => toggleValue(opt.value)}
              className="w-4 h-4 text-primary rounded border-input focus:ring-primary"
            />
            <span className="text-sm font-medium">{opt.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

// ===== Common: Check Tax Code (for Enterprise & Trainer Organization) =====
const TaxCodeInput = ({ value, onChange, onAutoFill, error, touched, label = "Mã số thuế" }) => {
  const [isChecking, setIsChecking] = useState(false)

  const checkTaxCode = async () => {
    if (!value.trim()) {
      toast.error('Vui lòng nhập mã số thuế để kiểm tra.')
      return
    }
    setIsChecking(true)
    try {
      const response = await fetch(`https://api.vietqr.io/v2/business/${value}`)
      const data = await response.json()
      if (data.code === '00' && data.data) {
        onAutoFill(data.data.name, data.data.address)
        toast.success('Lấy thông tin doanh nghiệp thành công!')
      } else {
        toast.error('Không tìm thấy thông tin doanh nghiệp hoặc mã số thuế không hợp lệ.')
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi kiểm tra mã số thuế.')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label} <span className="text-destructive">*</span>
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nhập mã số thuế"
          value={value}
          onChange={(e) => onChange('taxCode', e.target.value)}
          className={`
            flex-1 bg-background border rounded-lg px-4 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            transition-colors duration-200
            ${touched && error ? 'border-destructive' : 'border-input'}
          `}
        />
        <Button type="button" variant="outline" onClick={checkTaxCode} isLoading={isChecking}>
          Tra cứu
        </Button>
      </div>
      {touched && error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ===== Component: BasicInfoStep (Worker) =====
const initialBasicInfo = {
  age: '',
  gender: '',
  province: '01',
  district: '',
  education: '',
  maritalStatus: ''
}

function BasicInfoStep({ basicInfo, setBasicInfo, errors, touched, onChange }) {
  const handleChange = (field, value) => {
    if (field === 'province') {
      setBasicInfo(prev => ({ ...prev, province: value, district: '' }))
    } else {
      setBasicInfo(prev => ({ ...prev, [field]: value }))
    }
    if (errors[field]) onChange(field, '')
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Tuổi <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            min="35" max="65"
            placeholder="35 - 65"
            value={basicInfo.age}
            onChange={(e) => setBasicInfo(prev => ({ ...prev, age: e.target.value }))}
            onBlur={(e) => {
              const val = parseInt(e.target.value)
              if (e.target.value !== '' && (isNaN(val) || val < 35 || val > 65)) onChange('age', '')
            }}
            className={`
              w-full bg-background border rounded-lg px-4 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
              ${touched.age && errors.age ? 'border-destructive' : 'border-input'}
            `}
          />
          {touched.age && errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
        </div>
        <GenderField
          value={basicInfo.gender}
          onChange={(value) => handleChange('gender', value)}
          error={touched.gender ? errors.gender : ''}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <ProvinceField
          province={basicInfo.province}
          district={basicInfo.district}
          onProvinceChange={(value) => handleChange('province', value)}
          onDistrictChange={(value) => handleChange('district', value)}
          errors={errors}
        />
      </motion.div>
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="Trình độ học vấn"
          value={basicInfo.education}
          options={EDUCATION_OPTIONS}
          onChange={(val) => handleChange('education', val)}
          placeholder="-- Chọn trình độ --"
          error={touched.education ? errors.education : ''}
          required
        />
        <SelectField
          label="Tình trạng hôn nhân"
          value={basicInfo.maritalStatus}
          options={MARITAL_STATUS_OPTIONS}
          onChange={(val) => handleChange('maritalStatus', val)}
          placeholder="-- Chọn tình trạng --"
          error={touched.maritalStatus ? errors.maritalStatus : ''}
          required
        />
      </motion.div>
    </motion.div>
  )
}

// ===== Component: EnterpriseInfoStep =====
function EnterpriseInfoStep({ orgInfo, setOrgInfo, errors, touched, onChange }) {
  const [industryOptions, setIndustryOptions] = useState([])
  const [companySizeOptions, setCompanySizeOptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchMasterData = async () => {
      setIsLoading(true)
      try {
        // Lấy dữ liệu Lĩnh vực hoạt động
        const industryResponse = await publicAxiosInstance.get('/v1/master-data?type=industry')
        const industryList = industryResponse.data?.data || []
        const formattedIndustryOptions = industryList.map(item => ({
          value: item.value || item.code || item.id,
          label: item.label || item.name
        }))
        
        if (formattedIndustryOptions.length > 0) {
          setIndustryOptions(formattedIndustryOptions)
        } else {
          setIndustryOptions(INDUSTRY_OPTIONS)
        }

        // Lấy dữ liệu Quy mô nhân sự
        const companySizeResponse = await publicAxiosInstance.get('/v1/master-data?type=company_size')
        const companySizeList = companySizeResponse.data?.data || []
        const formattedCompanySizeOptions = companySizeList.map(item => ({
          value: item.value || item.code || item.id,
          label: item.label || item.name
        }))
        
        if (formattedCompanySizeOptions.length > 0) {
          setCompanySizeOptions(formattedCompanySizeOptions)
        } else {
          setCompanySizeOptions(COMPANY_SIZE_OPTIONS)
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu master data:', error)
        setIndustryOptions(INDUSTRY_OPTIONS)
        setCompanySizeOptions(COMPANY_SIZE_OPTIONS)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMasterData()
  }, [])

  const handleChange = (field, value) => {
    setOrgInfo(prev => ({ ...prev, [field]: value }))
    if (errors[field]) onChange(field, '')
  }

  const handleAutoFill = (name, address) => {
    setOrgInfo(prev => ({ ...prev, name: name || prev.name, address: address || prev.address }))
    onChange('name', '')
    onChange('address', '')
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      <motion.div variants={itemVariants}>
        <TaxCodeInput
          value={orgInfo.taxCode}
          onChange={handleChange}
          onAutoFill={handleAutoFill}
          error={errors.taxCode}
          touched={touched.taxCode}
        />
      </motion.div>
      <motion.div variants={itemVariants} className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Tên doanh nghiệp <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          placeholder="Công ty CP..."
          value={orgInfo.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full bg-background border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${touched.name && errors.name ? 'border-destructive' : 'border-input'}`}
        />
        {touched.name && errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </motion.div>
      <motion.div variants={itemVariants} className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Địa chỉ trụ sở <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          placeholder="Số nhà, đường, phường, quận..."
          value={orgInfo.address}
          onChange={(e) => handleChange('address', e.target.value)}
          className={`w-full bg-background border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${touched.address && errors.address ? 'border-destructive' : 'border-input'}`}
        />
        {touched.address && errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
      </motion.div>
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="Lĩnh vực hoạt động"
          value={orgInfo.industry}
          options={industryOptions.length > 0 ? industryOptions : INDUSTRY_OPTIONS}
          onChange={(val) => handleChange('industry', val)}
          placeholder={isLoading ? "-- Đang tải... --" : "-- Chọn lĩnh vực --"}
          error={touched.industry ? errors.industry : ''}
          required
          disabled={isLoading}
        />
        <SelectField
          label="Quy mô nhân sự"
          value={orgInfo.size}
          options={companySizeOptions.length > 0 ? companySizeOptions : COMPANY_SIZE_OPTIONS}
          onChange={(val) => handleChange('size', val)}
          placeholder={isLoading ? "-- Đang tải... --" : "-- Chọn quy mô --"}
          disabled={isLoading}
        />
      </motion.div>
    </motion.div>
  )
}

// ===== Component: TrainerInfoStep =====
function TrainerInfoStep({ orgInfo, setOrgInfo, errors, touched, onChange }) {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true)
      try {
        const response = await publicAxiosInstance.get('/v1/master-data?type=training_category')
        const dataList = response.data?.data || []
        const formattedOptions = dataList.map(item => ({
          value: item.value || item.code || item.id,
          label: item.label || item.name
        }))
        if (formattedOptions.length > 0) {
          setCategories(formattedOptions)
        } else {
          setCategories(TRAINING_CATEGORIES_OPTIONS)
        }
      } catch (error) {
        console.error('Lỗi lấy master data training_category:', error)
        setCategories(TRAINING_CATEGORIES_OPTIONS)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCategories()
  }, [])

  const handleChange = (field, value) => {
    setOrgInfo(prev => ({ ...prev, [field]: value }))
    if (errors[field]) onChange(field, '')
  }

  const handleAutoFill = (name, address) => {
    setOrgInfo(prev => ({ ...prev, name: name || prev.name, address: address || prev.address }))
    onChange('name', '')
    onChange('address', '')
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      {/* Radio: Individual or Organization */}
      <motion.div variants={itemVariants} className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Loại hình hoạt động <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="trainerType"
              value="organization"
              checked={orgInfo.trainerType === 'organization'}
              onChange={(e) => handleChange('trainerType', e.target.value)}
              className="text-primary focus:ring-primary"
            />
            <span className="text-sm">Trung tâm / Tổ chức</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="trainerType"
              value="individual"
              checked={orgInfo.trainerType === 'individual'}
              onChange={(e) => handleChange('trainerType', e.target.value)}
              className="text-primary focus:ring-primary"
            />
            <span className="text-sm">Cá nhân / Chuyên gia</span>
          </label>
        </div>
      </motion.div>

      {orgInfo.trainerType === 'organization' ? (
        <>
          <motion.div variants={itemVariants} className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Tên trung tâm đào tạo <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="Nhập tên trung tâm..."
              value={orgInfo.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full bg-background border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${touched.name && errors.name ? 'border-destructive' : 'border-input'}`}
            />
            {touched.name && errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </motion.div>
          <motion.div variants={itemVariants}>
            <TaxCodeInput
              value={orgInfo.taxCode}
              onChange={handleChange}
              onAutoFill={handleAutoFill}
              error={errors.taxCode}
              touched={touched.taxCode}
            />
          </motion.div>
        </>
      ) : (
        <>
          <motion.div variants={itemVariants} className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Số CCCD/CMND <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="Nhập số CCCD/CMND"
              value={orgInfo.identityNumber}
              onChange={(e) => handleChange('identityNumber', e.target.value)}
              className={`w-full bg-background border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${touched.identityNumber && errors.identityNumber ? 'border-destructive' : 'border-input'}`}
            />
            {touched.identityNumber && errors.identityNumber && <p className="text-xs text-destructive">{errors.identityNumber}</p>}
          </motion.div>
          <motion.div variants={itemVariants} className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Họ tên đầy đủ (Chuyên gia) <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="Nhập họ và tên..."
              value={orgInfo.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full bg-background border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${touched.name && errors.name ? 'border-destructive' : 'border-input'}`}
            />
            {touched.name && errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </motion.div>
        </>
      )}

      <motion.div variants={itemVariants}>
        <MultiSelectField
          label={isLoading ? "Lĩnh vực giảng dạy (Đang tải...)" : "Lĩnh vực giảng dạy"}
          options={categories.length > 0 ? categories : TRAINING_CATEGORIES_OPTIONS}
          selectedValues={orgInfo.trainingCategories}
          onChange={(vals) => handleChange('trainingCategories', vals)}
          error={touched.trainingCategories ? errors.trainingCategories : ''}
          placeholder="-- Chọn lĩnh vực --"
        />
      </motion.div>
    </motion.div>
  )
}

// ===== Component: NGOInfoStep =====
function NGOInfoStep({ orgInfo, setOrgInfo, errors, touched, onChange }) {
  const [focusAreasOptions, setFocusAreasOptions] = useState([])
  const [provinceOptions, setProvinceOptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [focusRes, provData] = await Promise.all([
          publicAxiosInstance.get('/v1/master-data?type=ngo_focus'),
          fetchProvinces()
        ])

        const dataList = focusRes.data?.data || []
        const formattedOptions = dataList.map(item => ({
          value: item.value || item.code || item.id,
          label: item.label || item.name
        }))
        if (formattedOptions.length > 0) {
          setFocusAreasOptions(formattedOptions)
        } else {
          setFocusAreasOptions(NGO_FOCUS_AREAS_OPTIONS)
        }

        setProvinceOptions(provData || [])
      } catch (error) {
        console.error('Lỗi lấy master data ngo_focus hoặc provinces:', error)
        setFocusAreasOptions(NGO_FOCUS_AREAS_OPTIONS)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleChange = (field, value) => {
    setOrgInfo(prev => ({ ...prev, [field]: value }))
    if (errors[field]) onChange(field, '')
  }

  const handleAutoFill = (name, address) => {
    setOrgInfo(prev => ({ ...prev, name: name || prev.name, address: address || prev.address }))
    onChange('name', '')
    onChange('address', '')
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      <motion.div variants={itemVariants}>
        <TaxCodeInput
          value={orgInfo.taxCode}
          onChange={handleChange}
          onAutoFill={handleAutoFill}
          error={errors.taxCode}
          touched={touched.taxCode}
          label="Giấy phép hoạt động / Mã số thuế"
        />
      </motion.div>
      <motion.div variants={itemVariants} className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Tên tổ chức / Quỹ <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          placeholder="Tổ chức phi chính phủ..."
          value={orgInfo.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full bg-background border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${touched.name && errors.name ? 'border-destructive' : 'border-input'}`}
        />
        {touched.name && errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </motion.div>
      <motion.div variants={itemVariants} className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Địa chỉ trụ sở <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          placeholder="Số nhà, đường, phường, quận..."
          value={orgInfo.address}
          onChange={(e) => handleChange('address', e.target.value)}
          className={`w-full bg-background border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${touched.address && errors.address ? 'border-destructive' : 'border-input'}`}
        />
        {touched.address && errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
      </motion.div>

      <motion.div variants={itemVariants}>
        <MultiSelectField
          label={isLoading ? "Mục tiêu hỗ trợ chính (Đang tải...)" : "Mục tiêu hỗ trợ chính"}
          options={focusAreasOptions.length > 0 ? focusAreasOptions : NGO_FOCUS_AREAS_OPTIONS}
          selectedValues={orgInfo.focusAreas}
          onChange={(vals) => handleChange('focusAreas', vals)}
          error={touched.focusAreas ? errors.focusAreas : ''}
          placeholder="-- Chọn mục tiêu --"
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <MultiSelectField
          label={isLoading ? "Địa bàn hoạt động (Đang tải...)" : "Địa bàn hoạt động"}
          options={provinceOptions}
          selectedValues={orgInfo.operatingRegions}
          onChange={(vals) => handleChange('operatingRegions', vals)}
          error={touched.operatingRegions ? errors.operatingRegions : ''}
          placeholder="-- Chọn địa bàn --"
        />
      </motion.div>
    </motion.div>
  )
}

// ===== Main RegisterForm =====
const initialOrganizationInfo = {
  name: '',
  taxCode: '',
  address: '',
  trainerType: 'organization',
  identityNumber: '',
  industry: '',
  size: '',
  trainingCategories: [],
  experience: '',
  focusAreas: [],
  operatingRegions: []
}

function RegisterForm({ onSwitchTab, selectedRole = 'worker', onBackToRoleSelection }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading } = useSelector((state) => state.user)

  // Step 1: Account info
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phone: '',
    acceptTerms: false
  })
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  // Step 2: BasicInfo
  const [basicInfo, setBasicInfo] = useState(initialBasicInfo)
  const [basicInfoErrors, setBasicInfoErrors] = useState({})
  const [basicInfoTouched, setBasicInfoTouched] = useState({})

  // Step 2: OrganizationInfo
  const [orgInfo, setOrgInfo] = useState(initialOrganizationInfo)
  const [orgInfoErrors, setOrgInfoErrors] = useState({})
  const [orgInfoTouched, setOrgInfoTouched] = useState({})

  const validateAccount = () => {
    const newErrors = {}
    if (!formData.email.trim()) newErrors.email = 'Email là bắt buộc.'
    else if (!EMAIL_RULE.test(formData.email)) newErrors.email = EMAIL_RULE_MESSAGE
    if (!formData.password) newErrors.password = 'Mật khẩu là bắt buộc.'
    else if (!PASSWORD_RULE.test(formData.password)) newErrors.password = PASSWORD_RULE_MESSAGE
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    if (selectedRole !== 'trainer') {
      if (!formData.displayName.trim()) newErrors.displayName = 'Họ tên là bắt buộc.'
      else if (formData.displayName.trim().length < 2) newErrors.displayName = 'Họ tên phải có ít nhất 2 ký tự.'
    }
    if (!formData.phone.trim()) newErrors.phone = 'Số điện thoại là bắt buộc.'
    else if (!PHONE_RULE.test(formData.phone)) newErrors.phone = PHONE_RULE_MESSAGE
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = selectedRole === 'trainer' 
        ? 'Bạn phải đồng ý với Quy định và Điều khoản dành cho Chuyên gia giảng dạy.' 
        : 'Bạn phải đồng ý với Điều khoản dịch vụ.'
    }
    
    return newErrors
  }

  const validateBasicInfo = () => {
    const newErrors = {}
    const ageStr = String(basicInfo.age ?? '').trim()
    if (!ageStr) newErrors.age = 'Tuổi là bắt buộc.'
    else {
      const ageNum = parseInt(ageStr, 10)
      if (isNaN(ageNum)) newErrors.age = 'Tuổi phải là một số hợp lệ.'
      else if (ageNum < 35) newErrors.age = 'Rất tiếc, RESTART-35 là nền tảng dành riêng cho người lao động từ 35 tuổi trở lên.'
      else if (ageNum > 65) newErrors.age = 'Độ tuổi đăng ký tham gia nền tảng tối đa là 65 tuổi.'
    }
    if (!basicInfo.gender) newErrors.gender = 'Vui lòng chọn giới tính.'
    if (!basicInfo.province) newErrors.province = 'Vui lòng chọn tỉnh/thành.'
    if (!basicInfo.education) newErrors.education = 'Vui lòng chọn trình độ học vấn.'
    if (!basicInfo.maritalStatus) newErrors.maritalStatus = 'Vui lòng chọn tình trạng hôn nhân.'
    return newErrors
  }

  const validateEnterpriseInfo = () => {
    const newErrors = {}
    if (!orgInfo.name.trim()) newErrors.name = 'Tên doanh nghiệp là bắt buộc.'
    if (!orgInfo.taxCode.trim()) newErrors.taxCode = 'Mã số thuế là bắt buộc.'
    if (!orgInfo.address.trim()) newErrors.address = 'Địa chỉ là bắt buộc.'
    if (!orgInfo.industry) newErrors.industry = 'Vui lòng chọn lĩnh vực hoạt động.'
    return newErrors
  }

  const validateTrainerInfo = () => {
    const newErrors = {}
    if (!orgInfo.name.trim()) {
      newErrors.name = orgInfo.trainerType === 'individual' ? 'Tên chuyên gia là bắt buộc.' : 'Tên trung tâm là bắt buộc.'
    }
    if (orgInfo.trainerType === 'organization' && !orgInfo.taxCode.trim()) {
      newErrors.taxCode = 'Mã số thuế / Giấy phép là bắt buộc.'
    }
    if (orgInfo.trainerType === 'individual' && !orgInfo.identityNumber.trim()) {
      newErrors.identityNumber = 'Số CCCD/CMND là bắt buộc.'
    }
    if (orgInfo.trainingCategories.length === 0) {
      newErrors.trainingCategories = 'Vui lòng chọn ít nhất 1 lĩnh vực giảng dạy.'
    }
    return newErrors
  }

  const validateNGOInfo = () => {
    const newErrors = {}
    if (!orgInfo.name.trim()) newErrors.name = 'Tên tổ chức là bắt buộc.'
    if (!orgInfo.taxCode.trim()) newErrors.taxCode = 'Giấy phép hoạt động là bắt buộc.'
    if (orgInfo.focusAreas.length === 0) newErrors.focusAreas = 'Vui lòng chọn ít nhất 1 lĩnh vực hỗ trợ.'
    if (orgInfo.operatingRegions.length === 0) newErrors.operatingRegions = 'Vui lòng chọn ít nhất 1 địa bàn hoạt động.'
    return newErrors
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleAccountSubmit = (e) => {
    e.preventDefault()
    setSuccessMessage('')
    const accountErrors = validateAccount()
    setErrors(accountErrors)
    if (Object.keys(accountErrors).length > 0) return
    
    if (selectedRole === 'worker') {
      setBasicInfoTouched({ age: true, gender: true, province: true, education: true, maritalStatus: true })
      const biErrors = validateBasicInfo()
      setBasicInfoErrors(biErrors)
      if (Object.keys(biErrors).length > 0) {
        toast.error(Object.values(biErrors)[0] || 'Vui lòng kiểm tra lại thông tin cơ bản.')
        return
      }
    } else {
      let orgErrors = {}
      if (selectedRole === 'enterprise') {
        setOrgInfoTouched({ name: true, taxCode: true, address: true, industry: true })
        orgErrors = validateEnterpriseInfo()
      } else if (selectedRole === 'trainer') {
        setOrgInfoTouched({ name: true, taxCode: true, identityNumber: true, trainingCategories: true })
        orgErrors = validateTrainerInfo()
      } else if (selectedRole === 'ngo') {
        setOrgInfoTouched({ name: true, taxCode: true, focusAreas: true, operatingRegions: true })
        orgErrors = validateNGOInfo()
      }

      setOrgInfoErrors(orgErrors)
      if (Object.keys(orgErrors).length > 0) {
        toast.error(Object.values(orgErrors)[0] || 'Vui lòng kiểm tra lại thông tin tổ chức.')
        return
      }
    }

    handleFullSubmit()
  }

  const handleFullSubmit = async () => {
    setSuccessMessage('')
    const payload = {
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      displayName: selectedRole === 'trainer' ? orgInfo.name : formData.displayName,
      role: selectedRole || 'worker'
    }

    if (selectedRole === 'worker') {
      payload.basicInfo = {
        age: basicInfo.age,
        gender: basicInfo.gender,
        province: basicInfo.province,
        district: basicInfo.district,
        education: basicInfo.education,
        maritalStatus: basicInfo.maritalStatus
      }
    } else {
      payload.organization = {
        name: orgInfo.name,
        taxCode: orgInfo.taxCode,
        address: orgInfo.address,
        trainerType: orgInfo.trainerType,
        identityNumber: orgInfo.identityNumber,
        industry: orgInfo.industry,
        size: orgInfo.size,
        trainingCategories: orgInfo.trainingCategories,
        experience: orgInfo.experience,
        focusAreas: orgInfo.focusAreas,
        operatingRegions: orgInfo.operatingRegions
      }
    }

    const result = await dispatch(registerUserAPI(payload))

    if (registerUserAPI.fulfilled.match(result)) {
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.')
      setSuccessMessage('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.')
      setFormData({ email: '', password: '', confirmPassword: '', displayName: '', phone: '' })
      setBasicInfo(initialBasicInfo)
      setBasicInfoErrors({})
      setBasicInfoTouched({})
      setOrgInfo(initialOrganizationInfo)
      setOrgInfoErrors({})
      setOrgInfoTouched({})
      setTimeout(() => onSwitchTab(), 2500)
    } else {
      toast.error(typeof result.payload === 'string' ? result.payload : result.payload?.message || 'Đăng ký thất bại.')
    }
  }

  return (
    <div className="space-y-4">
      {successMessage && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-sm">
          {successMessage}
        </motion.div>
      )}

      {/* ===== Step 1: Account Info ===== */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {selectedRole !== 'trainer' && (
          <motion.div variants={itemVariants}>
            <Label htmlFor="displayName" required>
              {selectedRole === 'worker' 
                ? 'Họ và tên đầy đủ' 
                : ['enterprise', 'ngo'].includes(selectedRole)
                  ? 'Họ tên người đại diện'
                  : 'Họ và tên đầy đủ (cá nhân) / Người đại diện (tổ chức)'}
            </Label>
            <div className="relative mt-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input id="displayName" name="displayName" placeholder="Nguyễn Văn A" value={formData.displayName} onChange={handleChange} error={errors.displayName} className="pl-10" inputSize="lg" autoComplete="name" />
            </div>
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <Label htmlFor="email" required>Email</Label>
          <div className="relative mt-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <MailIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input id="email" name="email" type="email" placeholder="email@example.com" value={formData.email} onChange={handleChange} error={errors.email} className="pl-10" inputSize="lg" autoComplete="email" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Label htmlFor="phone" required>Số điện thoại</Label>
          <div className="relative mt-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <PhoneIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input id="phone" name="phone" type="tel" placeholder="0xxxxxxxxx" value={formData.phone} onChange={handleChange} error={errors.phone} className="pl-10" inputSize="lg" autoComplete="tel" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Label htmlFor="password" required>Mật khẩu</Label>
          <div className="mt-1">
            <PasswordInput id="password" name="password" placeholder="Ít nhất 8 ký tự, có chữ và số" value={formData.password} onChange={handleChange} error={errors.password} inputSize="lg" autoComplete="new-password" />
          </div>
          <PasswordStrengthIndicator password={formData.password} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Label htmlFor="confirmPassword" required>Xác nhận mật khẩu</Label>
          <div className="mt-1">
            <PasswordInput id="confirmPassword" name="confirmPassword" placeholder="Nhập lại mật khẩu" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} inputSize="lg" autoComplete="new-password" />
          </div>
        </motion.div>
      </motion.div>

      {/* ===== Step 2: Role Specific Info ===== */}
      <div className="pt-2 border-t border-border/50">
        <p className="text-sm font-medium text-foreground mb-3">
          {selectedRole === 'worker' ? 'Thông tin cơ bản' : 'Thông tin đăng ký đối tác'} <span className="text-destructive">*</span>
        </p>
        
        {selectedRole === 'worker' && <BasicInfoStep basicInfo={basicInfo} setBasicInfo={setBasicInfo} errors={basicInfoErrors} touched={basicInfoTouched} onChange={(f,v) => { if(basicInfoErrors[f]) setBasicInfoErrors(p=>({...p,[f]:''})) }} />}
        
        {selectedRole === 'enterprise' && <EnterpriseInfoStep orgInfo={orgInfo} setOrgInfo={setOrgInfo} errors={orgInfoErrors} touched={orgInfoTouched} onChange={(f,v) => { if(orgInfoErrors[f]) setOrgInfoErrors(p=>({...p,[f]:''})) }} />}
        
        {selectedRole === 'trainer' && <TrainerInfoStep orgInfo={orgInfo} setOrgInfo={setOrgInfo} errors={orgInfoErrors} touched={orgInfoTouched} onChange={(f,v) => { if(orgInfoErrors[f]) setOrgInfoErrors(p=>({...p,[f]:''})) }} />}
        
        {selectedRole === 'ngo' && <NGOInfoStep orgInfo={orgInfo} setOrgInfo={setOrgInfo} errors={orgInfoErrors} touched={orgInfoTouched} onChange={(f,v) => { if(orgInfoErrors[f]) setOrgInfoErrors(p=>({...p,[f]:''})) }} />}
      </div>

      {/* Terms and Conditions Checkbox */}
      <motion.div variants={itemVariants} className="flex items-start gap-2 pt-2">
        <input
          type="checkbox"
          id="acceptTerms"
          name="acceptTerms"
          checked={formData.acceptTerms}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))
            if (errors.acceptTerms) setErrors(prev => ({ ...prev, acceptTerms: '' }))
          }}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
        />
        <label htmlFor="acceptTerms" className="text-sm text-muted-foreground cursor-pointer select-none">
          Tôi đã đọc và đồng ý với{' '}
          <a href="/terms" target="_blank" className="text-primary hover:underline font-medium">Điều khoản dịch vụ</a>
          {' '}và{' '}
          <a href="/privacy" target="_blank" className="text-primary hover:underline font-medium">Chính sách bảo mật</a>
          {selectedRole === 'trainer' && ' dành cho Chuyên gia giảng dạy'}.
        </label>
      </motion.div>
      {errors.acceptTerms && (
        <motion.div variants={itemVariants}>
          <p className="text-sm text-destructive font-medium">{errors.acceptTerms}</p>
        </motion.div>
      )}

      {/* Submit */}
      <motion.div variants={itemVariants}>
        <Button type="submit" onClick={handleAccountSubmit} isLoading={isLoading} size="xl" className="w-full">
          Tạo tài khoản
        </Button>
      </motion.div>

      {/* Back to role selection */}
      <motion.div variants={itemVariants} className="text-center">
        <button type="button" onClick={onBackToRoleSelection} className="text-sm text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer">
          Quay lại chọn vai trò
        </button>
      </motion.div>

      <motion.div variants={itemVariants} className="text-center">
        <p className="text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <button type="button" onClick={onSwitchTab} className="text-primary font-medium hover:underline bg-transparent border-none cursor-pointer p-0">
            Đăng nhập
          </button>
        </p>
      </motion.div>
    </div>
  )
}

export default RegisterForm

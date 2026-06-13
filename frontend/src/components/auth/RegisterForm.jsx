import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { SelectField } from '@/components/ui/SelectField'
import GenderField from '@/components/worker-profile/GenderField'
import ProvinceField from '@/components/worker-profile/ProvinceField'
import { registerUserAPI } from '@/redux/user/userSlice'
import {
  EMAIL_RULE,
  EMAIL_RULE_MESSAGE,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
  PHONE_RULE,
  PHONE_RULE_MESSAGE
} from '~/utils/validators'
import { EDUCATION_OPTIONS, MARITAL_STATUS_OPTIONS } from '~/data/profileData'

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

// ===== Step 2: BasicInfo =====
const BOOK_ICON = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
)

const HEART_ICON = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

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
    if (errors[field]) {
      onChange(field, '') // clear error
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-4"
    >
      {/* Age + Gender */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="reg-age" className="block text-sm font-medium text-foreground">
            Tuổi <span className="text-destructive">*</span>
          </label>
          <input
            id="reg-age"
            type="number"
            min="35"
            max="65"
            placeholder="35 - 65"
            value={basicInfo.age}
            onChange={(e) => {
              setBasicInfo(prev => ({ ...prev, age: e.target.value }))
            }}
            onBlur={(e) => {
              const val = parseInt(e.target.value)
              if (e.target.value !== '' && (isNaN(val) || val < 35 || val > 65)) {
                onChange('age', '')
              }
            }}
            className={`
              w-full bg-background border rounded-lg px-4 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
              transition-colors duration-200
              placeholder:text-muted-foreground/60
              ${touched.age && errors.age ? 'border-destructive' : 'border-input'}
            `}
          />
          {touched.age && errors.age && (
            <p className="text-xs text-destructive">{errors.age}</p>
          )}
        </div>

        <GenderField
          value={basicInfo.gender}
          onChange={(value) => handleChange('gender', value)}
          error={touched.gender ? errors.gender : ''}
        />
      </motion.div>

      {/* Province + District */}
      <motion.div variants={itemVariants}>
        <ProvinceField
          province={basicInfo.province}
          district={basicInfo.district}
          onProvinceChange={(value) => handleChange('province', value)}
          onDistrictChange={(value) => handleChange('district', value)}
          errors={errors}
        />
      </motion.div>

      {/* Education + Marital Status */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          id="reg-education"
          label="Trình độ học vấn"
          value={basicInfo.education}
          options={EDUCATION_OPTIONS}
          onChange={(val) => handleChange('education', val)}
          placeholder="-- Chọn trình độ --"
          icon={<BOOK_ICON />}
          error={touched.education ? errors.education : ''}
          required
        />

        <SelectField
          id="reg-maritalStatus"
          label="Tình trạng hôn nhân"
          value={basicInfo.maritalStatus}
          options={MARITAL_STATUS_OPTIONS}
          onChange={(val) => handleChange('maritalStatus', val)}
          placeholder="-- Chọn tình trạng --"
          icon={<HEART_ICON />}
          error={touched.maritalStatus ? errors.maritalStatus : ''}
          required
        />
      </motion.div>
    </motion.div>
  )
}

// ===== Step 2: OrganizationInfo =====
const initialOrganizationInfo = {
  name: '',
  taxCode: '',
  address: ''
}

function OrganizationInfoStep({ orgInfo, setOrgInfo, errors, touched, onChange }) {
  const [isChecking, setIsChecking] = useState(false)

  const checkTaxCode = async () => {
    if (!orgInfo.taxCode.trim()) {
      toast.error('Vui lòng nhập mã số thuế để kiểm tra.')
      return
    }
    setIsChecking(true)
    try {
      const response = await fetch(`https://api.vietqr.io/v2/business/${orgInfo.taxCode}`)
      const data = await response.json()
      if (data.code === '00' && data.data) {
        setOrgInfo(prev => ({
          ...prev,
          name: data.data.name || prev.name,
          address: data.data.address || prev.address
        }))
        toast.success('Lấy thông tin doanh nghiệp thành công!')
        onChange('name', '')
        onChange('address', '')
      } else {
        toast.error('Không tìm thấy thông tin doanh nghiệp hoặc mã số thuế không hợp lệ.')
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi kiểm tra mã số thuế.')
    } finally {
      setIsChecking(false)
    }
  }

  const handleChange = (field, value) => {
    setOrgInfo(prev => ({ ...prev, [field]: value }))
    if (errors[field]) onChange(field, '')
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      {/* Tax Code */}
      <motion.div variants={itemVariants} className="space-y-1.5">
        <label htmlFor="reg-taxCode" className="block text-sm font-medium text-foreground">
          Mã số thuế <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-2">
          <input
            id="reg-taxCode"
            type="text"
            placeholder="Nhập mã số thuế"
            value={orgInfo.taxCode}
            onChange={(e) => handleChange('taxCode', e.target.value)}
            className={`
              flex-1 bg-background border rounded-lg px-4 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
              transition-colors duration-200
              ${touched.taxCode && errors.taxCode ? 'border-destructive' : 'border-input'}
            `}
          />
          <Button type="button" variant="outline" onClick={checkTaxCode} isLoading={isChecking}>
            Tra cứu
          </Button>
        </div>
        {touched.taxCode && errors.taxCode && <p className="text-xs text-destructive">{errors.taxCode}</p>}
      </motion.div>

      {/* Name */}
      <motion.div variants={itemVariants} className="space-y-1.5">
        <label htmlFor="reg-orgName" className="block text-sm font-medium text-foreground">
          Tên tổ chức / Doanh nghiệp <span className="text-destructive">*</span>
        </label>
        <input
          id="reg-orgName"
          type="text"
          placeholder="Công ty CP..."
          value={orgInfo.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`
            w-full bg-background border rounded-lg px-4 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            transition-colors duration-200
            ${touched.name && errors.name ? 'border-destructive' : 'border-input'}
          `}
        />
        {touched.name && errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </motion.div>

      {/* Address */}
      <motion.div variants={itemVariants} className="space-y-1.5">
        <label htmlFor="reg-orgAddress" className="block text-sm font-medium text-foreground">
          Địa chỉ trụ sở <span className="text-destructive">*</span>
        </label>
        <input
          id="reg-orgAddress"
          type="text"
          placeholder="Số nhà, đường, phường, quận..."
          value={orgInfo.address}
          onChange={(e) => handleChange('address', e.target.value)}
          className={`
            w-full bg-background border rounded-lg px-4 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            transition-colors duration-200
            ${touched.address && errors.address ? 'border-destructive' : 'border-input'}
          `}
        />
        {touched.address && errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
      </motion.div>
    </motion.div>
  )
}

// ===== Main RegisterForm =====
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
    phone: ''
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

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc.'
    } else if (!EMAIL_RULE.test(formData.email)) {
      newErrors.email = EMAIL_RULE_MESSAGE
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc.'
    } else if (!PASSWORD_RULE.test(formData.password)) {
      newErrors.password = PASSWORD_RULE_MESSAGE
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Họ tên là bắt buộc.'
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Họ tên phải có ít nhất 2 ký tự.'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại là bắt buộc.'
    } else if (!PHONE_RULE.test(formData.phone)) {
      newErrors.phone = PHONE_RULE_MESSAGE
    }

    return newErrors
  }

  const validateBasicInfo = () => {
    const newErrors = {}

    const ageStr = String(basicInfo.age ?? '').trim()
    if (!ageStr) {
      newErrors.age = 'Tuổi là bắt buộc.'
    } else {
      const ageNum = parseInt(ageStr, 10)
      if (isNaN(ageNum) || ageNum < 35 || ageNum > 65) {
        newErrors.age = 'Tuổi phải từ 35 đến 65.'
      }
    }

    if (!basicInfo.gender) {
      newErrors.gender = 'Vui lòng chọn giới tính.'
    }
    if (!basicInfo.province) {
      newErrors.province = 'Vui lòng chọn tỉnh/thành.'
    }
    if (!basicInfo.education) {
      newErrors.education = 'Vui lòng chọn trình độ học vấn.'
    }
    if (!basicInfo.maritalStatus) {
      newErrors.maritalStatus = 'Vui lòng chọn tình trạng hôn nhân.'
    }

    return newErrors
  }

  const validateOrganizationInfo = () => {
    const newErrors = {}
    if (!orgInfo.name.trim()) newErrors.name = 'Tên tổ chức là bắt buộc.'
    if (!orgInfo.taxCode.trim()) newErrors.taxCode = 'Mã số thuế là bắt buộc.'
    if (!orgInfo.address.trim()) newErrors.address = 'Địa chỉ là bắt buộc.'
    return newErrors
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleBasicInfoChange = (field, value) => {
    if (basicInfoErrors[field]) {
      setBasicInfoErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleOrgInfoChange = (field, value) => {
    if (orgInfoErrors[field]) {
      setOrgInfoErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleAccountSubmit = (e) => {
    e.preventDefault()
    setSuccessMessage('')
    const accountErrors = validateAccount()
    setErrors(accountErrors)
    if (Object.keys(accountErrors).length > 0) return
    
    // Move to step 2 — let user fill basicInfo or orgInfo
    if (selectedRole === 'worker') {
      setBasicInfoTouched({ age: true, gender: true, province: true, education: true, maritalStatus: true })
      const biErrors = validateBasicInfo()
      setBasicInfoErrors(biErrors)
      if (Object.keys(biErrors).length > 0) {
        toast.error('Vui lòng điền đầy đủ thông tin cơ bản.')
        return
      }
    } else {
      setOrgInfoTouched({ name: true, taxCode: true, address: true })
      const orgErrors = validateOrganizationInfo()
      setOrgInfoErrors(orgErrors)
      if (Object.keys(orgErrors).length > 0) {
        toast.error('Vui lòng điền đầy đủ thông tin tổ chức.')
        return
      }
    }

    // Both steps valid — submit
    handleFullSubmit()
  }

  const handleFullSubmit = async () => {
    setSuccessMessage('')
    const payload = {
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      displayName: formData.displayName,
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
        address: orgInfo.address
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
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-sm"
        >
          {successMessage}
        </motion.div>
      )}

      {/* ===== Step 1: Account Info ===== */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <Label htmlFor="displayName" required>
            Họ và tên
          </Label>
          <div className="relative mt-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="displayName"
              name="displayName"
              placeholder="Nguyễn Văn A"
              value={formData.displayName}
              onChange={handleChange}
              error={errors.displayName}
              className="pl-10"
              inputSize="lg"
              autoComplete="name"
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Label htmlFor="email" required>
            Email
          </Label>
          <div className="relative mt-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <MailIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              className="pl-10"
              inputSize="lg"
              autoComplete="email"
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Label htmlFor="phone" required>
            Số điện thoại
          </Label>
          <div className="relative mt-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <PhoneIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="0xxxxxxxxx"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              className="pl-10"
              inputSize="lg"
              autoComplete="tel"
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Label htmlFor="password" required>
            Mật khẩu
          </Label>
          <div className="mt-1">
            <PasswordInput
              id="password"
              name="password"
              placeholder="Ít nhất 8 ký tự, có chữ và số"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              inputSize="lg"
              autoComplete="new-password"
            />
          </div>
          <PasswordStrengthIndicator password={formData.password} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Label htmlFor="confirmPassword" required>
            Xác nhận mật khẩu
          </Label>
          <div className="mt-1">
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Nhập lại mật khẩu"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              inputSize="lg"
              autoComplete="new-password"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* ===== Step 2: BasicInfo / OrgInfo ===== */}
      {selectedRole === 'worker' ? (
        <div className="pt-2 border-t border-border/50">
          <p className="text-sm font-medium text-foreground mb-3">
            Thông tin cơ bản <span className="text-destructive">*</span>
          </p>
          <BasicInfoStep
            basicInfo={basicInfo}
            setBasicInfo={setBasicInfo}
            errors={basicInfoErrors}
            touched={basicInfoTouched}
            onChange={handleBasicInfoChange}
          />
        </div>
      ) : (
        <div className="pt-2 border-t border-border/50">
          <p className="text-sm font-medium text-foreground mb-3">
            Thông tin Tổ chức / Doanh nghiệp <span className="text-destructive">*</span>
          </p>
          <OrganizationInfoStep
            orgInfo={orgInfo}
            setOrgInfo={setOrgInfo}
            errors={orgInfoErrors}
            touched={orgInfoTouched}
            onChange={handleOrgInfoChange}
          />
        </div>
      )}

      {/* Submit */}
      <motion.div variants={itemVariants}>
        <Button
          type="submit"
          onClick={handleAccountSubmit}
          isLoading={isLoading}
          size="xl"
          className="w-full"
        >
          Tạo tài khoản
        </Button>
      </motion.div>

      {/* Back to role selection */}
      <motion.div variants={itemVariants} className="text-center">
        <button
          type="button"
          onClick={onBackToRoleSelection}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
        >
          Quay lại chọn vai trò
        </button>
      </motion.div>

      <motion.div variants={itemVariants} className="text-center">
        <p className="text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <button
            type="button"
            onClick={onSwitchTab}
            className="text-primary font-medium hover:underline bg-transparent border-none cursor-pointer p-0"
          >
            Đăng nhập
          </button>
        </p>
      </motion.div>
    </div>
  )
}

export default RegisterForm

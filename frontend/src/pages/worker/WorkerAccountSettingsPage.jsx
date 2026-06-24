import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { SelectField } from '@/components/ui/SelectField'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import GenderField from '@/components/worker-profile/GenderField'
import ProvinceField from '@/components/worker-profile/ProvinceField'
import { selectCurrentUser, updateUserAPI } from '@/redux/user/userSlice'
import { selectProfile, fetchMyProfile, updateMyBasicInfo, createProfile } from '@/redux/profile/profileSlice'
import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'
import { EDUCATION_OPTIONS, MARITAL_STATUS_OPTIONS } from '~/data/profileData'
import toast from 'react-hot-toast'
import {
  User,
  Lock,
  ShieldCheck,
  Camera,
  Save,
  CheckCircle,
  AlertCircle,
  PhoneIcon,
  MailIcon,
  UserIcon,
  BookIcon,
  HeartIcon,
  Loader2,
} from 'lucide-react'

// ── Animation Variants (matching RegisterForm) ──────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

// ── Field Icon Components (matching RegisterForm style) ───────
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

const ROLE_LABELS = {
  worker: 'Người lao động',
  enterprise: 'Doanh nghiệp',
  trainer: 'Giảng viên',
  ngo: 'Tổ chức',
  admin: 'Quản trị viên',
}

// ── Icon-prefixed Input Wrapper ──────────────────────────────
function IconInput({ label, icon: IconComponent, id, required, error, ...props }) {
  return (
    <div>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      <div className="relative mt-1">
        {IconComponent && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground z-10">
            <IconComponent className="h-4 w-4" />
          </div>
        )}
        <Input
          id={id}
          error={error}
          className={IconComponent ? 'pl-10' : ''}
          inputSize="lg"
          {...props}
        />
      </div>
    </div>
  )
}

export default function WorkerAccountSettingsPage() {
  const dispatch = useDispatch()
  const currentUser = useSelector(selectCurrentUser)
  const myProfile = useSelector(selectProfile)

  // ── Fetch worker profile on mount ─────────────────────────
  useEffect(() => {
    if (!myProfile) {
      dispatch(fetchMyProfile())
    }
  }, [dispatch, myProfile])

  // ── Profile Tab State ─────────────────────────────────────
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    age: '',
    gender: '',
    province: '',
    district: '',
    education: '',
    maritalStatus: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const fileInputRef = useRef(null)

  // ── Password Tab State ────────────────────────────────────
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [savingPassword, setSavingPassword] = useState(false)

  const getAvatarUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    // ensure url starts with slash
    return url.startsWith('/') ? `${API_ROOT}${url}` : `${API_ROOT}/${url}`;
  }

  // ── Init form with current user + worker profile ───────────
  useEffect(() => {
    if (!currentUser) return

    // Prefer worker profile basicInfo; fall back to top-level user fields
    const profileBasicInfo = myProfile?.basicInfo || {}
    const userBasicInfo = currentUser // root-level fields on user doc

    const displayName = currentUser.displayName || ''
    const phone = currentUser.phone || ''
    const age = profileBasicInfo.age || userBasicInfo.age || ''
    const gender = profileBasicInfo.gender || userBasicInfo.gender || ''
    const province = profileBasicInfo.province || userBasicInfo.province || ''
    const district = profileBasicInfo.district || userBasicInfo.district || ''
    const education = profileBasicInfo.education || userBasicInfo.education || ''
    const maritalStatus = profileBasicInfo.maritalStatus || userBasicInfo.maritalStatus || ''

    setFormData({ displayName, phone, age, gender, province, district, education, maritalStatus })
    setAvatarPreview(getAvatarUrl(currentUser.avatar))
  }, [currentUser, myProfile])

  // ── Profile handlers ──────────────────────────────────────
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Hình ảnh không được vượt quá 5MB')
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    const errors = {}

    if (!formData.displayName.trim()) {
      errors.displayName = 'Tên hiển thị là bắt buộc.'
    }

    const ageNum = parseInt(formData.age, 10)
    if (formData.age && (isNaN(ageNum) || ageNum < 35 || ageNum > 65)) {
      errors.age = 'Tuổi phải từ 35 đến 65.'
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingProfile(true)
    try {
      const basicInfo = {
        age: formData.age ? parseInt(formData.age, 10) : null,
        gender: formData.gender || null,
        province: formData.province || null,
        district: formData.district || null,
        education: formData.education || null,
        maritalStatus: formData.maritalStatus || null,
      }

      // Build user account update payload (FormData)
      const userData = new FormData()
      userData.append('displayName', formData.displayName)
      userData.append('phone', formData.phone || '')
      if (formData.age) userData.append('age', formData.age)
      if (formData.gender) userData.append('gender', formData.gender)
      if (formData.province) userData.append('province', formData.province)
      if (formData.district) userData.append('district', formData.district)
      if (formData.education) userData.append('education', formData.education)
      if (formData.maritalStatus) userData.append('maritalStatus', formData.maritalStatus)
      if (avatarFile) userData.append('avatar', avatarFile)

      // Ensure worker profile exists, then sync both storage in parallel
      let profilePromise = Promise.resolve()
      if (!myProfile) {
        profilePromise = dispatch(createProfile()).unwrap().then(profile => {
          return dispatch(updateMyBasicInfo(basicInfo)).unwrap()
        })
      }

      await Promise.all([
        dispatch(updateUserAPI(userData)).unwrap(),
        profilePromise.then(() => dispatch(updateMyBasicInfo(basicInfo)).unwrap()),
      ])

      toast.success('Cập nhật thông tin thành công!')
      setAvatarFile(null)
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Có lỗi khi cập nhật thông tin')
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Password handlers ─────────────────────────────────────
  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }))
    setPasswordErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validatePassword = () => {
    const errors = {}
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
    }
    if (!passwordData.newPassword) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới.'
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự.'
    }
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.'
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    }
    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (!validatePassword()) return

    setSavingPassword(true)
    try {
      const response = await authorizeAxiosInstance.put(
        `${API_ROOT}/v1/users/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }
      )
      toast.success(response.data?.message || 'Đổi mật khẩu thành công!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi khi đổi mật khẩu.')
    } finally {
      setSavingPassword(false)
    }
  }

  const accountCreatedAt = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cài đặt tài khoản</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Quản lý thông tin cá nhân và bảo mật tài khoản
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User size={15} />
            Thông tin
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-2">
            <Lock size={15} />
            Mật khẩu
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <ShieldCheck size={15} />
            Bảo mật
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Thông tin tài khoản ── */}
        <TabsContent value="profile">
          <Card>
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Avatar upload */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border">
                  <div className={`relative group cursor-pointer w-24 h-24 rounded-full shrink-0 ${savingProfile ? 'pointer-events-none' : ''}`} onClick={() => fileInputRef.current?.click()}>
                    <Avatar
                      src={avatarPreview}
                      alt={currentUser?.displayName}
                      size="xl"
                      className={`w-full h-full text-3xl transition-opacity ${savingProfile ? 'opacity-50' : ''}`}
                    />
                    {!savingProfile && (
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={24} className="text-white" />
                      </div>
                    )}
                    {savingProfile && (
                      <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Ảnh đại diện</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG hoặc GIF. Tối đa 5MB.</p>
                    {avatarFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null)
                          setAvatarPreview(getAvatarUrl(currentUser?.avatar))
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="mt-2 text-xs text-destructive hover:underline"
                      >
                        Hủy thay đổi
                      </button>
                    )}
                  </div>
                </div>

                {/* Animated form fields */}
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {/* DisplayName */}
                  <motion.div variants={itemVariants}>
                    <IconInput
                      label="Họ và tên"
                      id="displayName"
                      icon={UserIcon}
                      placeholder="Nguyễn Văn A"
                      value={formData.displayName}
                      onChange={e => handleFormChange('displayName', e.target.value)}
                      error={formErrors.displayName}
                      required
                      autoComplete="name"
                    />
                  </motion.div>

                  {/* Email (read-only, pre-filled) */}
                  <motion.div variants={itemVariants}>
                    <IconInput
                      label="Email"
                      id="email"
                      icon={MailIcon}
                      value={currentUser?.email || ''}
                      disabled
                      autoComplete="email"
                    />
                  </motion.div>

                  {/* Phone */}
                  <motion.div variants={itemVariants}>
                    <IconInput
                      label="Số điện thoại"
                      id="phone"
                      icon={PhoneIcon}
                      placeholder="0xxxxxxxxx"
                      value={formData.phone}
                      onChange={e => handleFormChange('phone', e.target.value)}
                      autoComplete="tel"
                    />
                  </motion.div>

                  {/* Age + Gender */}
                  <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Age */}
                    <div>
                      <Label htmlFor="age" className="block mb-1.5">Tuổi</Label>
                      <Input
                        id="age"
                        type="number"
                        min="35"
                        max="65"
                        placeholder="35 - 65"
                        value={formData.age}
                        onChange={e => handleFormChange('age', e.target.value)}
                        error={formErrors.age}
                        inputSize="lg"
                      />
                    </div>

                    {/* Gender */}
                    <GenderField
                      value={formData.gender}
                      onChange={val => handleFormChange('gender', val)}
                      error={formErrors.gender}
                    />
                  </motion.div>

                  {/* Province + District */}
                  <motion.div variants={itemVariants}>
                    <ProvinceField
                      province={formData.province}
                      district={formData.district}
                      onProvinceChange={val => handleFormChange('province', val)}
                      onDistrictChange={val => handleFormChange('district', val)}
                      errors={formErrors}
                    />
                  </motion.div>

                  {/* Education + Marital Status */}
                  <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField
                      id="education"
                      label="Trình độ học vấn"
                      value={formData.education}
                      options={EDUCATION_OPTIONS}
                      onChange={val => handleFormChange('education', val)}
                      placeholder="-- Chọn trình độ --"
                      icon={<BOOK_ICON />}
                    />
                    <SelectField
                      id="maritalStatus"
                      label="Tình trạng hôn nhân"
                      value={formData.maritalStatus}
                      options={MARITAL_STATUS_OPTIONS}
                      onChange={val => handleFormChange('maritalStatus', val)}
                      placeholder="-- Chọn tình trạng --"
                      icon={<HEART_ICON />}
                    />
                  </motion.div>
                </motion.div>

                {/* Submit */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    isLoading={savingProfile}
                    size="xl"
                    className="gap-2"
                  >
                    <Save size={15} />
                    Lưu thay đổi
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Đổi mật khẩu ── */}
        <TabsContent value="password">
          <Card>
            <CardContent className="p-6 sm:p-8">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-5"
              >
                {/* Security tip banner */}
                <motion.div variants={itemVariants}>
                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <AlertCircle size={20} className="text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Bảo mật tài khoản
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                        Sử dụng mật khẩu mạnh gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
                        Không dùng chung mật khẩu với các tài khoản khác.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <form onSubmit={handleSavePassword} className="space-y-5 max-w-lg">
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="currentPassword" className="block mb-1.5">
                      Mật khẩu hiện tại <span className="text-destructive">*</span>
                    </Label>
                    <PasswordInput
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={e => handlePasswordChange('currentPassword', e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại"
                      autoComplete="current-password"
                      error={passwordErrors.currentPassword}
                      inputSize="lg"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Label htmlFor="newPassword" className="block mb-1.5">
                      Mật khẩu mới <span className="text-destructive">*</span>
                    </Label>
                    <PasswordInput
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={e => handlePasswordChange('newPassword', e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                      autoComplete="new-password"
                      error={passwordErrors.newPassword}
                      inputSize="lg"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Label htmlFor="confirmPassword" className="block mb-1.5">
                      Xác nhận mật khẩu mới <span className="text-destructive">*</span>
                    </Label>
                    <PasswordInput
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={e => handlePasswordChange('confirmPassword', e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      autoComplete="new-password"
                      error={passwordErrors.confirmPassword}
                      inputSize="lg"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-2">
                    <Button
                      type="submit"
                      isLoading={savingPassword}
                      size="xl"
                      className="gap-2"
                    >
                      <Lock size={15} />
                      Đổi mật khẩu
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Bảo mật (read-only) ── */}
        <TabsContent value="security">
          <Card>
            <CardContent className="p-6 sm:p-8">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-5"
              >
                {/* Info banner */}
                <motion.div variants={itemVariants}>
                  <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
                    <CheckCircle size={20} className="text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Thông tin tài khoản
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        Các thông tin bên dưới chỉ để tham khảo, không thể chỉnh sửa.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Account info grid */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoRow label="Email" value={currentUser?.email || '—'} />
                  <InfoRow label="Tên đăng nhập" value={currentUser?.username || '—'} />
                  <InfoRow label="Vai trò" value={ROLE_LABELS[currentUser?.role] || currentUser?.role || '—'} />
                  <InfoRow label="Trạng thái tài khoản">
                    {currentUser?.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        Đã kích hoạt
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                        Chưa kích hoạt
                      </span>
                    )}
                  </InfoRow>
                  <InfoRow label="Ngày tạo tài khoản" value={accountCreatedAt} />
                  <InfoRow label="Địa chỉ">
                    <span className="text-sm text-foreground">
                      {currentUser?.address || '—'}
                    </span>
                  </InfoRow>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoRow({ label, value, children }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      {children || <p className="text-sm text-foreground">{value || '—'}</p>}
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Camera, Save, Building2, Briefcase, Mail, Phone, MapPin, Hash, Users, Target, Map,
  User, Lock, ShieldCheck, AlertCircle, CheckCircle, MailIcon, PhoneIcon, UserIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { SelectField } from '@/components/ui/SelectField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

import { selectCurrentUser, updateUserAPI, fetchCurrentUser } from '@/redux/user/userSlice';
import { getOrganizationById, updateOrganization } from '@/apis/organizationApi';
import { authorizeAxiosInstance, publicAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const DEFAULT_SIZE_OPTIONS = [
  { value: '1-50', label: '1 - 50 nhân viên' },
  { value: '51-200', label: '51 - 200 nhân viên' },
  { value: '201-500', label: '201 - 500 nhân viên' },
  { value: '>500', label: 'Hơn 500 nhân viên' },
];

const DEFAULT_INDUSTRY_OPTIONS = [
  { value: 'it', label: 'Công nghệ phần mềm' },
  { value: 'finance', label: 'Tài chính - Ngân hàng' },
];

function IconInput({ label, icon: IconComponent, id, required, error, ...props }) {
  return (
    <div>
      {label && (
        <Label htmlFor={id} required={required} className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">
          {label}
        </Label>
      )}
      <div className="relative">
        {IconComponent && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[hsl(var(--admin-text-muted))] z-10">
            <IconComponent className="h-4 w-4" />
          </div>
        )}
        <Input
          id={id}
          error={error}
          className={`${IconComponent ? 'pl-10' : ''} bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))]`}
          inputSize="lg"
          {...props}
        />
      </div>
    </div>
  )
}

export default function EnterpriseProfilePage() {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const fileInputRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);

  // ─── TAB 1: ORGANIZATION STATE ────────────────────────────────────────────────
  const [orgData, setOrgData] = useState({
    name: '',
    taxCode: '',
    industry: '',
    size: '',
    address: '',
    focusAreas: '',
    operatingRegions: '',
    trainingCategories: '',
  });
  const [orgErrors, setOrgErrors] = useState({});
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // ─── MASTER DATA STATE ────────────────────────────────────────────────────────
  const [industryOptions, setIndustryOptions] = useState([]);
  const [sizeOptions, setSizeOptions] = useState([]);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(false);

  // ─── TAB 2: USER ACCOUNT STATE ────────────────────────────────────────────────
  const [userData, setUserData] = useState({
    displayName: '',
    phone: '',
  });
  const [userErrors, setUserErrors] = useState({});
  const [isSavingUser, setIsSavingUser] = useState(false);

  // ─── TAB 3: PASSWORD STATE ────────────────────────────────────────────────────
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const getAvatarUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return url.startsWith('/') ? `${API_ROOT}${url}` : `${API_ROOT}/${url}`;
  };

  // ─── INIT DATA ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchMasterData = async () => {
      setIsLoadingMasterData(true);
      try {
        const [industryRes, sizeRes] = await Promise.all([
          publicAxiosInstance.get('/v1/master-data?type=industry'),
          publicAxiosInstance.get('/v1/master-data?type=company_size')
        ]);
        
        const mapOptions = (res) => (res.data?.data || []).map(item => ({
          value: item.value || item.code || item.id,
          label: item.label || item.name
        }));

        const industries = mapOptions(industryRes);
        const sizes = mapOptions(sizeRes);

        setIndustryOptions(industries.length > 0 ? industries : DEFAULT_INDUSTRY_OPTIONS);
        setSizeOptions(sizes.length > 0 ? sizes : DEFAULT_SIZE_OPTIONS);
      } catch (error) {
        console.error('Lỗi lấy master data:', error);
        setIndustryOptions(DEFAULT_INDUSTRY_OPTIONS);
        setSizeOptions(DEFAULT_SIZE_OPTIONS);
      } finally {
        setIsLoadingMasterData(false);
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    const fetchOrgData = async () => {
      if (!currentUser) return;

      setUserData({
        displayName: currentUser.displayName || '',
        phone: currentUser.phone || '',
      });
      setAvatarPreview(getAvatarUrl(currentUser.avatar));

      if (!currentUser.organizationId) {
        setIsLoading(false);
        toast.error('Tài khoản của bạn chưa được liên kết với doanh nghiệp nào!');
        return;
      }

      try {
        setIsLoading(true);
        const res = await getOrganizationById(currentUser.organizationId);
        const data = res?.data || res;

        setOrgData({
          name: data.name || '',
          taxCode: data.taxCode || '',
          industry: data.industry || '',
          size: data.size || '',
          address: data.address || '',
          focusAreas: Array.isArray(data.focusAreas) ? data.focusAreas.join(', ') : (data.focusAreas || ''),
          operatingRegions: Array.isArray(data.operatingRegions) ? data.operatingRegions.join(', ') : (data.operatingRegions || ''),
          trainingCategories: Array.isArray(data.trainingCategories) ? data.trainingCategories.join(', ') : (data.trainingCategories || ''),
        });
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Không thể tải thông tin doanh nghiệp');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrgData();
  }, [currentUser]);

  // ─── ORG HANDLERS ────────────────────────────────────────────────────────────
  const handleOrgChange = (field, value) => {
    setOrgData((prev) => ({ ...prev, [field]: value }));
    if (orgErrors[field]) setOrgErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Hình ảnh không vượt quá 5MB');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveOrg = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!orgData.name.trim()) errors.name = 'Tên doanh nghiệp là bắt buộc';
    setOrgErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSavingOrg(true);
    try {
      const payload = {
        name: orgData.name.trim(),
        taxCode: orgData.taxCode.trim(),
        industry: orgData.industry.trim(),
        size: orgData.size,
        address: orgData.address.trim(),
        focusAreas: orgData.focusAreas.split(',').map(s => s.trim()).filter(Boolean),
        operatingRegions: orgData.operatingRegions.split(',').map(s => s.trim()).filter(Boolean),
        trainingCategories: orgData.trainingCategories.split(',').map(s => s.trim()).filter(Boolean),
      };

      await updateOrganization(currentUser.organizationId, payload);

      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await dispatch(updateUserAPI(formData)).unwrap();
        setAvatarFile(null);
      }

      dispatch(fetchCurrentUser());

      toast.success('Cập nhật hồ sơ doanh nghiệp thành công!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Lỗi cập nhật doanh nghiệp');
    } finally {
      setIsSavingOrg(false);
    }
  };

  // ─── USER HANDLERS ───────────────────────────────────────────────────────────
  const handleUserChange = (field, value) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
    if (userErrors[field]) setUserErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!userData.displayName.trim()) errors.displayName = 'Tên người đại diện là bắt buộc';
    setUserErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSavingUser(true);
    try {
      const formData = new FormData();
      formData.append('displayName', userData.displayName.trim());
      formData.append('phone', userData.phone.trim());

      await dispatch(updateUserAPI(formData)).unwrap();
      toast.success('Cập nhật thông tin đại diện thành công!');
    } catch (err) {
      toast.error(err?.data?.message || 'Lỗi cập nhật người đại diện');
    } finally {
      setIsSavingUser(false);
    }
  };

  // ─── PASSWORD HANDLERS ───────────────────────────────────────────────────────
  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) setPasswordErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validatePassword = () => {
    const errors = {};
    if (!passwordData.currentPassword) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    if (!passwordData.newPassword) errors.newPassword = 'Vui lòng nhập mật khẩu mới.';
    else if (passwordData.newPassword.length < 6) errors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
    if (!passwordData.confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.';
    else if (passwordData.newPassword !== passwordData.confirmPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setIsSavingPassword(true);
    try {
      const response = await authorizeAxiosInstance.put(`${API_ROOT}/v1/users/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success(response.data?.message || 'Đổi mật khẩu thành công!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đổi mật khẩu.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[hsl(var(--admin-accent))] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--admin-text-primary))]">Quản lý tài khoản</h1>
        <p className="text-[hsl(var(--admin-text-muted))] mt-1">
          Quản lý thông tin hiển thị của doanh nghiệp và bảo mật tài khoản.
        </p>
      </div>

      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-1 rounded-xl">
          <TabsTrigger value="organization" className="gap-2 rounded-lg data-[state=active]:bg-[hsl(var(--admin-accent))] data-[state=active]:text-white">
            <Building2 size={16} />
            Hồ sơ Doanh nghiệp
          </TabsTrigger>
          <TabsTrigger value="user" className="gap-2 rounded-lg data-[state=active]:bg-[hsl(var(--admin-accent))] data-[state=active]:text-white">
            <User size={16} />
            Người đại diện
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 rounded-lg data-[state=active]:bg-[hsl(var(--admin-accent))] data-[state=active]:text-white">
            <Lock size={16} />
            Bảo mật
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: ORGANIZATION ─── */}
        <TabsContent value="organization">
          <form onSubmit={handleSaveOrg}>
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

              {/* CARD 1: OVERVIEW */}
              <motion.div variants={itemVariants}>
                <Card className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
                  <CardHeader className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
                    <CardTitle className="flex items-center gap-2 text-lg text-[hsl(var(--admin-text-primary))]">
                      <Building2 size={18} className="text-[hsl(var(--admin-accent))]" />
                      Thông tin cơ bản
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Logo Upload */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-[hsl(var(--admin-border))]">
                      <div className={`relative group cursor-pointer w-24 h-24 rounded-full shrink-0 ${isSavingOrg ? 'pointer-events-none' : ''}`} onClick={() => fileInputRef.current?.click()}>
                        <Avatar
                          src={avatarPreview}
                          alt={orgData.name}
                          size="xl"
                          className={`w-full h-full text-3xl transition-opacity border-2 border-[hsl(var(--admin-border))] ${isSavingOrg ? 'opacity-50' : ''}`}
                        />
                        {!isSavingOrg && (
                          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera size={24} className="text-white" />
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
                        <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Logo Doanh nghiệp</p>
                        <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Định dạng JPG, PNG. Tối đa 5MB.</p>
                        {avatarFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setAvatarFile(null);
                              setAvatarPreview(getAvatarUrl(currentUser?.avatar));
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="mt-2 text-xs text-red-500 hover:underline"
                          >
                            Hủy thay đổi ảnh
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                      <div className="md:col-span-2">
                        <IconInput
                          label="Tên doanh nghiệp"
                          id="orgName"
                          icon={Building2}
                          value={orgData.name}
                          onChange={(e) => handleOrgChange('name', e.target.value)}
                          error={orgErrors.name}
                          placeholder="Công ty Cổ phần..."
                          required
                        />
                      </div>

                      <IconInput
                        label="Mã số thuế"
                        id="taxCode"
                        icon={Hash}
                        value={orgData.taxCode}
                        onChange={(e) => handleOrgChange('taxCode', e.target.value)}
                        placeholder="0123456789"
                      />

                      <div>
                        <SelectField
                          id="industry"
                          label={isLoadingMasterData ? "Ngành nghề / Lĩnh vực (Đang tải...)" : "Ngành nghề / Lĩnh vực"}
                          value={orgData.industry}
                          options={industryOptions}
                          onChange={(val) => handleOrgChange('industry', val)}
                          placeholder="Chọn ngành nghề"
                          icon={<Briefcase className="w-4 h-4" />}
                          className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))]"
                          labelClassName="text-[hsl(var(--admin-text-secondary))] mb-1.5 block"
                        />
                      </div>

                      <div>
                        <SelectField
                          id="size"
                          label={isLoadingMasterData ? "Quy mô nhân sự (Đang tải...)" : "Quy mô nhân sự"}
                          value={orgData.size}
                          options={sizeOptions}
                          onChange={(val) => handleOrgChange('size', val)}
                          placeholder="Chọn quy mô"
                          icon={<Users className="w-4 h-4" />}
                          className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))]"
                          labelClassName="text-[hsl(var(--admin-text-secondary))] mb-1.5 block"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <IconInput
                          label="Địa chỉ trụ sở"
                          id="address"
                          icon={MapPin}
                          value={orgData.address}
                          onChange={(e) => handleOrgChange('address', e.target.value)}
                          placeholder="Số 1, Đường ABC, Quận XYZ..."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>


              <motion.div variants={itemVariants} className="flex justify-end pt-2">
                <Button type="submit" isLoading={isSavingOrg} size="lg" className="gap-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white px-8">
                  <Save size={16} /> Lưu thay đổi
                </Button>
              </motion.div>
            </motion.div>
          </form>
        </TabsContent>

        {/* ─── TAB 2: USER ACCOUNT ─── */}
        <TabsContent value="user">
          <Card className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
            <CardHeader className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
              <CardTitle className="flex items-center gap-2 text-lg text-[hsl(var(--admin-text-primary))]">
                <User size={18} className="text-[hsl(var(--admin-accent))]" />
                Tài khoản Đại diện
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveUser}>
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
                  <motion.div variants={itemVariants}>
                    <IconInput
                      label="Họ và tên người đại diện"
                      id="displayName"
                      icon={UserIcon}
                      value={userData.displayName}
                      onChange={(e) => handleUserChange('displayName', e.target.value)}
                      error={userErrors.displayName}
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <IconInput
                      label="Email đăng nhập (Chỉ đọc)"
                      id="email"
                      icon={MailIcon}
                      value={currentUser?.email || ''}
                      disabled
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <IconInput
                      label="Số điện thoại cá nhân"
                      id="phone"
                      icon={PhoneIcon}
                      value={userData.phone}
                      onChange={(e) => handleUserChange('phone', e.target.value)}
                      placeholder="0xxxxxxxxx"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="flex justify-end pt-4">
                    <Button type="submit" isLoading={isSavingUser} size="lg" className="gap-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white px-8">
                      <Save size={16} /> Lưu Tài khoản
                    </Button>
                  </motion.div>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: PASSWORD ─── */}
        <TabsContent value="security">
          <Card className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
            <CardHeader className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
              <CardTitle className="flex items-center gap-2 text-lg text-[hsl(var(--admin-text-primary))]">
                <Lock size={18} className="text-[hsl(var(--admin-accent))]" />
                Đổi mật khẩu
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

                <motion.div variants={itemVariants}>
                  <div className="flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-900/50">
                    <AlertCircle size={20} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Bảo mật tài khoản</p>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                        Sử dụng mật khẩu mạnh gồm chữ hoa, chữ thường, số và ký tự đặc biệt để bảo vệ tài khoản doanh nghiệp của bạn.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <form onSubmit={handleSavePassword} className="space-y-5 max-w-lg">
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="currentPassword" required className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">
                      Mật khẩu hiện tại
                    </Label>
                    <PasswordInput
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={e => handlePasswordChange('currentPassword', e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại"
                      error={passwordErrors.currentPassword}
                      inputSize="lg"
                      className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))]"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Label htmlFor="newPassword" required className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">
                      Mật khẩu mới
                    </Label>
                    <PasswordInput
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={e => handlePasswordChange('newPassword', e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                      error={passwordErrors.newPassword}
                      inputSize="lg"
                      className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))]"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Label htmlFor="confirmPassword" required className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">
                      Xác nhận mật khẩu mới
                    </Label>
                    <PasswordInput
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={e => handlePasswordChange('confirmPassword', e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      error={passwordErrors.confirmPassword}
                      inputSize="lg"
                      className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))]"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-2">
                    <Button type="submit" isLoading={isSavingPassword} size="lg" className="gap-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white">
                      <Lock size={16} /> Đổi mật khẩu
                    </Button>
                  </motion.div>
                </form>

              </motion.div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

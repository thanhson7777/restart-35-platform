import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Save, Send, Trash2, XCircle } from 'lucide-react';

import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { createJob, updateJob, getEnterpriseJobById, submitJobForApproval, cancelJobApproval, deleteJob } from '@/apis/recruitmentAPI';
import { getJobCategoriesAPI } from '@/apis/jobCategoryApi';
import LocationPicker from '@/components/location/LocationPicker';
import { fetchProvinceByCode, fetchWards } from '@/services/locationService';
import toast from 'react-hot-toast';

const JOB_TYPE_OPTIONS = [
  { value: 'full-time', label: 'Toàn thời gian' },
  { value: 'part-time', label: 'Bán thời gian' },
  { value: 'temporary', label: 'Tạm thời' },
  { value: 'freelance', label: 'Tự do' }
];


const EDUCATION_OPTIONS = [
  { value: 'none', label: 'Không yêu cầu' },
  { value: 'primary', label: 'Tiểu học' },
  { value: 'middle', label: 'Trung học cơ sở' },
  { value: 'high', label: 'Trung học phổ thông' },
  { value: 'vocational', label: 'Học nghề / Trung cấp' },
  { value: 'college', label: 'Cao đẳng' },
  { value: 'university', label: 'Đại học' }
];

const MEETING_TYPE_OPTIONS = [
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'office', label: 'Tại văn phòng' }
];

const sections = [
  { id: 1, title: 'Thông tin cơ bản' },
  { id: 2, title: 'Yêu cầu ứng viên' },
  { id: 3, title: 'Lương thỏa thuận' },
  { id: 4, title: 'Địa điểm làm việc' },
  { id: 5, title: 'Cấu hình phỏng vấn' }
];

const initialFormData = {
  // Section 1: Basic Info
  title: '',
  description: '',
  type: 'full-time',
  quantity: 1,
  deadline: '',
  category: '',
  requirements: [],
  benefits: [],

  // Section 2: Requirements
  education: '',
  experience: 0,
  skills: [],
  certifications: [],
  languages: [],
  gender: 'any',
  ageMin: null,
  ageMax: null,

  // Section 3: Salary & Benefits
  salary: { min: null, max: null, negotiable: false, currency: 'VND' },
  benefitsList: [],

  // Section 4: Location
  location: {
    address: '',
    province: '',
    district: '',
    ward: '',
    type: 'onsite',
    coordinates: { lat: null, lng: null }
  },

  // Section 5: Interview Config
  interviewConfig: {
    meetingType: 'google_meet',
    officeAddress: '',
    duration: 60,
    allowReschedule: true,
    maxReschedules: 2,
    reminderMinutes: 60,
    suggestedSlots: []
  },

  // Section 6: Target Courses
  targetCourses: [],

  // Section 7: Hiring Bonus
  hiringBonus: {
    enabled: false,
    amount: null,
    payoutCondition: 'on_hire'
  },

  status: 'draft'
};

const TagInput = ({ field, value, onChange, tags, onAdd, onRemove }) => (
  <div className="space-y-2">
    <div className="flex gap-2">
      <Input
        placeholder={`Nhập và nhấn Enter để thêm ${field}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAdd(value);
          }
        }}
      />
      <Button type="button" variant="outline" onClick={() => onAdd(value)}>
        Thêm
      </Button>
    </div>
    <div className="flex flex-wrap gap-2">
      {Array.isArray(tags) ? tags.map((tag, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))] rounded-lg text-sm"
        >
          {tag}
          <button type="button" onClick={() => onRemove(tag)} className="hover:text-red-500">×</button>
        </span>
      )) : null}
    </div>
  </div>
);

export default function EnterpriseJobCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [currentSection, setCurrentSection] = useState(1);
  const [jobCategories, setJobCategories] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [tagInputs, setTagInputs] = useState({
    requirements: '',
    benefits: '',
    skills: '',
    certifications: '',
    languages: '',
    benefitsList: ''
  });
  const [useWorkingAddress, setUseWorkingAddress] = useState(false);

  const resolveWorkingAddressLabel = async () => {
    if (!formData.location) return '';
    const { address, province, ward } = formData.location;
    let provLabel = '';
    let wardLabel = '';

    if (province) {
      const provObj = await fetchProvinceByCode(province);
      if (provObj) provLabel = provObj.label;
    }
    if (province && ward) {
      const wardsList = await fetchWards(province);
      const wardObj = wardsList.find(w => w.value === ward);
      if (wardObj) wardLabel = wardObj.label;
    }

    return [address, wardLabel, provLabel].filter(Boolean).join(', ');
  };

  useEffect(() => {
    if (!useWorkingAddress) return;
    let active = true;
    const updateAddress = async () => {
      const fullAddr = await resolveWorkingAddressLabel();
      if (active) {
        updateFormData('interviewConfig.officeAddress', fullAddr);
      }
    };
    updateAddress();
    return () => { active = false; };
  }, [useWorkingAddress, formData.location.address, formData.location.province, formData.location.ward]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getJobCategoriesAPI();
        if (res.success && Array.isArray(res.data)) {
          setJobCategories(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch job categories', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch job data when in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    const fetchJob = async () => {
      setLoading(true);
      try {
        console.log('[EditJob] Fetching job id:', id);
        const res = await getEnterpriseJobById(id);
        console.log('[EditJob] Response status:', res?.status, 'data:', res?.data);
        const job = res.data?.data || res.data;
        console.log('[EditJob] Job data:', job);

        // Flatten backend's flat location fields back into nested location
        setFormData({
          ...job,
          title: job.job?.title || '',
          description: job.job?.description || '',
          type: job.job?.type || 'full-time',
          quantity: job.job?.quantity || 1,
          category: job.job?.category || '',
          requirements: Array.isArray(job.job?.requirements) ? job.job.requirements : [],
          benefits: Array.isArray(job.job?.benefits) ? job.job.benefits : [],
          salary: job.job?.salary || { min: null, max: null, negotiable: false, currency: 'VND' },
          benefitsList: Array.isArray(job.job?.benefitsList) ? job.job.benefitsList : [],
          gender: job.job?.gender || 'any',
          ageMin: job.job?.ageMin ?? null,
          ageMax: job.job?.ageMax ?? null,
          education: job.requirements?.education || '',
          experience: job.requirements?.experience ?? 0,
          skills: Array.isArray(job.requirements?.skills) ? job.requirements.skills : [],
          certifications: Array.isArray(job.requirements?.certifications) ? job.requirements.certifications : [],
          languages: Array.isArray(job.requirements?.languages) ? job.requirements.languages : [],
          location: {
            address: job.location?.address || '',
            province: job.location?.province || '',
            district: job.location?.district || '',
            ward: job.location?.ward || '',
            type: job.location?.type || 'onsite',
            coordinates: job.location?.coordinates || { lat: null, lng: null }
          },
          interviewConfig: job.interviewConfig || initialFormData.interviewConfig,
          targetCourses: Array.isArray(job.targetCourses) ? job.targetCourses : [],
          hiringBonus: job.hiringBonus || initialFormData.hiringBonus,
          deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : ''
        });
      } catch (err) {
        console.error('[Edit Job] fetch error:', err?.response?.data || err.message);
        toast.error(err?.response?.data?.message || 'Không thể tải thông tin tin tuyển dụng');
        navigate('/enterprise/recruitment');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, isEditMode]);

  const updateFormData = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const addTag = (field, value) => {
    if (!value.trim()) return;
    const currentArray = formData[field] || [];
    if (!currentArray.includes(value.trim())) {
      updateFormData(field, [...currentArray, value.trim()]);
    }
    setTagInputs(prev => ({ ...prev, [field]: '' }));
  };

  const removeTag = (field, tag) => {
    const currentArray = formData[field] || [];
    updateFormData(field, currentArray.filter(t => t !== tag));
  };

  const handleTagInputChange = (field, value) => {
    setTagInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (submitForApproval = false) => {
    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        quantity: formData.quantity,
        category: formData.category,
        requirements: formData.requirements,
        benefits: formData.benefits,
        salary: formData.salary,
        benefitsList: formData.benefitsList,
        gender: formData.gender,
        ageRange: { min: formData.ageMin, max: formData.ageMax },
        education: formData.education,
        experience: formData.experience,
        skills: formData.skills,
        certifications: formData.certifications,
        languages: formData.languages,
        address: formData.location?.address || '',
        province: formData.location?.province || '',
        district: formData.location?.district || '',
        ward: formData.location?.ward || '',
        locationType: formData.location?.type || 'onsite',
        coordinates: formData.location?.coordinates,
        interviewConfig: formData.interviewConfig,
        targetCourses: formData.targetCourses,
        hiringBonus: formData.hiringBonus,
        deadline: formData.deadline ? new Date(formData.deadline).getTime() : null
      };

      if (isEditMode) {
        await updateJob(id, payload);
        if (submitForApproval) {
          await submitJobForApproval(id);
        }
        toast.success(submitForApproval ? 'Tin đã được gửi để duyệt' : 'Cập nhật thành công');
      } else {
        const res = await createJob(payload);
        if (submitForApproval) {
          const newJobId = res.data?.data?._id || res.data?._id;
          if (newJobId) {
            await submitJobForApproval(newJobId);
          }
        }
        toast.success(submitForApproval ? 'Tin đã được gửi để duyệt' : 'Lưu bản nháp thành công');
      }
      navigate('/enterprise/recruitment');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelApproval = async () => {
    if (!id) return;
    if (!window.confirm('Bạn có chắc muốn hủy gửi duyệt? Tin sẽ trở về trạng thái nháp.')) return;
    setLoading(true);
    try {
      await cancelJobApproval(id);
      toast.success('Hủy duyệt thành công. Tin đang ở trạng thái nháp.');
      setFormData(prev => ({ ...prev, status: 'draft' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể hủy duyệt');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản nháp này?')) return;
    setLoading(true);
    try {
      await deleteJob(id);
      toast.success('Đã xóa bản nháp');
      navigate('/enterprise/recruitment');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa');
    } finally {
      setLoading(false);
    }
  };

  const renderActionButtons = () => {
    const status = formData.status;
    if (status === 'pending_approval') {
      return (
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCancelApproval} disabled={loading} className="text-amber-600 border-amber-600 hover:bg-amber-50">
            <XCircle size={14} className="mr-2" /> Hủy yêu cầu duyệt
          </Button>
        </div>
      );
    }

    if (status === 'published' || status === 'closed' || status === 'expired') {
      return (
        <div className="flex gap-3">
           <Button variant="outline" onClick={() => handleSubmit(false)} disabled={loading}>
            <Save size={14} className="mr-2" /> Lưu thay đổi
          </Button>
        </div>
      );
    }

    // Default: draft
    return (
      <div className="flex gap-3">
        {isEditMode && (
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            <Trash2 size={14} className="mr-2" /> Xóa
          </Button>
        )}
        <Button variant="outline" onClick={() => handleSubmit(false)} disabled={loading}>
          <Save size={14} className="mr-2" /> Lưu nháp
        </Button>
        <Button onClick={() => handleSubmit(true)} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Send size={14} className="mr-2" /> Gửi duyệt
        </Button>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">
              {isEditMode ? 'Chỉnh sửa tin tuyển dụng' : 'Tạo tin tuyển dụng'}
            </h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
              {isEditMode ? 'Cập nhật thông tin tin tuyển dụng.' : 'Điền thông tin để tạo tin tuyển dụng mới.'}
            </p>
          </div>
          {renderActionButtons()}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between bg-[hsl(var(--admin-surface))] rounded-xl p-4">
          {sections.map((section, idx) => (
            <div key={section.id} className="flex items-center">
              <button
                onClick={() => setCurrentSection(section.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentSection === section.id
                  ? 'bg-[hsl(var(--admin-accent))] text-white'
                  : 'text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-elevated))]'
                  }`}
              >
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  {section.id}
                </span>
                <span className="hidden md:inline">{section.title}</span>
              </button>
              {idx < sections.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${currentSection > section.id ? 'bg-[hsl(var(--admin-accent))]' : 'bg-[hsl(var(--admin-border))]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Section Content */}
        <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
          <CardHeader>
            <CardTitle className="text-lg text-[hsl(var(--admin-text-primary))]">
              {sections[currentSection - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Section 1: Basic Info */}
            {currentSection === 1 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Tiêu đề công việc <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="VD: Tuyển nhân viên pha chế"
                      value={formData.title}
                      onChange={(e) => updateFormData('title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Loại hình công việc <span className="text-red-500">*</span>
                    </label>
                    <Select value={formData.type} onValueChange={(v) => updateFormData('type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Mô tả công việc <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder="Mô tả chi tiết công việc, trách nhiệm, môi trường làm việc..."
                    rows={6}
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Số lượng tuyển
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.quantity}
                      onChange={(e) => updateFormData('quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Hạn nộp
                    </label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => updateFormData('deadline', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Ngành nghề
                    </label>
                    <Select value={formData.category} onValueChange={(v) => updateFormData('category', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn ngành nghề" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobCategories.map(cat => (
                          <SelectItem key={cat._id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Section 2: Requirements */}
            {currentSection === 2 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Trình độ học vấn
                    </label>
                    <Select value={formData.education} onValueChange={(v) => updateFormData('education', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trình độ" />
                      </SelectTrigger>
                      <SelectContent>
                        {EDUCATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Kinh nghiệm (năm)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={formData.experience}
                      onChange={(e) => updateFormData('experience', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Kỹ năng yêu cầu
                  </label>
                  <TagInput field="skills" value={tagInputs.skills} onChange={(v) => handleTagInputChange('skills', v)} tags={formData.skills} onAdd={(v) => addTag('skills', v)} onRemove={(tag) => removeTag('skills', tag)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Độ tuổi tối thiểu
                    </label>
                    <Input
                      type="number"
                      min={18}
                      max={65}
                      value={formData.ageMin || ''}
                      onChange={(e) => updateFormData('ageMin', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Độ tuổi tối đa
                    </label>
                    <Input
                      type="number"
                      min={18}
                      max={65}
                      value={formData.ageMax || ''}
                      onChange={(e) => updateFormData('ageMax', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Giới tính
                  </label>
                  <div className="flex gap-4">
                    {[{ value: 'any', label: 'Không yêu cầu' }, { value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }].map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value={opt.value}
                          checked={formData.gender === opt.value}
                          onChange={(e) => updateFormData('gender', e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Section 3: Salary & Benefits */}
            {currentSection === 3 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Lương tối thiểu (VND)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="VD: 5000000"
                      value={formData.salary.min || ''}
                      onChange={(e) => updateFormData('salary.min', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Lương tối đa (VND)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="VD: 10000000"
                      value={formData.salary.max || ''}
                      onChange={(e) => updateFormData('salary.max', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.salary.negotiable}
                        onChange={(e) => updateFormData('salary.negotiable', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Thương lượng được</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Section 4: Location */}
            {currentSection === 4 && (
              <>
                <LocationPicker
                  address={formData.location.address}
                  province={formData.location.province}
                  ward={formData.location.ward}
                  coordinates={formData.location.coordinates}
                  onAddressChange={(v) => updateFormData('location.address', v)}
                  onProvinceChange={(v) => { updateFormData('location.province', v); updateFormData('location.ward', '') }}
                  onWardChange={(v) => updateFormData('location.ward', v)}
                  onCoordinatesChange={(coords) => updateFormData('location.coordinates', coords)}
                />

              </>
            )}

            {/* Section 5: Interview Config */}
            {currentSection === 5 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Hình thức phỏng vấn
                    </label>
                    <Select
                      value={formData.interviewConfig.meetingType}
                      onValueChange={(v) => updateFormData('interviewConfig.meetingType', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEETING_TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Thời lượng (phút)
                    </label>
                    <Select
                      value={String(formData.interviewConfig.duration)}
                      onValueChange={(v) => updateFormData('interviewConfig.duration', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 phút</SelectItem>
                        <SelectItem value="45">45 phút</SelectItem>
                        <SelectItem value="60">60 phút</SelectItem>
                        <SelectItem value="90">90 phút</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.interviewConfig.meetingType === 'office' && (
                  <div className="space-y-2 mt-4">
                    <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                      Địa chỉ phỏng vấn (tại văn phòng)
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={useWorkingAddress}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUseWorkingAddress(checked);
                          if (!checked) {
                            updateFormData('interviewConfig.officeAddress', '');
                          }
                        }}
                        className="w-4 h-4 cursor-pointer rounded border-[hsl(var(--admin-border))] text-[hsl(var(--admin-accent))] focus:ring-[hsl(var(--admin-accent))]"
                      />
                      <span className="text-sm text-[hsl(var(--admin-text-primary))] cursor-pointer" onClick={() => {
                        const checked = !useWorkingAddress;
                        setUseWorkingAddress(checked);
                        if (!checked) {
                          updateFormData('interviewConfig.officeAddress', '');
                        }
                      }}>
                        Lấy địa chỉ làm việc làm nơi phỏng vấn
                      </span>
                    </div>
                    <Input
                      placeholder="VD: Tầng 5, Tòa nhà ABC, 123 Nguyễn Huệ"
                      value={formData.interviewConfig.officeAddress}
                      onChange={(e) => updateFormData('interviewConfig.officeAddress', e.target.value)}
                      disabled={useWorkingAddress}
                      className={useWorkingAddress ? "bg-slate-50 opacity-70" : ""}
                    />
                  </div>
                )}
              </>
            )}

          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentSection(Math.max(1, currentSection - 1))}
            disabled={currentSection === 1}
          >
            <ChevronLeft size={14} className="mr-2" /> Bước trước
          </Button>
          {currentSection < 5 ? (
            <Button onClick={() => setCurrentSection(currentSection + 1)}>
              Bước tiếp <ChevronRight size={14} className="ml-2" />
            </Button>
          ) : renderActionButtons()}
        </div>
      </div>
    </>
  );
}

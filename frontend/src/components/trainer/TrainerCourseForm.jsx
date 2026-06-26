import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  Plus, 
  Trash2, 
  Upload, 
  BookOpen, 
  DollarSign, 
  MapPin, 
  Clock, 
  GraduationCap, 
  AlertCircle,
  FileText,
  Settings,
  Info,
  Paperclip,
  Loader2,
  X
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Label, 
  Textarea, 
  SelectField, 
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui';
import LocationPicker from '@/components/location/LocationPicker';
import toast from 'react-hot-toast';
import { uploadCourseResource } from '@/apis/trainerApi';

const TrainerCourseForm = ({ initialData, categories = [], onSubmit, isSubmitting = false, isEditMode = false, isPartnership = false }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryType, setDeliveryType] = useState('live');
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);

  // Time & Location
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState('weeks');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationProvince, setLocationProvince] = useState('');
  const [locationWard, setLocationWard] = useState('');
  const [locationCoordinates, setLocationCoordinates] = useState({ lat: null, lng: null });
  const [expectedStartDate, setExpectedStartDate] = useState('');
  
  // Schedule Config
  const [scheduleTotalSessions, setScheduleTotalSessions] = useState(0);
  const [scheduleSessionsPerWeek, setScheduleSessionsPerWeek] = useState(1);
  const [scheduleDurationMinutes, setScheduleDurationMinutes] = useState(90);
  const [schedulePreferredDays, setSchedulePreferredDays] = useState([]);
  const [schedulePreferredTime, setSchedulePreferredTime] = useState('Morning');
  const [enableAutoSchedule, setEnableAutoSchedule] = useState(true);

  // Funding Config
  const [fundingType, setFundingType] = useState('FREE');
  const [fundingPrice, setFundingPrice] = useState(0);
  const [fundingHasJobGuarantee, setFundingHasJobGuarantee] = useState(false);
  const [fundingAcceptsSponsorship, setFundingAcceptsSponsorship] = useState(true);
  const [maxStudents, setMaxStudents] = useState(30);

  // Syllabus
  const [syllabus, setSyllabus] = useState([]);
  const [uploadingSyllabusIdx, setUploadingSyllabusIdx] = useState(null);

  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [outcomes, setOutcomes] = useState([]);
  const [outcomeInput, setOutcomeInput] = useState('');
  const [certificate, setCertificate] = useState('');

  // Errors state
  const [errors, setErrors] = useState({});

  // Populate form if initialData exists
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setCategoryId(initialData.categoryId || '');
      setShortDescription(initialData.shortDescription || '');
      setDescription(initialData.description || '');
      setDeliveryType(initialData.delivery_type || 'live');
      setThumbnailPreview(initialData.thumbnail || '');
      
      if (initialData.duration) {
        setDurationValue(initialData.duration.value || 1);
        setDurationUnit(initialData.duration.unit || 'weeks');
      }

      if (initialData.location) {
        setLocationAddress(initialData.location.address || '');
        setLocationProvince(initialData.location.province || '');
        setLocationWard(initialData.location.ward || '');
        setLocationCoordinates(initialData.location.coordinates || { lat: null, lng: null });
      }

      // Convert timestamp to YYYY-MM-DD for date input
      if (initialData.enrollmentStartDate) {
        const dateObj = new Date(initialData.enrollmentStartDate);
        if (!isNaN(dateObj.getTime())) {
          setExpectedStartDate(dateObj.toISOString().split('T')[0]);
        }
      }

      if (initialData.scheduleConfig) {
        setEnableAutoSchedule(true);
        setScheduleTotalSessions(initialData.scheduleConfig.totalSessions || 0);
        setScheduleSessionsPerWeek(initialData.scheduleConfig.sessionsPerWeek || 1);
        setScheduleDurationMinutes(initialData.scheduleConfig.sessionDurationMinutes || 90);
        setSchedulePreferredDays(initialData.scheduleConfig.preferredDays || []);
        setSchedulePreferredTime(initialData.scheduleConfig.preferredTime || 'Morning');
        if (initialData.scheduleConfig.expectedStartDate) {
          const expectedObj = new Date(initialData.scheduleConfig.expectedStartDate);
          if (!isNaN(expectedObj.getTime())) {
            setExpectedStartDate(expectedObj.toISOString().split('T')[0]);
          }
        }
      } else {
        setEnableAutoSchedule(false);
      }

      if (initialData.fundingConfig) {
        setFundingType(initialData.fundingConfig.type || 'FREE');
        setFundingPrice(initialData.fundingConfig.price || 0);
        setFundingHasJobGuarantee(initialData.fundingConfig.hasJobGuarantee || false);
        setFundingAcceptsSponsorship(initialData.fundingConfig.acceptsSponsorship !== false); // default true
      }
      
      setMaxStudents(initialData.maxStudents || 30);
      setSyllabus(initialData.syllabus || []);
      setSkills(initialData.skills || []);
      setOutcomes(initialData.outcomes || []);
      setCertificate(initialData.certificate || '');
    }
  }, [initialData]);

  // isFree state changes are now handled directly in the radio button onChange to prevent race conditions during initial load.

  // Handle image upload change
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, thumbnail: 'Chỉ chấp nhận file hình ảnh!' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, thumbnail: 'Kích thước file không vượt quá 5MB!' }));
        return;
      }
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, thumbnail: null }));
    }
  };

  // Helper functions for array inputs
  const addArrayItem = (list, setList, input, setInput) => {
    if (input.trim() && !list.includes(input.trim())) {
      setList([...list, input.trim()]);
      setInput('');
    }
  };

  const removeArrayItem = (list, setList, index) => {
    setList(list.filter((_, i) => i !== index));
  };

  // Syllabus helper functions
  const addSyllabusWeek = () => {
    const nextWeek = syllabus.length + 1;
    setSyllabus([
      ...syllabus,
      {
        week: nextWeek,
        title: '',
        content: '',
        duration: '',
        fileUrl: '',
        fileName: ''
      }
    ]);
  };

  const updateSyllabusItem = (index, field, value) => {
    const updated = [...syllabus];
    updated[index][field] = value;
    setSyllabus(updated);
  };

  const handleResourceUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Kích thước file tối đa là 15MB!');
      e.target.value = '';
      return;
    }

    try {
      setUploadingSyllabusIdx(index);
      const res = await uploadCourseResource(file);
      if (res.data?.success) {
        updateSyllabusItem(index, 'fileUrl', res.data.data.url);
        updateSyllabusItem(index, 'fileName', res.data.data.name);
        toast.success('Tải file đính kèm thành công!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Có lỗi xảy ra khi tải file lên!');
    } finally {
      setUploadingSyllabusIdx(null);
      e.target.value = '';
    }
  };

  const removeResource = (index) => {
    const updated = [...syllabus];
    updated[index].fileUrl = '';
    updated[index].fileName = '';
    setSyllabus(updated);
  };

  const removeSyllabusWeek = (index) => {
    const updated = syllabus
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, week: idx + 1 })); // Re-index week numbers
    setSyllabus(updated);
  };

  // Auto-sync syllabus length with scheduleTotalSessions (Smart sync)
  useEffect(() => {
    if (deliveryType !== 'video' && scheduleTotalSessions > 0) {
      setSyllabus(prev => {
        if (prev.length < scheduleTotalSessions) {
          // Tăng số buổi -> Thêm ô trống
          const added = Array.from({ length: scheduleTotalSessions - prev.length }).map((_, i) => ({
            week: prev.length + i + 1,
            title: '',
            duration: '',
            content: ''
          }));
          return [...prev, ...added];
        } else if (prev.length > scheduleTotalSessions) {
          // Giảm số buổi -> Kiểm tra xem các ô thừa có trống không
          const itemsToRemove = prev.slice(scheduleTotalSessions);
          const areAllEmpty = itemsToRemove.every(item => !(item.title?.trim()) && !(item.content?.trim()) && !(item.duration?.trim()));
          
          if (areAllEmpty) {
            // Nếu các ô thừa hoàn toàn trống (chưa nhập liệu) -> An toàn để xóa
            return prev.slice(0, scheduleTotalSessions);
          }
          // Nếu có chứa dữ liệu -> Không xóa, giữ nguyên để kích hoạt Cảnh báo UI
        }
        return prev;
      });
    }
  }, [scheduleTotalSessions, deliveryType]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (!title.trim() || title.length < 10 || title.length > 200) {
      newErrors.title = 'Tiêu đề khóa học là bắt buộc, từ 10 đến 200 ký tự';
    }
    if (!categoryId) {
      newErrors.categoryId = 'Vui lòng chọn danh mục khóa học';
    }
    if (!description.trim() || description.length < 50) {
      newErrors.description = 'Mô tả chi tiết là bắt buộc và phải có ít nhất 50 ký tự';
    }
    if (fundingType !== 'FREE' && (!fundingPrice || fundingPrice <= 0)) {
      newErrors.fee = 'Học phí phải lớn hơn 0 nếu không phải khóa học miễn phí';
    }
    if (maxStudents <= 0) {
      newErrors.maxStudents = 'Số học viên tối đa phải lớn hơn 0';
    }
    if (durationValue <= 0) {
      newErrors.duration = 'Thời lượng khóa học không hợp lệ';
    }

    if ((deliveryType === 'offline' || deliveryType === 'hybrid') && (!locationAddress || !locationProvince)) {
      newErrors.location = 'Vui lòng nhập địa chỉ và tỉnh/thành phố đầy đủ';
    }
    
    // Check if delivery is not video and schedule needs validation
    if (deliveryType !== 'video' && enableAutoSchedule) {
      if (scheduleSessionsPerWeek > 7) {
        newErrors.scheduleDays = 'Số buổi/tuần không được lớn hơn 7';
      } else if (scheduleSessionsPerWeek !== schedulePreferredDays.length) {
        newErrors.scheduleDays = `Số buổi/tuần (${scheduleSessionsPerWeek}) phải khớp với số lượng thứ đã chọn (${schedulePreferredDays.length})`;
      }
      if (scheduleTotalSessions < scheduleSessionsPerWeek) {
        newErrors.scheduleTotal = 'Tổng số buổi phải lớn hơn hoặc bằng số buổi/tuần';
      }
    }

    // Check syllabus
    if (syllabus && syllabus.length > 0) {
      const emptyIndex = syllabus.findIndex(item => !item.title || !item.title.trim());
      if (emptyIndex !== -1) {
        newErrors.syllabus = `Vui lòng nhập Tên bài học cho Buổi ${emptyIndex + 1} trong phần Giáo trình`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Form Submit
  const handleSave = (statusOverride) => {
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin và điền đầy đủ các trường bắt buộc (như tên bài học trong giáo trình)');
      // Switch to first tab with errors
      if (errors.title || errors.categoryId || errors.description) {
        setActiveTab('basic');
      } else if (errors.duration || errors.location || errors.scheduleTotal || errors.scheduleDays) {
        setActiveTab('schedule');
      } else if (errors.fee || errors.maxStudents) {
        setActiveTab('financial');
      } else if (errors.syllabus) {
        setActiveTab('syllabus');
      }
      return;
    }

    const payload = new FormData();
    payload.append('title', title.trim());
    if (categoryId === 'other') {
      payload.append('newCategoryName', newCategoryName.trim());
      // we'll send categoryId as empty, the wrapper will handle it
      payload.append('categoryId', '');
    } else {
      payload.append('categoryId', categoryId);
    }
    payload.append('shortDescription', shortDescription.trim());
    payload.append('description', description);
    payload.append('delivery_type', deliveryType);
    
    // Always append scheduleConfig if not video and enableAutoSchedule is true
    if (deliveryType !== 'video' && enableAutoSchedule) {
      payload.append('scheduleConfig', JSON.stringify({
        totalSessions: Number(scheduleTotalSessions),
        sessionsPerWeek: Number(scheduleSessionsPerWeek),
        sessionDurationMinutes: Number(scheduleDurationMinutes),
        preferredDays: schedulePreferredDays,
        preferredTime: schedulePreferredTime,
        expectedStartDate: expectedStartDate ? new Date(expectedStartDate).getTime() : null
      }));
    } else if (deliveryType !== 'video' && !enableAutoSchedule) {
      // Don't send scheduleConfig
      payload.append('scheduleConfig', JSON.stringify(null));
    }

    payload.append('certificate', certificate.trim());
    
    // Status Override
    if (statusOverride) {
      payload.append('status', statusOverride);
    }

    // Funding Config
    payload.append('fundingConfig', JSON.stringify({
      type: fundingType,
      price: Number(fundingPrice),
      sponsorIds: [],
      hasJobGuarantee: fundingHasJobGuarantee,
      acceptsSponsorship: fundingAcceptsSponsorship
    }));

    payload.append('maxStudents', maxStudents);

    // Date (chỉ gửi cho khóa học có lịch dạy)
    if (deliveryType !== 'video' && expectedStartDate) {
      // Send as timestamp
      const timestamp = new Date(expectedStartDate).getTime();
      payload.append('enrollmentStartDate', timestamp);
    }

    // Objects
    payload.append('duration', JSON.stringify({
      value: Number(durationValue),
      unit: durationUnit
    }));

    // Handle Location based on deliveryType
    let locationData = { type: deliveryType === 'video' ? 'online' : (deliveryType === 'hybrid' ? 'hybrid' : (deliveryType === 'offline' ? 'offline' : 'online')) };
    
    if (deliveryType === 'offline' || deliveryType === 'hybrid') {
      locationData = {
        type: deliveryType,
        address: locationAddress?.trim() || '',
        province: locationProvince || '',
        ward: locationWard || '',
        coordinates: locationCoordinates || { lat: null, lng: null }
      };
    }
    
    payload.append('location', JSON.stringify(locationData));



    // Arrays
    payload.append('skills', JSON.stringify(skills));
    payload.append('outcomes', JSON.stringify(outcomes));
    payload.append('syllabus', JSON.stringify(syllabus));

    // File
    if (thumbnailFile) {
      payload.append('thumbnail', thumbnailFile);
    }

    onSubmit(payload);
  };

  const tabs = [
    { id: 'basic', label: 'Thông tin chung', icon: FileText },
    { id: 'schedule', label: 'Thời gian & Giáo trình', icon: Clock },
    { id: 'financial', label: 'Học phí & Quy mô', icon: DollarSign },
    { id: 'syllabus', label: 'Kết quả & Khác', icon: BookOpen }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Navigation Sidebar (Desktop) */}
      <div className="lg:col-span-1 space-y-2">
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))]'
                    : 'text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Thumbnail Preview Card */}
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-4 space-y-4">
          <Label className="text-[hsl(var(--admin-text-muted))] text-xs font-semibold uppercase tracking-wider">Ảnh đại diện khóa học</Label>
          <div className="relative aspect-video w-full overflow-hidden bg-[hsl(var(--admin-surface-elevated))] rounded-lg border border-dashed border-[hsl(var(--admin-border))] flex items-center justify-center">
            {thumbnailPreview ? (
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-center p-4">
                <Upload className="h-8 w-8 text-[hsl(var(--admin-text-faint))] mx-auto mb-2" />
                <span className="text-xs text-[hsl(var(--admin-text-faint))]">Chưa có ảnh</span>
              </div>
            )}
          </div>
          <div className="relative">
            <input
              type="file"
              id="thumbnail-upload"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnailChange}
            />
            <Button
              type="button"
              asChild
              variant="outline"
              className="w-full border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]/50 text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]"
            >
              <label htmlFor="thumbnail-upload" className="cursor-pointer flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" />
                Chọn ảnh tải lên
              </label>
            </Button>
            {errors.thumbnail && (
              <p className="text-[hsl(var(--admin-danger))] text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.thumbnail}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="lg:col-span-3 space-y-6">
        <form onSubmit={(e) => e.preventDefault()} className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-6 space-y-6">
          
          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="border-b border-[hsl(var(--admin-border))] pb-4">
                <h3 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Thông tin cơ bản</h3>
                <p className="text-[hsl(var(--admin-text-muted))] text-xs">Điền các thông tin định dạng cơ bản của khóa học.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-[hsl(var(--admin-text-secondary))]">Tiêu đề khóa học <span className="text-[hsl(var(--admin-danger))]">*</span></Label>
                <Input
                  id="title"
                  placeholder="Ví dụ: Lập trình Web Frontend ReactJS nâng cao cho người 35+"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] focus:border-[hsl(var(--admin-accent))]"
                />
                {errors.title && (
                  <p className="text-[hsl(var(--admin-danger))] text-xs flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="categoryId" className="text-[hsl(var(--admin-text-secondary))]">Danh mục <span className="text-[hsl(var(--admin-danger))]">*</span></Label>
                  <Select 
                    value={categoryId || undefined} 
                    onValueChange={setCategoryId}
                    disabled={isPartnership && !!initialData?.categoryId}
                  >
                    <SelectTrigger 
                      id="categoryId"
                      className="w-full h-[42px] rounded-md border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] px-3 py-2 text-sm text-[hsl(var(--admin-text-primary))] focus:ring-1 focus:ring-[hsl(var(--admin-accent))] focus:border-[hsl(var(--admin-accent))] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      side="bottom" 
                      className="max-h-[250px] z-[100] bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))]"
                    >
                      {categories.map((cat) => (
                        <SelectItem 
                          key={cat._id} 
                          value={cat._id}
                          className="text-[hsl(var(--admin-text-primary))] focus:bg-[hsl(var(--admin-surface))] focus:text-[hsl(var(--admin-accent))] cursor-pointer"
                        >
                          {cat.name}
                        </SelectItem>
                      ))}
                      <SelectItem 
                        value="other" 
                        className="font-semibold text-[hsl(var(--admin-accent))] focus:bg-[hsl(var(--admin-surface))] cursor-pointer"
                      >
                        + Đề xuất danh mục khác...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {categoryId === 'other' && (
                    <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label htmlFor="newCategoryName" className="text-xs text-[hsl(var(--admin-accent))] font-medium">Tên danh mục đề xuất</Label>
                      <Input
                        id="newCategoryName"
                        placeholder="Nhập tên danh mục mới..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="bg-[hsl(var(--admin-surface-hover))] border-[hsl(var(--admin-accent))/50] focus:border-[hsl(var(--admin-accent))] text-[hsl(var(--admin-text-primary))]"
                        autoFocus
                      />
                    </div>
                  )}
                  {errors.categoryId && (
                    <p className="text-[hsl(var(--admin-danger))] text-xs flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.categoryId}
                    </p>
                  )}
                </div>


                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="deliveryType" className="text-[hsl(var(--admin-text-secondary))]">Hình thức giảng dạy</Label>
                  <Select 
                    value={deliveryType || undefined} 
                    onValueChange={setDeliveryType}
                    disabled={isPartnership && !!initialData?.delivery_type}
                  >
                    <SelectTrigger 
                      id="deliveryType"
                      className="w-full h-[42px] rounded-md border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] px-3 py-2 text-sm text-[hsl(var(--admin-text-primary))] focus:ring-1 focus:ring-[hsl(var(--admin-accent))] focus:border-[hsl(var(--admin-accent))] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <SelectValue placeholder="Chọn hình thức" />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      side="bottom" 
                      className="max-h-[250px] z-[100] bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))]"
                    >
                      <SelectItem 
                        value="live"
                        className="text-[hsl(var(--admin-text-primary))] focus:bg-[hsl(var(--admin-surface))] focus:text-[hsl(var(--admin-accent))] cursor-pointer"
                      >
                        Học Online (Zoom/Meet)
                      </SelectItem>
                      <SelectItem 
                        value="offline"
                        className="text-[hsl(var(--admin-text-primary))] focus:bg-[hsl(var(--admin-surface))] focus:text-[hsl(var(--admin-accent))] cursor-pointer"
                      >
                        Học trực tiếp (Offline)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription" className="text-[hsl(var(--admin-text-secondary))]">Mô tả ngắn (Hiển thị ở trang danh sách)</Label>
                <Textarea
                  id="shortDescription"
                  placeholder="Tóm tắt nhanh nội dung chính của khóa học trong vòng 2-3 câu..."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] focus:border-[hsl(var(--admin-accent))]"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[hsl(var(--admin-text-secondary))]">Mô tả chi tiết khóa học <span className="text-[hsl(var(--admin-danger))]">*</span></Label>
                <div className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-md overflow-hidden text-[hsl(var(--admin-text-primary))]">
                  <ReactQuill
                    theme="snow"
                    value={description}
                    onChange={setDescription}
                    className="editor-content"
                    placeholder="Mô tả chi tiết nội dung chương trình học, kết quả mong đợi, phương thức đào tạo..."
                  />
                </div>
                {errors.description && (
                  <p className="text-[hsl(var(--admin-danger))] text-xs flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TIME & LOCATION */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="border-b border-[hsl(var(--admin-border))] pb-4">
                <h3 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Thời gian & Địa điểm học</h3>
                <p className="text-[hsl(var(--admin-text-muted))] text-xs">Cấu hình thời lượng khóa học, địa chỉ học và thời gian mở tuyển sinh.</p>
              </div>

              {/* Notice for Video and Online courses */}

              {deliveryType === 'live' && (
                <div className="bg-[hsl(var(--admin-accent-subtle))] border border-[hsl(var(--admin-accent))/30] p-4 rounded-lg flex items-start gap-3 text-[hsl(var(--admin-accent))]">
                  <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    <strong>Lớp học Online:</strong> Hệ thống sẽ tự động tạo phòng học (Jitsi Meet) và gửi link cho học viên khi đến thời gian học. Bạn không cần thiết lập địa điểm.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="durationValue" className="text-[hsl(var(--admin-text-secondary))]">
                    Thời lượng ước tính hoàn thành <span className="text-[hsl(var(--admin-danger))]">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="durationValue"
                      type="number"
                      min="1"
                      value={durationValue}
                      onChange={(e) => setDurationValue(Number(e.target.value))}
                      className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] focus:border-[hsl(var(--admin-accent))] w-2/3"
                    />
                    <select
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value)}
                      className="rounded-md border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] px-3 py-2 text-sm text-[hsl(var(--admin-text-primary))] focus:border-[hsl(var(--admin-accent))] focus:outline-none w-1/3"
                    >
                      <option value="days">Ngày</option>
                      <option value="weeks">Tuần</option>
                      <option value="months">Tháng</option>
                    </select>
                  </div>
                </div>

                {deliveryType !== 'video' && (
                  <div className="space-y-2">
                    <Label htmlFor="expectedStartDate" className="text-[hsl(var(--admin-text-secondary))]">
                      Ngày dự kiến khai giảng <span className="text-[hsl(var(--admin-danger))]">*</span>
                    </Label>
                    <Input
                      id="expectedStartDate"
                      type="date"
                      value={expectedStartDate}
                      onChange={(e) => setExpectedStartDate(e.target.value)}
                      className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] focus:border-[hsl(var(--admin-accent))]"
                    />
                  </div>
                )}
              </div>

              {(deliveryType === 'offline' || deliveryType === 'hybrid') && (
                <div className="space-y-4 border-t border-[hsl(var(--admin-border))] pt-6 mt-6">
                  <h4 className="font-semibold text-[hsl(var(--admin-text-primary))]">Địa điểm giảng dạy</h4>
                  <LocationPicker
                    address={locationAddress}
                    province={locationProvince}
                    ward={locationWard}
                    coordinates={locationCoordinates}
                    onAddressChange={setLocationAddress}
                    onProvinceChange={setLocationProvince}
                    onWardChange={setLocationWard}
                    onCoordinatesChange={setLocationCoordinates}
                    errors={{ address: errors.location }}
                  />
                </div>
              )}

              {deliveryType !== 'video' && (
                <div className="space-y-6 border-t border-[hsl(var(--admin-border))] pt-6 mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id="enableAutoSchedule"
                      checked={enableAutoSchedule}
                      onChange={(e) => setEnableAutoSchedule(e.target.checked)}
                      className="h-4 w-4 rounded border-[hsl(var(--admin-border))] text-[hsl(var(--admin-accent))] focus:ring-[hsl(var(--admin-accent))]"
                    />
                    <Label htmlFor="enableAutoSchedule" className="font-semibold text-[hsl(var(--admin-text-primary))] cursor-pointer">Sử dụng tính năng Lập lịch học tự động</Label>
                  </div>
                  
                  {enableAutoSchedule && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[hsl(var(--admin-text-secondary))]">Tổng số buổi <span className="text-[hsl(var(--admin-danger))]">*</span></Label>
                      <Input
                        type="number"
                        min="1"
                        value={scheduleTotalSessions}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setScheduleTotalSessions(val);
                          if (val > 0 && scheduleSessionsPerWeek > val) {
                            setScheduleSessionsPerWeek(val);
                          }
                        }}
                        className={`bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] ${errors.scheduleTotal ? 'border-red-500' : ''}`}
                      />
                      {errors.scheduleTotal && <p className="text-red-500 text-xs mt-1">{errors.scheduleTotal}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[hsl(var(--admin-text-secondary))]">Số buổi/tuần <span className="text-[hsl(var(--admin-danger))]">*</span></Label>
                      <Input
                        type="number"
                        min="1"
                        max={Math.min(7, scheduleTotalSessions || 7)}
                        value={scheduleSessionsPerWeek}
                        onChange={(e) => {
                          let val = Number(e.target.value);
                          if (val > 7) val = 7;
                          if (scheduleTotalSessions > 0 && val > scheduleTotalSessions) val = scheduleTotalSessions;
                          setScheduleSessionsPerWeek(val);
                        }}
                        className={`bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] ${errors.scheduleDays ? 'border-red-500' : ''}`}
                      />
                      {errors.scheduleDays && <p className="text-red-500 text-xs mt-1">{errors.scheduleDays}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[hsl(var(--admin-text-secondary))]">Thời lượng 1 buổi (phút)</Label>
                      <Input
                        type="number"
                        min="30"
                        step="15"
                        value={scheduleDurationMinutes}
                        onChange={(e) => setScheduleDurationMinutes(Number(e.target.value))}
                        className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[hsl(var(--admin-text-secondary))]">Khung giờ ưu tiên</Label>
                      <select
                        value={schedulePreferredTime}
                        onChange={(e) => setSchedulePreferredTime(e.target.value)}
                        className="w-full rounded-md border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] px-3 py-2 text-sm text-[hsl(var(--admin-text-primary))] focus:border-[hsl(var(--admin-accent))] focus:outline-none"
                      >
                        <option value="Morning">Sáng (08:00 - 12:00)</option>
                        <option value="Afternoon">Chiều (13:30 - 17:30)</option>
                        <option value="Evening">Tối (18:00 - 21:00)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[hsl(var(--admin-text-secondary))]">Thứ giảng dạy trong tuần</Label>
                      <div className="border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] rounded-md p-2">
                        <div className="flex flex-wrap gap-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                            const labels = {
                              'Monday': 'Thứ 2', 'Tuesday': 'Thứ 3', 'Wednesday': 'Thứ 4',
                              'Thursday': 'Thứ 5', 'Friday': 'Thứ 6', 'Saturday': 'Thứ 7', 'Sunday': 'Chủ nhật'
                            };
                            const isChecked = schedulePreferredDays.includes(day);
                            return (
                              <label key={day} className={`cursor-pointer px-3 py-1 text-xs rounded-full border transition-colors ${isChecked ? 'bg-[hsl(var(--admin-accent-subtle))] border-[hsl(var(--admin-accent))] text-[hsl(var(--admin-accent))] font-medium' : 'bg-transparent border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-hover))]'}`}>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      if (schedulePreferredDays.length >= scheduleSessionsPerWeek) {
                                        import('react-hot-toast').then(({ default: toast }) => {
                                          toast.error(`Bạn chỉ được chọn tối đa ${scheduleSessionsPerWeek} thứ giảng dạy, hãy tăng Số buổi/tuần nếu cần.`);
                                        });
                                        return;
                                      }
                                      setSchedulePreferredDays([...schedulePreferredDays, day]);
                                    } else {
                                      setSchedulePreferredDays(schedulePreferredDays.filter(d => d !== day));
                                    }
                                  }}
                                />
                                {labels[day]}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
                </div>
              )}
              <div className="space-y-6 border-t border-[hsl(var(--admin-border))] pt-6 mt-6">
              {/* Syllabus Builder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[hsl(var(--admin-text-secondary))] font-semibold text-base">Nội dung giáo trình bài dạy</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSyllabusWeek}
                    size="sm"
                    className="border-dashed border-[hsl(var(--admin-accent))] text-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent)/10%)]"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {deliveryType === 'video' ? 'Thêm chương/bài mới' : 'Thêm buổi học mới'}
                  </Button>
                </div>
                
                {errors.syllabus && (
                  <p className="text-[hsl(var(--admin-danger))] text-sm bg-[hsl(var(--admin-danger)/10%)] p-2 rounded border border-[hsl(var(--admin-danger)/20%)]">
                    {errors.syllabus}
                  </p>
                )}

                {deliveryType !== 'video' && syllabus.length > scheduleTotalSessions && scheduleTotalSessions > 0 && (
                  <div className="bg-[hsl(var(--admin-danger)/10%)] border border-[hsl(var(--admin-danger)/20%)] text-[hsl(var(--admin-danger))] p-3 rounded-md text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>Số lượng giáo trình hiện tại ({syllabus.length}) đang lớn hơn Tổng số buổi ({scheduleTotalSessions}). Vui lòng xóa bớt giáo trình dư thừa hoặc tăng Tổng số buổi.</p>
                  </div>
                )}

                {syllabus.length === 0 ? (
                  <div className="border border-dashed border-[hsl(var(--admin-border))] rounded-lg p-6 text-center text-[hsl(var(--admin-text-faint))]">
                    Chưa có giáo trình nào. Hãy nhấn nút để thêm {deliveryType === 'video' ? 'chương/bài' : 'buổi học'}.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {syllabus.map((item, index) => (
                      <div key={index} className="border border-[hsl(var(--admin-border))] rounded-lg p-4 bg-[hsl(var(--admin-surface-elevated))]/40 space-y-3 relative">
                        <button
                          type="button"
                          onClick={() => removeSyllabusWeek(index)}
                          className="absolute right-4 top-4 text-[hsl(var(--admin-text-faint))] hover:text-[hsl(var(--admin-danger))] transition-colors"
                          title="Xóa tuần này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-8">
                          <div className="md:col-span-1 space-y-2">
                            <Label className="text-[hsl(var(--admin-text-muted))] text-xs">
                              {deliveryType === 'video' ? 'Chương/Bài số' : 'Buổi số'}
                            </Label>
                            <Input
                              type="number"
                              value={item.week}
                              onChange={(e) => updateSyllabusItem(index, 'week', Number(e.target.value))}
                              className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                            />
                          </div>
                          
                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-[hsl(var(--admin-text-muted))] text-xs">Tiêu đề buổi/chương học</Label>
                            <Input
                              placeholder="Ví dụ: Giới thiệu về React component và Props"
                              value={item.title}
                              onChange={(e) => updateSyllabusItem(index, 'title', e.target.value)}
                              className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                            />
                          </div>

                          <div className="md:col-span-1 space-y-2">
                            <Label className="text-[hsl(var(--admin-text-muted))] text-xs">Thời lượng ước tính</Label>
                            <Input
                              placeholder="Ví dụ: 3 giờ"
                              value={item.duration}
                              onChange={(e) => updateSyllabusItem(index, 'duration', e.target.value)}
                              className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[hsl(var(--admin-text-muted))] text-xs">Nội dung chi tiết</Label>
                          <Textarea
                            placeholder={`Mô tả tóm tắt nội dung học viên sẽ học trong ${deliveryType === 'video' ? 'chương/bài' : 'buổi'} này...`}
                            value={item.content}
                            onChange={(e) => updateSyllabusItem(index, 'content', e.target.value)}
                            className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                            rows={2}
                          />
                        </div>

                        {deliveryType === 'video' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-2">
                              <Label className="text-[hsl(var(--admin-text-muted))] text-xs">Đường dẫn Video bài giảng (YouTube, Cloudinary, MP4 link, v.v.)</Label>
                              <Input
                                placeholder="Ví dụ: https://www.youtube.com/watch?v=..."
                                value={item.videoUrl || ''}
                                onChange={(e) => updateSyllabusItem(index, 'videoUrl', e.target.value)}
                                className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                              />
                            </div>
                            <div className="md:col-span-1 space-y-2">
                              <Label className="text-[hsl(var(--admin-text-muted))] text-xs">Thời lượng video (phút)</Label>
                              <Input
                                type="number"
                                min="0"
                                placeholder="Ví dụ: 15"
                                value={item.videoDuration || ''}
                                onChange={(e) => updateSyllabusItem(index, 'videoDuration', e.target.value === '' ? '' : Number(e.target.value))}
                                className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                              />
                            </div>
                          </div>
                        )}

                        {/* File Upload Section */}
                        <div className="pt-2">
                          {item.fileUrl ? (
                            <div className="flex items-center justify-between p-3 bg-[hsl(var(--admin-background))] border border-[hsl(var(--admin-border))] rounded-md">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Paperclip className="h-4 w-4 text-[hsl(var(--admin-accent))] shrink-0" />
                                <a 
                                  href={item.fileUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-sm text-[hsl(var(--admin-accent))] hover:underline truncate"
                                >
                                  {item.fileName || 'Tài liệu đính kèm'}
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeResource(index)}
                                className="text-[hsl(var(--admin-text-faint))] hover:text-[hsl(var(--admin-danger))] p-1 rounded-full hover:bg-[hsl(var(--admin-danger)/10%)] transition-colors"
                                title="Xóa tài liệu"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                id={`syllabus-file-${index}`}
                                className="hidden"
                                onChange={(e) => handleResourceUpload(index, e)}
                                disabled={uploadingSyllabusIdx === index}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,image/*"
                              />
                              <label
                                htmlFor={`syllabus-file-${index}`}
                                className={`flex items-center gap-2 text-sm px-4 py-2 border border-dashed rounded-md transition-colors cursor-pointer
                                  ${uploadingSyllabusIdx === index 
                                    ? 'border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] cursor-not-allowed opacity-70'
                                    : 'border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] hover:border-[hsl(var(--admin-accent))] hover:text-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-background))] hover:bg-[hsl(var(--admin-accent)/5%)]'
                                  }`}
                              >
                                {uploadingSyllabusIdx === index ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Đang tải lên...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4" />
                                    Đính kèm tài liệu (Tối đa 15MB)
                                  </>
                                )}
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              </div>
            </div>
          )}

          {/* TAB 3: FINANCIAL & CAPACITY */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="border-b border-[hsl(var(--admin-border))] pb-4">
                <h3 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Học phí & Chỉ tiêu tuyển sinh</h3>
                <p className="text-[hsl(var(--admin-text-muted))] text-xs">Cấu hình mô hình tài chính, mức giá học phí và quy mô lớp học tối đa.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Loại hình học phí</Label>
                  <div className="flex flex-col gap-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-[hsl(var(--admin-text-primary))]">
                      <input
                        type="radio"
                        checked={fundingType === 'FREE'}
                        onChange={() => { setFundingType('FREE'); setFundingPrice(0); }}
                        className="h-4 w-4 accent-[hsl(var(--admin-accent))]"
                      />
                      <span>Miễn phí hoàn toàn (FREE)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-[hsl(var(--admin-text-primary))]">
                      <input
                        type="radio"
                        checked={fundingType === 'PAID'}
                        onChange={() => setFundingType('PAID')}
                        className="h-4 w-4 accent-[hsl(var(--admin-accent))]"
                      />
                      <span>Học viên tự chi trả (PAID)</span>
                    </label>
                  </div>
                </div>

                {deliveryType !== 'video' && (
                  <div className="space-y-2">
                    <Label htmlFor="maxStudents" className="text-[hsl(var(--admin-text-secondary))]">Quy mô lớp học (Sĩ số học viên tối đa) <span className="text-[hsl(var(--admin-danger))]">*</span></Label>
                    <Input
                      id="maxStudents"
                      type="number"
                      min="1"
                      value={maxStudents}
                      onChange={(e) => setMaxStudents(Number(e.target.value))}
                      disabled={isPartnership}
                      className={`bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] focus:border-[hsl(var(--admin-accent))] ${isPartnership ? 'opacity-70 cursor-not-allowed' : ''}`}
                    />
                    {errors.maxStudents && (
                      <p className="text-[hsl(var(--admin-danger))] text-xs flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.maxStudents}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {fundingType === 'PAID' && (
                <div className="space-y-2 md:w-1/2">
                  <Label htmlFor="fee" className="text-[hsl(var(--admin-text-secondary))]">Học phí (VND) <span className="text-[hsl(var(--admin-danger))]">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[hsl(var(--admin-text-faint))] text-sm">VND</span>
                    <Input
                      id="fee"
                      type="number"
                      min="0"
                      value={fundingPrice}
                      onChange={(e) => setFundingPrice(Number(e.target.value))}
                      className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] focus:border-[hsl(var(--admin-accent))] pl-12"
                    />
                  </div>
                  {errors.fee && (
                    <p className="text-[hsl(var(--admin-danger))] text-xs flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.fee}
                    </p>
                  )}
                </div>
              )}

              <div className="border-t border-[hsl(var(--admin-border))] pt-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="hasJobGuarantee"
                    checked={fundingHasJobGuarantee}
                    onChange={(e) => setFundingHasJobGuarantee(e.target.checked)}
                    disabled={isPartnership}
                    className={`h-4 w-4 rounded border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-accent))] focus:ring-[hsl(var(--admin-accent))] ${isPartnership ? 'bg-[hsl(var(--admin-surface-hover))] cursor-not-allowed opacity-60' : 'bg-[hsl(var(--admin-surface-elevated))]'}`}
                  />
                  <Label htmlFor="hasJobGuarantee" className={`text-[hsl(var(--admin-text-secondary))] ${isPartnership ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                    Khóa học có Cam kết việc làm đầu ra (Job Guarantee)
                  </Label>
                </div>
                
                {(!initialData?.hasEnterpriseSponsorship && !isPartnership) && (
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="acceptsSponsorship"
                      checked={fundingAcceptsSponsorship}
                      onChange={(e) => setFundingAcceptsSponsorship(e.target.checked)}
                      className="h-4 w-4 rounded border-[hsl(var(--admin-border-strong))] bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-accent))] focus:ring-[hsl(var(--admin-accent))]"
                    />
                    <div>
                      <Label htmlFor="acceptsSponsorship" className="text-[hsl(var(--admin-text-secondary))] cursor-pointer">
                        Cho phép nhận tài trợ từ các tổ chức NGO
                      </Label>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Nếu bật, khóa học của bạn sẽ hiển thị trên hệ thống của các NGO để họ cân nhắc tài trợ học bổng cho người lao động.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SYLLABUS & OTHERS */}
          {activeTab === 'syllabus' && (
            <div className="space-y-6">
              <div className="border-b border-[hsl(var(--admin-border))] pb-4">
                <h3 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Kết quả & Yêu cầu khác</h3>
                <p className="text-[hsl(var(--admin-text-muted))] text-xs">Thiết lập các điều kiện đầu vào, kỹ năng đạt được và chứng chỉ.</p>
              </div>

              {/* Tags & Lists section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[hsl(var(--admin-border))] pt-6">
                {/* Outbound Skills */}
                <div className="space-y-3">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Kỹ năng đầu ra (Skills)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhấn Enter hoặc nút thêm"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem(skills, setSkills, skillInput, setSkillInput))}
                      className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addArrayItem(skills, setSkills, skillInput, setSkillInput)}
                      className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))]"
                    >
                      Thêm
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skills.map((item, idx) => (
                      <span key={idx} className="flex items-center gap-1 bg-[hsl(var(--admin-accent)/10%)] text-[hsl(var(--admin-accent))] text-xs border border-[hsl(var(--admin-accent)/20%)] px-2 py-1 rounded-md">
                        {item}
                        <button type="button" onClick={() => removeArrayItem(skills, setSkills, idx)} className="text-[hsl(var(--admin-text-faint))] hover:text-[hsl(var(--admin-danger))]">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Outcomes */}
                <div className="space-y-3">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Kết quả đạt được (Outcomes)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhấn Enter hoặc nút thêm"
                      value={outcomeInput}
                      onChange={(e) => setOutcomeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem(outcomes, setOutcomes, outcomeInput, setOutcomeInput))}
                      className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addArrayItem(outcomes, setOutcomes, outcomeInput, setOutcomeInput)}
                      className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))]"
                    >
                      Thêm
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {outcomes.map((item, idx) => (
                      <span key={idx} className="flex items-center gap-1 bg-purple-500/10 text-purple-400 text-xs border border-purple-500/20 px-2 py-1 rounded-md">
                        {item}
                        <button type="button" onClick={() => removeArrayItem(outcomes, setOutcomes, idx)} className="text-[hsl(var(--admin-text-faint))] hover:text-[hsl(var(--admin-danger))]">×</button>
                      </span>
                    ))}
                  </div>
                </div>


              </div>

              {/* Certificate */}
              <div className="space-y-2 border-t border-[hsl(var(--admin-border))] pt-6">
                <Label htmlFor="certificate" className="text-[hsl(var(--admin-text-secondary))]">Thông tin chứng chỉ đầu ra</Label>
                <Input
                  id="certificate"
                  placeholder="Ví dụ: Chứng chỉ lập trình viên Frontend ReactJS chuyên nghiệp từ Restart-35"
                  value={certificate}
                  onChange={(e) => setCertificate(e.target.value)}
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] focus:border-[hsl(var(--admin-accent))]"
                />
              </div>

            </div>
          )}

          {/* Form Actions footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--admin-border))] pt-6">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]"
              onClick={() => window.history.back()}
            >
              Hủy bỏ
            </Button>
            
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))]"
              onClick={() => handleSave('draft')}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu bản nháp'}
            </Button>

            <Button
              type="button"
              disabled={isSubmitting}
              className="bg-[hsl(var(--admin-accent))] text-white hover:bg-[hsl(var(--admin-accent))]/90 border-none font-semibold px-6"
              onClick={() => handleSave('pending')}
            >
              {isSubmitting ? 'Đang xử lý...' : (isPartnership ? 'Gửi Doanh nghiệp duyệt' : 'Gửi duyệt khóa học')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrainerCourseForm;

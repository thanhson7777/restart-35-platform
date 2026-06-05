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
  Settings
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Label, 
  Textarea, 
  SelectField, 
  Checkbox 
} from '@/components/ui';

const TrainerCourseForm = ({ initialData, categories = [], onSubmit, isSubmitting = false }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('beginner');
  const [deliveryType, setDeliveryType] = useState('video');
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);

  // Time & Location
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState('weeks');
  const [locationType, setLocationType] = useState('online');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLink, setLocationLink] = useState('');
  const [enrollmentStartDate, setEnrollmentStartDate] = useState('');
  const [scheduleText, setScheduleText] = useState('');

  // Financial & Capacity
  const [fundingModel, setFundingModel] = useState('free');
  const [fee, setFee] = useState(0);
  const [maxStudents, setMaxStudents] = useState(30);
  const [isFree, setIsFree] = useState(true);
  const [scholarshipEligibility, setScholarshipEligibility] = useState(false);

  // Syllabus
  const [syllabus, setSyllabus] = useState([]);

  // Tag inputs (arrays of strings)
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [prerequisites, setPrerequisites] = useState([]);
  const [prereqInput, setPrereqInput] = useState('');
  const [requirements, setRequirements] = useState([]);
  const [reqInput, setReqInput] = useState('');
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
      setLevel(initialData.level || 'beginner');
      setDeliveryType(initialData.delivery_type || 'video');
      setThumbnailPreview(initialData.thumbnail || '');
      
      if (initialData.duration) {
        setDurationValue(initialData.duration.value || 1);
        setDurationUnit(initialData.duration.unit || 'weeks');
      }

      if (initialData.location) {
        setLocationType(initialData.location.type || 'online');
        setLocationAddress(initialData.location.address || '');
        setLocationLink(initialData.location.link || '');
      }

      // Convert timestamp to YYYY-MM-DD for date input
      if (initialData.enrollmentStartDate) {
        const dateObj = new Date(initialData.enrollmentStartDate);
        if (!isNaN(dateObj.getTime())) {
          setEnrollmentStartDate(dateObj.toISOString().split('T')[0]);
        }
      }

      setScheduleText(initialData.schedule || '');
      setFundingModel(initialData.funding_model || 'free');
      setFee(initialData.fee || 0);
      setMaxStudents(initialData.maxStudents || 30);
      setIsFree(initialData.isFree ?? true);
      setScholarshipEligibility(initialData.scholarshipEligibility || false);
      setSyllabus(initialData.syllabus || []);
      setSkills(initialData.skills || []);
      setPrerequisites(initialData.prerequisites || []);
      setRequirements(initialData.requirements || []);
      setOutcomes(initialData.outcomes || []);
      setCertificate(initialData.certificate || '');
    }
  }, [initialData]);

  // Sync fee and isFree when model changes
  useEffect(() => {
    if (fundingModel === 'free') {
      setIsFree(true);
      setFee(0);
    } else {
      setIsFree(false);
    }
  }, [fundingModel]);

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
        duration: ''
      }
    ]);
  };

  const updateSyllabusItem = (index, field, value) => {
    const updated = [...syllabus];
    updated[index][field] = value;
    setSyllabus(updated);
  };

  const removeSyllabusWeek = (index) => {
    const updated = syllabus
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, week: idx + 1 })); // Re-index week numbers
    setSyllabus(updated);
  };

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
    if (!isFree && (!fee || fee <= 0)) {
      newErrors.fee = 'Học phí phải lớn hơn 0 nếu không phải khóa học miễn phí';
    }
    if (maxStudents <= 0) {
      newErrors.maxStudents = 'Số học viên tối đa phải lớn hơn 0';
    }
    if (durationValue <= 0) {
      newErrors.duration = 'Thời lượng khóa học không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Form Submit
  const handleSave = (statusOverride) => {
    if (!validateForm()) {
      // Switch to first tab with errors
      if (errors.title || errors.categoryId || errors.description) {
        setActiveTab('basic');
      } else if (errors.duration) {
        setActiveTab('schedule');
      } else if (errors.fee || errors.maxStudents) {
        setActiveTab('financial');
      }
      return;
    }

    // Prepare payload
    const payload = new FormData();
    payload.append('title', title.trim());
    payload.append('categoryId', categoryId);
    payload.append('shortDescription', shortDescription.trim());
    payload.append('description', description);
    payload.append('level', level);
    payload.append('delivery_type', deliveryType);
    payload.append('schedule', scheduleText.trim());
    payload.append('certificate', certificate.trim());
    
    // Status Override
    if (statusOverride) {
      payload.append('status', statusOverride);
    }

    // Numeric & Boolean
    payload.append('fee', fee);
    payload.append('isFree', isFree);
    payload.append('scholarshipEligibility', scholarshipEligibility);
    payload.append('maxStudents', maxStudents);

    // Date
    if (enrollmentStartDate) {
      // Send as timestamp
      const timestamp = new Date(enrollmentStartDate).getTime();
      payload.append('enrollmentStartDate', timestamp);
    }

    // Objects
    payload.append('duration', JSON.stringify({
      value: Number(durationValue),
      unit: durationUnit
    }));

    payload.append('location', JSON.stringify({
      type: locationType,
      address: locationAddress.trim(),
      link: locationLink.trim()
    }));

    payload.append('funding_model', fundingModel);

    // Arrays
    payload.append('skills', JSON.stringify(skills));
    payload.append('prerequisites', JSON.stringify(prerequisites));
    payload.append('requirements', JSON.stringify(requirements));
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
    { id: 'schedule', label: 'Thời gian & Địa điểm', icon: Clock },
    { id: 'financial', label: 'Học phí & Quy mô', icon: DollarSign },
    { id: 'syllabus', label: 'Giáo trình & Khác', icon: BookOpen }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Navigation Sidebar (Desktop) */}
      <div className="lg:col-span-1 space-y-2">
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#001D4A] text-white'
                    : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Thumbnail Preview Card */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-4">
          <Label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Ảnh đại diện khóa học</Label>
          <div className="relative aspect-video w-full overflow-hidden bg-slate-800 rounded-lg border border-dashed border-[#1f2937] flex items-center justify-center">
            {thumbnailPreview ? (
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-center p-4">
                <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <span className="text-xs text-gray-500">Chưa có ảnh</span>
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
              className="w-full border-[#1f2937] bg-slate-800/50 text-gray-300 hover:bg-slate-800"
            >
              <label htmlFor="thumbnail-upload" className="cursor-pointer flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" />
                Chọn ảnh tải lên
              </label>
            </Button>
            {errors.thumbnail && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.thumbnail}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="lg:col-span-3 space-y-6">
        <form onSubmit={(e) => e.preventDefault()} className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 space-y-6">
          
          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="border-b border-[#1f2937] pb-4">
                <h3 className="text-lg font-semibold text-white">Thông tin cơ bản</h3>
                <p className="text-gray-400 text-xs">Điền các thông tin định dạng cơ bản của khóa học.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-200">Tiêu đề khóa học <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  placeholder="Ví dụ: Lập trình Web Frontend ReactJS nâng cao cho người 35+"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-slate-900 border-[#1f2937] text-white focus:border-blue-500"
                />
                {errors.title && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="category" className="text-gray-200">Danh mục <span className="text-red-500">*</span></Label>
                  <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-md border border-[#1f2937] bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.categoryId}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="level" className="text-gray-200">Trình độ</Label>
                  <select
                    id="level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full rounded-md border border-[#1f2937] bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="beginner">Cơ bản (Beginner)</option>
                    <option value="intermediate">Trung cấp (Intermediate)</option>
                    <option value="advanced">Nâng cao (Advanced)</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="deliveryType" className="text-gray-200">Hình thức giảng dạy</Label>
                  <select
                    id="deliveryType"
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value)}
                    className="w-full rounded-md border border-[#1f2937] bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="video">Học qua Video</option>
                    <option value="online">Học Online (Zoom/Meet)</option>
                    <option value="offline">Học trực tiếp (Offline)</option>
                    <option value="hybrid">Kết hợp (Hybrid)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription" className="text-gray-200">Mô tả ngắn (Hiển thị ở trang danh sách)</Label>
                <Textarea
                  id="shortDescription"
                  placeholder="Tóm tắt nhanh nội dung chính của khóa học trong vòng 2-3 câu..."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="bg-slate-900 border-[#1f2937] text-white focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-200">Mô tả chi tiết khóa học <span className="text-red-500">*</span></Label>
                <div className="bg-slate-900 border border-[#1f2937] rounded-md overflow-hidden text-white">
                  <ReactQuill
                    theme="snow"
                    value={description}
                    onChange={setDescription}
                    className="editor-content"
                    placeholder="Mô tả chi tiết nội dung chương trình học, kết quả mong đợi, phương thức đào tạo..."
                  />
                </div>
                {errors.description && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
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
              <div className="border-b border-[#1f2937] pb-4">
                <h3 className="text-lg font-semibold text-white">Thời gian & Địa điểm học</h3>
                <p className="text-gray-400 text-xs">Cấu hình thời lượng khóa học, địa chỉ học trực tiếp và thời gian mở tuyển sinh.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="durationValue" className="text-gray-200">Thời lượng khóa học <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    <Input
                      id="durationValue"
                      type="number"
                      min="1"
                      value={durationValue}
                      onChange={(e) => setDurationValue(Number(e.target.value))}
                      className="bg-slate-900 border-[#1f2937] text-white focus:border-blue-500 w-2/3"
                    />
                    <select
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value)}
                      className="rounded-md border border-[#1f2937] bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none w-1/3"
                    >
                      <option value="days">Ngày</option>
                      <option value="weeks">Tuần</option>
                      <option value="months">Tháng</option>
                    </select>
                  </div>
                  {errors.duration && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.duration}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enrollmentStartDate" className="text-gray-200">Ngày bắt đầu đăng ký</Label>
                  <Input
                    id="enrollmentStartDate"
                    type="date"
                    value={enrollmentStartDate}
                    onChange={(e) => setEnrollmentStartDate(e.target.value)}
                    className="bg-slate-900 border-[#1f2937] text-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-[#1f2937] pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="locationType" className="text-gray-200">Loại địa điểm</Label>
                  <select
                    id="locationType"
                    value={locationType}
                    onChange={(e) => setLocationType(e.target.value)}
                    className="w-full md:w-1/3 rounded-md border border-[#1f2937] bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="online">Trực tuyến (Online)</option>
                    <option value="offline">Trực tiếp tại Trung tâm (Offline)</option>
                    <option value="hybrid">Học kết hợp (Hybrid)</option>
                  </select>
                </div>

                {locationType !== 'online' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="locationAddress" className="text-gray-200">Địa chỉ cụ thể</Label>
                      <Input
                        id="locationAddress"
                        placeholder="Số 123 Đường ABC, Quận X, TP. HCM"
                        value={locationAddress}
                        onChange={(e) => setLocationAddress(e.target.value)}
                        className="bg-slate-900 border-[#1f2937] text-white focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="locationLink" className="text-gray-200">Link bản đồ (Google Maps URL)</Label>
                      <Input
                        id="locationLink"
                        placeholder="https://maps.google.com/..."
                        value={locationLink}
                        onChange={(e) => setLocationLink(e.target.value)}
                        className="bg-slate-900 border-[#1f2937] text-white focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduleText" className="text-gray-200">Lịch học dự kiến (Hiển thị giới thiệu)</Label>
                <Textarea
                  id="scheduleText"
                  placeholder="Ví dụ: Tối thứ 2 - 4 - 6 từ 19:30 đến 21:30"
                  value={scheduleText}
                  onChange={(e) => setScheduleText(e.target.value)}
                  className="bg-slate-900 border-[#1f2937] text-white focus:border-blue-500"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* TAB 3: FINANCIAL & CAPACITY */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="border-b border-[#1f2937] pb-4">
                <h3 className="text-lg font-semibold text-white">Học phí & Chỉ tiêu tuyển sinh</h3>
                <p className="text-gray-400 text-xs">Cấu hình mô hình tài chính, mức giá học phí và quy mô lớp học tối đa.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fundingModel" className="text-gray-200">Mô hình tài trợ học phí</Label>
                  <select
                    id="fundingModel"
                    value={fundingModel}
                    onChange={(e) => setFundingModel(e.target.value)}
                    className="w-full rounded-md border border-[#1f2937] bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="free">Miễn phí hoàn toàn (Free)</option>
                    <option value="upfront">Thanh toán trả trước (Upfront)</option>
                    <option value="deposit">Đặt cọc cam kết (Deposit)</option>
                    <option value="installment">Trả góp định kỳ (Installment)</option>
                    <option value="isa">Thỏa thuận chia sẻ thu nhập (ISA)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStudents" className="text-gray-200">Quy mô lớp học (Sĩ số học viên tối đa) <span className="text-red-500">*</span></Label>
                  <Input
                    id="maxStudents"
                    type="number"
                    min="1"
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(Number(e.target.value))}
                    className="bg-slate-900 border-[#1f2937] text-white focus:border-blue-500"
                  />
                  {errors.maxStudents && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.maxStudents}
                    </p>
                  )}
                </div>
              </div>

              {fundingModel !== 'free' && (
                <div className="space-y-2 md:w-1/2">
                  <Label htmlFor="fee" className="text-gray-200">Học phí (VND) <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">VND</span>
                    <Input
                      id="fee"
                      type="number"
                      min="0"
                      value={fee}
                      onChange={(e) => setFee(Number(e.target.value))}
                      className="bg-slate-900 border-[#1f2937] text-white focus:border-blue-500 pl-12"
                    />
                  </div>
                  {errors.fee && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.fee}
                    </p>
                  )}
                </div>
              )}

              <div className="border-t border-[#1f2937] pt-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="scholarshipEligibility"
                    checked={scholarshipEligibility}
                    onChange={(e) => setScholarshipEligibility(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="scholarshipEligibility" className="text-gray-300 cursor-pointer">
                    Hỗ trợ tài trợ học bổng học phí (từ quỹ NGO hoặc Chính phủ)
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SYLLABUS & OTHERS */}
          {activeTab === 'syllabus' && (
            <div className="space-y-6">
              <div className="border-b border-[#1f2937] pb-4">
                <h3 className="text-lg font-semibold text-white">Giáo trình chi tiết & Yêu cầu học</h3>
                <p className="text-gray-400 text-xs">Xây dựng giáo trình giảng dạy chi tiết theo tuần học và thiết lập các điều kiện đầu vào/kỹ năng đạt được.</p>
              </div>

              {/* Syllabus Builder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-200 font-semibold text-base">Nội dung giáo trình bài dạy</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSyllabusWeek}
                    size="sm"
                    className="border-dashed border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Thêm tuần học mới
                  </Button>
                </div>

                {syllabus.length === 0 ? (
                  <div className="border border-dashed border-[#1f2937] rounded-lg p-6 text-center text-gray-500">
                    Chưa có giáo trình nào. Hãy nhấn nút để thêm bài học.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {syllabus.map((item, index) => (
                      <div key={index} className="border border-[#1f2937] rounded-lg p-4 bg-slate-900/40 space-y-3 relative">
                        <button
                          type="button"
                          onClick={() => removeSyllabusWeek(index)}
                          className="absolute right-4 top-4 text-gray-500 hover:text-red-400 transition-colors"
                          title="Xóa tuần này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-8">
                          <div className="md:col-span-1 space-y-2">
                            <Label className="text-gray-400 text-xs">Tuần học</Label>
                            <Input
                              type="number"
                              value={item.week}
                              onChange={(e) => updateSyllabusItem(index, 'week', Number(e.target.value))}
                              className="bg-slate-900 border-[#1f2937] text-white"
                            />
                          </div>
                          
                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-gray-400 text-xs">Tiêu đề buổi/chương học</Label>
                            <Input
                              placeholder="Ví dụ: Giới thiệu về React component và Props"
                              value={item.title}
                              onChange={(e) => updateSyllabusItem(index, 'title', e.target.value)}
                              className="bg-slate-900 border-[#1f2937] text-white"
                            />
                          </div>

                          <div className="md:col-span-1 space-y-2">
                            <Label className="text-gray-400 text-xs">Thời lượng ước tính</Label>
                            <Input
                              placeholder="Ví dụ: 3 giờ"
                              value={item.duration}
                              onChange={(e) => updateSyllabusItem(index, 'duration', e.target.value)}
                              className="bg-slate-900 border-[#1f2937] text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-400 text-xs">Nội dung chi tiết bài giảng</Label>
                          <Textarea
                            placeholder="Mô tả tóm tắt nội dung học viên sẽ học trong tuần/chương này..."
                            value={item.content}
                            onChange={(e) => updateSyllabusItem(index, 'content', e.target.value)}
                            className="bg-slate-900 border-[#1f2937] text-white"
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags & Lists section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[#1f2937] pt-6">
                {/* Outbound Skills */}
                <div className="space-y-3">
                  <Label className="text-gray-200">Kỹ năng đầu ra (Skills)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhấn Enter hoặc nút thêm"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem(skills, setSkills, skillInput, setSkillInput))}
                      className="bg-slate-900 border-[#1f2937] text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addArrayItem(skills, setSkills, skillInput, setSkillInput)}
                      className="border-[#1f2937] hover:bg-slate-800"
                    >
                      Thêm
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skills.map((item, idx) => (
                      <span key={idx} className="flex items-center gap-1 bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20 px-2 py-1 rounded-md">
                        {item}
                        <button type="button" onClick={() => removeArrayItem(skills, setSkills, idx)} className="text-gray-500 hover:text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Outcomes */}
                <div className="space-y-3">
                  <Label className="text-gray-200">Kết quả đạt được (Outcomes)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhấn Enter hoặc nút thêm"
                      value={outcomeInput}
                      onChange={(e) => setOutcomeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem(outcomes, setOutcomes, outcomeInput, setOutcomeInput))}
                      className="bg-slate-900 border-[#1f2937] text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addArrayItem(outcomes, setOutcomes, outcomeInput, setOutcomeInput)}
                      className="border-[#1f2937] hover:bg-slate-800"
                    >
                      Thêm
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {outcomes.map((item, idx) => (
                      <span key={idx} className="flex items-center gap-1 bg-purple-500/10 text-purple-400 text-xs border border-purple-500/20 px-2 py-1 rounded-md">
                        {item}
                        <button type="button" onClick={() => removeArrayItem(outcomes, setOutcomes, idx)} className="text-gray-500 hover:text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prerequisites */}
                <div className="space-y-3">
                  <Label className="text-gray-200">Điều kiện tiên quyết (Prerequisites)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhấn Enter hoặc nút thêm"
                      value={prereqInput}
                      onChange={(e) => setPrereqInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem(prerequisites, setPrerequisites, prereqInput, setPrereqInput))}
                      className="bg-slate-900 border-[#1f2937] text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addArrayItem(prerequisites, setPrerequisites, prereqInput, setPrereqInput)}
                      className="border-[#1f2937] hover:bg-slate-800"
                    >
                      Thêm
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {prerequisites.map((item, idx) => (
                      <span key={idx} className="flex items-center gap-1 bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20 px-2 py-1 rounded-md">
                        {item}
                        <button type="button" onClick={() => removeArrayItem(prerequisites, setPrerequisites, idx)} className="text-gray-500 hover:text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                <div className="space-y-3">
                  <Label className="text-gray-200">Yêu cầu đầu vào (Requirements)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhấn Enter hoặc nút thêm"
                      value={reqInput}
                      onChange={(e) => setReqInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem(requirements, setRequirements, reqInput, setReqInput))}
                      className="bg-slate-900 border-[#1f2937] text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addArrayItem(requirements, setRequirements, reqInput, setReqInput)}
                      className="border-[#1f2937] hover:bg-slate-800"
                    >
                      Thêm
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {requirements.map((item, idx) => (
                      <span key={idx} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20 px-2 py-1 rounded-md">
                        {item}
                        <button type="button" onClick={() => removeArrayItem(requirements, setRequirements, idx)} className="text-gray-500 hover:text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Certificate */}
              <div className="space-y-2 border-t border-[#1f2937] pt-6">
                <Label htmlFor="certificate" className="text-gray-200">Thông tin chứng chỉ đầu ra</Label>
                <Input
                  id="certificate"
                  placeholder="Ví dụ: Chứng chỉ lập trình viên Frontend ReactJS chuyên nghiệp từ Restart-35"
                  value={certificate}
                  onChange={(e) => setCertificate(e.target.value)}
                  className="bg-slate-900 border-[#1f2937] text-white focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Form Actions footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[#1f2937] pt-6">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="border-[#1f2937] text-gray-300 hover:bg-slate-800"
              onClick={() => window.history.back()}
            >
              Hủy bỏ
            </Button>
            
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="border-[#1f2937] bg-slate-800 text-white hover:bg-slate-700"
              onClick={() => handleSave('draft')}
            >
              Lưu nháp
            </Button>

            <Button
              type="button"
              disabled={isSubmitting}
              className="bg-blue-600 text-white hover:bg-blue-700 font-semibold px-6"
              onClick={() => handleSave('pending')}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Gửi duyệt khóa học'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrainerCourseForm;

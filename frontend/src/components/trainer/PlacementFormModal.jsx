import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Briefcase,
  DollarSign,
  Calendar,
  Save,
  AlertCircle
} from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Textarea,
  SelectField
} from '@/components/ui';
import { getTrainerEnrollments, getMyCourses } from '@/apis/courseApi';
import { createPlacement, updatePlacement } from '@/apis/courseApi';
import toast from 'react-hot-toast';

const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Toàn thời gian' },
  { value: 'part-time', label: 'Bán thời gian' },
  { value: 'internship', label: 'Thực tập' },
  { value: 'freelance', label: 'Freelance' }
];

export const PlacementFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  placement = null
}) => {
  const isEditMode = !!placement;
  const [loading, setLoading] = useState(false);
  const [completedStudents, setCompletedStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm] = useState({
    userId: '',
    courseId: '',
    company: '',
    position: '',
    salary: '',
    employmentType: 'full-time',
    startedDate: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && placement) {
        setForm({
          userId: placement.userId || '',
          courseId: placement.courseId || placement.course?._id || '',
          company: placement.company || '',
          position: placement.position || '',
          salary: placement.salary ? String(placement.salary) : '',
          employmentType: placement.employmentType || 'full-time',
          startedDate: placement.startedDate ? placement.startedDate.split('T')[0] : '',
          notes: placement.notes || ''
        });
      } else {
        setForm({
          userId: '',
          courseId: '',
          company: '',
          position: '',
          salary: '',
          employmentType: 'full-time',
          startedDate: '',
          notes: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, placement]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [enrollmentsRes, coursesRes] = await Promise.all([
        getTrainerEnrollments({ status: 'completed', limit: 1000 }),
        getMyCourses({ limit: 1000 })
      ]);

      const completed = (enrollmentsRes.data?.data || []).filter(e => e.status === 'completed');
      setCompletedStudents(completed);
      setCourses(coursesRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.userId) {
      newErrors.userId = 'Vui lòng chọn học viên.';
    }
    if (!form.company.trim()) {
      newErrors.company = 'Vui lòng nhập tên công ty.';
    }
    if (!form.position.trim()) {
      newErrors.position = 'Vui lòng nhập vị trí công việc.';
    }
    if (form.salary && isNaN(Number(form.salary))) {
      newErrors.salary = 'Lương phải là số.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        userId: form.userId,
        courseId: form.courseId,
        company: form.company.trim(),
        position: form.position.trim(),
        employmentType: form.employmentType,
        ...(form.salary && { salary: Number(form.salary) }),
        ...(form.startedDate && { startedDate: form.startedDate }),
        ...(form.notes && { notes: form.notes.trim() })
      };

      if (isEditMode) {
        await updatePlacement(placement._id, payload);
        toast.success('Cập nhật placement thành công!');
      } else {
        await createPlacement(payload);
        toast.success('Tạo placement thành công!');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error saving placement:', err);
      toast.error(
        err.response?.data?.message ||
        `Không thể ${isEditMode ? 'cập nhật' : 'tạo'} placement.`
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const studentOptions = completedStudents.map(e => ({
    value: e.userId || e.user?._id,
    label: e.user?.displayName || 'Học viên',
    courseId: e.courseId || e.course?._id
  }));

  const selectedStudent = studentOptions.find(s => s.value === form.userId);
  const autoCourseId = selectedStudent?.courseId || form.courseId;

  const courseOptions = courses.map(c => ({
    value: c._id,
    label: c.title || 'Khóa học'
  }));

  const placementCourse = autoCourseId
    ? courses.find(c => c._id === autoCourseId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#111827] border border-slate-800 rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5 shrink-0">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-400" />
              {isEditMode ? 'Cập nhật Placement' : 'Thêm Placement'}
            </h3>
            <p className="text-xs text-slate-400">
              {isEditMode
                ? 'Cập nhật thông tin việc làm của học viên.'
                : 'Giới thiệu việc làm cho học viên đã hoàn thành khóa học.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">

          {loadingData ? (
            <div className="py-16 text-center text-slate-500 space-y-4">
              <div className="h-10 w-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <>
              {/* Học viên */}
              <div className="space-y-1.5">
                <SelectField
                  label="Học viên"
                  required
                  value={form.userId}
                  onChange={(val) => handleChange('userId', val)}
                  options={studentOptions}
                  placeholder="-- Chọn học viên --"
                  error={errors.userId}
                  disabled={isEditMode}
                />
              </div>

              {/* Khóa học (auto-filled hoặc chọn) */}
              {isEditMode ? (
                <div className="space-y-1.5">
                  <Label required>Khóa học</Label>
                  <div className="h-10 px-4 flex items-center bg-slate-900/40 border border-slate-800 rounded-lg text-sm text-slate-300">
                    {placementCourse?.title || 'N/A'}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <SelectField
                    label="Khóa học"
                    required
                    value={autoCourseId}
                    onChange={(val) => handleChange('courseId', val)}
                    options={courseOptions}
                    placeholder="-- Chọn khóa học --"
                    hint={!form.userId ? '(Tự động điền khi chọn học viên)' : ''}
                  />
                </div>
              )}

              {/* Công ty */}
              <div className="space-y-1.5">
                <Label required htmlFor="company">
                  Công ty
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <Input
                    id="company"
                    value={form.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    placeholder="Ví dụ: Công ty TNHH ABC"
                    className="pl-9 bg-slate-900/60 border-slate-800 text-slate-200 placeholder:text-slate-600"
                    error={errors.company}
                  />
                </div>
              </div>

              {/* Vị trí */}
              <div className="space-y-1.5">
                <Label required htmlFor="position">
                  Vị trí
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <Input
                    id="position"
                    value={form.position}
                    onChange={(e) => handleChange('position', e.target.value)}
                    placeholder="Ví dụ: Kỹ thuật viên CNC"
                    className="pl-9 bg-slate-900/60 border-slate-800 text-slate-200 placeholder:text-slate-600"
                    error={errors.position}
                  />
                </div>
              </div>

              {/* Lương + Loại công việc */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="salary">Lương (VND)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <Input
                      id="salary"
                      type="number"
                      min="0"
                      value={form.salary}
                      onChange={(e) => handleChange('salary', e.target.value)}
                      placeholder="Ví dụ: 10000000"
                      className="pl-9 bg-slate-900/60 border-slate-800 text-slate-200 placeholder:text-slate-600"
                      error={errors.salary}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <SelectField
                    label="Loại công việc"
                    value={form.employmentType}
                    onChange={(val) => handleChange('employmentType', val)}
                    options={EMPLOYMENT_TYPES}
                  />
                </div>
              </div>

              {/* Ngày bắt đầu */}
              <div className="space-y-1.5">
                <Label htmlFor="startedDate">Ngày bắt đầu</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <Input
                    id="startedDate"
                    type="date"
                    value={form.startedDate}
                    onChange={(e) => handleChange('startedDate', e.target.value)}
                    className="pl-9 bg-slate-900/60 border-slate-800 text-slate-200"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Ghi chú</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Thông tin bổ sung về placement (nếu có)..."
                  rows={3}
                  className="bg-slate-900/60 border-slate-800 text-slate-200 placeholder:text-slate-600 resize-none"
                />
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 p-5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 text-sm py-2 px-4"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || loadingData}
            className="bg-blue-600 hover:bg-blue-700 text-white border-none text-sm py-2 px-5 font-semibold flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditMode ? 'Cập nhật' : 'Tạo mới'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

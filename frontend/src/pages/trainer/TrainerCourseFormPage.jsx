import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui';
import { getCategoriesAPI } from '@/apis';
import { getCourseById } from '@/apis/courseApi';
import { createCourse, updateCourse, submitCourse } from '@/apis/trainerApi';
import TrainerCourseForm from '@/components/trainer/TrainerCourseForm';
import toast from 'react-hot-toast';

const TrainerCourseFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [categories, setCategories] = useState([]);
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch categories
      const categoriesRes = await getCategoriesAPI();
      setCategories(categoriesRes.data || []);

      // 2. Fetch course if in edit mode
      if (isEditMode) {
        const courseRes = await getCourseById(id);
        setCourseData(courseRes.data?.data || null);
      }
    } catch (err) {
      console.error('Error fetching course form data:', err);
      toast.error('Không thể tải thông tin biểu mẫu.');
    } finally {
      setLoading(false);
    }
  }, [id, isEditMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Form Submission
  const handleSubmit = async (formData) => {
    setSubmitting(true);
    const actionType = formData.get('status'); // 'draft' or 'pending'
    
    // Status is handled explicitly below; remove it from base update if needed
    // (though backend Joi schema ignores or processes it)
    
    try {
      let savedCourseId = id;

      if (isEditMode) {
        // Edit course
        await updateCourse(id, formData);
        toast.success('Cập nhật khóa học thành công!');
      } else {
        // Create course
        const res = await createCourse(formData);
        const newCourse = res.data?.data;
        savedCourseId = newCourse?._id;
        toast.success('Tạo khóa học thành công!');
      }

      // If user clicked "Gửi duyệt", perform the submission transition
      if (actionType === 'pending' && savedCourseId) {
        await submitCourse(savedCourseId);
        toast.success('Đã gửi yêu cầu phê duyệt khóa học!');
      }

      // Redirect back to courses list
      navigate('/trainer/courses');
    } catch (err) {
      console.error('Error saving course:', err);
      toast.error(err.response?.data?.message || 'Không thể lưu khóa học.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top breadcrumb navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/trainer/courses')}
          className="border-[hsl(var(--admin-border))] bg-transparent hover:bg-[hsl(var(--admin-surface-hover))] text-[hsl(var(--admin-text-secondary))]"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Quay lại danh sách
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))]">
            {isEditMode ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}
          </h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-xs mt-0.5">
            {isEditMode ? 'Cập nhật lại thông tin, giáo trình hoặc lịch học.' : 'Thiết lập nội dung và cấu hình ban đầu cho khóa học mới.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-96 w-full bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl animate-pulse flex items-center justify-center text-[hsl(var(--admin-text-muted))]">
          Đang tải dữ liệu biểu mẫu...
        </div>
      ) : (
        <TrainerCourseForm
          initialData={courseData}
          categories={categories}
          onSubmit={handleSubmit}
          isSubmitting={submitting}
        />
      )}
    </div>
  );
};

export default TrainerCourseFormPage;

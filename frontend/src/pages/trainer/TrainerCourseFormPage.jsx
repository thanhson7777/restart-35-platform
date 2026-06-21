import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui';
import { getCategoriesAPI, createCategoryAPI } from '@/apis';
import { getCourseById } from '@/apis/courseApi';
import { createCourse, updateCourse, submitCourse, getPartnershipDetail } from '@/apis/trainerApi';
import TrainerCourseForm from '@/components/trainer/TrainerCourseForm';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';

const TrainerCourseFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
      } else {
        // 3. Handle Partnership auto-fill
        const searchParams = new URLSearchParams(location.search);
        const partnershipId = searchParams.get('partnershipId');
        if (partnershipId) {
          try {
            const pRes = await getPartnershipDetail(partnershipId);
            const p = pRes.data?.data;
            if (p) {
              let dType = p.recruitmentNeeds?.deliveryType || 'video';
              if (dType === 'online') dType = 'live';
              if (dType === 'hybrid') dType = 'offline';

              setCourseData({
                title: `Khóa đào tạo ${p.recruitmentNeeds?.jobTitle || ''}`,
                categoryId: p.recruitmentNeeds?.categoryId || '',
                delivery_type: dType,
                maxStudents: p.recruitmentNeeds?.jobQuantity || 30,
                fundingConfig: {
                  type: 'PAID',
                  price: p.proposedSponsorship?.fixedAmountPerLearner || 0,
                  hasJobGuarantee: true,
                  acceptsSponsorship: !p.proposedSponsorship?.fixedAmountPerLearner
                },
                skills: p.recruitmentNeeds?.targetSkills || [],
                description: `<p>Khóa học được thiết kế đặc biệt theo yêu cầu tuyển dụng của doanh nghiệp <strong>${p.enterprise?.displayName || 'đối tác'}</strong>.</p><p>Mục tiêu: Đào tạo ứng viên đạt tiêu chuẩn cho vị trí <strong>${p.recruitmentNeeds?.jobTitle || ''}</strong>.</p>`,
                linkedPartnershipId: partnershipId,
                linkedEnterpriseId: p.enterpriseId,
                hasEnterpriseSponsorship: !!p.proposedSponsorship?.fixedAmountPerLearner
              });
              toast.success('Đã tự động điền thông tin từ Yêu cầu Doanh nghiệp!');
            }
          } catch (err) {
            console.error('Error fetching partnership:', err);
            toast.error('Không thể tự động điền dữ liệu từ Partnership.');
          }
        }
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
    
    // Status is handled explicitly by APIs below; prevent base update from overwriting it
    formData.delete('status');
    
    try {
      let savedCourseId = id;

      // Handle new category creation
      const newCategoryName = formData.get('newCategoryName');
      if (newCategoryName) {
        // We create a pending category
        const catRes = await createCategoryAPI({
          name: newCategoryName,
          status: 'pending',
          isActive: false
        });
        if (catRes?.data?._id) {
          formData.set('categoryId', catRes.data._id);
        }
        formData.delete('newCategoryName');
      }

      if (isEditMode) {
        // Edit course
        await updateCourse(id, formData);
        toast.success('Cập nhật khóa học thành công!');
      } else {
        // Create course
        // Append linked partnership details if they exist in courseData
        if (courseData?.linkedPartnershipId) {
          formData.append('linkedPartnershipId', courseData.linkedPartnershipId);
          formData.append('linkedEnterpriseId', courseData.linkedEnterpriseId);
        }
        
        const res = await createCourse(formData);
        const newCourse = res.data?.data;
        savedCourseId = newCourse?._id;
        toast.success('Tạo khóa học thành công!');
      }

      // If user clicked "Gửi duyệt" or "Gửi Doanh nghiệp Duyệt", perform the submission transition
      if (actionType === 'pending' && savedCourseId) {
        if (courseData?.linkedPartnershipId) {
          // It's a B2B course, the backend will handle changing status to DRAFT and Partnership to NEGOTIATING
          toast.success('Đã gửi bản thảo cho Doanh nghiệp phê duyệt!');
        } else {
          await submitCourse(savedCourseId);
          toast.success('Đã gửi yêu cầu phê duyệt khóa học cho Admin!');
        }
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
      ) : courseData?.status === 'pending' ? (
        <div className="bg-[hsl(var(--admin-warning)_/_10%)] border border-[hsl(var(--admin-warning)_/_30%)] text-[hsl(var(--admin-warning))] p-6 rounded-xl text-center space-y-4">
          <p className="font-medium text-lg">Khóa học này đang chờ Admin duyệt.</p>
          <p className="text-sm">Bạn không thể chỉnh sửa khóa học trong thời gian này. Vui lòng rút yêu cầu duyệt ở màn hình Danh sách nếu bạn cần tiếp tục chỉnh sửa.</p>
          <Button
            onClick={() => navigate('/trainer/courses')}
            className="bg-[hsl(var(--admin-warning))] hover:bg-[hsl(var(--admin-warning))/80] text-white"
          >
            Quay lại danh sách
          </Button>
        </div>
      ) : (
        <TrainerCourseForm
          initialData={courseData}
          categories={categories}
          onSubmit={handleSubmit}
          isSubmitting={submitting}
          isEditMode={isEditMode}
          isPartnership={!!courseData?.linkedPartnershipId}
        />
      )}
    </div>
  );
};

export default TrainerCourseFormPage;

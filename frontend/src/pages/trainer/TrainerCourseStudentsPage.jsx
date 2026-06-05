import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui';
import { getCourseById, getCourseEnrollments } from '@/apis/courseApi';
import { TrainerStudentTable } from '@/components/trainer/TrainerStudentTable';
import toast from 'react-hot-toast';

const TrainerCourseStudentsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const limit = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch course details
      const courseRes = await getCourseById(id);
      setCourse(courseRes.data?.data || null);

      // 2. Fetch enrollments for this course
      const enrollRes = await getCourseEnrollments(id, {
        page: currentPage,
        limit
      });
      setEnrollments(enrollRes.data?.data || []);
      setPagination(enrollRes.data?.pagination || null);
    } catch (err) {
      console.error('Error fetching course students:', err);
      toast.error('Không thể tải danh sách học viên.');
    } finally {
      setLoading(false);
    }
  }, [id, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/trainer/courses')}
          className="border-[#1f2937] bg-transparent hover:bg-slate-800 text-gray-300"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Quay lại khóa học
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            Học viên trong khóa học
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {course ? `Khóa học: ${course.title}` : 'Đang tải thông tin khóa học...'}
          </p>
        </div>
      </div>

      {/* Main Student List */}
      <div className="bg-[#111827] border border-[#1f2937] p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Danh sách đăng ký học</h3>
          {pagination && (
            <span className="text-xs text-gray-400">
              Tổng số: <strong>{pagination.totalRecords}</strong> học viên
            </span>
          )}
        </div>

        <TrainerStudentTable
          enrollments={enrollments}
          loading={loading}
          pagination={pagination}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default TrainerCourseStudentsPage;

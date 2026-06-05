import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Grid, 
  List, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  FileText,
  Eye,
  Calendar,
  Users,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Card, 
  CardContent, 
  Badge, 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui';
import { getMyCourses, deleteCourse } from '@/apis/courseApi';
import TrainerCourseCard from '@/components/trainer/TrainerCourseCard';
import toast from 'react-hot-toast';

const TrainerCoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 9;

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    pending: 0,
    draft: 0
  });

  // Fetch all courses (to compute stats accurately)
  const fetchStats = useCallback(async () => {
    try {
      const res = await getMyCourses({ limit: 100 });
      const allCourses = res.data?.data || [];
      setStats({
        total: allCourses.length,
        published: allCourses.filter(c => c.status === 'published').length,
        pending: allCourses.filter(c => c.status === 'pending').length,
        draft: allCourses.filter(c => c.status === 'draft').length
      });
    } catch (err) {
      console.error('Error fetching course stats:', err);
    }
  }, []);

  // Fetch paginated courses
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit,
        search: searchTerm
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const res = await getMyCourses(params);
      setCourses(res.data?.data || []);
      
      const pagination = res.data?.pagination || {};
      setTotalPages(pagination.totalPages || 1);
      setTotalRecords(pagination.totalRecords || 0);
    } catch (err) {
      console.error('Error fetching courses:', err);
      toast.error('Không thể tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    fetchCourses();
    fetchStats();
  }, [fetchCourses, fetchStats]);

  // Handle Search Input Change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  // Handle Filter Change
  const handleFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page
  };

  // Handle Course Delete
  const handleDeleteCourse = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khóa học này? Hành động này không thể hoàn tác.')) {
      try {
        await deleteCourse(id);
        toast.success('Xóa khóa học thành công!');
        fetchCourses();
        fetchStats();
      } catch (err) {
        console.error('Error deleting course:', err);
        toast.error(err.response?.data?.message || 'Không thể xóa khóa học.');
      }
    }
  };

  // Status mapping for table view
  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { text: 'Nháp', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
      pending: { text: 'Chờ duyệt', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      approved: { text: 'Đã duyệt', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      published: { text: 'Đã xuất bản', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
    };
    const current = statusMap[status] || statusMap.draft;
    return (
      <Badge variant="outline" className={current.className}>
        {current.text}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Khóa học của tôi</h1>
          <p className="text-gray-400 text-sm mt-1">Quản lý nội dung chương trình học, giáo trình và lịch trình bài giảng.</p>
        </div>
        <Button
          asChild
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 self-start md:self-auto border-none"
        >
          <Link to="/trainer/courses/new">
            <Plus className="h-5 w-5" />
            Tạo khóa học mới
          </Link>
        </Button>
      </div>

      {/* Mini Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#111827] border-[#1f2937]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Tổng số khóa</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.total}</h3>
            </div>
            <BookOpen className="h-8 w-8 text-blue-500/20" />
          </CardContent>
        </Card>
        <Card className="bg-[#111827] border-[#1f2937]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Đã xuất bản</p>
              <h3 className="text-2xl font-bold text-emerald-500 mt-1">{stats.published}</h3>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-500/20" />
          </CardContent>
        </Card>
        <Card className="bg-[#111827] border-[#1f2937]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Chờ phê duyệt</p>
              <h3 className="text-2xl font-bold text-amber-500 mt-1">{stats.pending}</h3>
            </div>
            <Clock className="h-8 w-8 text-amber-500/20" />
          </CardContent>
        </Card>
        <Card className="bg-[#111827] border-[#1f2937]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Bản nháp</p>
              <h3 className="text-2xl font-bold text-gray-400 mt-1">{stats.draft}</h3>
            </div>
            <FileText className="h-8 w-8 text-gray-400/20" />
          </CardContent>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111827] border border-[#1f2937] p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter tabs */}
          {['all', 'published', 'pending', 'draft'].map((status) => (
            <button
              key={status}
              onClick={() => handleFilterChange(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent text-gray-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {status === 'all' ? 'Tất cả' : status === 'published' ? 'Đã xuất bản' : status === 'pending' ? 'Chờ duyệt' : 'Bản nháp'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Tìm kiếm khóa học..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="bg-slate-900 border-[#1f2937] pl-9 text-white placeholder-gray-500 focus:border-blue-500 w-full md:w-64"
            />
          </div>

          {/* Grid/List layout toggle */}
          <div className="flex border border-[#1f2937] rounded-lg p-0.5 bg-slate-900">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#001D4A] text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Xem dạng lưới"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#001D4A] text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Xem dạng danh sách"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Courses display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-80 w-full animate-pulse bg-slate-900 border border-[#1f2937] rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="border border-dashed border-[#1f2937] bg-[#111827] rounded-xl p-16 text-center text-gray-400 flex flex-col items-center justify-center space-y-4">
          <BookOpen className="h-16 w-16 text-gray-600" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">Không tìm thấy khóa học nào</h3>
            <p className="text-sm text-gray-500">Thử thay đổi từ khóa tìm kiếm hoặc tạo khóa học đầu tiên của bạn.</p>
          </div>
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold border-none"
          >
            <Link to="/trainer/courses/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Tạo khóa học mới
            </Link>
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <TrainerCourseCard key={course._id} course={course} />
          ))}
        </div>
      ) : (
        /* List Layout using Table.jsx */
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-900/60 border-[#1f2937]">
              <TableRow className="border-[#1f2937] hover:bg-transparent">
                <TableHead className="text-gray-400 font-semibold py-4">Tên khóa học</TableHead>
                <TableHead className="text-gray-400 font-semibold py-4">Trạng thái</TableHead>
                <TableHead className="text-gray-400 font-semibold py-4">Học viên</TableHead>
                <TableHead className="text-gray-400 font-semibold py-4">Bài học</TableHead>
                <TableHead className="text-gray-400 font-semibold py-4">Học phí</TableHead>
                <TableHead className="text-gray-400 font-semibold py-4 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course._id} className="border-[#1f2937] hover:bg-slate-800/30">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      {course.thumbnail ? (
                        <img src={course.thumbnail} alt={course.title} className="h-10 w-16 object-cover rounded-md bg-slate-800" />
                      ) : (
                        <div className="h-10 w-16 bg-slate-800 rounded-md flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-gray-600" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-white line-clamp-1 max-w-[280px]" title={course.title}>
                          {course.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          Tạo ngày: {new Date(course.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">{getStatusBadge(course.status)}</TableCell>
                  <TableCell className="py-4 text-gray-300">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span>{course.currentStudents || 0}/{course.maxStudents || 30}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-gray-300">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-purple-500" />
                      <span>{course.syllabus?.length || 0} bài</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-gray-300 font-medium">
                    {course.isFree ? 'Miễn phí' : `${course.fee?.toLocaleString('vi-VN')} đ`}
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button asChild size="sm" variant="outline" className="border-[#1f2937] hover:bg-slate-800 text-gray-300" title="Xem học viên">
                        <Link to={`/trainer/courses/${course._id}/students`}>
                          <Users className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="border-[#1f2937] hover:bg-slate-800 text-gray-300" title="Lịch dạy">
                        <Link to={`/trainer/courses/${course._id}/schedule`}>
                          <Calendar className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="border-[#1f2937] hover:bg-slate-800 text-gray-300" title="Chỉnh sửa">
                        <Link to={`/trainer/courses/${course._id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDeleteCourse(course._id)}
                        className="border-[#1f2937] hover:bg-red-500/10 hover:text-red-400 text-gray-500"
                        title="Xóa khóa học"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#1f2937] pt-6 text-sm text-gray-400">
          <div>
            Hiển thị <strong>{courses.length}</strong> trên <strong>{totalRecords}</strong> khóa học
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="border-[#1f2937] bg-transparent hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </Button>
            <span className="px-3">Trang {currentPage} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="border-[#1f2937] bg-transparent hover:bg-slate-800"
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerCoursesPage;

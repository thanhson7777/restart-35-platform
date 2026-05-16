import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScholarshipGrid } from '@/components/scholarship/ScholarshipGrid';
import { ScholarshipFilters } from '@/components/scholarship/ScholarshipFilters';
import { Skeleton } from '@/components/ui';
import { getScholarships, getEligibleScholarships } from '@/apis/scholarshipApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { Award, CheckCircle2 } from 'lucide-react';

const DEFAULT_FILTERS = {
  search: '',
  status: '',
  page: 1,
};

export default function ScholarshipPage() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [scholarships, setScholarships] = useState([]);
  const [eligibleScholarships, setEligibleScholarships] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const fetchScholarships = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...f };
      Object.keys(params).forEach((k) => {
        if (params[k] === '' || params[k] == null) delete params[k];
      });
      const res = await getScholarships(params);
      const list = Array.isArray(res.data) ? res.data
        : Array.isArray(res?.data?.data) ? res.data.data : [];
      setScholarships(list);
      setPagination(res.pagination || null);
    } catch (err) {
      console.error('Error fetching scholarships:', err);
      setError('Không thể tải danh sách học bổng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEligible = useCallback(async () => {
    if (!currentUser) return;
    setEligibleLoading(true);
    try {
      const res = await getEligibleScholarships();
      const list = Array.isArray(res.data) ? res.data
        : Array.isArray(res?.data?.data) ? res.data.data : [];
      setEligibleScholarships(list);
    } catch (err) {
      console.error('Error fetching eligible scholarships:', err);
    } finally {
      setEligibleLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchScholarships(filters);
  }, []);

  useEffect(() => {
    fetchEligible();
  }, [fetchEligible]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchScholarships(filters);
    }, 50);
    return () => clearTimeout(timer);
  }, [filters, fetchScholarships]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleScholarshipClick = (scholarship) => {
    navigate(`/scholarships/${scholarship._id}`);
  };

  const eligibleCount = eligibleScholarships.filter((s) => s.eligibility?.eligible).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-white py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Học bổng</h1>
          <p className="text-primary-foreground/80">
            Khám phá các chương trình học bổng dành cho người lao động 35+
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Eligible callout */}
        {currentUser && !eligibleLoading && eligibleCount > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
            <div>
              <p className="font-medium text-green-700">
                Bạn đủ điều kiện cho {eligibleCount} học bổng
              </p>
              <p className="text-sm text-green-600">
                Nhấn vào học bổng để bắt đầu nộp đơn
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <ScholarshipFilters filters={filters} onChange={handleFiltersChange} />

        {/* Eligible scholarships */}
        {currentUser && !eligibleLoading && eligibleScholarships.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Học bổng bạn đủ điều kiện</h2>
            </div>
            <ScholarshipGrid
              scholarships={eligibleScholarships.filter((s) => s.eligibility?.eligible)}
              loading={eligibleLoading}
              onScholarshipClick={handleScholarshipClick}
              emptyMessage="Không có học bổng nào bạn đủ điều kiện"
            />
          </section>
        )}

        {/* All scholarships */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Tất cả học bổng
              {pagination && (
                <span className="text-muted-foreground font-normal text-base ml-2">
                  ({pagination.totalRecords ?? scholarships.length} học bổng)
                </span>
              )}
            </h2>
          </div>

          {error ? (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="text-destructive font-medium mb-2">{error}</p>
              <button
                onClick={() => fetchScholarships(filters)}
                className="text-primary underline text-sm"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <ScholarshipGrid
              scholarships={scholarships}
              loading={loading}
              onScholarshipClick={handleScholarshipClick}
              emptyMessage={
                filters.search
                  ? `Không tìm thấy học bổng với từ khóa "${filters.search}"`
                  : 'Không tìm thấy học bổng nào'
              }
            />
          )}
        </section>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: pagination.totalPages }).map((_, i) => {
              const page = i + 1;
              const isCurrent = page === pagination.currentPage;
              return (
                <button
                  key={page}
                  onClick={() => handleFiltersChange({ ...filters, page })}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

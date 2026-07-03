import { X, Building, Users, Briefcase, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getPartnershipLearners } from '@/apis';

const getStatusConfig = (learner) => {
  const enterpriseSponsorship = learner.sponsorships?.find(s => s.sponsorType === 'enterprise') || learner.sponsorships?.[0];
  if (enterpriseSponsorship?.status === 'rejected') {
    return { label: 'Bị từ chối', className: 'bg-red-500/10 text-red-500 border-red-500/20' };
  }
  
  if (learner.status === 'completed' || learner.progress?.percentage === 100 || learner.progress?.completionStatus === 'completed') {
    return { label: 'Đã hoàn thành', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
  }
  
  switch (learner.status) {
    case 'active':
    case 'in_progress':
      return { label: 'Đang học', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    case 'completed':
      return { label: 'Đã hoàn thành', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    case 'dropped':
      return { label: 'Bỏ học', className: 'bg-red-500/10 text-red-500 border-red-500/20' };
    case 'failed':
      return { label: 'Thất bại', className: 'bg-red-500/10 text-red-500 border-red-500/20' };
    case 'suspended':
      return { label: 'Đình chỉ', className: 'bg-red-500/10 text-red-500 border-red-500/20' };
    case 'pending_review':
      return { label: 'Chờ duyệt', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    default:
      return { label: learner.status || 'Chưa rõ', className: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
};

const formatSalaryRange = (salaryRange) => {
  if (!salaryRange) return '-';
  const { min, max, currency = 'VND' } = salaryRange;
  const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency });
  if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
  if (min) return `Từ ${formatter.format(min)}`;
  if (max) return `Đến ${formatter.format(max)}`;
  return '-';
};

const AdminPartnershipDetailModal = ({ placement: partnership, open, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [learners, setLearners] = useState([]);
  const [placedLearners, setPlacedLearners] = useState([]);
  const [loadingLearners, setLoadingLearners] = useState(false);

  useEffect(() => {
    if (open && partnership && (activeTab === 'learners' || activeTab === 'placed')) {
      const fetchData = async () => {
        try {
          setLoadingLearners(true);
          if (activeTab === 'learners' && learners.length === 0) {
            const { data: result } = await getPartnershipLearners(partnership._id || partnership.id, { limit: 100 });
            if (result.success) setLearners(result.data || []);
          } else if (activeTab === 'placed' && placedLearners.length === 0) {
            const { getPartnershipGraduates } = await import('@/apis');
            const { data: result } = await getPartnershipGraduates(partnership._id || partnership.id, { limit: 100 });
            if (result.success) setPlacedLearners(result.data || []);
          }
        } catch (error) {
          toast.error('Không thể tải danh sách học viên');
        } finally {
          setLoadingLearners(false);
        }
      };
      fetchData();
    }
  }, [open, partnership, activeTab]);

  if (!open || !partnership) return null;

  const tabs = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'learners', label: 'Tất cả Học viên' },
    { key: 'placed', label: 'Đã nhận việc' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Building className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[hsl(var(--admin-text-primary))]">
                Hợp tác: {partnership.enterprise?.organizationName || partnership.enterprise?.displayName || 'Doanh nghiệp'} & {partnership.trainer?.displayName || 'Giảng viên'}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-[hsl(var(--admin-text-muted))]">Vị trí: {partnership.recruitmentNeeds?.jobTitle || 'Chưa xác định'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-3 border-b border-[hsl(var(--admin-border))] overflow-x-auto bg-[hsl(var(--admin-surface-elevated))]">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[hsl(var(--admin-accent))] text-white'
                  : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Building className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Doanh nghiệp</span>
                  </div>
                  <p className="text-base font-semibold text-[hsl(var(--admin-text-primary))]">
                    {partnership.enterprise?.organizationName || partnership.enterprise?.displayName || '-'}
                  </p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                    {partnership.enterprise?.email || '-'}
                  </p>
                </div>
                <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <GraduationCap className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">Giảng viên (Trainer)</span>
                  </div>
                  <p className="text-base font-semibold text-[hsl(var(--admin-text-primary))]">
                    {partnership.trainer?.displayName || '-'}
                  </p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                    {partnership.trainer?.email || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Briefcase className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium">Nhu cầu tuyển dụng</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-primary))]">Vị trí: {partnership.recruitmentNeeds?.jobTitle || '-'}</p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Số lượng: {partnership.recruitmentNeeds?.jobQuantity || 0}</p>
                </div>
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium">Thống kê Học viên</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-primary))]">
                    Tham gia: {partnership.stats?.enrolledLearners || 0}
                  </p>
                  <p className="text-xs text-emerald-500 mt-1">
                    Đã có việc: {partnership.stats?.placedLearners || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'learners' && (
            <div className="space-y-4">
              {loadingLearners ? (
                <p className="text-center text-sm text-[hsl(var(--admin-text-muted))]">Đang tải...</p>
              ) : learners.length === 0 ? (
                <p className="text-center text-sm text-[hsl(var(--admin-text-muted))]">Chưa có học viên nào tham gia dự án này.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[hsl(var(--admin-border))]">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--admin-text-muted))]">Học viên</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--admin-text-muted))]">Khóa học</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--admin-text-muted))]">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--admin-border))]">
                      {learners.map((learner) => (
                        <tr key={learner._id || learner.id} className="hover:bg-[hsl(var(--admin-surface-elevated))]">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{learner.user?.displayName || '-'}</p>
                            <p className="text-xs text-[hsl(var(--admin-text-muted))]">{learner.user?.email || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-[hsl(var(--admin-text-primary))]">{learner.course?.title || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusConfig(learner).className}`}>
                              {getStatusConfig(learner).label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'placed' && (
            <div className="space-y-4">
              {loadingLearners ? (
                <p className="text-center text-sm text-[hsl(var(--admin-text-muted))]">Đang tải...</p>
              ) : placedLearners.length === 0 ? (
                <p className="text-center text-sm text-[hsl(var(--admin-text-muted))]">Chưa có học viên nào nhận việc trong dự án này.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[hsl(var(--admin-border))]">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--admin-text-muted))]">Học viên</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--admin-text-muted))]">Vị trí</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--admin-text-muted))]">Lương</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--admin-text-muted))]">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--admin-border))]">
                      {placedLearners.map((learner) => (
                        <tr key={learner._id || learner.id} className="hover:bg-[hsl(var(--admin-surface-elevated))]">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{learner.worker?.fullName || learner.user?.displayName || '-'}</p>
                            <p className="text-xs text-[hsl(var(--admin-text-muted))]">{learner.worker?.email || learner.user?.email || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-[hsl(var(--admin-text-primary))]">{learner.jobTitle || partnership.recruitmentNeeds?.jobTitle || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-[hsl(var(--admin-text-primary))]">
                              {learner.salary 
                                ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(learner.salary) 
                                : formatSalaryRange(partnership.recruitmentNeeds?.salaryRange)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusConfig(learner).className}`}>
                              {getStatusConfig(learner).label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          <Button variant="outline" onClick={onClose}
            className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminPartnershipDetailModal;

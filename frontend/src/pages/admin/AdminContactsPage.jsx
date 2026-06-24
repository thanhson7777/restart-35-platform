import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Eye, CheckCircle, Clock, X, Mail } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import { getContactsAdmin, markContactReplied } from '@/apis/contactApi';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const formatDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: vi }); }
  catch { return '-'; }
};

const AdminContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    totalRecords: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '', // 'all', 'pending', 'replied'
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit,
      };
      
      if (filters.status === 'pending') params.filter = JSON.stringify({ isReplied: false });
      if (filters.status === 'replied') params.filter = JSON.stringify({ isReplied: true });

      const response = await getContactsAdmin(params);
      const res = response.data;
      if (res.success) {
        setContacts(res.data.contacts || []);
        setPagination({
          currentPage: res.data.page,
          limit: res.data.limit,
          totalRecords: res.data.total,
          totalPages: res.data.totalPages,
        });
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Không thể tải danh sách liên hệ');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleMarkReplied = async (contact) => {
    try {
      setActionLoading(true);
      await markContactReplied(contact._id);
      toast.success('Đã đánh dấu là phản hồi');
      fetchContacts();
    } catch (error) {
      console.error('Error marking as replied:', error);
      toast.error('Không thể cập nhật trạng thái');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchContacts();
  };

  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.currentPage || 1;
  const totalRecords = pagination?.totalRecords || 0;

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Quản lý Liên hệ"
        subtitle="Xem và xử lý các tin nhắn từ người dùng"
      />

      <div className="flex items-center justify-end gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'pending', label: 'Chưa xử lý' },
            { key: 'replied', label: 'Đã phản hồi' }
          ].map((tab) => {
            const isActive = (tab.key === 'all' && !filters.status) || filters.status === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleFiltersChange({ ...filters, status: tab.key === 'all' ? '' : tab.key, page: 1 })}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-[hsl(var(--admin-accent))] text-white'
                    : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
              <tr>
                {['Người gửi', 'Chủ đề', 'Trạng thái', 'Ngày gửi', 'Thao tác'].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-[hsl(var(--admin-border))]">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 w-full bg-[hsl(var(--admin-surface-elevated))] rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-12 text-center">
          <Mail className="w-12 h-12 mx-auto text-[hsl(var(--admin-text-muted))] mb-4 opacity-60" />
          <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] mb-2">Chưa có liên hệ nào</h3>
          <p className="text-[hsl(var(--admin-text-muted))]">Không tìm thấy liên hệ nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
                <tr>
                  {['Người gửi', 'Chủ đề', 'Trạng thái', 'Ngày gửi', 'Thao tác'].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--admin-border))]">
                {contacts.map((contact) => (
                  <tr key={contact._id} className="hover:bg-[hsl(var(--admin-surface-hover))] transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                          {contact.name}
                        </p>
                        <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                          {contact.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
                        {contact.subject}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {contact.isReplied ? (
                         <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          Đã phản hồi
                        </span>
                      ) : (
                         <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">
                          Chưa xử lý
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[hsl(var(--admin-text-muted))]">
                        {formatDate(contact.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedContact(contact)}
                          className="p-1.5 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[hsl(var(--admin-border))] flex items-center justify-between">
              <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                Hiển thị {(currentPage - 1) * (pagination?.limit || 10) + 1} -{' '}
                {Math.min(currentPage * (pagination?.limit || 10), totalRecords)} trong {totalRecords} liên hệ
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="gap-1 border-[hsl(var(--admin-border))]"
                >
                  Trước
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) { pageNum = i + 1; }
                  else if (currentPage <= 3) { pageNum = i + 1; }
                  else if (currentPage >= totalPages - 2) { pageNum = totalPages - 4 + i; }
                  else { pageNum = currentPage - 2 + i; }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 text-sm rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-[hsl(var(--admin-accent))] text-white'
                          : 'border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="gap-1 border-[hsl(var(--admin-border))]"
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedContact(null)} />
          <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
              <h2 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Chi tiết Liên hệ</h2>
              <button onClick={() => setSelectedContact(null)} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg">
                <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Người gửi</p>
                  <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                    {selectedContact.name}
                  </p>
                  <a href={`mailto:${selectedContact.email}`} className="text-xs text-[hsl(var(--admin-accent))] hover:underline">
                    {selectedContact.email}
                  </a>
                </div>
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Trạng thái</p>
                  {selectedContact.isReplied ? (
                    <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      Đã phản hồi lúc {formatDate(selectedContact.repliedAt)}
                    </span>
                  ) : (
                    <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">
                      Chưa xử lý
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Chủ đề</p>
                <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                  {selectedContact.subject}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Nội dung tin nhắn</p>
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <p className="text-sm text-[hsl(var(--admin-text-primary))] whitespace-pre-wrap leading-relaxed">
                    {selectedContact.message}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
              <Button
                variant="outline"
                onClick={() => setSelectedContact(null)}
                className="rounded-xl"
              >
                Đóng
              </Button>
              {!selectedContact.isReplied && (
                <Button
                  onClick={() => { handleMarkReplied(selectedContact); setSelectedContact(null); }}
                  disabled={actionLoading}
                  className="gap-2 rounded-xl"
                >
                  <CheckCircle className="w-4 h-4" />
                  Đánh dấu đã phản hồi
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminContactsPage;

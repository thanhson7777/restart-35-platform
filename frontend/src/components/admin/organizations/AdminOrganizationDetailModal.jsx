import { useState, useEffect } from 'react';
import { X, Mail, Phone, MapPin, Users, Calendar, Building2, Loader2 } from 'lucide-react';
import { Button, Badge, Progress, Avatar } from '@/components/ui';
import AdminQuotaEditor from './AdminQuotaEditor';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import * as organizationApi from '@/apis/organizationApi';

const typeConfig = {
  enterprise: { label: 'Doanh nghiệp', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  ngo: { label: 'Tổ chức NGO', className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
};

const statusConfig = {
  active: { label: 'Hoạt động', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  inactive: { label: 'Không hoạt động', className: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]' },
  suspended: { label: 'Tạm ngưng', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
};

const formatDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd/MM/yyyy', { locale: vi }); }
  catch { return '-'; }
};

const AdminOrganizationDetailModal = ({ organization, open, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [quotaEditing, setQuotaEditing] = useState(false);

  useEffect(() => {
    if (open && organization?._id && activeTab === 'members') {
      fetchMembers();
    }
  }, [open, organization, activeTab]);

  const fetchMembers = async () => {
    if (!organization?._id) return;
    try {
      setMembersLoading(true);
      const res = await organizationApi.getOrganizationMembers(organization._id);
      if (res.success) setMembers(res.data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleQuotaSave = async (newTotal) => {
    if (!organization?._id) return;
    try {
      const res = await organizationApi.updateOrganizationQuota(organization._id, { total: newTotal });
      if (res.success) {
        onRefresh?.();
        setQuotaEditing(false);
      }
    } catch (err) {
      console.error('Error updating quota:', err);
    }
  };

  if (!open || !organization) return null;

  const typeInfo = typeConfig[organization.type] || typeConfig.enterprise;
  const statusInfo = statusConfig[organization.status] || statusConfig.inactive;
  const quota = organization.quota || {};
  const quotaPercent = quota.total > 0 ? Math.round(((quota.used || 0) / quota.total) * 100) : 0;

  const tabs = [
    { key: 'info', label: 'Thông tin chung' },
    { key: 'quota', label: 'Quota & Thành viên' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Building2 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[hsl(var(--admin-text-primary))]">{organization.name}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${typeInfo.className}`}>
                  {typeInfo.label}
                </span>
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-3 border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-[hsl(var(--admin-accent))] text-white'
                  : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Mail className="w-4 h-4 text-[hsl(var(--admin-accent))]" />
                    <span className="text-sm font-medium">Email</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-primary))]">{organization.email || '-'}</p>
                </div>
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Phone className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">Điện thoại</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-primary))]">{organization.phone || '-'}</p>
                </div>
              </div>

              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-medium">Địa chỉ</span>
                </div>
                <p className="text-sm text-[hsl(var(--admin-text-primary))]">{organization.address || '-'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium">Quota học viên</span>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">
                    {quota.used || 0} / {quota.total || 0}
                  </p>
                  <div className="mt-2">
                    <Progress value={quotaPercent} className="h-2" />
                  </div>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
                    Sử dụng: {quotaPercent}% - Còn lại: {Math.max(0, (quota.total || 0) - (quota.used || 0))} chỗ
                  </p>
                </div>
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium">Ngày tạo</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-primary))]">{formatDate(organization.createdAt)}</p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
                    Cập nhật: {formatDate(organization.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quota' && (
            <div className="space-y-6">
              <AdminQuotaEditor
                organization={organization}
                onSave={handleQuotaSave}
                editing={quotaEditing}
                onToggleEdit={setQuotaEditing}
              />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-[hsl(var(--admin-text-primary))]">Danh sách thành viên</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchMembers}
                    disabled={membersLoading}
                    className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]"
                  >
                    {membersLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Làm mới
                  </Button>
                </div>

                {membersLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-[hsl(var(--admin-surface))]" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-32 bg-[hsl(var(--admin-surface))] rounded" />
                          <div className="h-2.5 w-48 bg-[hsl(var(--admin-surface))] rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-[hsl(var(--admin-text-muted))]">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Chưa có thành viên nào</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member._id || member.id} className="flex items-center gap-3 p-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                        <Avatar
                          src={member.avatar}
                          fallback={member.displayName?.charAt(0) || 'U'}
                          className="w-8 h-8"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{member.displayName || member.name}</p>
                          <p className="text-xs text-[hsl(var(--admin-text-muted))]">{member.email}</p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-muted))] border border-[hsl(var(--admin-border))]"
                        >
                          {member.role || 'member'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminOrganizationDetailModal;

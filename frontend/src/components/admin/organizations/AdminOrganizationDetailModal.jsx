import { X, Mail, Phone, MapPin, Calendar, Building2, Tag, BookOpen, Globe, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  INDUSTRY_OPTIONS, 
  COMPANY_SIZE_OPTIONS, 
  TRAINING_CATEGORIES_OPTIONS, 
  NGO_FOCUS_AREAS_OPTIONS,
  VIETNAM_PROVINCES 
} from '@/data/profileData';

const typeConfig = {
  enterprise: { label: 'Doanh nghiệp', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  ngo: { label: 'Tổ chức NGO', className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  training_center: { label: 'Trung tâm đào tạo', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
};

const statusConfig = {
  active: { label: 'Hoạt động', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  inactive: { label: 'Không hoạt động', className: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]' },
  suspended: { label: 'Tạm ngưng', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  pending: { label: 'Chờ duyệt', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

const getLabel = (val, options) => {
  if (!val) return null;
  const found = options.find(opt => opt.value === val);
  return found ? found.label : val;
};

const formatDate = (org, field = 'createdAt') => {
  let dateVal = org[field];
  if (field === 'createdAt' && !dateVal && org._id && typeof org._id === 'string' && org._id.length === 24) {
    // Extract timestamp from MongoDB ObjectId
    dateVal = parseInt(org._id.substring(0, 8), 16) * 1000;
  }
  
  if (!dateVal) return '-';
  try {
    return format(new Date(dateVal), 'dd/MM/yyyy', { locale: vi });
  } catch {
    return '-';
  }
};

const joinArray = (arr, options) => {
  if (Array.isArray(arr) && arr.length > 0) {
    if (options) {
      return arr.map(val => getLabel(val, options) || val).join(', ');
    }
    return arr.join(', ');
  }
  return '-';
};

const AdminOrganizationDetailModal = ({ organization, open, onClose }) => {
  if (!open || !organization) return null;

  const typeInfo = typeConfig[organization.type] || typeConfig.enterprise;
  const statusInfo = statusConfig[organization.status || 'active'] || statusConfig.inactive;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]">
              <Building2 className={`w-6 h-6 ${typeInfo.className.split(' ')[1]}`} />
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
              <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                <Mail className="w-4 h-4 text-[hsl(var(--admin-accent))]" />
                <span className="text-sm font-medium">Email liên hệ</span>
              </div>
              <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{organization.contactEmail || organization.email || organization.ownerEmail || '-'}</p>
            </div>
            
            <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
              <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                <Phone className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Điện thoại</span>
              </div>
              <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{organization.contactPhone || organization.phone || '-'}</p>
            </div>
          </div>

          <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
            <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span className="text-sm font-medium">Địa chỉ</span>
            </div>
            <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{organization.address || '-'}</p>
          </div>

          {/* Type-Specific Fields */}
          {organization.type === 'enterprise' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                  <Tag className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium">Mã số thuế</span>
                </div>
                <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{organization.taxCode || '-'}</p>
              </div>
              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Ngành nghề</span>
                </div>
                <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{getLabel(organization.industry, INDUSTRY_OPTIONS) || organization.industry || '-'}</p>
              </div>
              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Quy mô</span>
                </div>
                <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{getLabel(organization.size, COMPANY_SIZE_OPTIONS) || organization.size || '-'}</p>
              </div>
            </div>
          )}

          {organization.type === 'ngo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Khu vực hoạt động</span>
                </div>
                <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))] leading-relaxed">{joinArray(organization.operatingRegions, VIETNAM_PROVINCES)}</p>
              </div>
              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                  <Briefcase className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium">Lĩnh vực trọng tâm</span>
                </div>
                <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))] leading-relaxed">{joinArray(organization.focusAreas, NGO_FOCUS_AREAS_OPTIONS)}</p>
              </div>
            </div>
          )}

          {organization.type === 'training_center' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                  <Building2 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Hình thức</span>
                </div>
                <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                  {organization.trainerType === 'individual' ? 'Cá nhân' : 
                   organization.trainerType === 'organization' ? 'Tổ chức' : '-'}
                </p>
              </div>
              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                  <Tag className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Số CCCD / ĐKKD</span>
                </div>
                <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{organization.identityNumber || '-'}</p>
              </div>
              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium">Lĩnh vực giảng dạy</span>
                </div>
                <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))] leading-relaxed">{joinArray(organization.trainingCategories, TRAINING_CATEGORIES_OPTIONS)}</p>
              </div>
              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Chuyên môn</span>
                </div>
                <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))] leading-relaxed">{joinArray(organization.focusAreas, INDUSTRY_OPTIONS)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
              <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">Ngày tạo</span>
              </div>
              <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{formatDate(organization, 'createdAt')}</p>
            </div>
            <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
              <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Cập nhật lần cuối</span>
              </div>
              <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{formatDate(organization, 'updatedAt')}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] rounded-xl"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminOrganizationDetailModal;

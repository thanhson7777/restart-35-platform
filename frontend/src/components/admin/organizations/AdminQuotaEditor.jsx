import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button, Progress } from '@/components/ui';

const AdminQuotaEditor = ({ organization, onSave, editing, onToggleEdit }) => {
  const quota = organization?.quota || {};
  const quotaPercent = quota.total > 0 ? Math.round(((quota.used || 0) / quota.total) * 100) : 0;
  const [newTotal, setNewTotal] = useState(quota.total || 0);

  const handleSave = () => {
    onSave?.(newTotal);
  };

  return (
    <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[hsl(var(--admin-text-primary))]">Quản lý Quota</h3>
        {!editing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleEdit?.(true)}
            className="border-[hsl(var(--admin-accent))]/30 text-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))]/10 rounded-xl"
          >
            Chỉnh sửa quota
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onToggleEdit?.(false);
                setNewTotal(quota.total || 0);
              }}
              className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-danger))]"
            >
              <X className="w-4 h-4 mr-1" />
              Hủy
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl text-center">
            <p className="text-2xl font-bold text-[hsl(var(--admin-accent))]">{quota.total || 0}</p>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Tổng quota</p>
          </div>
          <div className="p-4 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl text-center">
            <p className="text-2xl font-bold text-blue-500">{quota.used || 0}</p>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Đã sử dụng</p>
          </div>
          <div className="p-4 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl text-center">
            <p className="text-2xl font-bold text-emerald-500">{Math.max(0, (quota.total || 0) - (quota.used || 0))}</p>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Còn trống</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[hsl(var(--admin-text-muted))]">Tỷ lệ sử dụng</span>
            <span className="font-semibold text-[hsl(var(--admin-text-primary))]">{quotaPercent}%</span>
          </div>
          <Progress value={quotaPercent} className="h-3" />
        </div>

        {editing && (
          <div className="pt-4 border-t border-[hsl(var(--admin-border))]">
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">
              Cập nhật tổng quota mới
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                min={quota.used || 0}
                value={newTotal}
                onChange={(e) => setNewTotal(Number(e.target.value))}
                className="flex-1 px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                  bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-primary))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30
                  focus:border-[hsl(var(--admin-accent))]/50 text-sm"
              />
              <Button
                onClick={handleSave}
                className="gap-2 rounded-xl"
              >
                <Save className="w-4 h-4" />
                Lưu
              </Button>
            </div>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-2">
              Quota mới phải lớn hơn hoặc bằng số đã sử dụng ({(quota.used || 0)})
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQuotaEditor;

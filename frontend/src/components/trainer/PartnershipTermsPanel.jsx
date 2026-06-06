import React from 'react';
import { Badge } from '@/components/ui';

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
};

const PartnershipTermsPanel = ({ partnership }) => {
  const recruitment = partnership?.recruitmentNeeds || {};
  const agreedTerms = partnership?.agreedTerms || {};

  return (
    <div className="space-y-4">
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5">
        <h3 className="font-bold text-[hsl(var(--admin-text-primary))] text-sm mb-4">Nhu cầu tuyển dụng</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-0.5">Vị trí</p>
            <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{recruitment.jobTitle || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-0.5">Số lượng</p>
            <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{recruitment.jobQuantity || 0} người</p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-0.5">Mức lương</p>
            <p className="text-sm text-[hsl(var(--admin-success))]">
              {formatCurrency(recruitment.salaryRange?.min)} - {formatCurrency(recruitment.salaryRange?.max)}
            </p>
          </div>
          {recruitment.targetSkills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recruitment.targetSkills.map((skill, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] text-xs rounded-md font-medium">{skill}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5">
        <h3 className="font-bold text-[hsl(var(--admin-text-primary))] text-sm mb-4">Điều khoản thỏa thuận</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-0.5">Phí/learner</p>
            <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{formatCurrency(agreedTerms.tuitionFeePerLearner)}</p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-0.5">Thanh toán</p>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">{agreedTerms.paymentTerms || '—'}</p>
          </div>
          {agreedTerms.placementGuarantee && (
            <Badge className="bg-[hsl(var(--admin-success-subtle))] text-[hsl(var(--admin-success))] border-[hsl(var(--admin-success))]/30 border text-xs font-semibold">
              Cam kết tuyển dụng ({agreedTerms.guaranteePeriodMonths} tháng)
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnershipTermsPanel;

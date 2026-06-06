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
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
        <h3 className="font-bold text-white text-sm mb-4">Nhu cầu tuyển dụng</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Vị trí</p>
            <p className="text-sm font-semibold text-white">{recruitment.jobTitle || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Số lượng</p>
            <p className="text-sm font-semibold text-white">{recruitment.jobQuantity || 0} người</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Mức lương</p>
            <p className="text-sm text-green-400">
              {formatCurrency(recruitment.salaryRange?.min)} - {formatCurrency(recruitment.salaryRange?.max)}
            </p>
          </div>
          {recruitment.targetSkills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recruitment.targetSkills.map((skill, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-md font-medium">{skill}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
        <h3 className="font-bold text-white text-sm mb-4">Điều khoản thỏa thuận</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Phí/learner</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(agreedTerms.tuitionFeePerLearner)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Thanh toán</p>
            <p className="text-sm text-slate-300">{agreedTerms.paymentTerms || '—'}</p>
          </div>
          {agreedTerms.placementGuarantee && (
            <Badge className="bg-green-500/15 text-green-400 border-green-500/30 border text-xs font-semibold">
              Cam kết tuyển dụng ({agreedTerms.guaranteePeriodMonths} tháng)
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnershipTermsPanel;

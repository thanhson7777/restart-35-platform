import { useState } from 'react';
import { Calculator, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';
import { calculateFunding } from '@/apis';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const AdminFundingCalculator = () => {
  const [courseId, setCourseId] = useState('');
  const [income, setIncome] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    if (!courseId || !income) {
      toast.error('Vui lòng nhập Course ID và thu nhập');
      return;
    }
    try {
      setLoading(true);
      const response = await calculateFunding(courseId, { income: parseFloat(income) });
      if (response.success) {
        setResult(response.data);
      } else {
        toast.error(response.message || 'Tính toán thất bại');
      }
    } catch {
      toast.error('Không thể tính toán');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-[hsl(var(--admin-border))]">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[hsl(var(--admin-accent))]" />
          <h3 className="font-semibold text-[hsl(var(--admin-text-primary))]">Funding Calculator</h3>
        </div>
        <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Tính toán số tiền ISA phải trả dựa trên thu nhập</p>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Course ID</label>
          <input
            type="text"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            placeholder="65f..."
            className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
              bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
              focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Thu nhập hàng tháng (VND)</label>
          <input
            type="number" min="0"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="VD: 15000000"
            className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
              bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
              focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 text-sm"
          />
        </div>
        <Button onClick={handleCalculate} disabled={loading} className="w-full gap-2 rounded-xl">
          <Calculator className="w-4 h-4" />
          {loading ? 'Đang tính...' : 'Tính toán'}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-[hsl(var(--admin-text-muted))]">Loại funding</span>
              <span className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{result.type || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[hsl(var(--admin-text-muted))]">Tỷ lệ trả</span>
              <span className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{result.percentage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[hsl(var(--admin-text-muted))]">Ngưỡng thu nhập</span>
              <span className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{formatCurrency(result.incomeThreshold)}</span>
            </div>
            {result.paymentAmount !== undefined && (
              <div className="flex justify-between pt-2 border-t border-[hsl(var(--admin-border))]">
                <span className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">Số tiền phải trả</span>
                <span className="text-lg font-bold text-emerald-500">{formatCurrency(result.paymentAmount)}</span>
              </div>
            )}
            {result.gracePeriod !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-[hsl(var(--admin-text-muted))]">Grace period</span>
                <span className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{result.gracePeriod} tháng</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFundingCalculator;

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DollarSign, Calendar, User, ChevronLeft, Plus, RefreshCw } from 'lucide-react';

import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { createOffer } from '@/apis/recruitmentAPI';
import { fetchEnterpriseApplications } from '@/redux/recruitment/recruitmentSlice';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';

export default function EnterpriseOfferCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const preSelectedId = location.state?.applicationId;
  const preSelectedName = location.state?.applicationName;
  const preJobTitle = location.state?.jobTitle;

  const [formData, setFormData] = useState({
    applicationId: preSelectedId || '',
    position: preJobTitle || '',
    salaryAmount: '',
    salaryCurrency: 'VND',
    salaryPaymentType: 'monthly',
    startDate: '',
    probationMonths: 0,
    probationSalary: '',
    benefits: [],
    terms: '',
    expiresInDays: 7
  });
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [appLoading, setAppLoading] = useState(true);
  const [benefitInput, setBenefitInput] = useState('');

  const fetchApplications = async () => {
    setAppLoading(true);
    try {
      const res = await dispatch(fetchEnterpriseApplications({ limit: 100, status: 'interviewed' })).unwrap();
      const apps = res.applications || [];
      // Sort by most recent interview first
      const sorted = [...apps].sort((a, b) => {
        const dateA = a.interviewedAt || a.updatedAt || a.createdAt || '';
        const dateB = b.interviewedAt || b.updatedAt || b.createdAt || '';
        return new Date(dateB) - new Date(dateA);
      });
      setApplications(sorted);
      // If pre-selected, ensure it's in the list
      if (preSelectedId && !sorted.find(a => a._id === preSelectedId)) {
        setApplications(prev => [{
          _id: preSelectedId,
          workerName: preSelectedName || 'Ứng viên',
          jobTitle: preJobTitle || '',
        }, ...prev]);
      }
    } catch (err) {
      // ignore
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [dispatch]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addBenefit = () => {
    if (!benefitInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      benefits: [...prev.benefits, benefitInput.trim()]
    }));
    setBenefitInput('');
  };

  const removeBenefit = (index) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.applicationId) {
      toast.error('Vui lòng chọn ứng viên');
      return;
    }
    if (!formData.position) {
      toast.error('Vui lòng nhập vị trí');
      return;
    }
    if (!formData.salaryAmount) {
      toast.error('Vui lòng nhập mức lương');
      return;
    }
    if (!formData.startDate) {
      toast.error('Vui lòng chọn ngày bắt đầu');
      return;
    }

    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + formData.expiresInDays);

      await createOffer({
        applicationId: formData.applicationId,
        position: formData.position,
        salary: {
          amount: parseInt(formData.salaryAmount),
          currency: formData.salaryCurrency,
          paymentType: formData.salaryPaymentType
        },
        startDate: formData.startDate,
        probationPeriod: formData.probationMonths > 0 ? {
          months: parseInt(formData.probationMonths),
          salaryDuringProbation: formData.probationSalary ? parseInt(formData.probationSalary) : null
        } : undefined,
        benefits: formData.benefits,
        terms: formData.terms,
        expiresAt: expiresAt.toISOString()
      });
      toast.success('Đã tạo offer thành công');
      navigate('/enterprise/offers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))]">Tạo Offer</h1>
            <p className="text-sm text-[hsl(var(--admin-text-muted))]">Gửi offer cho ứng viên.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Select Application */}
          <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User size={18} /> Chọn ứng viên
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                  Ứng viên <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 items-center">
                  <Select
                    value={formData.applicationId}
                    onValueChange={(v) => updateField('applicationId', v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={appLoading ? 'Đang tải...' : 'Chọn ứng viên...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {applications.length === 0 && !appLoading && (
                        <div className="p-4 text-sm text-[hsl(var(--admin-text-muted))] text-center">
                          Không có ứng viên nào
                        </div>
                      )}
                      {applications.map(app => (
                        <SelectItem key={app._id} value={app._id}>
                          {app.workerName || app.worker?.name || 'Ứng viên'} - {app.jobTitle || app.job?.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={fetchApplications}
                    title="Làm mới"
                  >
                    <RefreshCw size={14} className={appLoading ? 'animate-spin' : ''} />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                  Vị trí <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="VD: Nhân viên pha chế"
                  value={formData.position}
                  onChange={(e) => updateField('position', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Salary */}
          <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign size={18} /> Lương & Phúc lợi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Mức lương <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="VD: 10000000"
                    value={formData.salaryAmount}
                    onChange={(e) => updateField('salaryAmount', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Loại thanh toán
                  </label>
                  <Select
                    value={formData.salaryPaymentType}
                    onValueChange={(v) => updateField('salaryPaymentType', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Hàng tháng</SelectItem>
                      <SelectItem value="hourly">Theo giờ</SelectItem>
                      <SelectItem value="project">Theo dự án</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Thời hạn trả lời
                  </label>
                  <Select
                    value={String(formData.expiresInDays)}
                    onValueChange={(v) => updateField('expiresInDays', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 ngày</SelectItem>
                      <SelectItem value="7">7 ngày</SelectItem>
                      <SelectItem value="14">14 ngày</SelectItem>
                      <SelectItem value="30">30 ngày</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                  Phúc lợi
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="VD: Bảo hiểm xã hội"
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addBenefit();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addBenefit}>
                    <Plus size={14} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.benefits.map((benefit, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))] rounded-lg text-sm"
                    >
                      {benefit}
                      <button type="button" onClick={() => removeBenefit(idx)} className="hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar size={18} /> Thời gian & Điều khoản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Ngày bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Thời gian thử việc (tháng)
                  </label>
                  <Select
                    value={String(formData.probationMonths)}
                    onValueChange={(v) => updateField('probationMonths', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Không có thử việc</SelectItem>
                      <SelectItem value="1">1 tháng</SelectItem>
                      <SelectItem value="2">2 tháng</SelectItem>
                      <SelectItem value="3">3 tháng</SelectItem>
                      <SelectItem value="6">6 tháng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.probationMonths > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Lương thử việc
                  </label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="VD: 8000000"
                    value={formData.probationSalary}
                    onChange={(e) => updateField('probationSalary', e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                  Điều khoản khác
                </label>
                <Textarea
                  placeholder="Các điều khoản và điều kiện khác..."
                  rows={4}
                  value={formData.terms}
                  onChange={(e) => updateField('terms', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? 'Đang tạo...' : 'Gửi Offer'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

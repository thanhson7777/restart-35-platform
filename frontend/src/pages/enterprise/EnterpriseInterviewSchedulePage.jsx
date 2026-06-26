import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, Video, Phone, Building, User, Mail, ChevronLeft } from 'lucide-react';

import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { createInterview } from '@/apis/recruitmentAPI';
import { fetchEnterpriseApplications } from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

const MEETING_TYPE_OPTIONS = [
  { value: 'google_meet', label: 'Jitsi Meet', icon: Video },
  { value: 'office', label: 'Tại văn phòng', icon: Building },
  { value: 'phone', label: 'Điện thoại', icon: Phone }
];

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const hour = 8 + i;
  return {
    value: String(hour),
    label: `${hour}:00`
  };
});

export default function EnterpriseInterviewSchedulePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    applicationId: location.state?.applicationId || '',
    scheduledDate: '',
    scheduledTime: '9',
    duration: 60,
    meetingType: 'google_meet',
    meetingLink: '',
    officeAddress: '',
    interviewerName: '',
    interviewerEmail: '',
    interviewerPhone: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    dispatch(fetchEnterpriseApplications({ limit: 100, status: 'shortlisted' }))
      .unwrap()
      .then(res => setApplications(res.applications || []))
      .catch(() => {});
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.applicationId) {
      toast.error('Vui lòng chọn ứng viên');
      return;
    }
    if (!formData.scheduledDate) {
      toast.error('Vui lòng chọn ngày');
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}:00`);
      await createInterview({
        applicationId: formData.applicationId,
        scheduledAt: scheduledAt.toISOString(),
        duration: formData.duration,
        meetingType: formData.meetingType,
        meetingLink: formData.meetingLink,
        officeAddress: formData.officeAddress,
        enterpriseInterviewer: {
          name: formData.interviewerName,
          email: formData.interviewerEmail,
          phone: formData.interviewerPhone
        },
        notes: formData.notes
      });
      toast.success('Đã tạo lịch phỏng vấn');
      navigate('/enterprise/interviews');
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
            <h1 className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))]">Đặt lịch phỏng vấn</h1>
            <p className="text-sm text-[hsl(var(--admin-text-muted))]">Tạo lịch phỏng vấn cho ứng viên.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Select Application */}
          <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
            <CardHeader>
              <CardTitle className="text-lg">Chọn ứng viên</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                  Ứng viên <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.applicationId}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, applicationId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ứng viên đã shortlisted..." />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.map(app => (
                      <SelectItem key={app._id} value={app._id}>
                        {app.workerName || app.worker?.name || 'Ứng viên'} - {app.jobTitle || app.job?.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar size={18} /> Thời gian
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Ngày <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Giờ
                  </label>
                  <Select
                    value={formData.scheduledTime}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, scheduledTime: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUR_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Thời lượng
                  </label>
                  <Select
                    value={String(formData.duration)}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, duration: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 phút</SelectItem>
                      <SelectItem value="45">45 phút</SelectItem>
                      <SelectItem value="60">60 phút</SelectItem>
                      <SelectItem value="90">90 phút</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Type */}
          <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
            <CardHeader>
              <CardTitle className="text-lg">Hình thức phỏng vấn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {MEETING_TYPE_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-all ${
                      formData.meetingType === opt.value
                        ? 'border-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent-subtle))]'
                        : 'border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-elevated))]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="meetingType"
                      value={opt.value}
                      checked={formData.meetingType === opt.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, meetingType: e.target.value }))}
                      className="sr-only"
                    />
                    <opt.icon size={24} className={
                      formData.meetingType === opt.value
                        ? 'text-[hsl(var(--admin-accent))]'
                        : 'text-[hsl(var(--admin-text-muted))]'
                    } />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>

              {formData.meetingType === 'google_meet' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Jitsi Meet Link
                  </label>
                  <Input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={formData.meetingLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
                  />
                </div>
              )}

              {formData.meetingType === 'office' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
                    Địa chỉ văn phòng
                  </label>
                  <Input
                    placeholder="VD: Tầng 5, Tòa nhà ABC, 123 Nguyễn Huệ"
                    value={formData.officeAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, officeAddress: e.target.value }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interviewer Info */}
          <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User size={18} /> Thông tin người phỏng vấn
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">Họ tên</label>
                  <Input
                    placeholder="Nguyễn Văn A"
                    value={formData.interviewerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, interviewerName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">Email</label>
                  <Input
                    type="email"
                    placeholder="nguyenvana@company.com"
                    value={formData.interviewerEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, interviewerEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">Điện thoại</label>
                  <Input
                    type="tel"
                    placeholder="0912 345 678"
                    value={formData.interviewerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, interviewerPhone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">Ghi chú</label>
                <Textarea
                  placeholder="Lưu ý cho buổi phỏng vấn..."
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading} className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white">
              {loading ? 'Đang tạo...' : 'Tạo lịch phỏng vấn'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

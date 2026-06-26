import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, Phone, Building, User, Mail } from 'lucide-react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

const MEETING_TYPE_OPTIONS = [
  { value: 'google_meet', label: 'Jitsi Meet', icon: Video },
  { value: 'office', label: 'Tại văn phòng', icon: Building },
  { value: 'phone', label: 'Điện thoại', icon: Phone }
];

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const hour = 8 + i;
  return { value: String(hour), label: `${hour}:00` };
});

const DURATION_OPTIONS = [
  { value: 30, label: '30 phút' },
  { value: 45, label: '45 phút' },
  { value: 60, label: '60 phút' },
  { value: 90, label: '90 phút' }
];

export default function ScheduleInterviewForm({
  applicationId,
  jobId,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Xác nhận'
}) {
  const getInitialDate = () => {
    if (initialData?.scheduledAt) {
      const d = new Date(initialData.scheduledAt);
      return d.toISOString().split('T')[0];
    }
    return '';
  };

  const getInitialTime = () => {
    if (initialData?.scheduledAt) {
      const d = new Date(initialData.scheduledAt);
      return String(d.getHours());
    }
    return '9';
  };

  const [formData, setFormData] = useState({
    scheduledDate: getInitialDate(),
    scheduledTime: getInitialTime(),
    duration: initialData?.duration || 60,
    meetingType: initialData?.meetingType || 'google_meet',
    meetingLink: initialData?.meetingLink || '',
    officeAddress: initialData?.officeAddress || '',
    interviewerName: initialData?.enterpriseInterviewer?.name || '',
    interviewerEmail: initialData?.enterpriseInterviewer?.email || '',
    interviewerPhone: initialData?.enterpriseInterviewer?.phone || '',
    notes: initialData?.notes || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.scheduledDate) {
      return;
    }

    const hourStr = String(formData.scheduledTime).padStart(2, '0');
    const scheduledAt = new Date(`${formData.scheduledDate}T${hourStr}:00:00`);
    const data = {
      applicationId,
      jobId,
      scheduledAt: scheduledAt.getTime(),
      duration: formData.duration,
      meetingType: 'google_meet',
      // meetingLink sẽ do Backend tự động sinh thông qua Google Calendar API
      officeAddress: '',
      interviewerName: formData.interviewerName || 'Bộ phận Tuyển dụng',
      interviewerEmail: formData.interviewerEmail,
      interviewerPhone: formData.interviewerPhone,
      notes: formData.notes
    };

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date & Time */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] flex items-center gap-2">
          <Calendar size={16} /> Thời gian
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[hsl(var(--admin-text-secondary))]">
              Ngày <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={formData.scheduledDate}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[hsl(var(--admin-text-secondary))]">Giờ</label>
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
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[hsl(var(--admin-text-secondary))]">Thời lượng</label>
            <Select
              value={String(formData.duration)}
              onValueChange={(v) => setFormData(prev => ({ ...prev, duration: parseInt(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200">
        <div className="flex items-start gap-2">
          <Video className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
          <p>
            Hệ thống sẽ tự động tạo link <strong>Jitsi Meet</strong> và gửi lời mời lịch (Calendar Invite) qua email cho cả Ứng viên và Doanh nghiệp.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[hsl(var(--admin-text-secondary))]">Ghi chú (tùy chọn)</label>
        <Textarea
          placeholder="Lưu ý cho buổi phỏng vấn (ví dụ: yêu cầu chuẩn bị portfolio...)"
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || !formData.scheduledDate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {loading ? 'Đang xử lý...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

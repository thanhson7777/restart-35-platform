import React from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  BookOpen,
  Award,
  AlertOctagon,
  Zap,
  TrendingDown,
  UserX,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import {
  BezelCard,
  Avatar,
  Badge,
  Progress,
  Button
} from '@/components/ui';
import { TrainerRiskAlert } from './TrainerRiskAlert';

export const TrainerEnrollmentDetail = ({
  enrollment = {},
  risk = {},
  onTriggerIntervention = () => {},
  onSuspend = () => {},
  onComplete = () => {},
  onFail = () => {},
  isInterventionLoading = false
}) => {
  const {
    user = {},
    course = {},
    status,
    payment_status,
    enrolledAt,
    startDate,
    completedAt,
    progress = {},
    fee = {}
  } = enrollment;

  const getStatusLabel = (s) => {
    switch (s) {
      case 'active':
      case 'in_progress':
        return 'Đang học';
      case 'completed':
        return 'Hoàn thành';
      case 'suspended':
        return 'Tạm ngưng';
      case 'failed':
        return 'Đã trượt';
      case 'dropped':
        return 'Bỏ học';
      default:
        return s || 'N/A';
    }
  };

  const getStatusBadgeVariant = (s) => {
    switch (s) {
      case 'active':
      case 'in_progress':
        return 'success';
      case 'completed':
        return 'default';
      case 'suspended':
        return 'warning';
      case 'failed':
      case 'dropped':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPaymentStatusLabel = (p) => {
    switch (p) {
      case 'paid':
      case 'completed':
        return 'Đã thanh toán';
      case 'pending':
        return 'Chưa thanh toán';
      case 'isa_pending':
        return 'Chờ ký hợp đồng ISA';
      case 'isa_active':
        return 'Đang đóng theo ISA';
      default:
        return p || 'N/A';
    }
  };

  const getPaymentStatusVariant = (p) => {
    switch (p) {
      case 'paid':
      case 'completed':
      case 'isa_active':
        return 'success';
      case 'pending':
        return 'destructive';
      case 'isa_pending':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getInterventionLabel = (type) => {
    switch (type) {
      case 'zalo_reminder':
        return 'Nhắc nhở qua Zalo';
      case 'email_alert':
        return 'Cảnh báo qua Email';
      case 'trainer_notified':
        return 'Báo cáo hệ thống';
      default:
        return type;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (val) => {
    if (!val) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: General Info */}
        <div className="lg:col-span-1 space-y-6">
          <BezelCard className="flex flex-col items-center text-center p-6 bg-[#0c101d] border border-slate-800" padding="default">
            <Avatar
              src={user?.avatar}
              alt={user?.displayName}
              fallback={user?.displayName?.charAt(0).toUpperCase()}
              size="large"
              className="w-24 h-24 text-3xl bg-slate-800 border-2 border-slate-700 ring-4 ring-slate-900/50 mb-4"
            />
            <h2 className="text-xl font-bold text-white tracking-tight">{user?.displayName || 'Chưa cập nhật'}</h2>
            <p className="text-xs text-slate-400 font-mono mt-1 mb-3">{user?.email || 'N/A'}</p>
            
            <Badge variant={getStatusBadgeVariant(status)} className="px-3 py-1 text-xs font-semibold rounded-md">
              {getStatusLabel(status)}
            </Badge>

            <div className="w-full border-t border-slate-800/80 my-5" />

            <div className="w-full space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                  <Phone size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Số điện thoại</span>
                  <span className="text-sm font-semibold text-slate-200 font-mono">{user?.phone || 'Chưa cung cấp'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                  <CreditCard size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Học phí & Trạng thái</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-semibold text-slate-200 font-mono">{formatCurrency(fee?.total)}</span>
                    <Badge variant={getPaymentStatusVariant(payment_status)} className="px-1.5 py-px text-[10px] font-semibold rounded">
                      {getPaymentStatusLabel(payment_status)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                  <Calendar size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Ngày nhập học</span>
                  <span className="text-sm font-semibold text-slate-200 font-mono">{formatDate(enrolledAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                  <BookOpen size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Khóa học đăng ký</span>
                  <span className="text-sm font-semibold text-slate-200">{course?.title || 'N/A'}</span>
                </div>
              </div>
            </div>
          </BezelCard>
        </div>

        {/* Right Column: Learning Progress & Interventions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Progress Card */}
          <BezelCard className="bg-[#0c101d] border border-slate-800 p-6" padding="default">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Award size={18} className="text-[#3B82F6]" />
                Tiến độ học tập
              </h3>
              <span className="text-sm font-bold text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg font-mono">
                {progress?.percentage || 0}% Hoàn thành
              </span>
            </div>

            <Progress
              value={progress?.percentage || 0}
              className="h-2.5 bg-slate-900"
              indicatorClassName="bg-gradient-to-r from-blue-500 to-indigo-500"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-2xl">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Bài học hiện tại</span>
                <span className="text-lg font-bold text-white font-mono mt-1 block">
                  {progress?.currentLesson || 0}
                </span>
              </div>
              <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-2xl">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Tổng số bài học</span>
                <span className="text-lg font-bold text-white font-mono mt-1 block">
                  {progress?.totalLessons || 0}
                </span>
              </div>
              <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-2xl col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Ngày hoàn thành</span>
                <span className="text-sm font-semibold text-slate-300 font-mono mt-1.5 block">
                  {completedAt ? formatDate(completedAt) : 'Chưa hoàn thành'}
                </span>
              </div>
            </div>
          </BezelCard>

          {/* Intervention & Dropout Risk Analytics */}
          <BezelCard className="bg-[#0c101d] border border-slate-800 p-6" padding="default">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/60">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <AlertOctagon size={18} className="text-orange-500" />
                  Mức độ nguy cơ bỏ học
                </h3>
                <p className="text-xs text-slate-400 mt-1">Phân tích dựa trên tương tác và thời gian vắng mặt</p>
              </div>
              <TrainerRiskAlert level={risk?.level} score={risk?.score} />
            </div>

            {/* Quick Interventions */}
            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap size={15} className="text-[#3B82F6]" />
                Can thiệp nhanh
              </h4>
              <p className="text-xs text-slate-400">Kích hoạt các hành động can thiệp tự động để nhắc nhở học viên qua các kênh kết nối.</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isInterventionLoading}
                  onClick={() => onTriggerIntervention('zalo_reminder')}
                  className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all duration-200 font-semibold"
                >
                  Gửi nhắc nhở Zalo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isInterventionLoading}
                  onClick={() => onTriggerIntervention('email_alert')}
                  className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all duration-200 font-semibold"
                >
                  Gửi cảnh báo Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isInterventionLoading}
                  onClick={() => onTriggerIntervention('trainer_notified')}
                  className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all duration-200 font-semibold"
                >
                  Báo cáo hệ thống
                </Button>
              </div>
            </div>

            {/* Intervention Logs */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <TrendingDown size={15} className="text-slate-400" />
                Lịch sử can thiệp
              </h4>
              
              {(!risk?.interventions_sent || risk.interventions_sent.length === 0) ? (
                <div className="text-xs text-slate-500 italic p-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
                  Chưa thực hiện biện pháp can thiệp nào cho học viên này.
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-850 rounded-xl bg-slate-900/20">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900/50 border-b border-slate-850 text-slate-400 font-medium">
                        <th className="p-3">Biện pháp</th>
                        <th className="p-3">Thời gian thực hiện</th>
                        <th className="p-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {risk.interventions_sent.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/20 text-slate-300">
                          <td className="p-3 font-semibold">{getInterventionLabel(item.type)}</td>
                          <td className="p-3 font-mono text-slate-400">{formatDate(item.sent_at)}</td>
                          <td className="p-3 text-right">
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <Clock size={11} className="animate-spin text-slate-500" style={{ animationDuration: '3s' }} />
                              Đã xử lý
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </BezelCard>
        </div>
      </div>

      {/* Footer Section: Actions */}
      <BezelCard className="bg-[#0b0e17] border border-slate-800/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-4" padding="default">
        <div>
          <h3 className="text-sm font-bold text-white">Quản trị trạng thái học tập</h3>
          <p className="text-xs text-slate-400 mt-1">Thay đổi tình trạng tham gia học tập của học viên đối với khóa học này.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {status !== 'suspended' && status !== 'completed' && status !== 'failed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSuspend}
              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 gap-1.5 transition-all duration-200 font-semibold"
            >
              <UserX size={14} />
              Tạm ngưng học
            </Button>
          )}
          
          {status !== 'completed' && status !== 'failed' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onComplete}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5 transition-all duration-200 font-semibold"
              >
                <CheckCircle size={14} />
                Hoàn thành khóa học
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onFail}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 transition-all duration-200 font-semibold"
              >
                <XCircle size={14} />
                Đánh trượt học viên
              </Button>
            </>
          )}
        </div>
      </BezelCard>
    </div>
  );
};

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
  TrendingUp,
  UserX,
  Activity,
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
  onUpdateProgress = () => {},
  onUpdateStatus = () => {},
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
          <BezelCard className="flex flex-col items-center text-center p-6 bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]" padding="default">
            <Avatar
              src={user?.avatar}
              alt={user?.displayName}
              fallback={user?.displayName?.charAt(0).toUpperCase()}
              size="large"
              className="w-24 h-24 text-3xl bg-[hsl(var(--admin-surface-elevated))] border-2 border-[hsl(var(--admin-border-strong))] ring-4 ring-[hsl(var(--admin-surface))]/50 mb-4"
            />
            <h2 className="text-xl font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">{user?.displayName || 'Chưa cập nhật'}</h2>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] font-mono mt-1 mb-3">{user?.email || 'N/A'}</p>
            
            <Badge variant={getStatusBadgeVariant(status)} className="px-3 py-1 text-xs font-semibold rounded-md">
              {getStatusLabel(status)}
            </Badge>

            <div className="w-full border-t border-[hsl(var(--admin-border))]/80 my-5" />

            <div className="w-full space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))]">
                  <Phone size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[hsl(var(--admin-text-faint))] uppercase tracking-wider">Số điện thoại</span>
                  <span className="text-sm font-semibold text-[hsl(var(--admin-text-secondary))] font-mono">{user?.phone || 'Chưa cung cấp'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))]">
                  <CreditCard size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[hsl(var(--admin-text-faint))] uppercase tracking-wider">
                    {enrollment.source === 'enterprise_sponsored' ? 'Nguồn học phí' : 'Học phí & Trạng thái'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {enrollment.source === 'enterprise_sponsored' ? (
                      <Badge variant="success" className="px-1.5 py-px text-[10px] font-semibold rounded bg-[hsl(var(--admin-success)/20%)] text-[hsl(var(--admin-success))] border-none">
                        Tài trợ bởi Doanh nghiệp
                      </Badge>
                    ) : (
                      <>
                        <span className="text-xs font-semibold text-[hsl(var(--admin-text-secondary))] font-mono">{formatCurrency(fee?.total)}</span>
                        <Badge variant={getPaymentStatusVariant(payment_status)} className="px-1.5 py-px text-[10px] font-semibold rounded">
                          {getPaymentStatusLabel(payment_status)}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))]">
                  <Calendar size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[hsl(var(--admin-text-faint))] uppercase tracking-wider">Ngày nhập học</span>
                  <span className="text-sm font-semibold text-[hsl(var(--admin-text-secondary))] font-mono">{formatDate(enrolledAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))]">
                  <BookOpen size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[hsl(var(--admin-text-faint))] uppercase tracking-wider">Khóa học đăng ký</span>
                  <span className="text-sm font-semibold text-[hsl(var(--admin-text-secondary))]">{course?.title || 'N/A'}</span>
                </div>
              </div>
            </div>
          </BezelCard>
        </div>

        {/* Right Column: Learning Progress & Interventions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Progress Card */}
          <BezelCard className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] p-6" padding="default">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[hsl(var(--admin-text-primary))] tracking-tight flex items-center gap-2">
                <Award size={18} className="text-[hsl(var(--admin-accent))]" />
                Tiến độ học tập
              </h3>
              <span className="text-sm font-bold text-[hsl(var(--admin-text-primary))] bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] px-2 py-0.5 rounded-lg font-mono">
                {progress?.percentage || 0}% Hoàn thành
              </span>
            </div>

            <Progress
              value={progress?.percentage || 0}
              className="h-2.5 bg-[hsl(var(--admin-surface-elevated))]"
              indicatorClassName="bg-gradient-to-r from-blue-500 to-indigo-500"
            />


            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-[hsl(var(--admin-surface-elevated))]/40 border border-[hsl(var(--admin-border))] p-3.5 rounded-2xl">
                <span className="text-[10px] text-[hsl(var(--admin-text-faint))] uppercase tracking-wider block">Buổi học hiện tại</span>
                <span className="text-lg font-bold text-[hsl(var(--admin-text-primary))] font-mono mt-1 block">
                  {enrollment.attendance?.present || progress?.currentLesson || 0}
                </span>
              </div>
              <div className="bg-[hsl(var(--admin-surface-elevated))]/40 border border-[hsl(var(--admin-border))] p-3.5 rounded-2xl">
                <span className="text-[10px] text-[hsl(var(--admin-text-faint))] uppercase tracking-wider block">Tổng số buổi học</span>
                <span className="text-lg font-bold text-[hsl(var(--admin-text-primary))] font-mono mt-1 block">
                  {enrollment.attendance?.totalSessions || progress?.totalLessons || 0}
                </span>
              </div>
              <div className="bg-[hsl(var(--admin-surface-elevated))]/40 border border-[hsl(var(--admin-border))] p-3.5 rounded-2xl col-span-2 sm:col-span-1">
                <span className="text-[10px] text-[hsl(var(--admin-text-faint))] uppercase tracking-wider block">Ngày hoàn thành</span>
                <span className="text-sm font-semibold text-[hsl(var(--admin-text-secondary))] font-mono mt-1.5 block">
                  {completedAt ? formatDate(completedAt) : 'Chưa hoàn thành'}
                </span>
              </div>
            </div>
          </BezelCard>


        </div>
      </div>

    </div>
  );
};

import React from 'react';
import { MapPin, DollarSign, Clock, Building } from 'lucide-react';
import { Badge } from '@/components/ui';

const formatSalary = (salary) => {
  if (!salary) return 'Thoả thuận';
  const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  if (salary.min && salary.max) return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}`;
  if (salary.min) return `Từ ${formatter.format(salary.min)}`;
  if (salary.max) return `Đến ${formatter.format(salary.max)}`;
  return 'Thoả thuận';
};

const formatDate = (date) => {
  if (!date) return '';
  const days = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
};

const getJobTypeLabel = (type) => {
  const labels = {
    full_time: 'Toàn thời gian',
    part_time: 'Bán thời gian',
    temporary: 'Tạm thời',
    freelance: 'Freelance',
    internship: 'Thực tập'
  };
  return labels[type] || type || 'Toàn thời gian';
};

export default function RecruitmentJobCard({ job, onClick, compact = false, showEnterprise = true }) {
  if (!job) return null;

  const jobData = {
    id: job._id || job.id,
    title: job.title || job.job?.title,
    enterpriseName: job.enterpriseInfo?.name || job.enterprise?.name || job.company,
    enterpriseLogo: job.enterpriseInfo?.logo || job.enterprise?.logo,
    province: job.location?.province || job.province,
    address: job.location?.address,
    salary: job.salary,
    type: job.job?.type || job.type,
    skills: job.skills || job.requirements?.skills || [],
    createdAt: job.createdAt || job.publishedAt,
    stats: job.stats
  };

  if (compact) {
    return (
      <div
        className={`bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 ${
          onClick ? 'cursor-pointer hover:border-[hsl(var(--primary))] transition-all' : ''
        }`}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[hsl(var(--foreground))] truncate">
              {jobData.title}
            </h3>
            {showEnterprise && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">
                {jobData.enterpriseName}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className="text-xs">
              {getJobTypeLabel(jobData.type)}
            </Badge>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {formatDate(jobData.createdAt)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 ${
        onClick ? 'cursor-pointer hover:border-[hsl(var(--primary))] hover:shadow-md transition-all' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[hsl(var(--foreground))] text-lg mb-1">
            {jobData.title}
          </h3>
          {showEnterprise && (
            <p className="text-[hsl(var(--muted-foreground))] flex items-center gap-1">
              <Building size={14} />
              {jobData.enterpriseName}
            </p>
          )}
        </div>
        <Badge variant="outline" className="shrink-0">
          {getJobTypeLabel(jobData.type)}
        </Badge>
      </div>

      {/* Info */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-[hsl(var(--muted-foreground))]">
        {jobData.province && (
          <span className="flex items-center gap-1">
            <MapPin size={14} />
            {jobData.province}
          </span>
        )}
        <span className="flex items-center gap-1">
          <DollarSign size={14} />
          {formatSalary(jobData.salary)}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={14} />
          {formatDate(jobData.createdAt)}
        </span>
      </div>

      {/* Skills */}
      {jobData.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {jobData.skills.slice(0, 5).map((skill, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
            >
              {skill}
            </span>
          ))}
          {jobData.skills.length > 5 && (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              +{jobData.skills.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      {jobData.stats && (
        <div className="flex items-center gap-4 pt-4 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
          <span>{jobData.stats.views || 0} lượt xem</span>
          <span>{jobData.stats.applications || 0} ứng viên</span>
        </div>
      )}
    </div>
  );
}

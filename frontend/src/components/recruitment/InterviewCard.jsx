import React from 'react';
import { Video, Phone, Building, Clock, Check, X } from 'lucide-react';
import ApplicationStatusBadge from './ApplicationStatusBadge';

const getMeetingIcon = (type) => {
  switch (type) {
    case 'google_meet': return Video;
    case 'phone': return Phone;
    case 'office': return Building;
    default: return Video;
  }
};

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};

export default function InterviewCard({ interview, onClick, compact = false }) {
  if (!interview) return null;

  const MeetingIcon = getMeetingIcon(interview.meetingType);
  const isPast = interview.scheduledAt && new Date(interview.scheduledAt) < new Date();

  if (compact) {
    return (
      <div
        className={`bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 flex items-center gap-4 ${
          onClick ? 'cursor-pointer hover:border-[hsl(var(--primary))] transition-colors' : ''
        }`}
        onClick={onClick}
      >
        <div className={`p-2 rounded-lg ${
          interview.status === 'confirmed' ? 'bg-emerald-100' :
          interview.status === 'pending_confirmation' ? 'bg-emerald-100' : 'bg-slate-100'
        }`}>
          <MeetingIcon size={20} className={
            interview.status === 'confirmed' ? 'text-emerald-600' :
            interview.status === 'pending_confirmation' ? 'text-emerald-600' : 'text-slate-500'
          } />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[hsl(var(--foreground))] truncate">
            {interview.jobTitle || interview.job?.title}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {formatDateTime(interview.scheduledAt)}
          </p>
        </div>
        <ApplicationStatusBadge status={interview.status} size="sm" />
      </div>
    );
  }

  return (
    <div
      className={`bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 ${
        onClick ? 'cursor-pointer hover:border-[hsl(var(--primary))] transition-all' : ''
      } ${isPast && interview.status !== 'completed' ? 'opacity-75' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${
            interview.status === 'confirmed' ? 'bg-emerald-100' :
            interview.status === 'pending_confirmation' ? 'bg-emerald-100' :
            interview.status === 'completed' ? 'bg-blue-100' : 'bg-slate-100'
          }`}>
            <MeetingIcon size={24} className={
              interview.status === 'confirmed' ? 'text-emerald-600' :
              interview.status === 'pending_confirmation' ? 'text-emerald-600' :
              interview.status === 'completed' ? 'text-blue-600' : 'text-slate-500'
            } />
          </div>
          <div>
            <h3 className="font-semibold text-[hsl(var(--foreground))]">
              {interview.jobTitle || interview.job?.title}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {interview.enterpriseName || interview.enterprise?.name}
            </p>
          </div>
        </div>
        <ApplicationStatusBadge status={interview.status} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
          <Clock size={16} />
          <span>{formatDateTime(interview.scheduledAt)}</span>
          <span>•</span>
          <span>{interview.duration || 60} phút</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {interview.meetingType === 'google_meet' && (
            <span className="text-[hsl(var(--primary))]">
              {interview.meetingType === 'google_meet' ? 'Jitsi Meet' :
               interview.meetingType === 'office' ? 'Tại văn phòng' : 'Điện thoại'}
            </span>
          )}
          {interview.meetingLink && (
            <a
              href={interview.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[hsl(var(--primary))] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {interview.meetingLink}
            </a>
          )}
          {interview.officeAddress && (
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              {interview.officeAddress}
            </span>
          )}
        </div>


      </div>
    </div>
  );
}

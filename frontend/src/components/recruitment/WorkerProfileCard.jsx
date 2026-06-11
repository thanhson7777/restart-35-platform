import React from 'react';
import { User, Phone, Mail, MapPin, Briefcase, GraduationCap, Award, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function WorkerProfileCard({ profile, compact = false, onClick }) {
  if (!profile) return null;

  const profileData = {
    name: profile.name || profile.basicInfo?.name || profile.workerName || 'N/A',
    email: profile.email || profile.basicInfo?.email,
    phone: profile.phone || profile.basicInfo?.phone,
    dateOfBirth: profile.dateOfBirth || profile.basicInfo?.dateOfBirth,
    address: profile.address || profile.basicInfo?.address,
    targetJob: profile.targetJob || profile.aspirations?.targetJob,
    preferredJobType: profile.preferredJobType || profile.aspirations?.preferredJobType,
    targetSalary: profile.targetSalary || profile.aspirations?.targetSalary,
    skills: profile.skills || profile.interests?.skills || [],
    education: profile.education,
    experience: profile.experience,
    certifications: profile.certifications || [],
    barriers: profile.barriers
  };

  if (compact) {
    return (
      <div
        className={`bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 ${
          onClick ? 'cursor-pointer hover:border-[hsl(var(--primary))] transition-colors' : ''
        }`}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary)/10] flex items-center justify-center shrink-0">
            <span className="text-sm font-medium text-[hsl(var(--primary))]">
              {profileData.name[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[hsl(var(--foreground))] truncate">
              {profileData.name}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {profileData.targetJob || '—'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`bg-[hsl(var(--card))] border border-[hsl(var(--border))] ${
      onClick ? 'cursor-pointer hover:border-[hsl(var(--primary))] transition-colors' : ''
    }`} onClick={onClick}>
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-[hsl(var(--primary)/10] flex items-center justify-center shrink-0">
            <span className="text-xl font-medium text-[hsl(var(--primary))]">
              {profileData.name[0]}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-[hsl(var(--foreground))]">
              {profileData.name}
            </h3>
            <div className="flex flex-wrap gap-3 mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              {profileData.email && (
                <span className="flex items-center gap-1">
                  <Mail size={12} /> {profileData.email}
                </span>
              )}
              {profileData.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={12} /> {profileData.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        {(profileData.address || profileData.dateOfBirth) && (
          <div className="flex flex-wrap gap-4 text-sm text-[hsl(var(--muted-foreground))]">
            {profileData.address && (
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {profileData.address}
              </span>
            )}
            {profileData.dateOfBirth && (
              <span>Sinh: {formatDate(profileData.dateOfBirth)}</span>
            )}
          </div>
        )}

        {/* Aspirations */}
        {(profileData.targetJob || profileData.preferredJobType || profileData.targetSalary) && (
          <div className="p-3 rounded-lg bg-[hsl(var(--muted))] space-y-2">
            <h4 className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase">
              Mong muốn nghề nghiệp
            </h4>
            <div className="space-y-1 text-sm">
              {profileData.targetJob && (
                <p><span className="font-medium">Vị trí:</span> {profileData.targetJob}</p>
              )}
              {profileData.preferredJobType && (
                <p><span className="font-medium">Loại hình:</span> {profileData.preferredJobType}</p>
              )}
              {profileData.targetSalary && (
                <p>
                  <span className="font-medium">Lương mong muốn:</span>{' '}
                  {profileData.targetSalary.toLocaleString('vi-VN')} VND
                </p>
              )}
            </div>
          </div>
        )}

        {/* Skills */}
        {profileData.skills.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase mb-2 flex items-center gap-1">
              <Award size={12} /> Kỹ năng
            </h4>
            <div className="flex flex-wrap gap-2">
              {profileData.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs rounded-full bg-[hsl(var(--primary)/10] text-[hsl(var(--primary))]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {profileData.experience > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase size={14} className="text-[hsl(var(--muted-foreground))]" />
            <span>{profileData.experience} năm kinh nghiệm</span>
          </div>
        )}

        {/* Certifications */}
        {profileData.certifications.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase mb-2 flex items-center gap-1">
              <GraduationCap size={12} /> Chứng chỉ
            </h4>
            <div className="flex flex-wrap gap-2">
              {profileData.certifications.map((cert, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Barriers */}
        {profileData.barriers && Object.keys(profileData.barriers).some(k => profileData.barriers[k]) && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <h4 className="text-xs font-medium text-amber-700 uppercase mb-2 flex items-center gap-1">
              <AlertCircle size={12} /> Rào cản cần lưu ý
            </h4>
            <ul className="space-y-1 text-sm text-amber-800">
              {profileData.barriers.familyResponsibilities && (
                <li>• Trách nhiệm gia đình</li>
              )}
              {profileData.barriers.healthIssues && (
                <li>• Vấn đề sức khỏe</li>
              )}
              {profileData.barriers.transportation && (
                <li>• Khó khăn di chuyển</li>
              )}
              {profileData.barriers.ageDiscrimination && (
                <li>• Lo ngại về tuổi tác</li>
              )}
              {profileData.barriers.lackOfExperience && (
                <li>• Thiếu kinh nghiệm</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

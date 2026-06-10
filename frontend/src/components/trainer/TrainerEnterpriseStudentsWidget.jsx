import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, BookOpen } from 'lucide-react';
import { BezelCard, Avatar } from '@/components/ui';

export const TrainerEnterpriseStudentsWidget = ({ data = {} }) => {
  const { total = 0, recentLearners = [] } = data;

  const displayLearners = recentLearners.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <BezelCard padding="default">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[hsl(var(--admin-accent))]/10 border border-[hsl(var(--admin-accent))]/20">
              <Building2 size={18} className="text-[hsl(var(--admin-accent))]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">
                Enterprise Learners
              </h3>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))] mt-0.5">
                Học viên từ các doanh nghiệp đối tác
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]">
              <Users size={16} className="text-[hsl(var(--admin-accent))]" />
            </div>
            <span className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">{total}</span>
          </div>
        </div>

        {displayLearners.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-[hsl(var(--admin-text-muted))] text-sm border border-dashed border-[hsl(var(--admin-border))] rounded-xl">
            <Users size={20} className="mb-2 opacity-50" />
            Chưa có học viên enterprise.
          </div>
        ) : (
          <div className="space-y-3">
            {displayLearners.map((learner, idx) => (
              <div
                key={learner._id || learner.id || idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]/40 border border-[hsl(var(--admin-border))]/60 hover:bg-[hsl(var(--admin-surface-elevated))]/60 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={learner.avatar || learner.user?.avatar}
                    alt={learner.displayName || learner.user?.displayName || 'Learner'}
                    fallback={(learner.displayName || learner.user?.displayName || '?').charAt(0).toUpperCase()}
                    size="default"
                  />
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] truncate">
                      {learner.displayName || learner.user?.displayName || 'Học viên'}
                    </h4>
                    {learner.enterprise && (
                      <p className="text-xs text-[hsl(var(--admin-text-muted))] truncate flex items-center gap-1">
                        <Building2 size={10} />
                        {learner.enterprise}
                      </p>
                    )}
                  </div>
                </div>

                {learner.course && (
                  <div className="flex items-center gap-1.5 text-right shrink-0">
                    <BookOpen size={11} className="text-[hsl(var(--admin-text-muted))]" />
                    <span className="text-xs text-[hsl(var(--admin-text-muted))] max-w-[120px] truncate">
                      {typeof learner.course === 'string' ? learner.course : learner.course.title}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </BezelCard>
    </motion.div>
  );
};

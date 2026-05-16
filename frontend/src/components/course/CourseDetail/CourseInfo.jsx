import { Card, Badge } from '@/components/ui';
import { formatDuration } from '@/utils/formatter';
import { CheckCircle2 } from 'lucide-react';

const LEVEL_LABELS = {
  beginner: 'Người mới',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
};

export const CourseInfo = ({ course }) => {
  if (!course) return null;

  const {
    description,
    syllabus,
    prerequisites,
    outcomes,
    certificate,
    duration,
    location,
    skills,
    level,
  } = course;

  return (
    <div className="space-y-6">
      {/* Description */}
      {description && (
        <section>
          <h3 className="font-semibold text-lg mb-3">Mô tả khóa học</h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {description}
          </p>
        </section>
      )}

      {/* Skills */}
      {skills?.length > 0 && (
        <section>
          <h3 className="font-semibold text-lg mb-3">Kỹ năng đạt được</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <Badge key={i} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Prerequisites */}
      {prerequisites?.length > 0 && (
        <section>
          <h3 className="font-semibold text-lg mb-3">Yêu cầu đầu vào</h3>
          <ul className="space-y-2">
            {prerequisites.map((prereq, i) => (
              <li key={i} className="flex items-start gap-2 text-muted-foreground">
                <span className="text-destructive mt-0.5">*</span>
                {prereq}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Outcomes */}
      {outcomes?.length > 0 && (
        <section>
          <h3 className="font-semibold text-lg mb-3">Bạn sẽ học được gì?</h3>
          <ul className="space-y-2">
            {outcomes.map((outcome, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{outcome}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Syllabus */}
      {syllabus?.length > 0 && (
        <section>
          <h3 className="font-semibold text-lg mb-3">Nội dung khóa học</h3>
          <div className="space-y-3">
            {syllabus.map((week, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="px-4 py-3 bg-muted font-medium text-sm">
                  Tuần {week.week}: {week.title}
                  {week.duration && (
                    <span className="text-muted-foreground font-normal ml-2">
                      ({week.duration})
                    </span>
                  )}
                </div>
                <div className="p-4 text-sm text-muted-foreground">
                  {week.content}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Certificate */}
      {certificate && (
        <section>
          <h3 className="font-semibold text-lg mb-3">Chứng chỉ</h3>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="font-medium text-primary">{certificate}</p>
          </div>
        </section>
      )}
    </div>
  );
};

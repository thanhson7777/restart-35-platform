import { Card, Badge } from '@/components/ui';
import { formatDuration } from '@/utils/formatter';
import { CheckCircle2 } from 'lucide-react';

const LEVEL_LABELS = {
  beginner: 'Người mới',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
};

export const CourseInfo = ({ course, isEnrolled = false, lessons = [] }) => {
  if (!course) return null;

  const {
    description,
    syllabus,
    prerequisites,
    certificate,
    duration,
    location,
    skills,
    level,
  } = course;

  return (
    <div className="space-y-8">
      {/* Description */}
      {description && (
        <section>
          <h3 className="font-bold text-xl text-zinc-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-600 rounded-full inline-block"></span>
            Mô tả khóa học
          </h3>
          <div 
            className="text-zinc-600 leading-relaxed whitespace-pre-line text-base prose prose-blue max-w-none"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </section>
      )}

      {/* Skills */}
      {skills?.length > 0 && (
        <section>
          <h3 className="font-bold text-xl text-zinc-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-600 rounded-full inline-block"></span>
            Kỹ năng đạt được
          </h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                {skill}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Prerequisites */}
      {prerequisites?.length > 0 && (
        <section>
          <h3 className="font-bold text-xl text-zinc-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-600 rounded-full inline-block"></span>
            Yêu cầu đầu vào
          </h3>
          <ul className="space-y-2">
            {prerequisites.map((prereq, i) => (
              <li key={i} className="flex items-start gap-2 text-zinc-600">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                {prereq}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Certificate */}
      {certificate && (
        <section>
          <h3 className="font-bold text-xl text-zinc-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-600 rounded-full inline-block"></span>
            Chứng chỉ
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="font-semibold text-blue-800">{certificate}</p>
          </div>
        </section>
      )}
    </div>
  );
};

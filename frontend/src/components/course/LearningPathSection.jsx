/**
 * Learning Path Section — Timeline UI cho multi-step learning path
 */

import React from 'react';
import { BookOpenText, Clock, CheckCircle, CircleNotch } from '@phosphor-icons/react';


const LearningPathSection = ({ learningPath, loading }) => {
  if (loading) {
    return <LearningPathSkeleton />;
  }

  if (!learningPath || !learningPath.steps || learningPath.steps.length === 0) {
    return null;
  }

  const {
    steps,
    total_steps,
    total_weeks,
    job_title,
    skills_covered_count,
    skills_total,
    coverage_percent,
  } = learningPath;

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BookOpenText size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">Lộ trình học tập</h3>
          </div>
          {job_title && (
            <p className="text-xs text-blue-700 ml-6">
              Dành cho: {job_title}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="block text-xs font-semibold text-blue-800">
            {Math.round(coverage_percent)}% kỹ năng
          </span>
          <span className="block text-xs text-blue-600">
            {skills_covered_count}/{skills_total} kỹ năng
          </span>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-3 mb-4 text-xs text-blue-700">
        <span className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded-full">
          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
            {total_steps}
          </span>
          bước
        </span>
        {total_weeks > 0 && (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            ~{total_weeks} tuần
          </span>
        )}
        <span className="flex items-center gap-1">
          <CheckCircle size={12} />
          {skills_covered_count} kỹ năng được bù
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <LearningPathStep
            key={index}
            step={step}
            index={index}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

const LearningPathStep = ({ step, index, isLast }) => {
  const { course, skills_covered, skills_remaining, reason, step: stepNum } = step;

  const isFree = course.fee === 0 || course.fee === '0';

  return (
    <div className="flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`
            w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
            ${index === 0
              ? 'bg-blue-600 text-white'
              : 'bg-blue-200 text-blue-700'
            }
          `}
        >
          {stepNum || index + 1}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-blue-200 mt-1 min-h-[20px]" />
        )}
      </div>

      {/* Course content */}
      <div className="flex-1 bg-white rounded-lg p-3 border border-blue-100 shadow-sm mb-1">
        {/* Title + match badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-medium text-gray-900 leading-tight flex-1">
            {course.title}
          </h4>
          <span
            className={`
              shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded
              ${course.score >= 0.8
                ? 'bg-green-100 text-green-700'
                : course.score >= 0.6
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-600'
              }
            `}
          >
            {Math.round((course.score || 0) * 100)}%
          </span>
        </div>

        {/* LLM explanation */}
        {course.llm_explanation && (
          <p className="text-xs text-gray-600 mb-2 italic leading-relaxed">
            {course.llm_explanation}
          </p>
        )}

        {/* Skills covered */}
        {skills_covered && skills_covered.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {skills_covered.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs border border-purple-100"
              >
                <CheckCircle size={10} className="text-purple-500" />
                {skill}
              </span>
            ))}
            {skills_remaining > 0 && (
              <span className="text-xs text-blue-500 self-center">
                +{skills_remaining} còn lại
              </span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {course.fee !== undefined && (
            <span className={isFree ? 'text-green-600 font-medium' : ''}>
              {isFree ? 'Mien phi' : `${(course.fee || 0).toLocaleString('vi-VN')} dong`}
            </span>
          )}
          {course.duration?.value !== undefined && (
            <span>
              {course.duration.value} {course.duration.unit === 'weeks' ? 'tuan' : course.duration.unit}
            </span>
          )}
          {levelLabel && <span>{levelLabel}</span>}
          {course.rating?.average && (
            <span className="flex items-center gap-0.5 text-amber-600">
              <span className="text-amber-500">★</span>
              {course.rating.average} ({course.rating.count})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const LearningPathSkeleton = () => (
  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
    <div className="flex items-center gap-2 mb-4">
      <BookOpenText size={16} className="text-blue-400" />
      <div className="h-4 w-32 bg-blue-200 rounded animate-pulse" />
    </div>
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-blue-200 animate-pulse shrink-0 mt-1" />
          <div className="flex-1 h-20 bg-blue-100 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

export default LearningPathSection;

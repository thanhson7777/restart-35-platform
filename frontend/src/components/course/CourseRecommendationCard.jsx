/**
 * Course Recommendation Card
 * Hiển thị một khóa học gợi ý với feedback buttons (thumbs up/down/dismiss)
 */

import React from 'react'

const LEVEL_LABELS = {
  BEGINNER: 'Sơ cấp',
  INTERMEDIATE: 'Trung cấp',
  ADVANCED: 'Nâng cao',
  beginner: 'Sơ cấp',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
}

const CourseRecommendationCard = ({ course }) => {

  const {
    course_id,
    title,
    score,
    covered_skills = [],
    fee,
    duration,
    level,
    rating,
    thumbnail,
  } = course

  const isFree = fee === 0 || fee === '0' || course.isFree


  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-purple-100">
      {/* Header: title + match badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <a
          href={`/courses/${course_id || course._id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-purple-700 hover:text-purple-900 hover:underline line-clamp-2 flex-1 leading-tight"
        >
          {title}
        </a>

      </div>

      {/* Covered skills */}
      {covered_skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {covered_skills.slice(0, 3).map((skill, i) => (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs"
            >
              {skill}
            </span>
          ))}
          {covered_skills.length > 3 && (
            <span className="text-xs text-purple-500 self-center">
              +{covered_skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-2">
        {fee !== undefined && (
          <span className={isFree ? 'text-green-600 font-medium' : ''}>
            {isFree ? 'Miễn phí' : `${(fee || 0).toLocaleString('vi-VN')} đ`}
          </span>
        )}
        {duration && (
          <span>
            {duration.value} {duration.unit === 'weeks' ? 'tuần' : duration.unit}
          </span>
        )}
        {level && <span>{LEVEL_LABELS[level] || level}</span>}
        {rating?.average && (
          <span className="flex items-center gap-0.5">
            <span className="text-amber-500">★</span>
            {rating.average} ({rating.count})
          </span>
        )}
      </div>


    </div>
  )
}

export default CourseRecommendationCard

/**
 * Course Recommendation Card
 * Hiển thị một khóa học gợi ý với feedback buttons (thumbs up/down/dismiss)
 */

import React, { useState } from 'react'
import { ThumbsUp, ThumbsDown, X } from '@phosphor-icons/react'

const LEVEL_LABELS = {
  BEGINNER: 'Sơ cấp',
  INTERMEDIATE: 'Trung cấp',
  ADVANCED: 'Nâng cao',
  beginner: 'Sơ cấp',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
}

const CourseRecommendationCard = ({ course, onThumbsUp, onThumbsDown, onDismiss }) => {
  const [feedbackSent, setFeedbackSent] = useState(null)

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

  const matchPercent = Math.round((score || 0) * 100)
  const isFree = fee === 0 || fee === '0' || course.isFree

  const handleThumbsUp = (e) => {
    e.stopPropagation()
    if (feedbackSent) return
    setFeedbackSent('up')
    onThumbsUp?.(course)
  }

  const handleThumbsDown = (e) => {
    e.stopPropagation()
    if (feedbackSent) return
    setFeedbackSent('down')
    onThumbsDown?.(course)
  }

  const handleDismiss = (e) => {
    e.stopPropagation()
    if (feedbackSent) return
    setFeedbackSent('dismiss')
    onDismiss?.(course)
  }

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-purple-100">
      {/* Header: title + match badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-xs font-medium text-gray-900 line-clamp-2 flex-1 leading-tight">
          {title}
        </h4>
        <span
          className={`
            shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded
            ${matchPercent >= 80
              ? 'bg-green-100 text-green-700'
              : matchPercent >= 60
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-600'
            }
          `}
        >
          {matchPercent}% phù hợp
        </span>
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

      {/* Feedback bar */}
      <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-400 mr-auto">Hữu ích?</span>

        <button
          onClick={handleThumbsUp}
          disabled={!!feedbackSent}
          title="Hữu ích"
          className={`
            p-1 rounded transition-colors
            ${feedbackSent === 'up'
              ? 'text-green-600 bg-green-50'
              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
            }
          `}
        >
          <ThumbsUp size={13} />
        </button>

        <button
          onClick={handleThumbsDown}
          disabled={!!feedbackSent}
          title="Không phù hợp"
          className={`
            p-1 rounded transition-colors
            ${feedbackSent === 'down'
              ? 'text-red-600 bg-red-50'
              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
            }
          `}
        >
          <ThumbsDown size={13} />
        </button>

        <button
          onClick={handleDismiss}
          disabled={!!feedbackSent}
          title="Bỏ qua"
          className={`
            p-1 rounded transition-colors
            ${feedbackSent === 'dismiss'
              ? 'text-gray-600 bg-gray-100'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }
          `}
        >
          <X size={13} />
        </button>

        {feedbackSent && (
          <span className="text-xs text-green-600 ml-1">Đã gửi</span>
        )}
      </div>
    </div>
  )
}

export default CourseRecommendationCard

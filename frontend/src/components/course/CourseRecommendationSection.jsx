/**
 * Course Recommendation Section
 * Hiển thị danh sách khóa học gợi ý trong career path card
 */

import React from 'react'
import CourseRecommendationCard from './CourseRecommendationCard'
import { BookOpenText, CircleNotch, Warning } from '@phosphor-icons/react'
import { trackFeedbackAPI } from '~/apis/recommendationFeedbackAPI'

const CourseRecommendationSection = ({
  courses = [],
  loading = false,
  skillGapTotal = 0,
  jobTitle = '',
}) => {
  if (loading) {
    return (
      <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500">
        <div className="flex items-center gap-2 mb-3">
                <BookOpenText size={14} className="text-purple-600" />
          <p className="text-sm font-medium text-purple-800">Khóa học gợi ý</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-purple-100 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-purple-600">
          <CircleNotch size={12} className="animate-spin" />
          <span>Đang tìm khóa học phù hợp...</span>
        </div>
      </div>
    )
  }

  if (!loading && courses.length === 0) {
    return (
      <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500">
        <div className="flex items-center gap-2 mb-2">
                <BookOpenText size={14} className="text-purple-600" />
          <p className="text-sm font-medium text-purple-800">Khóa học gợi ý</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-purple-600">
          <Warning size={12} />
          <span>Chưa có khóa học phù hợp cho {skillGapTotal} kỹ năng cần học</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
                <BookOpenText size={14} className="text-purple-600" />
          <p className="text-sm font-medium text-purple-800">Khóa học gợi ý</p>
        </div>
        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
          {courses.length} khóa học
        </span>
      </div>

      <div className="space-y-3">
        {courses.slice(0, 5).map((course) => (
          <CourseRecommendationCard
            key={course.course_id || course._id}
            course={course}
            onThumbsUp={handleThumbsUp}
            onThumbsDown={handleThumbsDown}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  )
}

// ---- Feedback handlers (module-level to avoid recreating on every render) ----

async function handleThumbsUp(course) {
  try {
    await trackFeedbackAPI({
      courseId: course.course_id || course._id,
      courseTitle: course.title,
      action: 'thumbs_up',
      recommendationScore: course.score
    })
  } catch (err) {
    console.error('[CourseRecommendation] thumbs up error:', err)
  }
}

async function handleThumbsDown(course) {
  try {
    await trackFeedbackAPI({
      courseId: course.course_id || course._id,
      courseTitle: course.title,
      action: 'thumbs_down',
      recommendationScore: course.score
    })
  } catch (err) {
    console.error('[CourseRecommendation] thumbs down error:', err)
  }
}

async function handleDismiss(course) {
  try {
    await trackFeedbackAPI({
      courseId: course.course_id || course._id,
      courseTitle: course.title,
      action: 'dismiss',
      recommendationScore: course.score
    })
  } catch (err) {
    console.error('[CourseRecommendation] dismiss error:', err)
  }
}

export default CourseRecommendationSection

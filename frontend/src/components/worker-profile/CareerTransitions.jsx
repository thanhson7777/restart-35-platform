/**
 * CareerTransitions Component
 * 
 * Hiển thị gợi ý chuyển đổi nghề nghiệp cho lao động 35+
 * 
 * Features:
 * - Hiển thị urgency theo độ tuổi
 * - 3 loại transitions: Management, Cross-Industry, Universal
 * - Learning resources cho skill gaps
 */

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCareerTransitions } from '~/redux/ai/aiSlice'
import {
  selectCareerTransitions,
  selectCareerTransitionsLoading,
  selectCareerTransitionsError,
  selectCareerTransitionsUrgency
} from '~/redux/ai/aiSlice'

// Industry name mapping
const INDUSTRY_NAMES = {
  'bao_ve': 'Bảo Vệ & An Ninh',
  'lai_xe': 'Lái Xe & Vận Tải',
  'co_khi': 'Cơ Khí & Sản Xuất',
  'ban_hang': 'Bán Hàng & Kinh Doanh',
  'phuc_vu': 'Phục Vụ & Nhà Hàng',
  'hanh_chinh': 'Hành Chính',
  'nhan_su': 'Nhân Sự & HR',
  'tu_van': 'Tư Vấn',
  'universal': 'Áp dụng mọi ngành'
}

// Urgency colors
const URGENCY_CONFIG = {
  'low': { color: 'text-green-600', bg: 'bg-green-100', label: 'Thấp' },
  'medium': { color: 'text-amber-600', bg: 'bg-amber-100', label: 'Trung bình' },
  'high': { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Cao' },
  'critical': { color: 'text-red-600', bg: 'bg-red-100', label: 'Khẩn cấp' }
}

// Transition type tabs
const TRANSITION_TABS = [
  { key: 'universal', label: 'Áp dụng mọi ngành', icon: '🌟' },
  { key: 'trainer', label: 'Đào tạo viên', icon: '📚' },
  { key: 'consultant', label: 'Tư vấn', icon: '💼' },
  { key: 'coach', label: 'Coach/Mentor', icon: '🎯' },
  { key: 'cross_industry', label: 'Chuyển ngành', icon: '🔄' },
  { key: 'management_track', label: 'Thăng tiến', icon: '📈' }
]

/**
 * CareerTransitions Component
 */
const CareerTransitions = ({ profile }) => {
  const dispatch = useDispatch()
  const transitions = useSelector(selectCareerTransitions)
  const loading = useSelector(selectCareerTransitionsLoading)
  const error = useSelector(selectCareerTransitionsError)
  const urgency = useSelector(selectCareerTransitionsUrgency)
  
  const [activeTab, setActiveTab] = useState('universal')
  const [expandedCard, setExpandedCard] = useState(null)
  
  // Fetch transitions when profile changes
  useEffect(() => {
    if (profile && profile.age && profile.current_role && profile.current_industry) {
      dispatch(fetchCareerTransitions({
        age: profile.age,
        current_role: profile.current_role,
        current_industry: profile.current_industry,
        experience_years: profile.experience_years || profile.experience || 0,
        skills: profile.skills || [],
        target_salary: profile.target_salary,
        transition_types: ['management', 'cross_industry', 'universal'],
        limit: 15
      }))
    }
  }, [profile, dispatch])
  
  // Filter transitions by tab
  const filteredTransitions = transitions.filter(t => {
    if (activeTab === 'universal') {
      return ['trainer', 'consultant', 'coach', 'entrepreneur', 'freelancer'].includes(t.transition?.type)
    }
    return t.transition?.type === activeTab
  })
  
  // Urgency config
  const urgencyConfig = urgency ? URGENCY_CONFIG[urgency.urgency] : null
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Không thể tải gợi ý chuyển đổi nghề: {error}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Urgency Banner */}
      {urgency && (
        <div className={`rounded-lg p-4 ${urgencyConfig?.bg || 'bg-gray-100'}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {urgency.urgency === 'critical' ? '🚨' : urgency.urgency === 'high' ? '⚠️' : 'ℹ️'}
            </span>
            <div>
              <h3 className={`font-semibold ${urgencyConfig?.color || 'text-gray-800'}`}>
                Mức độ khẩn cấp: {urgencyConfig?.label || urgency.urgency}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {urgency.message}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-2 overflow-x-auto pb-2">
          {TRANSITION_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Transitions List */}
      <div className="space-y-4">
        {filteredTransitions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Không có gợi ý cho danh mục này</p>
          </div>
        ) : (
          filteredTransitions.map((item, index) => (
            <TransitionCard
              key={index}
              data={item}
              isExpanded={expandedCard === index}
              onToggle={() => setExpandedCard(expandedCard === index ? null : index)}
            />
          ))
        )}
      </div>
      
      {/* Statistics */}
      {transitions.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Hiển thị {filteredTransitions.length} / {transitions.length} gợi ý
        </div>
      )}
    </div>
  )
}

/**
 * Transition Card Component
 */
const TransitionCard = ({ data, isExpanded, onToggle }) => {
  const transition = data?.transition || data
  const explanation = data?.explanation
  const resources = data?.learning_resources || []
  
  const matchPercent = Math.round((transition?.match_score || 0) * 100)
  const salaryMin = transition?.salary_range?.min || 0
  const salaryMax = transition?.salary_range?.max || 0
  
  // Match score color
  const getMatchColor = (percent) => {
    if (percent >= 80) return 'bg-green-500'
    if (percent >= 60) return 'bg-blue-500'
    if (percent >= 40) return 'bg-amber-500'
    return 'bg-gray-400'
  }
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Card Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50"
      >
        <div className="flex-1 text-left">
          <h4 className="font-medium text-gray-900">
            {transition?.title || 'N/A'}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <span className="px-2 py-0.5 bg-gray-100 rounded">
              {INDUSTRY_NAMES[transition?.target_industry] || transition?.target_industry}
            </span>
            <span>|</span>
            <span>{transition?.timeline_months || 6} tháng</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Match Score */}
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{matchPercent}%</div>
            <div className="text-xs text-gray-500">Phù hợp</div>
          </div>
          
          {/* Expand Icon */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {/* Match Score Bar */}
      <div className="h-1 bg-gray-100">
        <div
          className={`h-full ${getMatchColor(matchPercent)} transition-all`}
          style={{ width: `${matchPercent}%` }}
        />
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 py-4 bg-gray-50 space-y-4">
          {/* Salary */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-1">Mức lương dự kiến</h5>
            <p className="text-lg font-semibold text-green-600">
              {salaryMin / 1e6:.0f} - {salaryMax / 1e6:.0f} triệu VND/tháng
            </p>
          </div>
          
          {/* Pros */}
          {transition?.pros?.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-1">Ưu điểm</h5>
              <ul className="space-y-1">
                {transition.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500">+</span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Cons */}
          {transition?.cons?.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-1">Nhược điểm</h5>
              <ul className="space-y-1">
                {transition.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-red-500">-</span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Skill Gaps */}
          {transition?.skill_gaps?.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Kỹ năng cần học thêm</h5>
              <div className="flex flex-wrap gap-2">
                {transition.skill_gaps.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Learning Resources */}
          {resources.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Khóa học gợi ý</h5>
              <div className="space-y-2">
                {resources.slice(0, 3).map((resource, i) => (
                  <a
                    key={i}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-white rounded border hover:border-blue-300 transition-colors"
                  >
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {resource.platform}
                    </span>
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      {resource.title}
                    </span>
                    {resource.is_free && (
                      <span className="text-xs text-green-600 font-medium">FREE</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {/* Reasoning from LLM */}
          {explanation?.reasoning?.free_text && (
            <div className="bg-blue-50 rounded-lg p-3">
              <h5 className="text-sm font-medium text-blue-700 mb-1">Phân tích chi tiết</h5>
              <p className="text-sm text-gray-600">{explanation.reasoning.free_text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CareerTransitions

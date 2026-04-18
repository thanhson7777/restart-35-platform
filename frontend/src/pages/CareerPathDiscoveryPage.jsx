/**
 * CareerPathDiscoveryPage - Trang khám phá con đường sự nghiệp
 * 
 * Features:
 * - Input form for user profile (age, experiences)
 * - Display career path recommendations
 * - Management track and Age transition sections
 * - AI-powered explanations
 */

import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import {
  selectFormData,
  selectIsCompleted,
  selectCurrentStep
} from '~/redux/profile/profileSlice'
import { selectCurrentUser } from '~/redux/user/userSlice'

import CareerPathCard from '~/components/ai/CareerPathCard'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Industry options
const INDUSTRIES = [
  { value: 'IT', label: 'Công nghệ thông tin' },
  { value: 'manufacturing', label: 'Sản xuất / Cơ khí' },
  { value: 'retail', label: 'Bán lẻ / Kinh doanh' },
  { value: 'service', label: 'Dịch vụ' },
  { value: 'finance', label: 'Tài chính / Ngân hàng' },
  { value: 'education', label: 'Giáo dục / Đào tạo' },
  { value: 'healthcare', label: 'Y tế / Sức khỏe' },
  { value: 'construction', label: 'Xây dựng' },
  { value: 'transport', label: 'Vận tải / Logistics' },
  { value: 'other', label: 'Khác' }
]

// Experience levels
const EXPERIENCE_LEVELS = [
  { value: '0-1', label: 'Dưới 1 năm' },
  { value: '1-3', label: '1-3 năm' },
  { value: '3-5', label: '3-5 năm' },
  { value: '5-8', label: '5-8 năm' },
  { value: '8+', label: 'Trên 8 năm' }
]

const CareerPathDiscoveryPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  // Redux state
  const formData = useSelector(selectFormData)
  const isProfileCompleted = useSelector(selectIsCompleted)
  const currentStep = useSelector(selectCurrentStep)
  const authUser = useSelector(selectCurrentUser)

  // Local state
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [hasFetched, setHasFetched] = useState(false)

  // Form state
  const [age, setAge] = useState(35)
  const [experiences, setExperiences] = useState([
    { industry: 'IT', role: '', years: 5, skills: [] }
  ])
  const [targetSalary, setTargetSalary] = useState('')
  const [workPreference, setWorkPreference] = useState('hybrid')

  // Initialize from Redux store
  useEffect(() => {
    if (formData?.basicInfo?.age) {
      setAge(formData.basicInfo.age)
    }

    if (formData?.employmentHistory && formData.employmentHistory.length > 0) {
      const mapped = formData.employmentHistory.map(job => ({
        industry: job.industry || 'other',
        role: job.title || '',
        years: (job.duration || 0) / 12, // Convert months to years
        skills: job.skills || []
      }))
      if (mapped.length > 0) {
        setExperiences(mapped)
      }
    }
  }, [formData])

  // Calculate total experience
  const totalExperience = experiences.reduce((sum, exp) => sum + exp.years, 0)

  // Get primary industry
  const primaryIndustry = experiences.reduce((max, exp) => 
    exp.years > max.years ? exp : max, experiences[0] || { industry: 'other' }
  )?.industry || 'other'

  // Handle add experience
  const handleAddExperience = () => {
    setExperiences([...experiences, { industry: 'IT', role: '', years: 1, skills: [] }])
  }

  // Handle remove experience
  const handleRemoveExperience = (index) => {
    if (experiences.length > 1) {
      setExperiences(experiences.filter((_, i) => i !== index))
    }
  }

  // Handle update experience
  const handleUpdateExperience = (index, field, value) => {
    const updated = [...experiences]
    updated[index] = { ...updated[index], [field]: value }
    setExperiences(updated)
  }

  // Handle submit
  const handleSubmit = async () => {
    if (age < 18 || age > 70) {
      toast.error('Tuổi phải từ 18 đến 70')
      return
    }

    if (totalExperience === 0) {
      toast.error('Vui lòng nhập ít nhất 1 kinh nghiệm làm việc')
      return
    }

    setIsLoading(true)
    setError(null)
    setHasFetched(true)

    try {
      const requestBody = {
        age,
        experiences: experiences.map(exp => ({
          industry: exp.industry,
          role: exp.role || 'Nhân viên',
          years: exp.years,
          skills: exp.skills
        })),
        target_salary: targetSalary ? parseInt(targetSalary) * 1000000 : null,
        work_preference: workPreference
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/ai/career-path`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error('Failed to fetch career paths')
      }

      const data = await response.json()

      if (data.success) {
        setResults(data.data)
        toast.success('Đã phân tích xong!')
      } else {
        throw new Error(data.message || 'Unknown error')
      }
    } catch (err) {
      console.error('Career path error:', err)
      setError(err.message || 'Có lỗi xảy ra')
      toast.error('Không thể phân tích con đường sự nghiệp')
    } finally {
      setIsLoading(false)
    }
  }

  // Get urgency info for current age
  const getUrgencyInfo = (age) => {
    if (age < 25) return { level: 'low', message: 'Giai đoạn khám phá - Xây dựng nền tảng' }
    if (age < 30) return { level: 'low', message: 'Giai đoạn chuyên môn hóa - Tìm đam mê' }
    if (age < 35) return { level: 'medium', message: 'Giai đoạn ổn định - Chuẩn bị chuyển đổi' }
    if (age < 40) return { level: 'high', message: 'GIAI ĐOẠN VÀNG - Chuyển đổi sự nghiệp!' }
    if (age < 50) return { level: 'critical', message: 'Giai đoạn chuyển đổi cuối cùng - Hành động ngay!' }
    return { level: 'critical', message: 'Giai đoạn ổn định - Tối ưu hóa vị thế' }
  }

  const urgencyInfo = getUrgencyInfo(age)

  // Combine and sort results
  const allPaths = results ? [
    ...(results.management_track || []).map(p => ({ ...p, section: 'management' })),
    ...(results.age_transition || []).map(p => ({ ...p, section: 'age_transition' }))
  ].sort((a, b) => (b.llm_score || b.score) - (a.llm_score || a.score)) : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            Khám phá con đường sự nghiệp
          </h1>
          <p className="text-purple-100 text-lg">
            Tìm hướng đi phù hợp với kinh nghiệm và độ tuổi của bạn
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Profile Summary Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Thông tin của bạn</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{age}</div>
              <div className="text-sm text-gray-600">Tuổi</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{totalExperience.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Năm kinh nghiệm</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-green-600 truncate">
                {INDUSTRIES.find(i => i.value === primaryIndustry)?.label || 'Khác'}
              </div>
              <div className="text-sm text-gray-600">Ngành chính</div>
            </div>
          </div>

          {/* Urgency Alert */}
          <div className={`rounded-lg p-4 ${
            urgencyInfo.level === 'high' || urgencyInfo.level === 'critical' 
              ? 'bg-orange-100 border border-orange-300' 
              : urgencyInfo.level === 'medium'
              ? 'bg-yellow-100 border border-yellow-300'
              : 'bg-green-100 border border-green-300'
          }`}>
            <div className="flex items-center gap-2">
              {urgencyInfo.level === 'high' || urgencyInfo.level === 'critical' ? (
                <span className="text-2xl">⚡</span>
              ) : urgencyInfo.level === 'medium' ? (
                <span className="text-2xl">💡</span>
              ) : (
                <span className="text-2xl">✨</span>
              )}
              <div>
                <div className={`font-semibold ${
                  urgencyInfo.level === 'high' || urgencyInfo.level === 'critical' 
                    ? 'text-orange-800' 
                    : urgencyInfo.level === 'medium'
                    ? 'text-yellow-800'
                    : 'text-green-800'
                }`}>
                  {urgencyInfo.level === 'high' && 'GIAI ĐOẠN VÀNG'}
                  {urgencyInfo.level === 'critical' && 'CẦN HÀNH ĐỘNG NGAY'}
                  {urgencyInfo.level === 'medium' && 'THỜI ĐIỂM TỐT'}
                  {urgencyInfo.level === 'low' && 'GIAI ĐOẠN PHÁT TRIỂN'}
                </div>
                <div className="text-sm">{urgencyInfo.message}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Experiences Input */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Kinh nghiệm làm việc</h2>
            <button
              onClick={handleAddExperience}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
            >
              + Thêm kinh nghiệm
            </button>
          </div>

          <div className="space-y-4">
            {experiences.map((exp, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-700">Công việc {index + 1}</span>
                  {experiences.length > 1 && (
                    <button
                      onClick={() => handleRemoveExperience(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Ngành</label>
                    <select
                      value={exp.industry}
                      onChange={(e) => handleUpdateExperience(index, 'industry', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {INDUSTRIES.map(ind => (
                        <option key={ind.value} value={ind.value}>{ind.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vai trò</label>
                    <input
                      type="text"
                      value={exp.role}
                      onChange={(e) => handleUpdateExperience(index, 'role', e.target.value)}
                      placeholder="VD: Senior Developer"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Số năm</label>
                    <input
                      type="number"
                      value={exp.years}
                      onChange={(e) => handleUpdateExperience(index, 'years', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="50"
                      step="0.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Options */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Mục tiêu (tùy chọn)</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mức lương mong muốn (triệu/tháng)</label>
              <input
                type="number"
                value={targetSalary}
                onChange={(e) => setTargetSalary(e.target.value)}
                placeholder="VD: 30"
                min="1"
                max="500"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Hình thức làm việc</label>
              <select
                value={workPreference}
                onChange={(e) => setWorkPreference(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="onsite">Tại văn phòng</option>
                <option value="hybrid">Hybrid (Kết hợp)</option>
                <option value="remote">Từ xa</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:scale-[1.02]'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Đang phân tích...
            </span>
          ) : (
            'Khám phá con đường sự nghiệp'
          )}
        </button>

        {/* Results Section */}
        {error && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        )}

        {results && (
          <div className="mt-8">
            {/* User Profile Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                Hồ sơ của bạn
              </h3>
              <div className="text-gray-600">
                <p><strong>Tuổi:</strong> {results.user_profile?.age} tuổi</p>
                <p><strong>Kinh nghiệm:</strong> {results.user_profile?.total_experience_years?.toFixed(1)} năm</p>
                <p><strong>Ngành:</strong> {results.user_profile?.primary_industry}</p>
                {results.user_profile?.target_salary && (
                  <p><strong>Mục tiêu lương:</strong> {results.user_profile.target_salary / 1000000}M/tháng</p>
                )}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Scoring: {results.scoring_method === 'llm' ? 'AI-powered' : 'Rule-based'} | 
                AI Available: {results.llm_available ? 'Yes' : 'No'}
              </div>
            </div>

            {/* Advice Section */}
            {results.advice && results.advice.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-bold text-purple-800 mb-3">
                  💡 Lời khuyên từ AI
                </h3>
                <ul className="space-y-2">
                  {results.advice.map((advice, idx) => (
                    <li key={idx} className="text-purple-700 flex items-start gap-2">
                      <span className="text-purple-500 mt-1">→</span>
                      <span>{advice}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Management Track */}
            {results.management_track && results.management_track.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>📈</span> Lộ trình thăng tiến
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.management_track.map((path, idx) => (
                    <CareerPathCard
                      key={`management-${idx}`}
                      path={path}
                      priority={path.llm_priority}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Age Transition */}
            {results.age_transition && results.age_transition.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>🔄</span> Chuyển hướng sự nghiệp
                  {(urgencyInfo.level === 'high' || urgencyInfo.level === 'critical') && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm font-medium">
                      ⚡ GIAI ĐOẠN VÀNG
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.age_transition.map((path, idx) => (
                    <CareerPathCard
                      key={`transition-${idx}`}
                      path={path}
                      priority={path.llm_priority}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Skill Upgrades */}
            {results.skill_upgrades && results.skill_upgrades.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>📚</span> Kỹ năng cần nâng cấp
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {results.skill_upgrades.map((path, idx) => (
                    <CareerPathCard
                      key={`skill-${idx}`}
                      path={path}
                      compact={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {allPaths.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Không tìm thấy gợi ý phù hợp
                </h3>
                <p className="text-gray-500">
                  Hãy điều chỉnh thông tin và thử lại
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CareerPathDiscoveryPage

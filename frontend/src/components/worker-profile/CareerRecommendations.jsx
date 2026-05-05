import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { TrendingUp, AlertTriangle, Zap, ArrowRight, Clock, DollarSign, Target, Loader2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  selectCareerPath,
  selectCareerPathLoading,
  selectCareerPathError,
  selectManagementTrack,
  selectAgeTransition,
  selectSkillUpgrades,
  fetchCareerPath
} from '@/redux/ai/aiSlice'

const UrgencyBadge = ({ urgency }) => {
  const config = {
    low: { label: 'Thấp', bg: 'bg-green-100', text: 'text-green-700', icon: null },
    medium: { label: 'Trung bình', bg: 'bg-amber-100', text: 'text-amber-700', icon: null },
    high: { label: 'Cao', bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle },
    critical: { label: 'Khẩn cấp', bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle }
  }
  
  const { label, bg, text, icon: Icon } = config[urgency] || config.low
  
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', bg, text)}>
      {Icon && <Icon size={12} />}
      {label}
    </span>
  )
}

const PathCard = ({ path, type, index }) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { delay: index * 0.1, duration: 0.3 }
    }
  }
  
  const iconConfig = {
    management: { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
    age_transition: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
    skill_upgrade: { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50' }
  }
  
  const { icon: Icon, color, bg } = iconConfig[type] || iconConfig.management
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center', bg)}>
          <Icon size={20} className={color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-foreground truncate">{path.title}</h4>
            {path.urgency && <UrgencyBadge urgency={path.urgency} />}
          </div>
          
          {path.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {path.description}
            </p>
          )}
          
          {/* Salary & Timeline */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            {path.salary_range?.display && (
              <span className="inline-flex items-center gap-1">
                <DollarSign size={12} />
                {path.salary_range.display}
              </span>
            )}
            {path.timeline_months > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {path.timeline_months} tháng
              </span>
            )}
            {path.score > 0 && (
              <span className="inline-flex items-center gap-1">
                <Target size={12} />
                Score: {path.score.toFixed(1)}
              </span>
            )}
          </div>
          
          {/* LLM Reasoning (if available) */}
          {path.llm_reasoning && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 leading-relaxed">
                {path.llm_reasoning}
              </p>
            </div>
          )}
          
          {/* Missing Skills */}
          {path.missing_skills?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1.5">Cần học thêm:</p>
              <div className="flex flex-wrap gap-1.5">
                {path.missing_skills.slice(0, 4).map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/5 text-primary rounded text-xs"
                  >
                    <ArrowRight size={10} />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Pros/Cons */}
          {(path.pros?.length > 0 || path.cons?.length > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {path.pros?.length > 0 && (
                <div>
                  <p className="text-green-600 font-medium mb-1">Ưu điểm:</p>
                  <ul className="text-slate-600 space-y-0.5">
                    {path.pros.slice(0, 2).map((pro, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-green-500">+</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {path.cons?.length > 0 && (
                <div>
                  <p className="text-amber-600 font-medium mb-1">Lưu ý:</p>
                  <ul className="text-slate-600 space-y-0.5">
                    {path.cons.slice(0, 2).map((con, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-amber-500">!</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const SectionHeader = ({ title, subtitle, icon: Icon, count }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={18} className="text-primary" />}
      <h3 className="font-semibold text-foreground">{title}</h3>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
    {subtitle && (
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    )}
  </div>
)

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <Loader2 size={32} className="text-primary animate-spin mb-3" />
    <p className="text-sm text-muted-foreground">Đang phân tích lộ trình sự nghiệp...</p>
  </div>
)

const EmptyState = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
      <TrendingUp size={24} className="text-slate-400" />
    </div>
    <p className="text-sm text-muted-foreground mb-3">
      Chưa có gợi ý lộ trình sự nghiệp
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-sm text-primary hover:underline"
      >
        Thử lại
      </button>
    )}
  </div>
)

const ErrorState = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
      <AlertTriangle size={24} className="text-red-400" />
    </div>
    <p className="text-sm text-red-600 mb-2">Đã xảy ra lỗi</p>
    <p className="text-xs text-muted-foreground mb-3">{error}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-sm text-primary hover:underline"
      >
        Thử lại
      </button>
    )}
  </div>
)

function CareerRecommendations({ className }) {
  const dispatch = useDispatch()
  const careerPath = useSelector(selectCareerPath)
  const isLoading = useSelector(selectCareerPathLoading)
  const error = useSelector(selectCareerPathError)
  const managementTrack = useSelector(selectManagementTrack)
  const ageTransition = useSelector(selectAgeTransition)
  const skillUpgrades = useSelector(selectSkillUpgrades)
  
  const hasData = managementTrack.length > 0 || ageTransition.length > 0 || skillUpgrades.length > 0
  
  const handleRetry = () => {
    if (careerPath?.user_profile?.age) {
      dispatch(fetchCareerPath({
        age: careerPath.user_profile.age,
        experiences: careerPath.user_profile.experiences || [],
        include_age_transition: true,
        include_management_track: true
      }))
    }
  }
  
  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-xl border border-border p-6', className)}>
        <LoadingState />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={cn('bg-white rounded-xl border border-border p-6', className)}>
        <ErrorState error={error} onRetry={handleRetry} />
      </div>
    )
  }
  
  if (!hasData && !careerPath) {
    return (
      <div className={cn('bg-white rounded-xl border border-border p-6', className)}>
        <EmptyState onRetry={handleRetry} />
      </div>
    )
  }
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Lộ trình sự nghiệp
          </h2>
          {careerPath?.user_profile && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Dựa trên hồ sơ của bạn ({careerPath.user_profile.total_experience_years} năm kinh nghiệm)
            </p>
          )}
        </div>
        {careerPath?.scoring_method && (
          <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded">
            {careerPath.scoring_method === 'llm' ? 'AI-powered' : 'Rule-based'}
          </span>
        )}
      </div>
      
      {/* Management Track */}
      {managementTrack.length > 0 && (
        <div>
          <SectionHeader
            title="Thăng tiến trong nghành"
            subtitle="Lộ trình phát triển sự nghiệp"
            icon={TrendingUp}
            count={managementTrack.length}
          />
          <div className="space-y-3">
            {managementTrack.map((path, index) => (
              <PathCard key={`mgmt-${index}`} path={path} type="management" index={index} />
            ))}
          </div>
        </div>
      )}
      
      {/* Age Transition */}
      {ageTransition.length > 0 && (
        <div>
          <SectionHeader
            title="Chuyển đổi nghề nghiệp"
            subtitle="Phù hợp với độ tuổi"
            icon={AlertTriangle}
            count={ageTransition.length}
          />
          <div className="space-y-3">
            {ageTransition.map((path, index) => (
              <PathCard key={`age-${index}`} path={path} type="age_transition" index={index} />
            ))}
          </div>
        </div>
      )}
      
      {/* Skill Upgrades */}
      {skillUpgrades.length > 0 && (
        <div>
          <SectionHeader
            title="Nâng cấp kỹ năng"
            subtitle="Cần thiết để thăng tiến"
            icon={Zap}
            count={skillUpgrades.length}
          />
          <div className="space-y-3">
            {skillUpgrades.map((path, index) => (
              <PathCard key={`skill-${index}`} path={path} type="skill_upgrade" index={index} />
            ))}
          </div>
        </div>
      )}
      
      {/* AI Advice */}
      {careerPath?.advice?.length > 0 && (
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
          <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <Target size={16} className="text-primary" />
            Lời khuyên từ AI
          </h4>
          <ul className="space-y-2">
            {careerPath.advice.slice(0, 3).map((advice, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-primary font-medium">{i + 1}.</span>
                {advice}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Generated timestamp */}
      {careerPath?.generated_at && (
        <p className="text-xs text-muted-foreground text-center">
          Phân tích lúc: {new Date(careerPath.generated_at).toLocaleString('vi-VN')}
        </p>
      )}
    </div>
  )
}

export default CareerRecommendations

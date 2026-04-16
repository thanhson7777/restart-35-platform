/**
 * SkeletonLoader - Loading state cho AI sections
 */

const SkeletonLoader = ({ type = 'job-card', count = 3 }) => {
  // Job card skeleton với shimmer effect
  const JobCardSkeleton = () => (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 overflow-hidden">
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />

      {/* Header */}
      <div className="flex items-start justify-between mb-3 relative">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-3 mb-3 relative">
        <div className="h-4 bg-gray-100 rounded w-24 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-20 animate-pulse" />
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-3 relative">
        <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-6 w-14 bg-gray-100 rounded-full animate-pulse" />
      </div>

      {/* Action */}
      <div className="h-10 bg-gray-200 rounded-lg animate-pulse relative" />
    </div>
  )

  // Risk badge skeleton
  const RiskBadgeSkeleton = () => (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
      <div className="inline-flex items-center gap-2 relative">
        <div className="h-8 w-32 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="h-4 bg-gray-100 rounded w-full mt-3 animate-pulse" />
    </div>
  )

  // Section skeleton
  const SectionSkeleton = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-24 animate-pulse" />
      </div>

      {/* Risk badge */}
      <div className="mb-4 p-4 bg-white rounded-xl border border-gray-100">
        <RiskBadgeSkeleton />
      </div>

      {/* Job cards */}
      <div className="grid gap-4">
        {[...Array(count)].map((_, index) => (
          <JobCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )

  // Full page skeleton
  const FullPageSkeleton = () => (
    <div className="space-y-6 p-6">
      {/* Welcome section */}
      <div className="bg-white rounded-xl p-6 shadow-sm overflow-hidden relative">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
        <div className="h-8 bg-gray-200 rounded w-64 mb-4 animate-pulse relative" />
        <div className="h-4 bg-gray-100 rounded w-full mb-2 animate-pulse relative" />
        <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse relative" />
      </div>

      {/* AI Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
        <SectionSkeleton />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  )

  switch (type) {
    case 'job-card':
      return <JobCardSkeleton />
    case 'job-cards':
      return (
        <div className="grid gap-4">
          {[...Array(count)].map((_, index) => (
            <JobCardSkeleton key={index} />
          ))}
        </div>
      )
    case 'risk-badge':
      return <RiskBadgeSkeleton />
    case 'section':
      return <SectionSkeleton />
    case 'full-page':
      return <FullPageSkeleton />
    default:
      return <SectionSkeleton />
  }
}

export default SkeletonLoader

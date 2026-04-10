/**
 * SkeletonLoader - Loading state cho AI sections
 */

const SkeletonLoader = ({ type = 'job-card', count = 3 }) => {
  // Job card skeleton
  const JobCardSkeleton = () => (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="h-8 w-16 bg-gray-200 rounded-full" />
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-4 bg-gray-100 rounded w-24" />
        <div className="h-4 bg-gray-100 rounded w-20" />
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="h-6 w-16 bg-gray-100 rounded-full" />
        <div className="h-6 w-20 bg-gray-100 rounded-full" />
        <div className="h-6 w-14 bg-gray-100 rounded-full" />
      </div>

      {/* Action */}
      <div className="h-10 bg-gray-200 rounded-lg" />
    </div>
  )

  // Risk badge skeleton
  const RiskBadgeSkeleton = () => (
    <div className="animate-pulse">
      <div className="inline-flex items-center gap-2">
        <div className="h-8 w-32 bg-gray-200 rounded-full" />
        <div className="h-6 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="h-4 bg-gray-100 rounded w-full mt-3" />
    </div>
  )

  // Section skeleton
  const SectionSkeleton = () => (
    <div className="animate-pulse space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-4 bg-gray-100 rounded w-24" />
      </div>

      {/* Risk badge */}
      <div className="mb-4">
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
    <div className="animate-pulse space-y-6 p-6">
      {/* Welcome section */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="h-8 bg-gray-200 rounded w-64 mb-4" />
        <div className="h-4 bg-gray-100 rounded w-full mb-2" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>

      {/* AI Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
        <SectionSkeleton />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
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

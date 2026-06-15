import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchMyOutcomes,
  fetchMyStats,
  selectOutcomes,
  selectOutcomesLoading,
  selectOutcomesError,
  selectStats,
  selectStatsLoading,
  withdrawOutcome,
} from '@/redux/outcome/outcomeSlice'
import { selectCurrentUser } from '@/redux/user/userSlice'
import { Card, CardContent, Badge, Button } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'

import toast from 'react-hot-toast'
import { Briefcase, MapPin, DollarSign, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STATUS_CONFIG = {
  pending:       { label: 'Chờ duyệt',        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',  icon: Clock },
  interviewing:  { label: 'Đang phỏng vấn',   color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',    icon: TrendingUp },
  hired:         { label: 'Được nhận',         color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  rejected:      { label: 'Bị từ chối',        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',      icon: XCircle },
  withdrawn:     { label: 'Đã rút',             color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',      icon: XCircle },
}

const STATUS_ORDER = ['pending', 'interviewing', 'hired', 'rejected', 'withdrawn']

export default function MyOutcomesPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const currentUser = useSelector(selectCurrentUser)
  const outcomes = useSelector(selectOutcomes)
  const loading = useSelector(selectOutcomesLoading)
  const error = useSelector(selectOutcomesError)
  const stats = useSelector(selectStats)
  const statsLoading = useSelector(selectStatsLoading)

  useEffect(() => {
    if (!currentUser) return
    dispatch(fetchMyOutcomes())
    dispatch(fetchMyStats())
  }, [dispatch, currentUser?._id])

  const handleWithdraw = async (outcomeId) => {
    if (!window.confirm('Bạn có chắc muốn rút đơn ứng tuyển này?')) return
    try {
      await dispatch(withdrawOutcome(outcomeId)).unwrap()
      toast.success('Đã rút đơn ứng tuyển')
      dispatch(fetchMyOutcomes())
    } catch (err) {
      toast.error(err || 'Không thể rút đơn. Vui lòng thử lại.')
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground mb-4">
          Vui lòng đăng nhập để xem đơn ứng tuyển
        </p>
        <Button onClick={() => navigate('/auth')}>Đăng nhập</Button>
      </div>
    )
  }

  // Count by status
  const countByStatus = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = outcomes.filter(o => o.status === s).length
    return acc
  }, {})

  return (
    <>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-border">
          <div className="container mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold text-foreground">Đơn ứng tuyển của tôi</h1>
            <p className="text-muted-foreground mt-1">Theo dõi trạng thái các đơn đã nộp</p>
          </div>
        </div>

        <main className="container mx-auto px-4 py-8 space-y-6">
          {/* Stats Row */}
          {!statsLoading && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {STATUS_ORDER.map(status => {
                const cfg = STATUS_CONFIG[status]
                const count = countByStatus[status] || 0
                return (
                  <Card key={status} className="overflow-hidden">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color}`}>
                        <cfg.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xl font-bold leading-none">{count}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{cfg.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {statsLoading && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <Card className="border-red-200 dark:border-red-900">
              <CardContent className="p-6 text-center">
                <p className="text-red-600 dark:text-red-400 font-medium">Không thể tải danh sách đơn ứng tuyển.</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => { dispatch(fetchMyOutcomes()); dispatch(fetchMyStats()) }}
                >
                  Thử lại
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!loading && !error && outcomes.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold text-lg">Chưa có đơn ứng tuyển nào</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Hãy ứng tuyển một công việc để theo dõi tại đây
                </p>
                <Button onClick={() => navigate('/jobs')}>Tìm việc ngay</Button>
              </CardContent>
            </Card>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24 mt-1" />
                      </div>
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Outcomes List */}
          {!loading && !error && outcomes.length > 0 && (
            <div className="space-y-4">
              {outcomes.map(outcome => {
                const cfg = STATUS_CONFIG[outcome.status] || STATUS_CONFIG.pending
                const Icon = cfg.icon
                return (
                  <Card key={outcome._id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg leading-tight">
                            {outcome.jobTitle || outcome.position || 'Không có tiêu đề'}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {outcome.companyName || outcome.employerName || 'Công ty không xác định'}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                            {outcome.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                {outcome.location}
                              </span>
                            )}
                            {outcome.expectedSalary && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                {typeof outcome.expectedSalary === 'number'
                                  ? `${outcome.expectedSalary.toLocaleString('vi-VN')} VND`
                                  : outcome.expectedSalary}
                              </span>
                            )}
                            {outcome.appliedAt && (
                              <span className="flex items-center gap-1 text-xs">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                {new Date(outcome.appliedAt).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Badge className={`${cfg.color} font-semibold text-xs`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {cfg.label}
                          </Badge>
                          {outcome.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                              onClick={() => handleWithdraw(outcome._id)}
                            >
                              Rút đơn
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </main>
      </div>

    </>
  )
}

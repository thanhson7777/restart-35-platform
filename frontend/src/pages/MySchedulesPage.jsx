import { useState, useEffect } from 'react'
import { getMySchedules } from '@/apis/scheduleApi'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge, Button } from '@/components/ui'
import { Calendar, Clock, Video, MapPin, User, Filter, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const parseSessionTime = (dateValue, timeString) => {
  if (!dateValue || !timeString) return new Date()
  const date = new Date(dateValue)
  const [hours, minutes] = timeString.split(':').map(Number)
  date.setHours(hours, minutes, 0, 0)
  return date
}

const MySchedulesPage = () => {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true)
      try {
        const res = await getMySchedules()
        const data = res.data || res
        const scheduleList = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (data?.schedules || []))
        setSchedules(scheduleList)
      } catch (err) {
        toast.error('Không thể tải lịch học')
      } finally {
        setLoading(false)
      }
    }
    fetchSchedules()
  }, [])

  const now = new Date()
  const filteredSchedules = schedules.filter(schedule => {
    if (filter === 'upcoming') {
      return schedule.sessions?.some(s => parseSessionTime(s.date, s.startTime) > now)
    }
    if (filter === 'past') {
      return schedule.sessions?.every(s => parseSessionTime(s.date, s.startTime) <= now)
    }
    return true
  })

  const getSessionTypeIcon = (session, schedule) => {
    const type = session.location?.type || schedule.sessionType || schedule.location?.type || 'offline';
    if (type === 'online') return <Video size={16} className="text-blue-500 shrink-0 mt-0.5" />
    if (type === 'offline') return <MapPin size={16} className="text-green-500 shrink-0 mt-0.5" />
    if (type === 'hybrid') return <MapPin size={16} className="text-purple-500 shrink-0 mt-0.5" />
    return <Calendar size={16} className="text-gray-500 shrink-0 mt-0.5" />
  }

  const getSessionTypeBadge = (type) => {
    const config = {
      online: { label: 'Trực tuyến', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      offline: { label: 'Tại chỗ', class: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      hybrid: { label: 'Kết hợp', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' }
    }
    const c = config[type] || { label: type, class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
    return <Badge className={c.class}>{c.label}</Badge>
  }

  const getSessionStatusBadge = (session) => {
    const start = parseSessionTime(session.date, session.startTime)
    const end = parseSessionTime(session.date, session.endTime)
    if (now >= start && now <= end) {
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Đang diễn ra</Badge>
    }
    if (now > end) {
      return <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Đã qua</Badge>
    }
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Sắp tới</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải lịch học...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lịch học của tôi</h1>
            <p className="text-muted-foreground mt-1">Xem tất cả lịch học và buổi training</p>
          </div>
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            {['all', 'upcoming', 'past'].map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(f)}
                className="h-8"
              >
                {f === 'all' ? 'Tất cả' : f === 'upcoming' ? 'Sắp tới' : 'Đã qua'}
              </Button>
            ))}
          </div>
        </div>

        {/* Schedule List */}
        {filteredSchedules.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Không có lịch học</h3>
            <p className="text-muted-foreground">Bạn chưa có lịch học nào phù hợp với bộ lọc.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSchedules.map((schedule) => (
              <Card key={schedule._id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{schedule.courseName || schedule.title}</CardTitle>
                      {schedule.trainerName && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <User size={14} /> {schedule.trainerName}
                        </p>
                      )}
                    </div>
                    {getSessionTypeBadge(schedule.sessionType)}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {!schedule.sessions || schedule.sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có buổi học nào.</p>
                  ) : (
                    <div className="space-y-2">
                      {schedule.sessions.map((session, idx) => (
                        <div key={session._id || idx} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                          <div className="flex items-center gap-3">
                            {getSessionTypeIcon(session, schedule)}
                            <div>
                              <p className="text-sm font-medium">Buổi {session.sessionNumber}: {session.title || session.topic || 'Buổi học'}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock size={12} />
                                {new Date(session.date).toLocaleDateString('vi-VN')} | {session.startTime} - {session.endTime}
                              </p>
                              {(() => {
                                const isOnline = session.location?.type === 'online' || schedule.sessionType === 'online' || schedule.location?.type === 'online';
                                const link = session.location?.link || schedule.location?.link;
                                const isTime = now >= new Date(parseSessionTime(session.date, session.startTime).getTime() - 15 * 60000);
                                const isTimeEnded = now > parseSessionTime(session.date, session.endTime);
                                const isEnded = isTimeEnded || session.status === 'completed';
                                const hasAttendance = session.myAttendance && session.myAttendance !== 'upcoming';

                                return (
                                  <div className="flex flex-col gap-2 mt-3">
                                    {/* 1. Attendance Badge */}
                                    {(hasAttendance || isEnded) && (() => {
                                      if (!session.myAttendance || session.myAttendance === 'upcoming') {
                                        return (
                                          <div className="flex items-center gap-1.5 w-fit px-2.5 py-1.5 rounded-md text-[11px] font-bold border bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                            <Clock size={14} />
                                            Đã kết thúc (Chưa điểm danh)
                                          </div>
                                        )
                                      }

                                      const isPresent = session.myAttendance === 'present';
                                      const isLate = session.myAttendance === 'late';
                                      const isExcused = session.myAttendance === 'excused';
                                      
                                      return (
                                        <div className={`flex items-center gap-1.5 w-fit px-2.5 py-1.5 rounded-md text-[11px] font-bold border
                                          ${isPresent ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 
                                            isLate ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                                            isExcused ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
                                            'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                                          {isPresent ? <CheckCircle2 size={14} /> : isLate ? <Clock size={14} /> : isExcused ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                          {isPresent ? 'Đã tham gia' : isLate ? 'Đi trễ' : isExcused ? 'Có phép' : 'Vắng mặt'}
                                        </div>
                                      )
                                    })()}

                                    {/* 2. Action Buttons (Only if not ended) */}
                                    {!isEnded && (
                                      !isOnline ? (() => {
                                        const address = session.location?.address || schedule.location?.address;
                                        if (!address) return null;
                                        return (
                                          <div 
                                            className="text-xs flex items-start gap-1.5 p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 w-fit cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank')}
                                            title="Xem trên bản đồ"
                                          >
                                            <MapPin size={14} className="shrink-0 mt-0.5 text-zinc-500" />
                                            <span className="line-clamp-2 max-w-[280px]">{address}</span>
                                          </div>
                                        );
                                      })() : (
                                        <Button 
                                          variant={isTime ? "default" : "secondary"}
                                          size="sm" 
                                          className="text-xs w-fit h-8"
                                          disabled={!isTime}
                                          onClick={() => link ? window.open(link, '_blank') : toast.error('Chưa có link lớp học')}
                                        >
                                          <Video size={14} className="mr-1.5" /> 
                                          {!isTime ? 'Chưa tới giờ vào lớp' : 'Tham gia buổi học'}
                                        </Button>
                                      )
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getSessionStatusBadge(session)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default MySchedulesPage

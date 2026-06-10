import { useState, useEffect } from 'react'
import { getMySchedules } from '@/apis/scheduleApi'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge, Button } from '@/components/ui'
import { Calendar, Clock, Video, MapPin, User, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

const MySchedulesPage = () => {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true)
      try {
        const res = await getMySchedules()
        setSchedules(res.data || [])
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
      return schedule.sessions?.some(s => new Date(s.startTime) > now)
    }
    if (filter === 'past') {
      return schedule.sessions?.every(s => new Date(s.startTime) <= now)
    }
    return true
  })

  const getSessionTypeIcon = (type) => {
    switch (type) {
      case 'online': return <Video size={16} className="text-blue-500" />
      case 'offline': return <MapPin size={16} className="text-green-500" />
      default: return <Video size={16} className="text-gray-500" />
    }
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
    const start = new Date(session.startTime)
    const end = new Date(session.endTime)
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
      <Navbar />
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
                            {getSessionTypeIcon(schedule.sessionType)}
                            <div>
                              <p className="text-sm font-medium">Buổi {session.sessionNumber}: {session.title || session.topic || 'Buổi học'}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock size={12} />
                                {new Date(session.startTime).toLocaleString('vi-VN')} - {new Date(session.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {session.meetingLink && (
                                <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                  <Video size={12} /> Tham gia buổi học
                                </a>
                              )}
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
      <Footer />
    </div>
  )
}

export default MySchedulesPage

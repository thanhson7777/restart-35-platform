import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/layout/Footer'
import { Card, CardContent } from '@/components/ui'
import { Badge, Button } from '@/components/ui'
import { Avatar } from '@/components/ui'
import { Star, Clock, Calendar, Video, X, CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  pending: { label: 'Cho xac nhan', color: 'bg-amber-100 text-amber-700', icon: Clock },
  confirmed: { label: 'Da xac nhan', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  completed: { label: 'Da hoan thanh', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Da huy', color: 'bg-gray-100 text-gray-600', icon: X },
  no_show: { label: 'Khong di', color: 'bg-red-100 text-red-700', icon: X },
}

const MyMentorSessionsPage = () => {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [cancelId, setCancelId] = useState(null)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [ratingSession, setRatingSession] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`${base}/v1/mentor-sessions/my${params}`)
      const data = await res.json()
      setSessions(data.data || [])
    } catch (err) {
      toast.error('Khong the tai lich')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSessions() }, [filter])

  const handleCancel = async (id) => {
    setSubmitting(true)
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const res = await fetch(`${base}/v1/mentor-sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Da huy lich')
        setCancelId(null)
        fetchSessions()
      }
    } catch (err) {
      toast.error('Huy that bai')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRate = async () => {
    if (!rating || rating < 1 || rating > 5) {
      toast.error('Vui long cho sao')
      return
    }
    setSubmitting(true)
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const res = await fetch(`${base}/v1/mentor-sessions/${ratingSession._id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Cam on ban da danh gia!')
        setRatingSession(null)
        setRating(0)
        setFeedback('')
        fetchSessions()
      }
    } catch (err) {
      toast.error('Gui danh gia that bai')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredSessions = sessions

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Lich Mentor cua toi</h1>
            <p className="text-muted-foreground text-sm mt-1">{sessions.length} buoi</p>
          </div>
          <Button size="sm" onClick={() => navigate('/mentor/booking')}>
            Dat lich moi
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' ? 'Tat ca' : STATUS_CONFIG[f]?.label || f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Chua co lich nao</h3>
            <p className="text-muted-foreground mb-4">Ban chua dat lich voi mentor nao.</p>
            <Button onClick={() => navigate('/mentor/booking')}>Dat lich ngay</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map(session => {
              const cfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.pending
              const ConfigIcon = cfg.icon
              const canCancel = ['pending', 'confirmed'].includes(session.status)
              const canRate = session.status === 'completed' && !session.workerRating

              return (
                <Card key={session._id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar size="md" className="bg-primary/10 text-primary font-bold shrink-0">
                        {session.mentorName?.[0] || 'M'}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{session.mentorName || 'Mentor'}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{session.topic || 'Tu van'}</p>
                          </div>
                          <Badge className={`shrink-0 ${cfg.color}`}>
                            <ConfigIcon size={12} className="mr-1" />
                            {cfg.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(session.scheduledAt).toLocaleDateString('vi-VN')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {new Date(session.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(new Date(session.scheduledAt).getTime() + (session.duration || 60) * 60000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {session.meetingLink && ['pending', 'confirmed'].includes(session.status) && (
                          <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2">
                            <Video size={14} /> Tham gia buoi hoc
                          </a>
                        )}

                        {session.workerRating && (
                          <div className="flex items-center gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} size={14} className={s <= session.workerRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3 justify-end">
                      {canRate && (
                        <Button size="sm" variant="outline" onClick={() => setRatingSession(session)}>
                          <Star size={14} className="mr-1" /> Danh gia
                        </Button>
                      )}
                      {canCancel && (
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setCancelId(session._id)}>
                          Huy lich
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Cancel Confirm Dialog */}
      {cancelId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-bold mb-2">Huy lich?</h3>
              <p className="text-sm text-muted-foreground mb-4">Ban co chac muon huy buoi hoc nay?</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCancelId(null)}>Khong</Button>
                <Button className="flex-1" onClick={() => handleCancel(cancelId)} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Co, huy'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rating Dialog */}
      {ratingSession && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-1">Danh gia buoi hoc</h3>
              <p className="text-sm text-muted-foreground mb-4">Buoi hoc voi {ratingSession.mentorName}</p>
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)} className="p-1 hover:scale-110 transition-transform">
                    <Star size={32} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
                  </button>
                ))}
              </div>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Chia se trai nghiem (tuy chon)..."
                rows={3}
                className="w-full px-4 py-2.5 border rounded-xl text-sm mb-4 resize-none"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setRatingSession(null); setRating(0) }}>Huy</Button>
                <Button className="flex-1" onClick={handleRate} disabled={submitting || rating === 0}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gui danh gia'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default MyMentorSessionsPage

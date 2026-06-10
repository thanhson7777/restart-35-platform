import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/layout/Footer'
import { Card, CardContent } from '@/components/ui'
import { Badge, Button } from '@/components/ui'
import { Avatar } from '@/components/ui'
import { Star, Clock, Calendar, BookOpen, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const EXPERTISE_LABELS = {
  career: 'Nghe nghiep',
  skills: 'Ky nang',
  industry: 'Chuyen nganh',
  resume: 'Hoi lam',
  interview: 'Phong van',
}

const MentorBookingPage = () => {
  const navigate = useNavigate()
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMentor, setSelectedMentor] = useState(null)
  const [booking, setBooking] = useState({ topic: '', scheduledAt: '', duration: 60, notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  const fetchMentors = useCallback(async () => {
    setLoading(true)
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const res = await fetch(`${base}/v1/mentors`)
      const data = await res.json()
      setMentors(data.data || [])
    } catch (err) {
      toast.error('Khong the tai danh sach mentor')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMentors() }, [fetchMentors])

  const handleBooking = async (e) => {
    e.preventDefault()
    if (!selectedMentor || !booking.scheduledAt || !booking.topic.trim()) {
      toast.error('Vui long dien day du thong tin')
      return
    }
    setSubmitting(true)
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const res = await fetch(`${base}/v1/mentor-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: selectedMentor._id,
          topic: booking.topic,
          scheduledAt: booking.scheduledAt,
          duration: parseInt(booking.duration),
          notes: booking.notes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setBookingSuccess(true)
        toast.success('Dat lich thanh cong!')
        setTimeout(() => navigate('/my-mentor-sessions'), 2000)
      } else {
        toast.error(data.message || 'Dat lich that bai')
      }
    } catch (err) {
      toast.error('Dat lich that bai')
    } finally {
      setSubmitting(false)
    }
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Dat lich thanh cong!</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Ban da dat lich voi mentor thanh cong. Lich se duoc gui den mentor de xac nhan.
            </p>
            <Button onClick={() => navigate('/my-mentor-sessions')} className="w-full">
              Xem lich cua toi
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Dat lich Mentor</h1>
          <p className="text-muted-foreground mt-1">Chon mentor va dat lich tu van</p>
        </div>

        {selectedMentor ? (
          /* Booking Form */
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <Avatar size="lg" className="bg-primary/10 text-primary font-bold text-lg">
                  {selectedMentor.userId?.name?.[0] || 'M'}
                </Avatar>
                <div>
                  <h2 className="font-bold text-lg">{selectedMentor.userId?.name || 'Mentor'}</h2>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-medium">{selectedMentor.rating || 0}</span>
                    <span className="text-xs text-muted-foreground">({selectedMentor.sessionCount || 0} buoi)</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMentor(null)} className="ml-auto">
                  Doi mentor
                </Button>
              </div>

              <form onSubmit={handleBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Chu de tu van *</label>
                  <input
                    type="text"
                    value={booking.topic}
                    onChange={e => setBooking(b => ({ ...b, topic: e.target.value }))}
                    placeholder="VD: Huong nghep chuyen nganh CNTT..."
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Ngay & gio *</label>
                    <input
                      type="datetime-local"
                      value={booking.scheduledAt}
                      onChange={e => setBooking(b => ({ ...b, scheduledAt: e.target.value }))}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Thoi luong</label>
                    <select
                      value={booking.duration}
                      onChange={e => setBooking(b => ({ ...b, duration: e.target.value }))}
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="30">30 phut</option>
                      <option value="60">60 phut</option>
                      <option value="90">90 phut</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ghi chu (tuy chon)</label>
                  <textarea
                    value={booking.notes}
                    onChange={e => setBooking(b => ({ ...b, notes: e.target.value }))}
                    placeholder="Mota them ve tinh hinh cua ban..."
                    rows={3}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  Dat lich ngay
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Mentor List */
          <>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : mentors.length === 0 ? (
              <Card className="p-12 text-center">
                <BookOpen size={48} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Chua co mentor</h3>
                <p className="text-muted-foreground">Chua co mentor nao dang ky trong he thong.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mentors.map(mentor => (
                  <Card
                    key={mentor._id}
                    className="hover:border-primary/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedMentor(mentor)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Avatar size="lg" className="bg-primary/10 text-primary font-bold text-lg shrink-0">
                          {mentor.userId?.name?.[0] || 'M'}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <h3 className="font-semibold truncate">{mentor.userId?.name || 'Mentor'}</h3>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-sm font-medium">{mentor.rating || 0}</span>
                            <span className="text-xs text-muted-foreground">({mentor.sessionCount || 0} buoi)</span>
                          </div>
                          {mentor.expertise?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {mentor.expertise.slice(0, 3).map(e => (
                                <Badge key={e} variant="secondary" className="text-[10px]">
                                  {EXPERISE_LABELS[e] || e}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {mentor.userId?.bio && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{mentor.userId.bio}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default MentorBookingPage

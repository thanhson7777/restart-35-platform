import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Calendar, MapPin, Users, ArrowLeft, Building2 } from 'lucide-react'
import { Button } from '~/components/ui'
import { Navbar } from '~/components/landing'
import { fetchEventById, joinEvent, selectCurrentEvent, selectEventDetailLoading, selectEventActionLoading } from '~/redux/event/eventSlice'
import { selectCurrentUser } from '~/redux/user/userSlice'

export default function EventDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const event = useSelector(selectCurrentEvent)
  const loading = useSelector(selectEventDetailLoading)
  const actionLoading = useSelector(selectEventActionLoading)
  const currentUser = useSelector(selectCurrentUser)

  useEffect(() => {
    dispatch(fetchEventById(id))
  }, [dispatch, id])

  const handleJoin = async () => {
    if (!currentUser) {
      toast.error('Vui lòng đăng nhập để tham gia sự kiện')
      navigate('/auth')
      return
    }

    if (currentUser.role !== 'worker') {
      toast.error('Chỉ tài khoản Người lao động (Worker) mới có thể tham gia sự kiện')
      return
    }

    try {
      await dispatch(joinEvent(id)).unwrap()
      toast.success('Đăng ký tham gia thành công')
    } catch (error) {
      toast.error(error || 'Có lỗi xảy ra')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))]"></div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">Không tìm thấy sự kiện</h2>
          <Button onClick={() => navigate('/community')}>Quay lại cộng đồng</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      {/* Cover Image Banner */}
      <div className="w-full h-[300px] md:h-[400px] relative">
        <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-10 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-sm p-6 md:p-8">
            <Button variant="ghost" size="sm" onClick={() => navigate('/community')} className="mb-6 -ml-3 text-[hsl(var(--muted-foreground))]">
              <ArrowLeft size={16} className="mr-2" /> Quay lại
            </Button>

            <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--foreground))] mb-6">{event.title}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-8">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-[hsl(var(--foreground))]">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">{new Date(event.eventDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">{new Date(event.eventDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[hsl(var(--foreground))]">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="font-semibold line-clamp-2">{event.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[hsl(var(--foreground))]">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">{event.participantCount} người</p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">đã đăng ký tham gia</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[hsl(var(--foreground))] mb-4 border-b pb-2">Chi tiết sự kiện</h3>
                  <div className="prose max-w-none text-[hsl(var(--foreground))] whitespace-pre-wrap">
                    {event.description}
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                {/* Action Card */}
                <div className="bg-slate-50 border border-[hsl(var(--border))] rounded-xl p-5 text-center">
                  <h3 className="font-bold text-lg mb-2">Đăng ký tham gia</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">Đăng ký để nhận thông báo và link tham gia sự kiện.</p>
                  
                  {event.isJoined ? (
                    <Button disabled className="w-full bg-emerald-500 text-white cursor-not-allowed opacity-100">
                      Đã đăng ký tham gia
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleJoin} 
                      disabled={actionLoading}
                      className="w-full bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))/90] h-12 text-base"
                    >
                      {actionLoading ? 'Đang xử lý...' : 'Tham gia ngay'}
                    </Button>
                  )}
                </div>

                {/* Organizer Card */}
                <div className="border border-[hsl(var(--border))] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] mb-4 uppercase tracking-wider">Tổ chức bởi</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
                      {event.organizer?.avatar ? (
                        <img src={event.organizer.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium">
                          {event.organizer?.displayName?.charAt(0) || 'N'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-[hsl(var(--foreground))] line-clamp-1">{event.organizer?.displayName || 'Tổ chức NGO'}</h4>
                      <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        <Building2 size={12} /> NGO
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

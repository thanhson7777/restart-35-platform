import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Calendar, Users, MapPin, Plus, ExternalLink, RefreshCw } from 'lucide-react'
import { Button, Badge } from '~/components/ui'
import { fetchEvents, fetchEventParticipants, selectEvents, selectEventsLoading, selectEventParticipants, updateEventParticipantCount } from '~/redux/event/eventSlice'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/Dialog'
import { selectCurrentUser } from '~/redux/user/userSlice'
import { useSocket } from '~/contexts/SocketContext'

export default function NgoEventsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const events = useSelector(selectEvents)
  const loading = useSelector(selectEventsLoading)
  const participants = useSelector(selectEventParticipants)
  const currentUser = useSelector(selectCurrentUser)
  const { socket } = useSocket()

  const [selectedEvent, setSelectedEvent] = useState(null)
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false)

  useEffect(() => {
    if (currentUser?._id) {
      dispatch(fetchEvents({ organizerId: currentUser._id }))
    }
  }, [dispatch, currentUser])

  useEffect(() => {
    if (!socket) return;
    
    const handleParticipantUpdated = (data) => {
      if (data.eventId && data.participantCount !== undefined) {
        dispatch(updateEventParticipantCount({
          eventId: data.eventId,
          participantCount: data.participantCount
        }))
      }
    }

    socket.on('EVENT_PARTICIPANT_UPDATED', handleParticipantUpdated)
    return () => socket.off('EVENT_PARTICIPANT_UPDATED', handleParticipantUpdated)
  }, [socket, dispatch])

  const handleViewParticipants = (event) => {
    setSelectedEvent(event)
    dispatch(fetchEventParticipants({ id: event._id, params: { limit: 100 } }))
    setIsParticipantsModalOpen(true)
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">Quản lý sự kiện</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Tạo và quản lý các sự kiện dành cho cộng đồng người lao động 35+</p>
        </div>
        <Button onClick={() => navigate('/ngo/events/create')} className="gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/90] text-white">
          <Plus size={18} /> Tạo sự kiện mới
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-80 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl">
          <Calendar size={48} className="mx-auto text-[hsl(var(--muted-foreground))] mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">Chưa có sự kiện nào</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">Bạn chưa tạo sự kiện nào cho cộng đồng.</p>
          <Button onClick={() => navigate('/ngo/events/create')} variant="outline" className="gap-2">
            <Plus size={18} /> Tạo sự kiện đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event._id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="h-40 overflow-hidden relative">
                <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
                <Badge className="absolute top-3 right-3 bg-emerald-500/90 text-white border-none">
                  Đã xuất bản
                </Badge>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-3 line-clamp-2">{event.title}</h3>
                
                <div className="space-y-2 mb-4 text-sm text-[hsl(var(--muted-foreground))]">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="shrink-0" />
                    <span>{new Date(event.eventDate).toLocaleString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="shrink-0 mt-0.5" />
                    <span className="line-clamp-1" title={event.location}>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[hsl(var(--primary))] font-medium">
                    <Users size={16} className="shrink-0" />
                    <span>{event.participantCount} người tham gia</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-[hsl(var(--border))] flex justify-between">
                  <Button variant="ghost" size="sm" onClick={() => window.open(`/community/events/${event._id}`, '_blank')} className="gap-2 text-[hsl(var(--muted-foreground))]">
                    <ExternalLink size={16} /> Xem Public
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleViewParticipants(event)} className="gap-2">
                    <Users size={16} /> Danh sách
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isParticipantsModalOpen} onOpenChange={setIsParticipantsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Danh sách người tham gia</DialogTitle>
            <DialogDescription>
              Sự kiện: <span className="font-medium text-[hsl(var(--foreground))]">{selectedEvent?.title}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-3">
            {!participants || participants.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[hsl(var(--muted-foreground))]">Chưa có người đăng ký tham gia sự kiện này.</p>
              </div>
            ) : (
              participants.map((item, index) => (
                <div key={item._id} className="flex items-center gap-4 p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    {item.user?.avatar ? (
                      <img src={item.user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium">
                        {item.user?.displayName?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-[hsl(var(--foreground))] truncate">{item.user?.displayName || 'Người dùng ẩn danh'}</h4>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">{item.user?.email}</p>
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                    Đăng ký lúc: <br />
                    {new Date(item.registeredAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

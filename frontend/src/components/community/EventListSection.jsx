import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, Info } from 'lucide-react'
import { Button } from '~/components/ui'
import { fetchEvents, selectEvents, selectEventsLoading, updateEventParticipantCount } from '~/redux/event/eventSlice'
import { useSocket } from '~/contexts/SocketContext'

export default function EventListSection() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const events = useSelector(selectEvents)
  const loading = useSelector(selectEventsLoading)
  const { socket } = useSocket()

  useEffect(() => {
    dispatch(fetchEvents({})) // Get all published events
  }, [dispatch])

  useEffect(() => {
    if (!socket) return;
    const handleEventCreated = (notification) => {
      dispatch(fetchEvents({}))
    }
    const handleParticipantUpdated = (data) => {
      if (data.eventId && data.participantCount !== undefined) {
        dispatch(updateEventParticipantCount({
          eventId: data.eventId,
          participantCount: data.participantCount
        }))
      }
    }

    socket.on('PUBLIC_EVENT_CREATED', handleEventCreated)
    socket.on('EVENT_PARTICIPANT_UPDATED', handleParticipantUpdated)

    return () => {
      socket.off('PUBLIC_EVENT_CREATED', handleEventCreated)
      socket.off('EVENT_PARTICIPANT_UPDATED', handleParticipantUpdated)
    }
  }, [socket, dispatch])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-80 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-20 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl">
        <Calendar size={48} className="mx-auto text-[hsl(var(--muted-foreground))] mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">Chưa có sự kiện nào</h3>
        <p className="text-[hsl(var(--muted-foreground))]">Hiện tại chưa có sự kiện nào đang diễn ra.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <div key={event._id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <div className="h-40 overflow-hidden">
            <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
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
              <div className="flex items-center gap-2">
                <Users size={16} className="shrink-0" />
                <span>{event.participantCount} người đã đăng ký</span>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-[hsl(var(--border))] flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden shrink-0">
                  {event.organizer?.avatar ? (
                    <img src={event.organizer.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium text-[10px]">
                      {event.organizer?.displayName?.charAt(0) || 'N'}
                    </div>
                  )}
                </div>
                <span className="truncate max-w-[120px]">{event.organizer?.displayName || 'Tổ chức'}</span>
              </div>
              <Button onClick={() => navigate(`/community/events/${event._id}`)} className="gap-2 bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))/90]">
                <Info size={16} /> Xem chi tiết
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { Star, MessageCircle, UserPlus, Loader2 } from 'lucide-react'

const EXPERTISE_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'IT', label: 'IT / Công nghệ' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Kinh doanh', label: 'Kinh doanh' },
  { value: 'Kỹ thuật', label: 'Kỹ thuật' },
  { value: 'Ngôn ngữ', label: 'Ngôn ngữ' },
  { value: 'Tài chính', label: 'Tài chính' },
  { value: 'Thiết kế', label: 'Thiết kế' },
]

export default function MentorFindPage() {
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchMentors = useCallback(async () => {
    setLoading(true)
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const params = new URLSearchParams({ page, limit: '20' })
      if (filter) params.set('expertise', filter)
      const res = await fetch(`${base}/v1/mentors?${params}`)
      const data = await res.json()
      setMentors(data.data || [])
      setTotal(data.pagination?.total || 0)
    } catch (err) {
      console.warn('Mentor fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => {
    fetchMentors()
  }, [fetchMentors])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tìm Mentor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} mentor đang hoạt động` : 'Kết nối với người có kinh nghiệm'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Đăng ký làm Mentor
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {EXPERTISE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => { setFilter(opt.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Mentor grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-full bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : mentors.length === 0 ? (
          <div className="md:col-span-2 flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Star className="w-6 h-6 text-primary/60" />
            </div>
            <p className="font-medium">Chưa có mentor nào</p>
            <p className="text-xs text-muted-foreground mt-1">
              Trở thành mentor đầu tiên của cộng đồng
            </p>
          </div>
        ) : mentors.map(mentor => (
          <Card
            key={mentor._id}
            className="hover:border-primary/40 transition-colors"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-lg font-semibold text-primary">
                  {mentor.userId?.name?.[0]?.toUpperCase() || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name & Rating */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold leading-tight">
                        {mentor.userId?.name || 'Mentor'}
                      </h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < Math.round(mentor.rating || 0)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-zinc-300 dark:text-zinc-600'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">
                          {mentor.rating?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({mentor.sessionCount || 0} buổi)
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                      {mentor.availability || 'available'}
                    </Badge>
                  </div>

                  {/* Expertise */}
                  {mentor.expertise?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {mentor.expertise.map(skill => (
                        <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Bio */}
                  {mentor.bio && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {mentor.bio}
                    </p>
                  )}

                  {/* CTA */}
                  <Button size="sm" className="w-full mt-3 gap-2">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Liên hệ Mentor
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Trang trước
          </Button>
          <span className="flex items-center px-3 text-xs text-muted-foreground">Trang {page}</span>
          <Button variant="outline" size="sm" disabled={mentors.length < 20} onClick={() => setPage(p => p + 1)}>
            Trang sau
          </Button>
        </div>
      )}
    </div>
  )
}

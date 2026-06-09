import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  ThumbsUp,
  MessageCircle,
  Plus,
  Search,
  Pin,
  Loader2,
} from 'lucide-react'

const CATEGORIES = [
  { value: 'all', label: 'Tất cả' },
  { value: 'general', label: 'Chung' },
  { value: 'career', label: 'Nghề nghiệp' },
  { value: 'skills', label: 'Kỹ năng' },
  { value: 'mentor', label: 'Hỏi Mentor' },
]

const CATEGORY_BADGE = {
  general: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  career:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  skills:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  mentor:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export default function ForumPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [reactingId, setReactingId] = useState(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const params = new URLSearchParams()
      if (category !== 'all') params.set('category', category)
      params.set('page', page)
      params.set('limit', '20')
      const res = await fetch(`${base}/v1/forum/posts?${params}`)
      const data = await res.json()
      setPosts(data.data || [])
      setTotal(data.pagination?.total || 0)
    } catch (err) {
      console.warn('Forum fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [category, page])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleReact = async (postId, type) => {
    if (reactingId) return
    setReactingId(postId)
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const res = await fetch(`${base}/v1/forum/posts/${postId}/react`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (data.success) {
        setPosts(prev => prev.map(p => p._id === postId ? { ...p, reactions: data.data.reactions } : p))
      }
    } catch (err) {
      console.warn('React error:', err)
    } finally {
      setReactingId(null)
    }
  }

  const filteredPosts = search
    ? posts.filter(p =>
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.content?.toLowerCase().includes(search.toLowerCase())
      )
    : posts

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Diễn đàn</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} bài viết` : 'Cộng đồng người lao động'}
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Đăng bài
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm bài viết..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                category === cat.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <MessageCircle className="w-6 h-6 text-primary/60" />
              </div>
              <p className="font-medium">Chưa có bài viết nào</p>
              <p className="text-xs text-muted-foreground mt-1">Hãy là người đầu tiên đăng bài</p>
            </CardContent>
          </Card>
        ) : filteredPosts.map(post => (
          <Card
            key={post._id}
            className="hover:border-primary/40 transition-colors cursor-pointer group"
          >
            <CardContent className="p-5">
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
                  {post.authorId?.name?.[0]?.toUpperCase() || '?'}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Meta */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.isPinned && (
                      <Pin className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_BADGE[post.category] || CATEGORY_BADGE.general}`}>
                      {post.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {post.authorId?.name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-muted-foreground/50">·</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(post.createdAt)}
                    </span>
                  </div>

                  {/* Title & Content */}
                  <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>

                  {/* Tags */}
                  {post.tags?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {post.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Reactions */}
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReact(post._id, 'thumbsUp') }}
                      disabled={reactingId === post._id}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                        reactingId === post._id
                          ? 'text-muted-foreground'
                          : 'hover:text-blue-600'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {post.reactions?.thumbsUp || 0}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReact(post._id, 'thumbsDown') }}
                      disabled={reactingId === post._id}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 rotate-180" />
                      {post.reactions?.thumbsDown || 0}
                    </button>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {post.commentCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Trang trước
          </Button>
          <span className="flex items-center px-3 text-xs text-muted-foreground">
            Trang {page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filteredPosts.length < 20}
            onClick={() => setPage(p => p + 1)}
          >
            Trang sau
          </Button>
        </div>
      )}
    </div>
  )
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'Vừa đăng'
  if (diffMins < 60) return `${diffMins} phút trước`
  if (diffHours < 24) return `${diffHours} giờ trước`
  if (diffDays < 7) return `${diffDays} ngày trước`
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })
}

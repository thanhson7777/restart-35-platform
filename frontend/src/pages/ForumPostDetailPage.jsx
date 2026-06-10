import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge, Button } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui'
import { ArrowLeft, ThumbsUp, MessageCircle, Loader2, Pin, Send } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORY_BADGE = {
  general: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  career:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  skills:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  mentor:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  if (days < 30) return `${days} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

const ForumPostDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [reactingId, setReactingId] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  const fetchPost = useCallback(async () => {
    setLoading(true)
    try {
      const [postRes, commentsRes] = await Promise.all([
        fetch(`${API_BASE}/v1/forum/posts/${id}`),
        fetch(`${API_BASE}/v1/forum/posts/${id}/comments`),
      ])
      const [postData, commentsData] = await Promise.all([postRes.json(), commentsRes.json()])
      setPost(postData.data || postData)
      setComments(commentsData.data || [])
    } catch (err) {
      toast.error('Không thể tải bài viết')
    } finally {
      setLoading(false)
    }
  }, [id, API_BASE])

  useEffect(() => { fetchPost() }, [fetchPost])

  const handleReact = async (type) => {
    if (reactingId) return
    setReactingId(type)
    try {
      const res = await fetch(`${API_BASE}/v1/forum/posts/${id}/react`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (data.success) {
        setPost(prev => ({ ...prev, reactions: data.data.reactions }))
      }
    } catch (err) {
      console.warn('React error:', err)
    } finally {
      setReactingId(null)
    }
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`${API_BASE}/v1/forum/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      })
      const data = await res.json()
      if (data.success) {
        setComments(prev => [...prev, data.data])
        setPost(prev => ({ ...prev, commentCount: (prev.commentCount || 0) + 1 }))
        setNewComment('')
        toast.success('Đã đăng bình luận')
      }
    } catch (err) {
      toast.error('Không thể gửi bình luận')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Không tìm thấy bài viết</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/forum')}>
          <ArrowLeft size={16} className="mr-2" /> Quay lại diễn đàn
        </Button>
      </div>
    )
  }

  const categoryLabel = {
    general: 'Chung', career: 'Nghề nghiệp', skills: 'Kỹ năng', mentor: 'Hỏi Mentor'
  }[post.category] || post.category

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/forum')} className="mb-4">
          <ArrowLeft size={16} className="mr-1" /> Quay lại diễn đàn
        </Button>

        <div className="space-y-6">
          {/* Post Card */}
          <Card>
            <CardContent className="p-6">
              {/* Author + Meta */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar size="md" className="bg-primary/10 text-primary font-semibold">
                  {post.authorId?.name?.[0]?.toUpperCase() || '?'}
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{post.authorId?.name || 'Anonymous'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(post.createdAt)}
                    {post.isPinned && <Pin className="inline w-3 h-3 ml-2 text-amber-500" />}
                  </p>
                </div>
                <Badge className={`ml-auto text-xs ${CATEGORY_BADGE[post.category] || CATEGORY_BADGE.general}`}>
                  {categoryLabel}
                </Badge>
              </div>

              {/* Title */}
              <h1 className="text-xl font-bold mb-3">{post.title}</h1>

              {/* Content */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{post.content}</p>
              </div>

              {/* Tags */}
              {post.tags?.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">#{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Reactions */}
              <div className="flex items-center gap-4 mt-5 pt-4 border-t">
                <button
                  onClick={() => handleReact('thumbsUp')}
                  disabled={reactingId === 'thumbsUp'}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${reactingId === 'thumbsUp' ? 'text-muted-foreground' : 'hover:text-blue-600'}`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  {post.reactions?.thumbsUp || 0}
                </button>
                <button
                  onClick={() => handleReact('thumbsDown')}
                  disabled={reactingId === 'thumbsDown'}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <ThumbsUp className="w-4 h-4 rotate-180" />
                  {post.reactions?.thumbsDown || 0}
                </button>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  {comments.length} bình luận
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bình luận ({comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comment Form */}
              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <Input
                  placeholder="Viết bình luận..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={submittingComment || !newComment.trim()}>
                  {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>

              {/* Comments List */}
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Chưa có bình luận nào.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map(comment => (
                    <div key={comment._id} className="flex gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                      <Avatar size="sm" className="bg-primary/10 text-primary font-semibold text-xs shrink-0">
                        {comment.authorId?.name?.[0]?.toUpperCase() || '?'}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{comment.authorId?.name || 'Anonymous'}</span>
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-foreground/80">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default ForumPostDetailPage

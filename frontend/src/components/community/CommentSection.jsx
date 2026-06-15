import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { forumApi } from '@/apis/forumApi'
import { Button } from '@/components/ui'
import { Send, User } from 'lucide-react'
import { toast } from 'react-toastify'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function CommentSection({ postId, isExpanded, onCommentAdded }) {
  const currentUser = useSelector(state => state.user.currentUser)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isExpanded) {
      fetchComments()
    }
  }, [isExpanded, postId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const res = await forumApi.getComments(postId)
      if (res.data?.success) {
        setComments(res.data.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!content.trim()) return
    try {
      setSubmitting(true)
      const res = await forumApi.createComment(postId, { content })
      if (res.data?.success) {
        setComments(res.data.data) // Assuming backend returns full comment list
        setContent('')
        if (onCommentAdded) onCommentAdded()
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi gửi bình luận')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isExpanded) return null

  return (
    <div className="pt-4 mt-4 border-t border-[hsl(var(--admin-border))] space-y-4">
      
      {/* List comments */}
      {loading ? (
        <div className="text-sm text-[hsl(var(--admin-text-muted))] text-center py-2">Đang tải bình luận...</div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-[hsl(var(--admin-text-muted))] text-center py-2 bg-slate-50 rounded-lg">Chưa có bình luận nào. Hãy là người đầu tiên!</div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment._id} className="flex gap-3">
              <img 
                src={comment.author?.avatar || 'https://ui-avatars.com/api/?name=' + (comment.author?.displayName || 'U')} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 bg-[hsl(var(--admin-surface-hover))] rounded-2xl rounded-tl-none p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-[hsl(var(--admin-text-primary))]">
                    {comment.author?.displayName}
                  </span>
                  <span className="text-[11px] text-[hsl(var(--admin-text-muted))]">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                  </span>
                </div>
                <p className="text-sm text-[hsl(var(--admin-text-secondary))] whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input box */}
      {currentUser ? (
        <div className="flex gap-3 pt-2">
          <img 
            src={currentUser.avatar || 'https://ui-avatars.com/api/?name=' + (currentUser.displayName || 'U')} 
            alt="Avatar" 
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Viết bình luận..."
              className="w-full min-h-[40px] max-h-[120px] py-2.5 pl-4 pr-12 text-sm bg-[hsl(var(--admin-surface-elevated))] border-none rounded-2xl focus:ring-1 focus:ring-[hsl(var(--admin-accent))] resize-y"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            <button 
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="absolute right-2 bottom-2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-center py-3 bg-[hsl(var(--admin-surface-hover))] rounded-xl text-[hsl(var(--admin-text-muted))]">
          Vui lòng đăng nhập để bình luận
        </div>
      )}
    </div>
  )
}

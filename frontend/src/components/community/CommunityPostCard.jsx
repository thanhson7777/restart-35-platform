import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Heart, MessageCircle, Share2, MoreHorizontal, Building2, GraduationCap, HeartHandshake } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { forumApi } from '@/apis/forumApi'
import CommentSection from './CommentSection'
import { toast } from 'react-toastify'

const ROLE_BADGES = {
  enterprise: { icon: Building2, label: 'Doanh nghiệp', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  trainer: { icon: GraduationCap, label: 'Trainer', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  ngo: { icon: HeartHandshake, label: 'Tổ chức', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  worker: { icon: null, label: '', color: '', bg: '', border: '' } // No special badge for worker to keep it clean
}

export default function CommunityPostCard({ post, onUpdate }) {
  const currentUser = useSelector(state => state.user.currentUser)
  const [isLiked, setIsLiked] = useState(post.likedBy?.includes(currentUser?._id))
  const [likeCount, setLikeCount] = useState(post.reactions?.thumbsUp || 0)
  const [commentCount, setCommentCount] = useState(post.commentCount || 0)
  const [showComments, setShowComments] = useState(false)

  const handleLike = async () => {
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để thích bài viết')
      return
    }

    try {
      // Optimistic update
      setIsLiked(!isLiked)
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
      
      await forumApi.reactToPost(post._id)
    } catch (error) {
      // Revert on error
      setIsLiked(isLiked)
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
      toast.error('Có lỗi xảy ra')
    }
  }

  const roleInfo = ROLE_BADGES[post.author?.role] || ROLE_BADGES.worker
  const RoleIcon = roleInfo.icon

  return (
    <div className="bg-[hsl(var(--admin-surface))] rounded-2xl p-5 border border-[hsl(var(--admin-border))] shadow-sm hover:shadow-md transition-shadow">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <img 
            src={post.author?.avatar || 'https://ui-avatars.com/api/?name=' + (post.author?.displayName || 'U')} 
            alt="Avatar" 
            className="w-11 h-11 rounded-full object-cover border border-slate-100"
          />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-[hsl(var(--admin-text-primary))]">
                {post.author?.displayName}
              </h4>
              {roleInfo.label && (
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${roleInfo.bg} ${roleInfo.color} ${roleInfo.border}`}>
                  {RoleIcon && <RoleIcon size={10} />}
                  {roleInfo.label}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--admin-text-muted))]">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}</span>
              {post.category && (
                <>
                  <span>•</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-600 font-medium">{post.category.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <button className="p-1.5 text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-full transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="mb-4">
        {post.title && <h3 className="font-semibold text-lg text-[hsl(var(--admin-text-primary))] mb-2">{post.title}</h3>}
        <p className="text-[15px] leading-relaxed text-[hsl(var(--admin-text-secondary))] whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Stats */}
      {(likeCount > 0 || commentCount > 0) && (
        <div className="flex items-center justify-between py-2 text-xs text-[hsl(var(--admin-text-muted))] border-b border-[hsl(var(--admin-border))] mb-1">
          <div className="flex items-center gap-1.5">
            {likeCount > 0 && (
              <>
                <div className="bg-rose-100 p-1 rounded-full text-rose-500">
                  <Heart size={10} weight="fill" className="fill-current" />
                </div>
                <span>{likeCount} người thích</span>
              </>
            )}
          </div>
          <div>
            {commentCount > 0 && <span>{commentCount} bình luận</span>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button 
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors ${
            isLiked 
              ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' 
              : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
          }`}
        >
          <Heart size={18} className={isLiked ? 'fill-current' : ''} />
          Thích
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors ${
            showComments
              ? 'text-blue-600 bg-blue-50'
              : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
          }`}
        >
          <MessageCircle size={18} />
          Bình luận
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))] transition-colors">
          <Share2 size={18} />
          Chia sẻ
        </button>
      </div>

      {/* Comments */}
      <CommentSection 
        postId={post._id} 
        isExpanded={showComments} 
        onCommentAdded={() => setCommentCount(prev => prev + 1)}
      />

    </div>
  )
}

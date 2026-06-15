import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Button, Input } from '@/components/ui'
import { Image, X } from 'lucide-react'
import { forumApi } from '@/apis/forumApi'
import { toast } from 'react-toastify'

export default function CreatePostForm({ categories, onPostCreated }) {
  const currentUser = useSelector(state => state.user.currentUser)
  const [isExpanded, setIsExpanded] = useState(false)
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return
    
    try {
      setLoading(true)
      const res = await forumApi.createPost({
        content,
        categoryId: categoryId || null
      })
      if (res.data?.success) {
        toast.success('Đăng bài thành công!')
        setContent('')
        setCategoryId('')
        setIsExpanded(false)
        if (onPostCreated) {
          onPostCreated(res.data.data)
        }
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi đăng bài')
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] rounded-2xl p-4 border border-[hsl(var(--admin-border))] shadow-sm mb-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0" />
        <div className="text-[hsl(var(--admin-text-muted))] text-sm">
          Vui lòng đăng nhập để chia sẻ kinh nghiệm...
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[hsl(var(--admin-surface))] rounded-2xl p-4 border border-[hsl(var(--admin-border))] shadow-sm mb-6">
      <div className="flex gap-3">
        <img 
          src={currentUser.avatar || 'https://ui-avatars.com/api/?name=' + (currentUser.displayName || 'U')} 
          alt="Avatar" 
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1">
          {!isExpanded ? (
            <div 
              onClick={() => setIsExpanded(true)}
              className="w-full bg-[hsl(var(--admin-surface-hover))] rounded-full py-2.5 px-4 text-sm text-[hsl(var(--admin-text-muted))] cursor-text hover:bg-[hsl(var(--admin-surface-elevated))] transition-colors"
            >
              Bạn muốn chia sẻ điều gì hôm nay?
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Chia sẻ kinh nghiệm, đặt câu hỏi hoặc kể câu chuyện của bạn..."
                className="w-full min-h-[120px] p-3 text-[15px] leading-relaxed bg-[hsl(var(--admin-surface-hover))] rounded-xl border-none focus:ring-1 focus:ring-[hsl(var(--admin-accent))] resize-y"
                autoFocus
              />
              
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[hsl(var(--admin-border))]">
                <div className="flex items-center gap-3">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="text-sm bg-[hsl(var(--admin-surface-elevated))] border-none rounded-lg px-3 py-1.5 text-[hsl(var(--admin-text-secondary))] cursor-pointer focus:ring-1 focus:ring-[hsl(var(--admin-accent))]"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                  
                  <button className="p-2 text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-surface-elevated))] rounded-full transition-colors">
                    <Image size={18} />
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setIsExpanded(false)
                      setContent('')
                    }}
                    className="text-[hsl(var(--admin-text-muted))]"
                  >
                    Hủy
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSubmit}
                    disabled={!content.trim() || loading}
                    className="rounded-full px-5 font-semibold shadow-sm"
                  >
                    Đăng bài
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

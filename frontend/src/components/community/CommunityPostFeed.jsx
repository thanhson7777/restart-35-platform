import { useState, useEffect } from 'react'
import { forumApi } from '@/apis/forumApi'
import CommunityPostCard from './CommunityPostCard'
import CreatePostForm from './CreatePostForm'
import { Skeleton } from '@/components/ui'
import { FileQuestion } from 'lucide-react'

export default function CommunityPostFeed({ categories, activeCategoryId }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    setPage(1)
    setPosts([])
    fetchPosts(1, true)
  }, [activeCategoryId])

  const fetchPosts = async (pageNum, reset = false) => {
    try {
      setLoading(true)
      const res = await forumApi.getPosts({
        categoryId: activeCategoryId || undefined,
        page: pageNum,
        limit: 10
      })
      if (res.data?.success) {
        const newPosts = res.data.data
        if (reset) {
          setPosts(newPosts)
        } else {
          setPosts(prev => [...prev, ...newPosts])
        }
        setHasMore(res.data.pagination?.page * res.data.pagination?.limit < res.data.pagination?.total)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPosts(nextPage)
  }

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev])
  }

  return (
    <div className="w-full">
      {/* Create Post Section */}
      <CreatePostForm categories={categories} onPostCreated={handlePostCreated} />

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map(post => (
          <CommunityPostCard key={post._id} post={post} />
        ))}
        
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-[hsl(var(--admin-surface))] rounded-2xl p-5 border border-[hsl(var(--admin-border))] h-40 flex flex-col gap-3">
                <div className="flex gap-3 items-center">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full mt-2" />
              </div>
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-[hsl(var(--admin-surface))] border border-dashed border-[hsl(var(--admin-border))] rounded-2xl">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <FileQuestion size={32} />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))] mb-2">Chưa có bài viết nào</h3>
            <p className="text-[hsl(var(--admin-text-muted))] max-w-sm mb-6">
              Hãy là người đầu tiên chia sẻ kinh nghiệm hoặc đặt câu hỏi trong chuyên mục này nhé!
            </p>
          </div>
        )}

        {hasMore && !loading && (
          <div className="text-center pt-4 pb-8">
            <button
              onClick={handleLoadMore}
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-full text-sm transition-colors"
            >
              Tải thêm bài viết
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Heart, MessageCircle, Trash2, AlertCircle, FileText } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { forumApi } from '@/apis/forumApi';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog';

export default function WorkerPostsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ totalPosts: 0, totalLikes: 0, totalComments: 0 });
  const [loading, setLoading] = useState(true);
  
  // Pagination (Simple)
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Delete Confirm Modal
  const [confirmModal, setConfirmModal] = useState({ open: false, postId: null });
  const [deleting, setDeleting] = useState(false);

  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const res = await forumApi.getMyPosts({ page: pageNum, limit: 10 });
      
      if (res.data && res.data.data) {
        setPosts(prev => append ? [...prev, ...res.data.data] : res.data.data);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
        setHasMore(res.data.data.length === 10);
      }
    } catch (error) {
      toast.error('Không thể tải bài viết');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, false);
  }, [fetchPosts]);

  const loadMore = () => {
    setPage(p => p + 1);
    fetchPosts(page + 1, true);
  };

  const handleDelete = async () => {
    if (!confirmModal.postId) return;
    setDeleting(true);
    try {
      await forumApi.deletePost(confirmModal.postId);
      toast.success('Xóa bài viết thành công');
      setConfirmModal({ open: false, postId: null });
      // Refresh list
      setPage(1);
      fetchPosts(1, false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xóa bài viết thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = (e, postId) => {
    e.stopPropagation();
    setConfirmModal({ open: true, postId });
  };

  return (
    <>
      <div className="max-w-6xl space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">Bài viết của tôi</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Quản lý và theo dõi tương tác các bài viết bạn đã đăng trên cộng đồng.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">Tổng bài viết</p>
                <p className="text-2xl font-bold">{stats.totalPosts}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg text-red-600">
                <Heart size={24} />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">Tổng lượt thích</p>
                <p className="text-2xl font-bold">{stats.totalLikes}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                <MessageCircle size={24} />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">Tổng bình luận</p>
                <p className="text-2xl font-bold">{stats.totalComments}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Posts List */}
        {loading && posts.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-[hsl(var(--card))] border rounded-xl">
            <MessageSquare size={48} className="mx-auto text-[hsl(var(--muted))] mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">
              Bạn chưa đăng bài viết nào trên cộng đồng.
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate('/community/forum')}
            >
              Đến Diễn đàn
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div
                key={post._id}
                className="bg-[hsl(var(--card))] border rounded-xl p-5 hover:border-[hsl(var(--primary))] transition-all cursor-pointer"
                onClick={() => navigate(`/community/forum/${post._id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                        {post.category?.name || 'Chung'}
                      </span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {new Date(post.createdAt).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[hsl(var(--foreground))] line-clamp-2">
                      {post.title}
                    </h3>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => openDeleteModal(e, post._id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 mb-4">
                  {post.content}
                </p>

                <div className="flex items-center gap-6 text-sm text-[hsl(var(--muted-foreground))]">
                  <span className="flex items-center gap-1.5">
                    <Heart size={16} /> {post.reactions?.thumbsUp || 0} lượt thích
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle size={16} /> {post.commentCount || 0} bình luận
                  </span>
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading ? 'Đang tải...' : 'Xem thêm'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      <Dialog open={confirmModal.open} onOpenChange={(open) => !open && setConfirmModal({ open: false, postId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={18} />
              Xác nhận xóa bài viết
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmModal({ open: false, postId: null })}>
              Hủy
            </Button>
            <Button onClick={handleDelete} disabled={deleting} variant="destructive" className="gap-2">
              {deleting ? 'Đang xóa...' : 'Xóa bài viết'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

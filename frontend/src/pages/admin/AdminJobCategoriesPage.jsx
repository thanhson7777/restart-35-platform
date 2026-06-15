import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Button, Input, Card, CardContent, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import { getJobCategoriesAPI, createJobCategoryAPI, updateJobCategoryAPI, deleteJobCategoryAPI } from '@/apis/jobCategoryApi';

const POPULAR_ICONS = [
  { value: '', label: 'Không có icon' },
  { value: 'Briefcase', label: 'Briefcase (Cặp xách)' },
  { value: 'Monitor', label: 'Monitor (Máy tính)' },
  { value: 'Code', label: 'Code (Lập trình)' },
  { value: 'PenTool', label: 'PenTool (Thiết kế)' },
  { value: 'LineChart', label: 'LineChart (Biểu đồ)' },
  { value: 'Megaphone', label: 'Megaphone (Marketing)' },
  { value: 'HeartPulse', label: 'HeartPulse (Sức khỏe)' },
  { value: 'Globe', label: 'Globe (Ngôn ngữ)' },
  { value: 'Video', label: 'Video (Quay phim)' },
  { value: 'Cpu', label: 'Cpu (Phần cứng/AI)' },
  { value: 'Camera', label: 'Camera (Nhiếp ảnh)' },
  { value: 'Music', label: 'Music (Âm nhạc)' },
  { value: 'Calculator', label: 'Calculator (Kế toán)' },
  { value: 'Users', label: 'Users (Nhân sự)' },
  { value: 'Shield', label: 'Shield (Bảo mật)' },
  { value: 'Wrench', label: 'Wrench (Cơ khí/Bảo trì)' },
  { value: 'Building2', label: 'Building (Xây dựng)' },
  { value: 'Truck', label: 'Truck (Vận tải)' },
];

const AdminJobCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', icon: '', order: 0, isActive: true });
  const [formLoading, setFormLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getJobCategoriesAPI(true); // includeInactive
      if (res.success) {
        setCategories(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching job categories:', error);
      toast.error('Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreate = () => {
    setSelectedCategory(null);
    setFormData({ name: '', description: '', icon: '', order: categories.length, isActive: true });
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setFormData({ 
      name: category.name, 
      description: category.description || '', 
      icon: category.icon || '', 
      order: category.order || 0, 
      isActive: category.isActive 
    });
    setShowModal(true);
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${category.name}"?`)) return;
    try {
      await deleteJobCategoryAPI(category._id);
      toast.success('Xóa danh mục thành công');
      fetchCategories();
    } catch (error) {
      toast.error('Không thể xóa danh mục');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      if (selectedCategory?._id) {
        await updateJobCategoryAPI(selectedCategory._id, formData);
        toast.success('Cập nhật danh mục thành công');
      } else {
        await createJobCategoryAPI(formData);
        toast.success('Thêm danh mục thành công');
      }
      setShowModal(false);
      fetchCategories();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi lưu');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Quản lý Danh mục Việc làm"
        subtitle="Quản lý các nhóm ngành nghề và lĩnh vực tuyển dụng trên hệ thống"
      />

      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-[hsl(var(--admin-text-muted))]">
          Tổng cộng: <strong>{categories.length}</strong> danh mục
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchCategories} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button size="sm" onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Thêm danh mục
          </Button>
        </div>
      </div>

      <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[hsl(var(--admin-surface-elevated))]/50 border-b border-[hsl(var(--admin-border))]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px] text-center font-semibold text-[hsl(var(--admin-text-muted))]">Vị trí</TableHead>
                <TableHead className="font-semibold text-[hsl(var(--admin-text-muted))]">Tên danh mục</TableHead>
                <TableHead className="font-semibold text-[hsl(var(--admin-text-muted))]">Icon</TableHead>
                <TableHead className="text-center font-semibold text-[hsl(var(--admin-text-muted))]">Số việc làm</TableHead>
                <TableHead className="font-semibold text-[hsl(var(--admin-text-muted))]">Trạng thái</TableHead>
                <TableHead className="text-right font-semibold text-[hsl(var(--admin-text-muted))]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-[hsl(var(--admin-text-muted))]">Đang tải dữ liệu...</TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-[hsl(var(--admin-text-muted))]">Chưa có danh mục nào</TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category._id} className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))] transition-colors">
                    <TableCell className="text-center text-[hsl(var(--admin-text-secondary))]">{category.order}</TableCell>
                    <TableCell>
                      <div className="font-medium text-[hsl(var(--admin-text-primary))]">{category.name}</div>
                      {category.description && <div className="text-xs text-[hsl(var(--admin-text-muted))] line-clamp-1">{category.description}</div>}
                    </TableCell>
                    <TableCell className="text-[hsl(var(--admin-text-secondary))] text-sm">{category.icon || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))]">
                        {category.jobCount || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {category.isActive ? (
                        <Badge variant="outline" className="bg-[hsl(var(--admin-success)_/_10%)] text-[hsl(var(--admin-success))] border-[hsl(var(--admin-success)_/_20%)]">
                          Hoạt động
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-[hsl(var(--admin-text-muted)_/_10%)] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-text-muted)_/_20%)]">
                          Đã ẩn
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(category)} className="h-8 px-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))]">
                          <Edit className="w-4 h-4 text-[hsl(var(--admin-text-secondary))]" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(category)} className="h-8 px-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-danger-subtle))] hover:text-[hsl(var(--admin-danger))]">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Thêm/Sửa */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px] bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-[hsl(var(--admin-text-primary))]">
                {selectedCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Tên danh mục <span className="text-red-500">*</span></label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Vd: Công nghệ thông tin"
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Mô tả</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Vd: Lập trình viên, kiểm thử, thiết kế..."
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Icon hiển thị</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="flex h-10 w-full rounded-md border bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] px-3 py-2 text-sm text-[hsl(var(--admin-text-primary))] outline-none focus:border-[hsl(var(--admin-accent))]"
                  >
                    {POPULAR_ICONS.map((icon) => (
                      <option key={icon.value} value={icon.value}>
                        {icon.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Thứ tự hiển thị</label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-accent))] focus:ring-[hsl(var(--admin-accent))]"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                  Kích hoạt (Hiển thị ra ngoài)
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))] text-[hsl(var(--admin-text-secondary))]">
                Hủy
              </Button>
              <Button type="submit" disabled={formLoading} className="bg-[hsl(var(--admin-accent))] text-white hover:bg-[hsl(var(--admin-accent))] hover:opacity-90">
                {formLoading ? 'Đang lưu...' : 'Lưu lại'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminJobCategoriesPage;

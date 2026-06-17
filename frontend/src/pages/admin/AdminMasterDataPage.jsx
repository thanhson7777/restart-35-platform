import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react'
import { Button, Input, Card, CardContent, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { AdminLayout, AdminPageTitle } from '@/components/layout'
import { getMasterDataAdminAPI, createMasterDataAPI, updateMasterDataAPI, deleteMasterDataAPI } from '@/apis/index'

const TABS = [
  { value: 'industry', label: 'Lĩnh vực Doanh nghiệp' },
  { value: 'training_category', label: 'Lĩnh vực Giảng dạy (Trainer)' },
  { value: 'ngo_focus', label: 'Mục tiêu hỗ trợ (NGO)' }
]

const AdminMasterDataPage = () => {
  const [dataList, setDataList] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TABS[0].value)

  const [showModal, setShowModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [formData, setFormData] = useState({ type: activeTab, label: '', value: '', description: '', order: 0, isActive: true })
  const [formLoading, setFormLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getMasterDataAdminAPI()
      if (res.success) {
        setDataList(res.data || [])
      }
    } catch (error) {
      console.error('Error fetching master data:', error)
      toast.error('Không thể tải danh sách dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleTabChange = (val) => {
    setActiveTab(val)
  }

  const handleCreate = () => {
    setSelectedItem(null)
    setFormData({ type: activeTab, label: '', value: '', description: '', order: 0, isActive: true })
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setSelectedItem(item)
    setFormData({
      type: item.type,
      label: item.label,
      value: item.value || '',
      description: item.description || '',
      order: item.order || 0,
      isActive: item.isActive
    })
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${item.label}"?`)) return
    try {
      await deleteMasterDataAPI(item._id)
      toast.success('Xóa thành công')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xóa')
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    try {
      setFormLoading(true)
      if (selectedItem?._id) {
        await updateMasterDataAPI(selectedItem._id, formData)
        toast.success('Cập nhật thành công')
      } else {
        await createMasterDataAPI(formData)
        toast.success('Thêm mới thành công')
      }
      setShowModal(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu')
    } finally {
      setFormLoading(false)
    }
  }

  const currentDataList = dataList.filter(item => item.type === activeTab)

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Danh mục mở rộng (Master Data)"
        subtitle="Quản lý các danh mục cấu hình hệ thống dùng chung cho Doanh nghiệp, Trainer và NGO"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
        <TabsList className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-lg p-1">
          {TABS.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-[hsl(var(--admin-accent))] data-[state=active]:text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-[hsl(var(--admin-text-muted))]">
          Tổng cộng: <strong>{currentDataList.length}</strong> mục
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))]">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button size="sm" onClick={handleCreate} className="gap-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] hover:opacity-90 text-white">
            <Plus className="w-4 h-4" />
            Thêm mới
          </Button>
        </div>
      </div>

      <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[hsl(var(--admin-surface-elevated))]/50 border-b border-[hsl(var(--admin-border))]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px] text-center font-semibold text-[hsl(var(--admin-text-muted))]">Vị trí</TableHead>
                <TableHead className="font-semibold text-[hsl(var(--admin-text-muted))]">Tên hiển thị</TableHead>
                <TableHead className="font-semibold text-[hsl(var(--admin-text-muted))]">Giá trị (Slug)</TableHead>
                <TableHead className="font-semibold text-[hsl(var(--admin-text-muted))]">Trạng thái</TableHead>
                <TableHead className="text-right font-semibold text-[hsl(var(--admin-text-muted))]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-[hsl(var(--admin-text-muted))]">Đang tải dữ liệu...</TableCell>
                </TableRow>
              ) : currentDataList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-[hsl(var(--admin-text-muted))]">Chưa có dữ liệu nào</TableCell>
                </TableRow>
              ) : (
                currentDataList.map((item) => (
                  <TableRow key={item._id} className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))] transition-colors">
                    <TableCell className="text-center text-[hsl(var(--admin-text-secondary))]">{item.order}</TableCell>
                    <TableCell>
                      <div className="font-medium text-[hsl(var(--admin-text-primary))]">{item.label}</div>
                      {item.description && <div className="text-xs text-[hsl(var(--admin-text-muted))] line-clamp-1">{item.description}</div>}
                    </TableCell>
                    <TableCell className="text-[hsl(var(--admin-text-secondary))] text-sm">
                      <code className="px-1.5 py-0.5 bg-[hsl(var(--admin-surface-elevated))] rounded text-xs">
                        {item.value}
                      </code>
                    </TableCell>
                    <TableCell>
                      {item.isActive ? (
                        <Badge variant="outline" className="bg-[hsl(var(--admin-success)_/_10%)] text-[hsl(var(--admin-success))] border-[hsl(var(--admin-success)_/_20%)]">
                          Đang bật
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-[hsl(var(--admin-text-muted)_/_10%)] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-text-muted)_/_20%)]">
                          Đã ẩn
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)} className="h-8 px-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))]">
                          <Edit className="w-4 h-4 text-[hsl(var(--admin-text-secondary))]" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(item)} className="h-8 px-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-danger-subtle))] hover:text-[hsl(var(--admin-danger))]">
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
                {selectedItem ? 'Cập nhật mục' : 'Thêm mục mới'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Phân loại <span className="text-red-500">*</span></label>
                <select
                  required
                  disabled
                  value={formData.type}
                  className="flex h-10 w-full rounded-md border bg-[hsl(var(--admin-surface-hover))] border-[hsl(var(--admin-border))] px-3 py-2 text-sm text-[hsl(var(--admin-text-muted))] cursor-not-allowed"
                >
                  {TABS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Tên hiển thị <span className="text-red-500">*</span></label>
                <Input
                  required
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Vd: Công nghệ thông tin"
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Giá trị (Slug)</label>
                <Input
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="Vd: cong-nghe-thong-tin (để trống tự tạo)"
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Mô tả thêm</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả..."
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Thứ tự</label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
                <div className="flex items-center gap-2 mt-8">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-accent))] focus:ring-[hsl(var(--admin-accent))]"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-[hsl(var(--admin-text-primary))] cursor-pointer">
                    Cho phép sử dụng
                  </label>
                </div>
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
  )
}

export default AdminMasterDataPage

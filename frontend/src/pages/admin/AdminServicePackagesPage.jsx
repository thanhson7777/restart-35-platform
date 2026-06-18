import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { servicePackageApi } from '~/apis/servicePackageApi'
import toast from 'react-hot-toast'
import { AdminLayout, AdminPageTitle } from '@/components/layout'
import { Button, Badge, Input, Checkbox, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea } from '@/components/ui'

const AdminServicePackagesPage = () => {
  const [packages, setPackages] = useState([])
  const [openDialog, setOpenDialog] = useState(false)
  const [editingPackage, setEditingPackage] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    durationValue: 1,
    durationUnit: 'month',
    monthlyJobQuota: 100,
    isFree: false
  })

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      const res = await servicePackageApi.getAllPackages()
      const packagesData = res?.data || res || []
      setPackages(Array.isArray(packagesData) ? packagesData : [])
    } catch (error) {
      toast.error('Lỗi khi tải danh sách gói dịch vụ')
    }
  }

  const handleOpenDialog = (pkg = null) => {
    if (pkg) {
      setEditingPackage(pkg)
      setFormData({
        name: pkg.name,
        description: pkg.description || '',
        price: pkg.price,
        durationValue: pkg.durationMonths >= 12 && pkg.durationMonths % 12 === 0 ? pkg.durationMonths / 12 : pkg.durationMonths,
        durationUnit: pkg.durationMonths >= 12 && pkg.durationMonths % 12 === 0 ? 'year' : 'month',
        monthlyJobQuota: pkg.monthlyJobQuota,
        isFree: pkg.price === 0
      })
    } else {
      setEditingPackage(null)
      setFormData({
        name: '',
        description: '',
        price: 0,
        durationValue: 1,
        durationUnit: 'month',
        monthlyJobQuota: 100,
        isFree: false
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
  }

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async () => {
    try {
      const data = {
        name: formData.name,
        description: formData.description,
        price: formData.isFree ? 0 : Number(formData.price),
        durationMonths: formData.durationUnit === 'year' ? Number(formData.durationValue) * 12 : Number(formData.durationValue),
        monthlyJobQuota: Number(formData.monthlyJobQuota),
        isActive: true
      }

      if (editingPackage) {
        await servicePackageApi.updatePackage(editingPackage._id, data)
        toast.success('Cập nhật thành công')
      } else {
        await servicePackageApi.createPackage(data)
        toast.success('Tạo gói mới thành công')
      }
      handleCloseDialog()
      fetchPackages()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa gói này?')) {
      try {
        await servicePackageApi.deletePackage(id)
        toast.success('Đã xóa thành công')
        fetchPackages()
      } catch (error) {
        toast.error('Lỗi khi xóa gói dịch vụ')
      }
    }
  }

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Quản lý Gói dịch vụ"
        subtitle="Quản lý các gói dịch vụ đăng tin cho doanh nghiệp"
      />

      <div className="flex justify-end mb-6">
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Thêm gói mới
        </Button>
      </div>

      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))]">
              <tr>
                <th className="px-6 py-4 font-semibold border-b border-[hsl(var(--admin-border))]">Tên gói</th>
                <th className="px-6 py-4 font-semibold border-b border-[hsl(var(--admin-border))]">Giá (VNĐ)</th>
                <th className="px-6 py-4 font-semibold border-b border-[hsl(var(--admin-border))]">Thời hạn</th>
                <th className="px-6 py-4 font-semibold border-b border-[hsl(var(--admin-border))]">Số lượt đăng tin</th>
                <th className="px-6 py-4 font-semibold border-b border-[hsl(var(--admin-border))]">Trạng thái</th>
                <th className="px-6 py-4 font-semibold border-b border-[hsl(var(--admin-border))] text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--admin-border))]">
              {packages.map((row) => (
                <tr key={row._id} className="hover:bg-[hsl(var(--admin-surface-hover))] transition-colors">
                  <td className="px-6 py-4 font-semibold text-[hsl(var(--admin-text-primary))]">
                    {row.name}
                    {row.price === 0 && (
                      <Badge variant="secondary" className="ml-2 text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200">Free</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[hsl(var(--admin-text-secondary))]">
                    {row.price === 0 ? 'Miễn phí' : `${row.price.toLocaleString()} đ`}
                  </td>
                  <td className="px-6 py-4 text-[hsl(var(--admin-text-secondary))]">
                    {row.durationMonths >= 12 && row.durationMonths % 12 === 0 
                      ? `${row.durationMonths / 12} năm` 
                      : `${row.durationMonths} tháng`}
                  </td>
                  <td className="px-6 py-4 text-[hsl(var(--admin-text-secondary))]">{row.monthlyJobQuota} tin</td>
                  <td className="px-6 py-4">
                    {row.isActive ? (
                      <Badge variant="success" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle className="w-3 h-3" /> Đang hoạt động
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="w-3 h-3" /> Đã ẩn
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(row)} className="h-9 px-3 gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <Edit className="w-4 h-4" />
                        <span className="font-medium text-sm">Sửa</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(row._id)} className="h-9 px-3 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                        <span className="font-medium text-sm">Xóa</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {packages.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[hsl(var(--admin-text-muted))]">
                    Chưa có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPackage ? 'Cập nhật gói dịch vụ' : 'Thêm gói dịch vụ mới'}</DialogTitle>
            <DialogDescription>
              Điền thông tin chi tiết cho gói dịch vụ. Các trường có dấu * là bắt buộc.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label required>Tên gói</Label>
              <Input name="name" value={formData.name} onChange={handleChange} required placeholder="Ví dụ: Gói Cơ Bản" />
            </div>

            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>Loại gói</Label>
              <div className="flex items-center h-10 space-x-2 px-3 border border-[hsl(var(--admin-border))] rounded-md bg-[hsl(var(--admin-surface))] hover:bg-[hsl(var(--admin-surface-hover))] transition-colors">
                <input 
                  type="checkbox"
                  id="isFree"
                  name="isFree"
                  checked={formData.isFree} 
                  onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.checked }))} 
                  className="w-4 h-4 rounded border-gray-300 text-[hsl(var(--admin-accent))] focus:ring-[hsl(var(--admin-accent))]"
                />
                <Label htmlFor="isFree" className="cursor-pointer flex-1">Là gói miễn phí</Label>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label required={!formData.isFree}>Giá (VNĐ)</Label>
              <Input 
                name="price" 
                type="number" 
                value={formData.isFree ? 0 : formData.price} 
                onChange={handleChange} 
                disabled={formData.isFree}
                className={formData.isFree ? "opacity-60 bg-[hsl(var(--admin-surface-elevated))] cursor-not-allowed" : ""}
                required={!formData.isFree} 
                min="0"
              />
            </div>

            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label required>Thời hạn</Label>
              <div className="flex gap-2">
                <Input 
                  name="durationValue" 
                  type="number" 
                  value={formData.durationValue} 
                  onChange={handleChange} 
                  className="w-24 text-center"
                  required 
                  min="1" 
                />
                <div className="flex flex-1 items-center gap-3 rounded-md border border-[hsl(var(--admin-border))] px-3 h-10 bg-[hsl(var(--admin-surface))]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="durationUnit" value="month" checked={formData.durationUnit === 'month'} onChange={handleChange} className="w-3.5 h-3.5 accent-[hsl(var(--admin-accent))]" />
                    <span className="text-sm">Tháng</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="durationUnit" value="year" checked={formData.durationUnit === 'year'} onChange={handleChange} className="w-3.5 h-3.5 accent-[hsl(var(--admin-accent))]" />
                    <span className="text-sm">Năm</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label required>Số lượt đăng tin (Hạn mức)</Label>
              <Input name="monthlyJobQuota" type="number" value={formData.monthlyJobQuota} onChange={handleChange} required min="1" />
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label>Mô tả</Label>
              <Textarea name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="Mô tả các quyền lợi của gói dịch vụ..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Hủy</Button>
            <Button onClick={handleSubmit}>Lưu lại</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

export default AdminServicePackagesPage


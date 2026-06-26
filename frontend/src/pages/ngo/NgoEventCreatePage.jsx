import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Calendar, MapPin, AlignLeft, Image as ImageIcon, ArrowLeft } from 'lucide-react'
import { Button } from '~/components/ui/Button'
import { createEvent, selectEventActionLoading } from '~/redux/event/eventSlice'

export default function NgoEventCreatePage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const loading = useSelector(selectEventActionLoading)

  const [formData, setFormData] = useState({
    title: '',
    coverImage: '',
    eventDate: '',
    location: '',
    description: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.eventDate || !formData.location || !formData.description) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    try {
      const payload = {
        ...formData,
        eventDate: new Date(formData.eventDate).getTime()
      }
      await dispatch(createEvent(payload)).unwrap()
      toast.success('Tạo sự kiện thành công')
      navigate('/ngo/events')
    } catch (error) {
      toast.error(error || 'Có lỗi xảy ra khi tạo sự kiện')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ngo/events')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Tạo sự kiện mới</h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">Sự kiện sẽ được hiển thị trên bảng tin cộng đồng</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Tên sự kiện <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="VD: Hội thảo kỹ năng phỏng vấn cho lao động 35+"
              className="w-full h-10 px-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Thời gian <span className="text-red-500">*</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-[hsl(var(--muted-foreground))]" size={18} />
                <input
                  type="datetime-local"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleChange}
                  className="w-full h-10 pl-10 pr-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Địa điểm / Link Online <span className="text-red-500">*</span></label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 text-[hsl(var(--muted-foreground))]" size={18} />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Địa chỉ hoặc Link Jitsi Meet"
                  className="w-full h-10 pl-10 pr-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Link Ảnh bìa sự kiện</label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-2.5 text-[hsl(var(--muted-foreground))]" size={18} />
              <input
                type="url"
                name="coverImage"
                value={formData.coverImage}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
                className="w-full h-10 pl-10 pr-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Mô tả sự kiện <span className="text-red-500">*</span></label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" size={18} />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Mô tả chi tiết nội dung sự kiện, đối tượng tham gia, lịch trình..."
                className="w-full min-h-[150px] pl-10 pr-3 py-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
          <Button type="button" variant="outline" onClick={() => navigate('/ngo/events')}>
            Hủy
          </Button>
          <Button type="submit" disabled={loading} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))/90]">
            {loading ? 'Đang tạo...' : 'Tạo sự kiện'}
          </Button>
        </div>
      </form>
    </div>
  )
}

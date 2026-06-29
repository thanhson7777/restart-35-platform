import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Calendar, MapPin, AlignLeft, Image as ImageIcon, ArrowLeft, Upload, X, Video } from 'lucide-react'
import { Button } from '~/components/ui/Button'
import { createEvent, selectEventActionLoading } from '~/redux/event/eventSlice'

export default function NgoEventCreatePage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const loading = useSelector(selectEventActionLoading)

  const [formData, setFormData] = useState({
    title: '',
    eventDate: '',
    location: '',
    description: ''
  })
  const [coverImageFile, setCoverImageFile] = useState(null)
  const [coverImagePreview, setCoverImagePreview] = useState('')
  const [eventType, setEventType] = useState('offline')

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCoverImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setCoverImageFile(null)
    setCoverImagePreview('')
  }

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
      const payload = new FormData()
      payload.append('title', formData.title)
      payload.append('eventDate', new Date(formData.eventDate).getTime())
      payload.append('location', formData.location)
      payload.append('description', formData.description)
      if (coverImageFile) {
        payload.append('coverImage', coverImageFile)
      }

      await dispatch(createEvent(payload)).unwrap()
      toast.success('Tạo sự kiện thành công')
      navigate('/ngo/events')
    } catch (error) {
      toast.error(error || 'Có lỗi xảy ra khi tạo sự kiện')
    }
  }

  return (
    <div className="w-full space-y-6">
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

          <div className="flex items-center gap-6 p-4 bg-[hsl(var(--muted))/30] rounded-lg border border-[hsl(var(--border))]">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">Hình thức tổ chức:</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors">
                <input 
                  type="radio" 
                  value="offline" 
                  checked={eventType === 'offline'} 
                  onChange={() => setEventType('offline')} 
                  className="w-4 h-4 accent-[hsl(var(--primary))]" 
                />
                Trực tiếp (Offline)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors">
                <input 
                  type="radio" 
                  value="online" 
                  checked={eventType === 'online'} 
                  onChange={() => setEventType('online')} 
                  className="w-4 h-4 accent-[hsl(var(--primary))]" 
                />
                Trực tuyến (Online)
              </label>
            </div>
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
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                {eventType === 'offline' ? 'Địa điểm tổ chức' : 'Link sự kiện trực tuyến'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {eventType === 'offline' ? (
                  <MapPin className="absolute left-3 top-2.5 text-[hsl(var(--muted-foreground))]" size={18} />
                ) : (
                  <Video className="absolute left-3 top-2.5 text-[hsl(var(--muted-foreground))]" size={18} />
                )}
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder={eventType === 'offline' ? "VD: 123 Đường A, Quận B, TP.HCM" : "VD: https://meet.google.com/abc-xyz"}
                  className="w-full h-10 pl-10 pr-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Ảnh bìa sự kiện</label>
            {!coverImagePreview ? (
              <div className="relative group border-2 border-dashed border-[hsl(var(--border))] rounded-xl hover:border-[hsl(var(--primary))] transition-colors bg-[hsl(var(--muted))/30] overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="w-12 h-12 mb-3 rounded-full bg-[hsl(var(--primary))/10] flex items-center justify-center text-[hsl(var(--primary))] group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  <h4 className="text-sm font-medium text-[hsl(var(--foreground))] mb-1">Click hoặc kéo thả ảnh vào đây</h4>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">PNG, JPG, WEBP (Tối đa 5MB)</p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-[hsl(var(--border))] group">
                <img src={coverImagePreview} alt="Preview" className="w-full h-[250px] object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <Button 
                    type="button" 
                    variant="destructive" 
                    className="gap-2"
                    onClick={handleRemoveImage}
                  >
                    <X size={16} /> Gỡ ảnh
                  </Button>
                </div>
              </div>
            )}
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

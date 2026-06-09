import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Briefcase,
  BookOpen,
  Search,
  X,
  MapPin,
  List,
  Map as MapIcon,
  ChevronDown,
} from 'lucide-react'

// Fix Leaflet default icon broken in Vite/Webpack bundlers
// eslint-disable-next-line no-unused-vars
let DefaultIconClass = L.Icon.Default
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const MVIcon = (color) =>
  new L.DivIcon({
    html: `<div style="
      width: 28px; height: 28px;
      border-radius: 50% 50% 50% 0;
      background: ${color};
      transform: rotate(-45deg);
      border: 2.5px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  })

const VIOLATION_COLOR = '#3b82f6'
const COURSE_COLOR = '#8b5cf6'

export default function OpportunityMapPage() {
  const [activeTab, setActiveTab] = useState('jobs')
  const [jobs, setJobs] = useState([])
  const [courses, setCourses] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const [jobsRes, coursesRes] = await Promise.all([
        fetch(`${base}/v1/jobs/map-data`).catch(() => ({ ok: false, json: async () => ({ data: [] }) })),
        fetch(`${base}/v1/courses/map-data`).catch(() => ({ ok: false, json: async () => ({ data: [] }) })),
      ])
      const [jobsData, coursesData] = await Promise.all([jobsRes.json(), coursesRes.json()])
      setJobs(jobsData.data || [])
      setCourses(coursesData.data || [])
    } catch (err) {
      console.warn('Map data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const items = activeTab === 'jobs' ? jobs : courses
  const filtered = items.filter(
    (item) =>
      !search ||
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.location?.toLowerCase().includes(search.toLowerCase()) ||
      item.venue?.toLowerCase().includes(search.toLowerCase())
  )

  const hasCoords = (item) => item.lat && item.lng && !isNaN(parseFloat(item.lat)) && !isNaN(parseFloat(item.lng))
  const coordsItems = filtered.filter(hasCoords)
  const defaultCenter = [16.0544, 108.2022] // Vietnam center

  const Icon = activeTab === 'jobs' ? Briefcase : BookOpen
  const iconColor = activeTab === 'jobs' ? VIOLATION_COLOR : COURSE_COLOR

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary shrink-0" />
          <h1 className="text-base font-semibold">Bản đồ cơ hội</h1>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-muted rounded-lg p-0.5 ml-2">
          <button
            onClick={() => { setActiveTab('jobs'); setSelected(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'jobs'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Việc làm
            {jobs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px]">
                {jobs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('courses'); setSelected(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'courses'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Khóa học
            {courses.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px]">
                {courses.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên, địa điểm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Sidebar toggle */}
        <button
          onClick={() => setShowSidebar((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          {showSidebar ? <List className="w-3.5 h-3.5" /> : <MapIcon className="w-3.5 h-3.5" />}
          {showSidebar ? 'Ẩn danh sách' : 'Hiện danh sách'}
        </button>
      </div>

      {/* Body: Map + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
              <div className="text-sm text-muted-foreground">Đang tải bản đồ...</div>
            </div>
          ) : coordsItems.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
              <MapPin className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {items.length === 0
                  ? 'Không có dữ liệu bản đồ'
                  : 'Không có điểm nào có tọa độ'}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {activeTab === 'jobs'
                  ? 'Các việc làm cần có thông tin địa lý'
                  : 'Các khóa học offline cần có địa điểm'}
              </p>
            </div>
          ) : null}

          <MapContainer
            center={coordsItems[0] ? [parseFloat(coordsItems[0].lat), parseFloat(coordsItems[0].lng)] : defaultCenter}
            zoom={11}
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {coordsItems.map((item) => (
              <Marker
                key={item._id}
                position={[parseFloat(item.lat), parseFloat(item.lng)]}
                icon={MVIcon(iconColor)}
                eventHandlers={{
                  click: () => setSelected(item),
                }}
              >
                <Popup>
                  <div className="min-w-48 py-1">
                    <p className="font-semibold text-sm">{item.title}</p>
                    {item.location && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.location}</p>
                    )}
                    {item.venue && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.venue}</p>
                    )}
                    {item.salary && (
                      <p className="text-xs font-medium text-green-700 mt-1">{item.salary}</p>
                    )}
                    {item.price !== undefined && item.price !== null && (
                      <p className="text-xs font-medium text-primary mt-1">
                        {item.price === 0 ? 'Miễn phí' : `${Number(item.price).toLocaleString('vi-VN')}đ`}
                      </p>
                    )}
                    <a
                      href={activeTab === 'jobs' ? `/jobs/${item._id}` : `/courses/${item._id}`}
                      className="text-xs text-blue-600 hover:underline mt-1.5 block"
                    >
                      Xem chi tiết
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Stats overlay */}
          <div className="absolute bottom-4 left-4 z-[400] bg-background/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 shadow-sm">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{coordsItems.length}</span> điểm trên bản đồ
              {filtered.length !== items.length && (
                <span className="text-muted-foreground/60"> / {filtered.length} kết quả lọc</span>
              )}
            </p>
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-l bg-background overflow-y-auto shrink-0">
            <div className="p-3 space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Không tìm thấy</p>
                </div>
              ) : (
                filtered.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => setSelected(item)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selected?._id === item._id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${iconColor}18` }}
                      >
                        <Icon className="w-4.5 h-4.5" style={{ color: iconColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.location || item.venue || item.companyName || ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {item.salary && (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              {item.salary}
                            </span>
                          )}
                          {item.price !== undefined && item.price !== null && (
                            <span className="text-xs font-medium text-primary">
                              {item.price === 0 ? 'Miễn phí' : `${Number(item.price).toLocaleString('vi-VN')}đ`}
                            </span>
                          )}
                          {item.jobType && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {item.jobType}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

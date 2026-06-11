import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Input } from '@/components/ui'
import { fetchProvinces, fetchWards, fetchProvinceByCode } from '@/services/locationService'

// ─── Leaflet icon fix ─────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const PIN_ICON = new L.DivIcon({
  html: `<div style="
    width: 32px; height: 32px;
    border-radius: 50% 50% 50% 0;
    background: #3b82f6;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 3px 8px rgba(0,0,0,0.3);
  "></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -34],
})

const VIETNAM_CENTER = [16.0544, 108.2022]

// ─── Geocoding helpers ────────────────────────────────────────────────────────
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'

const geocode = async (query) => {
  try {
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=vn`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'vi' },
    })
    const data = await res.json()
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch (err) {
    console.warn('[LocationPicker] geocode failed:', err)
  }
  return null
}

// ─── Province label lookup ─────────────────────────────────────────────────────
let _provinceCache = null
const getProvinceLabel = async (code) => {
  if (!_provinceCache) _provinceCache = await fetchProvinces()
  return _provinceCache.find((p) => p.value === code)?.label || ''
}

// ─── Draggable marker inner component ────────────────────────────────────────
function DraggableMarker({ position, onPositionChange }) {
  const markerRef = useRef(null)
  useMapEvents({
    dragend() {
      const marker = markerRef.current
      if (!marker) return
      const { lat, lng } = marker.getLatLng()
      onPositionChange({ lat, lng })
    },
  })
  return position?.lat != null && position?.lng != null ? (
    <Marker
      ref={markerRef}
      position={[position.lat, position.lng]}
      icon={PIN_ICON}
      draggable={true}
      eventHandlers={{ dragend: () => {
        const { lat, lng } = markerRef.current.getLatLng()
        onPositionChange({ lat, lng })
      }}}
    />
  ) : null
}

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// ─── Province dropdown (inline, avoids ProvinceField dep) ─────────────────────
const MapPinIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
  </svg>
)

function ProvinceDropdown({ value, onChange, provinceList, loading }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = provinceList.find((p) => p.value === value)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
        Tỉnh / Thành phố <span className="text-red-500">*</span>
      </label>
      <div ref={ref} className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[hsl(var(--admin-text-muted))]">
          <MapPinIcon />
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-lg pl-10 pr-8 py-2.5 text-sm text-left focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))/50] transition-colors flex items-center justify-between cursor-pointer"
        >
          <span className={selected ? '' : 'text-[hsl(var(--admin-text-muted))]'}>
            {selected ? selected.label : '-- Chọn tỉnh/thành --'}
          </span>
          <ChevronIcon open={open} />
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-lg shadow-lg z-50 overflow-hidden">
            <ul className="max-h-48 overflow-y-auto py-1">
              {loading ? (
                <li className="px-3 py-2 text-sm text-[hsl(var(--admin-text-muted))] text-center">Đang tải...</li>
              ) : provinceList.length === 0 ? (
                <li className="px-3 py-2 text-sm text-[hsl(var(--admin-text-muted))] text-center">Không có dữ liệu</li>
              ) : (
                provinceList.map((p) => (
                  <li key={p.value}>
                    <button
                      type="button"
                      onClick={() => { onChange(p.value); setOpen(false) }}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-[hsl(var(--admin-accent-subtle))] transition-colors ${value === p.value ? 'font-medium text-[hsl(var(--admin-accent))]' : ''}`}
                    >
                      {p.label}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function WardDropdown({ value, onChange, wardList, loading, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = wardList.find((w) => w.value === value)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const MapIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  )

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
        Phường / Xã / Thị trấn
      </label>
      <div ref={ref} className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[hsl(var(--admin-text-muted))]">
          <MapIcon />
        </div>
        <button
          type="button"
          onClick={() => { if (!disabled) setOpen(!open) }}
          disabled={disabled}
          className="w-full bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-lg pl-10 pr-8 py-2.5 text-sm text-left focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))/50] transition-colors flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className={selected ? '' : 'text-[hsl(var(--admin-text-muted))]'}>
            {selected ? selected.label : '-- Chọn phường/xã --'}
          </span>
          <ChevronIcon open={open} />
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-lg shadow-lg z-50 overflow-hidden">
            <ul className="max-h-48 overflow-y-auto py-1">
              {loading ? (
                <li className="px-3 py-2 text-sm text-[hsl(var(--admin-text-muted))] text-center">Đang tải...</li>
              ) : wardList.length === 0 ? (
                <li className="px-3 py-2 text-sm text-[hsl(var(--admin-text-muted))] text-center">Không có dữ liệu</li>
              ) : (
                wardList.map((w) => (
                  <li key={w.value}>
                    <button
                      type="button"
                      onClick={() => { onChange(w.value); setOpen(false) }}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-[hsl(var(--admin-accent-subtle))] transition-colors ${value === w.value ? 'font-medium text-[hsl(var(--admin-accent))]' : ''}`}
                    >
                      {w.label}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {!disabled && (
        <p className="text-xs text-[hsl(var(--admin-text-faint))]">Vui lòng chọn tỉnh/thành trước</p>
      )}
    </div>
  )
}

// ─── Main LocationPicker ─────────────────────────────────────────────────────
export default function LocationPicker({
  address,
  province,
  ward,
  coordinates,
  onAddressChange,
  onProvinceChange,
  onWardChange,
  onCoordinatesChange,
  errors = {},
}) {
  const [provinceList, setProvinceList] = useState([])
  const [wardList, setWardList] = useState([])
  const [loadingProvinces, setLoadingProvinces] = useState(true)
  const [loadingWards, setLoadingWards] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [mapKey, setMapKey] = useState(0)

  const debouncedAddress = useDebounce(address, 600)

  // Load provinces
  useEffect(() => {
    fetchProvinces().then((data) => {
      setProvinceList(data)
      setLoadingProvinces(false)
    })
  }, [])

  // Load wards when province changes
  useEffect(() => {
    if (!province) { setWardList([]); return }
    setLoadingWards(true)
    onWardChange('')
    fetchWards(province).then((data) => {
      setWardList(data)
      setLoadingWards(false)
    })
  }, [province])

  // When province changes → update map center to centroid
  useEffect(() => {
    if (!province) return
    fetchProvinceByCode(province).then((prov) => {
      if (prov && prov.lat && prov.lng) {
        onCoordinatesChange({ lat: prov.lat, lng: prov.lng })
        setMapKey((k) => k + 1)
      }
    })
  }, [province])

  // Geocode when address + ward both non-empty
  const doGeocode = useCallback(async () => {
    if (!province) return
    setGeocoding(true)
    try {
      const provLabel = await getProvinceLabel(province)
      let query = [address, ward, provLabel].filter(Boolean).join(', ')
      if (!query.trim()) { setGeocoding(false); return }
      const result = await geocode(query)
      if (result) {
        onCoordinatesChange(result)
        setMapKey((k) => k + 1)
      }
    } finally {
      setGeocoding(false)
    }
  }, [province, ward, debouncedAddress])

  useEffect(() => {
    if (debouncedAddress && ward) {
      doGeocode()
    }
  }, [debouncedAddress, ward])

  const mapCenter =
    coordinates?.lat != null && coordinates?.lng != null
      ? [coordinates.lat, coordinates.lng]
      : VIETNAM_CENTER

  return (
    <div className="space-y-4">
      {/* Address */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
          Địa chỉ chi tiết <span className="text-red-500">*</span>
        </label>
        <Input
          placeholder="VD: 123 Nguyễn Huệ, Quận 1"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
        />
        {errors.address && (
          <p className="text-xs text-red-500">{errors.address}</p>
        )}
      </div>

      {/* Province + Ward row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProvinceDropdown
          value={province}
          onChange={(v) => { onProvinceChange(v); onWardChange('') }}
          provinceList={provinceList}
          loading={loadingProvinces}
        />
        <WardDropdown
          value={ward}
          onChange={onWardChange}
          wardList={wardList}
          loading={loadingWards}
          disabled={!province}
        />
      </div>

      {/* Map */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))]">
            Vị trí trên bản đồ
          </label>
          {geocoding && (
            <span className="text-xs text-[hsl(var(--admin-text-muted))]">Đang xác định tọa độ...</span>
          )}
        </div>
        <div className="rounded-xl overflow-hidden border border-[hsl(var(--admin-border))]">
          <MapContainer
            key={mapKey}
            center={mapCenter}
            zoom={coordinates ? 15 : 12}
            className="h-[280px] w-full"
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <DraggableMarker
              position={coordinates}
              onPositionChange={onCoordinatesChange}
            />
          </MapContainer>
        </div>
        <p className="text-xs text-[hsl(var(--admin-text-muted))]">
          Kéo marker để chỉnh vị trí chính xác.
          {!coordinates && ' Chọn tỉnh/thành phố để xem trên bản đồ.'}
        </p>
      </div>
    </div>
  )
}

import React, { useState, useRef, useEffect } from 'react'
import { VIETNAM_PROVINCES, getDistricts } from '~/data/profileData'

const MapPinIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const MapIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/>
    <line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg
    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
  </svg>
)

function ProvinceField({ province, district, onProvinceChange, onDistrictChange, errors = {} }) {
  const districts = province ? getDistricts(province) : []
  const [provinceOpen, setProvinceOpen] = useState(false)
  const [districtOpen, setDistrictOpen] = useState(false)
  const provinceRef = useRef(null)
  const districtRef = useRef(null)

  const selectedProvince = VIETNAM_PROVINCES.find(p => p.value === province)
  const selectedDistrict = districts.find(d => d.value === district)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (provinceRef.current && !provinceRef.current.contains(e.target)) {
        setProvinceOpen(false)
      }
      if (districtRef.current && !districtRef.current.contains(e.target)) {
        setDistrictOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {/* Province Select */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Tỉnh / Thành phố <span className="text-destructive">*</span>
        </label>
        <div ref={provinceRef} className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground z-10">
            <MapPinIcon />
          </div>
          <button
            type="button"
            onClick={() => {
              setProvinceOpen(!provinceOpen)
            }}
            className={`
              w-full bg-background border rounded-lg
              pl-10 pr-8 py-2.5 text-sm text-left
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
              transition-colors duration-200 cursor-pointer
              flex items-center justify-between
              ${errors.province ? 'border-destructive' : 'border-input'}
            `}
          >
            <span className={selectedProvince ? 'text-foreground' : 'text-muted-foreground'}>
              {selectedProvince ? selectedProvince.label : '-- Chọn tỉnh/thành --'}
            </span>
            <ChevronIcon open={provinceOpen} />
          </button>

          {provinceOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-lg shadow-lg z-50 overflow-hidden">
              <ul className="max-h-48 overflow-y-auto py-1">
                {VIETNAM_PROVINCES.map((p) => (
                  <li key={p.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onProvinceChange(p.value)
                        setProvinceOpen(false)
                      }}
                      className={`
                        w-full px-3 py-2 text-sm text-left
                        hover:bg-primary/10 hover:text-primary
                        transition-colors duration-150
                        ${province === p.value
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground'
                        }
                      `}
                    >
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {errors.province && (
          <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
            {errors.province}
          </p>
        )}
      </div>

      {/* District Select */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Quận / Huyện
          <span className="ml-1 text-xs text-muted-foreground font-normal">(tùy chọn)</span>
        </label>
        <div ref={districtRef} className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground z-10">
            <MapIcon />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!province) return
              setDistrictOpen(!districtOpen)
            }}
            disabled={!province}
            className={`
              w-full bg-background border rounded-lg
              pl-10 pr-8 py-2.5 text-sm text-left
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
              transition-colors duration-200 cursor-pointer
              flex items-center justify-between
              disabled:opacity-40 disabled:cursor-not-allowed
              ${errors.district ? 'border-destructive' : 'border-input'}
            `}
          >
            <span className={selectedDistrict ? 'text-foreground' : 'text-muted-foreground'}>
              {selectedDistrict ? selectedDistrict.label : '-- Chọn quận/huyện --'}
            </span>
            <ChevronIcon open={districtOpen} />
          </button>

          {districtOpen && province && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-lg shadow-lg z-50 overflow-hidden">
              <ul className="max-h-48 overflow-y-auto py-1">
                {districts.map((d) => (
                  <li key={d.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onDistrictChange(d.value)
                        setDistrictOpen(false)
                      }}
                      className={`
                        w-full px-3 py-2 text-sm text-left
                        hover:bg-primary/10 hover:text-primary
                        transition-colors duration-150
                        ${district === d.value
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground'
                        }
                      `}
                    >
                      {d.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {errors.district && (
          <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
            {errors.district}
          </p>
        )}
        {!province && (
          <p className="text-xs text-muted-foreground">Vui lòng chọn tỉnh/thành trước</p>
        )}
      </div>
    </>
  )
}

export default ProvinceField

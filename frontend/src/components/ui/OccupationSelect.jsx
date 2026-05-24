import React, { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check, Loader2 } from 'lucide-react'
import { useEscoSearch, useOccupationDetails, usePopularOccupations } from '~/hooks/useEsco'
import { cn } from '~/lib/utils'

/**
 * OccupationSelect Component - Search + Autocomplete
 *
 * Features:
 * - Search input with debounce
 * - Popular occupations when not searching
 * - Results dropdown
 * - Selected state display
 * - Skills preview when selected
 */
export function OccupationSelect({
  value,
  onChange,
  placeholder = "Tìm và chọn nghề...",
  error,
  disabled,
  maxSkills = 20
}) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [showAllSkills, setShowAllSkills] = useState(false)
  const wrapperRef = useRef(null)

  // ESCO hooks
  const { query, setQuery, results, isLoading, isError } = useEscoSearch()
  const { popular, isLoading: popularLoading } = usePopularOccupations(5)

  // Selected occupation details (for skills preview)
  const { occupation: occupationDetails, isLoading: detailsLoading } = useOccupationDetails(value?.uri)

  // Handle outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Sync search value
  useEffect(() => {
    setQuery(searchValue)
  }, [searchValue, setQuery])

  // Display skills (essential first, then optional)
  const displaySkills = React.useMemo(() => {
    if (!occupationDetails?.skills) return { essential: [], optional: [], total: 0 }

    const essential = occupationDetails.skills.filter(s => s.isEssential)
    const optional = occupationDetails.skills.filter(s => !s.isEssential)

    return {
      essential: essential.slice(0, maxSkills),
      optional: optional.slice(0, 10),
      total: occupationDetails.skills.length
    }
  }, [occupationDetails, maxSkills])

  // Handle select
  const handleSelect = (occupation) => {
    onChange(occupation)
    setSearchValue('')
    setQuery('')
    setShowAllSkills(false)
    setOpen(false)
  }

  // Handle clear
  const handleClear = (e) => {
    e.stopPropagation()
    onChange(null)
  }

  // Show popular when no search
  const showPopular = !searchValue && popular.length > 0
  const showResults = searchValue.length >= 2

  return (
    <div ref={wrapperRef} className="relative">
      {/* Selected value display / Search input */}
      <div
        className={cn(
          "relative rounded-lg border transition-colors duration-200",
          error ? "border-destructive" : "border-input",
          open && "ring-2 ring-primary/50 border-primary",
          disabled && "opacity-40 cursor-not-allowed"
        )}
      >
        {open ? (
          // Search input when open
          <div className="flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={placeholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              disabled={disabled}
              className="w-full bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none rounded-lg"
              autoFocus
            />
            {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        ) : (
          // Display selected value when closed
          <button
            type="button"
            onClick={() => !disabled && setOpen(true)}
            disabled={disabled}
            className="w-full bg-background px-4 py-2.5 text-left flex items-center justify-between rounded-lg"
          >
            <span className={value ? "text-foreground" : "text-muted-foreground"}>
              {value ? (
                <span>
                  <span className="font-medium">{value.titleVi || value.titleEn}</span>
                  {value.titleEn && value.titleVi && (
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({value.titleEn})
                    </span>
                  )}
                </span>
              ) : placeholder}
            </span>
            <div className="flex items-center gap-1">
              {value && (
                <span
                  onClick={handleClear}
                  className="w-5 h-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 cursor-pointer"
                >
                  <span className="text-xs">x</span>
                </span>
              )}
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </div>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Loading / Popular / Results */}
          <div className="max-h-80 overflow-y-auto">
            {/* Popular occupations (when no search) */}
            {showPopular && (
              <div className="p-2">
                <p className="px-3 py-1 text-xs text-muted-foreground font-medium">
                  Nghề phổ biến
                </p>
                {popular.map((occ) => (
                  <OccupationOption
                    key={occ.uri}
                    occupation={occ}
                    isSelected={value?.uri === occ.uri}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="p-4 text-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                <span className="text-sm">Đang tìm kiếm...</span>
              </div>
            )}

            {/* Search results */}
            {showResults && !isLoading && results.length > 0 && (
              <div className="p-2">
                <p className="px-3 py-1 text-xs text-muted-foreground font-medium">
                  Kết quả tìm kiếm ({results.length})
                </p>
                {results.map((occ) => (
                  <OccupationOption
                    key={occ.uri}
                    occupation={occ}
                    isSelected={value?.uri === occ.uri}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* No results */}
            {showResults && !isLoading && results.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm">Không tìm thấy nghề phù hợp</p>
                <p className="text-xs mt-1">Thử từ khóa khác</p>
              </div>
            )}

            {/* Empty state for popular */}
            {!showResults && !showPopular && !isLoading && (
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm">Nhập để tìm kiếm nghề nghiệp</p>
                <p className="text-xs mt-1">Tối thiểu 2 ký tự</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skills preview (when selected) */}
      {value && occupationDetails && (
        <div className="mt-2 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              Kỹ năng ({displaySkills.total})
            </p>
            {displaySkills.optional.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllSkills(!showAllSkills)}
                className="text-xs text-primary hover:underline"
              >
                {showAllSkills ? 'Ẩn bớt' : `Xem thêm (${displaySkills.optional.length})`}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {displaySkills.essential.map((skill) => (
              <span
                key={skill.uri}
                className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary"
                title={skill.titleEn}
              >
                {skill.titleVi || skill.titleEn}
              </span>
            ))}
            {showAllSkills && displaySkills.optional.map((skill) => (
              <span
                key={skill.uri}
                className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                title={skill.titleEn}
              >
                {skill.titleVi || skill.titleEn}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  )
}

/**
 * Sub-component: Occupation option in dropdown
 */
function OccupationOption({ occupation, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(occupation)}
      className={cn(
        "w-full px-3 py-2 text-left rounded-md transition-colors",
        "hover:bg-accent",
        isSelected && "bg-primary/10 text-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">
            {occupation.titleVi || occupation.titleEn}
          </p>
          {occupation.titleEn && occupation.titleVi && (
            <p className="text-xs text-muted-foreground">
              {occupation.titleEn}
            </p>
          )}
        </div>
        {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
      </div>
      {occupation.code && (
        <p className="text-xs text-muted-foreground mt-1">
          Mã ISCO: {occupation.code}
        </p>
      )}
    </button>
  )
}

export default OccupationSelect

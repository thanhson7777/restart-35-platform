import React, { useState, useMemo } from 'react'
import { Search, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useOccupationSkills } from '~/hooks/useEsco'
import { cn } from '~/lib/utils'

/**
 * SkillsSelector Component
 *
 * Features:
 * - Displays skills for selected occupation
 * - Essential skills shown first
 * - Optional skills in collapsible section
 * - Search/filter skills
 * - Max skills limit
 */
export function SkillsSelector({
  occupationUri,
  selectedSkills = [],
  onToggle,
  onRemove,
  maxSkills = 20,
  label = "Kỹ năng"
}) {
  const [search, setSearch] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  // Fetch skills from ESCO
  const { skills, essentialSkills, optionalSkills, totalCount, isLoading, isError } = useOccupationSkills(occupationUri, {
    essentialOnly: false,
    limit: 100
  })

  // Filter skills by search
  const filteredEssential = useMemo(() => {
    if (!essentialSkills) return []
    if (!search) return essentialSkills

    const lowerSearch = search.toLowerCase()
    return essentialSkills.filter(s =>
      s.titleVi?.toLowerCase().includes(lowerSearch) ||
      s.titleEn?.toLowerCase().includes(lowerSearch)
    )
  }, [essentialSkills, search])

  const filteredOptional = useMemo(() => {
    if (!optionalSkills) return []
    if (!search) return optionalSkills

    const lowerSearch = search.toLowerCase()
    return optionalSkills.filter(s =>
      s.titleVi?.toLowerCase().includes(lowerSearch) ||
      s.titleEn?.toLowerCase().includes(lowerSearch)
    )
  }, [optionalSkills, search])

  // Check if skill is selected
  const isSelected = (skillUri) => selectedSkills.some(s => s.uri === skillUri)
  const selectedCount = selectedSkills.length
  const canAddMore = selectedCount < maxSkills

  // Handle toggle skill
  const handleToggle = (skill) => {
    if (isSelected(skill.uri)) {
      onRemove(skill.uri)
    } else if (canAddMore) {
      onToggle({
        uri: skill.uri,
        titleEn: skill.titleEn,
        titleVi: skill.titleVi,
        type: skill.type,
        isEssential: skill.isEssential
      })
    }
  }

  // Handle remove selected skill
  const handleRemove = (skillUri) => {
    onRemove(skillUri)
  }

  // If no occupation, show placeholder
  if (!occupationUri) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
        <div className="p-4 border border-dashed border-border rounded-lg text-center text-sm text-muted-foreground">
          Chọn nghề nghiệp để xem kỹ năng
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">
          {label}
          <span className="ml-1 text-xs text-muted-foreground font-normal">
            ({selectedCount}/{maxSkills})
          </span>
        </label>
      </div>

      {/* Selected skills tags */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSkills.map((skill) => (
            <span
              key={skill.uri}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                skill.isEssential
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {skill.titleVi || skill.titleEn}
              <button
                type="button"
                onClick={() => handleRemove(skill.uri)}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang tải kỹ năng...</span>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="text-sm text-destructive">
          Không thể tải kỹ năng. Vui lòng thử lại.
        </div>
      )}

      {/* Skills content */}
      {skills && !isLoading && !isError && (
        <div className="space-y-2">
          {/* Essential Skills */}
          {filteredEssential.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-1">
                Kỹ năng thiết yếu ({filteredEssential.length})
              </p>
              <div className="grid grid-cols-2 gap-1">
                {filteredEssential.slice(0, 20).map((skill) => (
                  <SkillOption
                    key={skill.uri}
                    skill={skill}
                    isSelected={isSelected(skill.uri)}
                    onClick={() => handleToggle(skill)}
                    disabled={!isSelected(skill.uri) && !canAddMore}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Optional Skills (collapsible) */}
          {optionalSkills.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground px-1 py-1 transition-colors"
              >
                {showOptional ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Kỹ năng bổ sung ({optionalSkills.length})
              </button>

              {showOptional && (
                <div className="grid grid-cols-2 gap-1">
                  {filteredOptional.slice(0, 30).map((skill) => (
                    <SkillOption
                      key={skill.uri}
                      skill={skill}
                      isSelected={isSelected(skill.uri)}
                      onClick={() => handleToggle(skill)}
                      disabled={!isSelected(skill.uri) && !canAddMore}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty skills */}
          {essentialSkills.length === 0 && optionalSkills.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Không có kỹ năng cho nghề này
            </p>
          )}

          {/* Search for more */}
          {(essentialSkills.length > 0 || optionalSkills.length > 0) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={!canAddMore}
                className={cn(
                  "w-full py-2 px-3 rounded-lg border border-dashed text-sm text-muted-foreground",
                  "hover:border-primary/50 hover:text-primary hover:bg-primary/5",
                  "transition-all flex items-center justify-center gap-2",
                  !canAddMore && "opacity-50 cursor-not-allowed"
                )}
              >
                <Search className="w-4 h-4" />
                Thêm kỹ năng khác...
              </button>

              {/* Search dropdown */}
              {showDropdown && canAddMore && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-20 overflow-hidden">
                  {/* Search input */}
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Tìm kỹ năng..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Skills list */}
                  <div className="max-h-64 overflow-y-auto p-2">
                    {filteredEssential.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-muted-foreground px-2 py-1">Kỹ năng thiết yếu</p>
                        {filteredEssential.map((skill) => (
                          <SkillOption
                            key={skill.uri}
                            skill={skill}
                            isSelected={isSelected(skill.uri)}
                            onClick={() => {
                              handleToggle(skill)
                              if (isSelected(skill.uri)) {
                                setShowDropdown(false)
                              }
                            }}
                            disabled={!isSelected(skill.uri) && !canAddMore}
                            compact
                          />
                        ))}
                      </div>
                    )}

                    {filteredOptional.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground px-2 py-1">Kỹ năng bổ sung</p>
                        {filteredOptional.map((skill) => (
                          <SkillOption
                            key={skill.uri}
                            skill={skill}
                            isSelected={isSelected(skill.uri)}
                            onClick={() => {
                              handleToggle(skill)
                              if (isSelected(skill.uri)) {
                                setShowDropdown(false)
                              }
                            }}
                            disabled={!isSelected(skill.uri) && !canAddMore}
                            compact
                          />
                        ))}
                      </div>
                    )}

                    {filteredEssential.length === 0 && filteredOptional.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Không tìm thấy kỹ năng
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Limit reached message */}
      {!canAddMore && (
        <p className="text-xs text-muted-foreground">
          Đã đạt giới hạn {maxSkills} kỹ năng. Xóa bớt để thêm kỹ năng khác.
        </p>
      )}
    </div>
  )
}

/**
 * Skill option checkbox
 */
function SkillOption({ skill, isSelected, onClick, disabled, compact }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left rounded flex items-center gap-2 transition-colors",
        compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
        isSelected
          ? "bg-primary/10 text-primary"
          : "hover:bg-accent",
        disabled && !isSelected && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className={cn(
        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
        isSelected
          ? "bg-primary border-primary"
          : "border-border"
      )}>
        {isSelected && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6L5 9L10 3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className="truncate">
        {skill.titleVi || skill.titleEn}
      </span>
    </button>
  )
}

export default SkillsSelector

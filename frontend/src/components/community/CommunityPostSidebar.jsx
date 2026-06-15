import { MessageSquare, Hash } from 'lucide-react'

export default function CommunityPostSidebar({ categories, activeCategoryId, onSelectCategory }) {
  return (
    <div className="w-full bg-[hsl(var(--admin-surface))] rounded-2xl border border-[hsl(var(--admin-border))] shadow-sm overflow-hidden sticky top-6">
      <div className="p-4 border-b border-[hsl(var(--admin-border))] bg-gradient-to-r from-blue-50/50 to-transparent">
        <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] flex items-center gap-2">
          <MessageSquare size={18} className="text-blue-500" />
          Chủ đề thảo luận
        </h3>
      </div>
      
      <div className="p-2 space-y-1">
        <button
          onClick={() => onSelectCategory('')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
            activeCategoryId === ''
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeCategoryId === '' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
            <Hash size={16} />
          </div>
          Tất cả bài viết
        </button>

        {categories.map((cat) => (
          <button
            key={cat._id}
            onClick={() => onSelectCategory(cat._id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              activeCategoryId === cat._id
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeCategoryId === cat._id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
              <Hash size={16} />
            </div>
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  )
}

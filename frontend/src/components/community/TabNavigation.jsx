import React from 'react';

const tabs = [
  { id: 'jobs', label: 'Doanh nghiệp tuyển dụng', icon: '💼' },
  { id: 'courses', label: 'Khóa học', icon: '📚' },
  { id: 'community', label: 'Chia sẻ kinh nghiệm', icon: '💬' },
  { id: 'events', label: 'Sự kiện & Tài trợ', icon: '🎯' }
];

export default function TabNavigation({ activeTab, onTabChange, counts }) {
  return (
    <div className="border-b border-[hsl(var(--border))]">
      <nav className="flex gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-[hsl(var(--primary))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
            {counts?.[tab.id] > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-[hsl(var(--muted))]">
                {counts[tab.id]}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--primary))]" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

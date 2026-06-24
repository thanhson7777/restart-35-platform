import React from 'react';
import { Briefcase, BookOpen, MessageSquare, CalendarDays } from 'lucide-react';

const tabs = [
  { id: 'community', label: 'Chia sẻ kinh nghiệm', icon: MessageSquare },
  { id: 'events', label: 'Sự kiện & Tài trợ', icon: CalendarDays }
];

export default function TabNavigation({ activeTab, onTabChange, counts }) {
  return (
    <div className="mb-8">
      <nav className="flex flex-wrap gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-[15px] font-semibold transition-all duration-200 border-2 ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-0.5'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500'} />
              {tab.label}
              {counts?.[tab.id] > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

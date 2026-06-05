import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { motion } from 'framer-motion';

export const ViewModeToggle = ({ mode, onChange }) => {
  return (
    <div className="relative flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
      {/* Sliding Highlight Pill */}
      <div className="absolute inset-y-1 left-1 right-1 pointer-events-none">
        <motion.div
          className="h-full rounded-lg bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50"
          animate={{
            width: 'calc(50% - 4px)',
            x: mode === 'grid' ? 0 : '100%',
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
        />
      </div>

      {/* Grid Mode Button */}
      <button
        onClick={() => onChange('grid')}
        className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-300 ${
          mode === 'grid'
            ? 'text-zinc-900 dark:text-white'
            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
        }`}
        aria-label="Grid view"
      >
        <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2.0} />
        <span>Lưới</span>
      </button>

      {/* List Mode Button */}
      <button
        onClick={() => onChange('list')}
        className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-300 ${
          mode === 'list'
            ? 'text-zinc-900 dark:text-white'
            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
        }`}
        aria-label="List view"
      >
        <List className="w-3.5 h-3.5" strokeWidth={2.0} />
        <span>Danh sách</span>
      </button>
    </div>
  );
};

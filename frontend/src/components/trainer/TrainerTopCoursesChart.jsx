import React from 'react';
import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const TrainerTopCoursesChart = ({ courses = [] }) => {
  // Sort courses by enrollmentCount (or currentStudents) and take top 5
  const topCourses = [...courses]
    .filter(c => c.status === 'approved' || c.status === 'published')
    .sort((a, b) => {
      const enrollsA = a.enrollmentCount || a.currentStudents || 0;
      const enrollsB = b.enrollmentCount || b.currentStudents || 0;
      return enrollsB - enrollsA;
    })
    .slice(0, 5)
    .map(c => ({
      name: c.title.length > 20 ? c.title.substring(0, 20) + '...' : c.title,
      fullTitle: c.title,
      students: c.enrollmentCount || c.currentStudents || 0
    }))
    .filter(c => c.students > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[hsl(var(--admin-surface))]/95 border border-[hsl(var(--admin-border))] p-3 rounded-xl shadow-xl backdrop-blur-md max-w-[200px]">
          <p className="text-sm font-bold text-[hsl(var(--admin-text-primary))] mb-1 line-clamp-2">
            {payload[0].payload.fullTitle}
          </p>
          <p className="text-sm font-medium text-sky-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            {payload[0].value} học viên
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <BezelCard className="flex flex-col h-full" padding="default">
        <div className="mb-2">
          <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Top Khóa học</h3>
          <p className="text-xs text-[hsl(var(--admin-text-secondary))] mt-1">Các khóa học đông học viên nhất</p>
        </div>

        <div className="h-72 w-full mt-4">
          {topCourses.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-[hsl(var(--admin-text-muted))] text-sm border border-dashed border-[hsl(var(--admin-border))] rounded-xl">
              Chưa có dữ liệu học viên.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topCourses}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--admin-border))" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--admin-text-secondary))', fontSize: 12 }}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--admin-surface-hover))' }} />
                <Bar dataKey="students" radius={[0, 6, 6, 0]} barSize={24}>
                  {topCourses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#0EA5E9" /> // Sky 500
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </BezelCard>
    </motion.div>
  );
};

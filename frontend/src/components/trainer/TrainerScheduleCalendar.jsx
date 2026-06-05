import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import viLocale from '@fullcalendar/core/locales/vi';

export const TrainerScheduleCalendar = ({ schedules = [], onSessionSelect }) => {
  // Convert schedules & their sessions into FullCalendar events
  const getEvents = () => {
    const events = [];
    schedules.forEach((schedule) => {
      const courseTitle = schedule.course?.title || schedule.title || 'Khóa học';
      const courseId = schedule.courseId;
      const scheduleId = schedule._id;

      if (schedule.sessions && schedule.sessions.length > 0) {
        schedule.sessions.forEach((session) => {
          // Construct client-side ISO strings for start and end time based on local date
          const dateObj = new Date(session.date);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;

          const start = `${dateStr}T${session.startTime || '08:00'}:00`;
          const end = `${dateStr}T${session.endTime || '10:00'}:00`;

          // Determine colors based on status
          let backgroundColor = '#3b82f6'; // blue-500 (scheduled)
          let borderColor = '#2563eb'; // blue-600
          let className = 'cursor-pointer hover:brightness-110 transition-all duration-150 ';

          if (session.status === 'completed') {
            backgroundColor = '#10b981'; // emerald-500
            borderColor = '#059669'; // emerald-600
          } else if (session.status === 'cancelled') {
            backgroundColor = '#ef4444'; // red-500
            borderColor = '#dc2626'; // red-600
            className += 'opacity-50 line-through ';
          } else if (session.status === 'in_progress') {
            backgroundColor = '#8b5cf6'; // purple-500
            borderColor = '#7c3aed'; // purple-600
          } else if (session.status === 'rescheduled') {
            backgroundColor = '#f59e0b'; // amber-500
            borderColor = '#d97706'; // amber-600
          }

          events.push({
            id: `${scheduleId}-${session.sessionNumber}`,
            title: `${courseTitle} - Buổi ${session.sessionNumber}`,
            start,
            end,
            backgroundColor,
            borderColor,
            className,
            extendedProps: {
              scheduleId,
              sessionNumber: session.sessionNumber,
              courseId,
              courseTitle,
              session
            }
          });
        });
      }
    });
    return events;
  };

  const handleEventClick = (info) => {
    if (onSessionSelect) {
      const props = info.event.extendedProps;
      onSessionSelect({
        scheduleId: props.scheduleId,
        sessionNumber: props.sessionNumber,
        courseId: props.courseId,
        courseTitle: props.courseTitle,
        session: props.session
      });
    }
  };

  return (
    <div className="trainer-calendar-wrapper overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-xl">
      <style>{`
        /* FullCalendar Tailwind overrides for Dark Mode */
        .trainer-calendar-wrapper .fc {
          --fc-border-color: #1f2937;
          --fc-page-bg-color: #111827;
          --fc-neutral-bg-color: #1f2937;
          --fc-list-event-hover-bg-color: #1f2937;
          font-family: inherit;
        }
        
        .trainer-calendar-wrapper .fc-header-toolbar {
          margin-bottom: 1.5rem !important;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .trainer-calendar-wrapper .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: #f9fafb !important;
        }

        /* Buttons styling */
        .trainer-calendar-wrapper .fc-button {
          background-color: #1f2937 !important;
          border-color: #374151 !important;
          color: #d1d5db !important;
          font-size: 0.875rem !important;
          font-weight: 500 !important;
          padding: 0.5rem 0.875rem !important;
          border-radius: 0.5rem !important;
          box-shadow: none !important;
          transition: all 150ms ease;
        }

        .trainer-calendar-wrapper .fc-button:hover {
          background-color: #374151 !important;
          border-color: #4b5563 !important;
          color: #ffffff !important;
        }

        .trainer-calendar-wrapper .fc-button-active {
          background-color: #001D4A !important;
          border-color: #001D4A !important;
          color: #ffffff !important;
        }

        .trainer-calendar-wrapper .fc-button-primary:disabled {
          opacity: 0.4 !important;
        }

        /* Group button spacing */
        .trainer-calendar-wrapper .fc-button-group {
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .trainer-calendar-wrapper .fc-button-group .fc-button {
          border-radius: 0 !important;
        }

        /* Day names header styling */
        .trainer-calendar-wrapper .fc-col-header-cell {
          background-color: #1e293b / 20;
          padding: 0.75rem 0 !important;
        }

        .trainer-calendar-wrapper .fc-col-header-cell-cushion {
          color: #9ca3af !important;
          font-size: 0.875rem !important;
          font-weight: 600 !important;
          text-decoration: none !important;
        }

        /* Day grid cells */
        .trainer-calendar-wrapper .fc-daygrid-day-number {
          color: #9ca3af !important;
          font-size: 0.875rem !important;
          font-weight: 500 !important;
          padding: 6px 10px !important;
          text-decoration: none !important;
        }

        .trainer-calendar-wrapper .fc-daygrid-day:hover {
          background-color: rgba(31, 41, 55, 0.2);
        }

        .trainer-calendar-wrapper .fc-day-today {
          background-color: rgba(0, 29, 74, 0.15) !important;
        }

        .trainer-calendar-wrapper .fc-day-today .fc-daygrid-day-number {
          color: #60a5fa !important;
          font-weight: 700 !important;
        }

        /* Event rendering design */
        .trainer-calendar-wrapper .fc-event {
          border-radius: 0.375rem !important;
          padding: 2px 4px !important;
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        }

        .trainer-calendar-wrapper .fc-event-title {
          font-weight: 600 !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* List View */
        .trainer-calendar-wrapper .fc-list {
          border-radius: 0.75rem !important;
          border-color: #1f2937 !important;
          background-color: #111827 !important;
        }

        .trainer-calendar-wrapper .fc-list-day-cushion {
          background-color: #1f2937 !important;
          padding: 0.75rem 1rem !important;
        }

        .trainer-calendar-wrapper .fc-list-day-text,
        .trainer-calendar-wrapper .fc-list-day-side-text {
          color: #f3f4f6 !important;
          font-weight: 600 !important;
          text-decoration: none !important;
          font-size: 0.875rem !important;
        }

        .trainer-calendar-wrapper .fc-list-event-time {
          color: #9ca3af !important;
          font-size: 0.875rem !important;
        }

        .trainer-calendar-wrapper .fc-list-event-title a {
          color: #f3f4f6 !important;
          font-weight: 600 !important;
          text-decoration: none !important;
        }

        .trainer-calendar-wrapper .fc-list-empty {
          background-color: #111827 !important;
          color: #9ca3af !important;
          padding: 3rem 1rem !important;
          font-size: 0.875rem !important;
        }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listWeek'
        }}
        events={getEvents()}
        eventClick={handleEventClick}
        height="auto"
        locale={viLocale}
        firstDay={1} // Monday
      />
    </div>
  );
};

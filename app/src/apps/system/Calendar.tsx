import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  color: string;
}

const EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Team Sync', date: new Date(), color: '#7c6bff' },
  { id: '2', title: 'AI Model Review', date: addDays(new Date(), 2), color: '#38bdf8' },
  { id: '3', title: 'WebGPU Demo', date: addDays(new Date(), 5), color: '#4ade80' },
  { id: '4', title: 'Code Review', date: addDays(new Date(), -1), color: '#fbbf24' },
  { id: '5', title: 'Release Planning', date: addDays(new Date(), 7), color: '#f87171' },
];

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const selectedEvents = EVENTS.filter((e) => isSameDay(e.date, selectedDate));
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-[#e8e8f0]">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 rounded-md text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 rounded-md text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            setCurrentMonth(new Date());
            setSelectedDate(new Date());
          }}
          className="text-[11px] text-[#7c6bff] hover:text-[#9b8fff] transition-colors"
        >
          Today
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 p-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-medium text-[#585870] py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-px">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const dayEvents = EVENTS.filter((e) => isSameDay(e.date, day));

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`relative h-10 rounded-lg text-[11px] transition-all flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'bg-[#7c6bff]/15 text-[#7c6bff]'
                      : isToday
                      ? 'bg-white/[0.04] text-[#e8e8f0] font-semibold'
                      : isCurrentMonth
                      ? 'text-[#e8e8f0] hover:bg-white/[0.04]'
                      : 'text-[#585870]'
                  }`}
                >
                  {format(day, 'd')}
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5">
                      {dayEvents.slice(0, 3).map((e, j) => (
                        <div
                          key={j}
                          className="w-1 h-1 rounded-full"
                          style={{ background: e.color }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar - Selected Day Events */}
        <div className="w-56 border-l border-white/[0.06] p-3 shrink-0 overflow-auto">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-[#7c6bff]" />
            <span className="text-xs font-medium text-[#e8e8f0]">
              {format(selectedDate, 'EEE, MMM d')}
            </span>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="text-[11px] text-[#585870] mt-4">No events</div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-2.5 rounded-lg border border-white/[0.06]"
                  style={{
                    borderLeft: `3px solid ${event.color}`,
                  }}
                >
                  <div className="text-[11px] font-medium text-[#e8e8f0]">
                    {event.title}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-[#585870]">
                    <Clock className="w-2.5 h-2.5" />
                    All day
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendar, type CalendarEvent } from '@/contexts/CalendarContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimpleTodoList } from '@/components/SimpleTodoList';
import { AssignmentsWidget, NotesWidget } from '@/components/DashboardWidgets';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function CalendarComponent() {
  const { events } = useCalendar();
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());

  const eventsByDay = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const grouped = new Map<number, CalendarEvent[]>();

    for (const event of events) {
      const eventDate = new Date(event.startTime);
      if (eventDate.getMonth() !== month || eventDate.getFullYear() !== year) {
        continue;
      }

      const dayEvents = grouped.get(eventDate.getDate());
      if (dayEvents) {
        dayEvents.push(event);
      } else {
        grouped.set(eventDate.getDate(), [event]);
      }
    }

    return grouped;
  }, [events, currentDate]);

  const getDaysInMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const days = Array<number | null>(firstDay.getDay()).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((date) => {
      const next = new Date(date);
      next.setMonth(date.getMonth() + (direction === 'prev' ? -1 : 1));
      return next;
    });
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const isCurrentMonth =
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  return (
    <Card
      className="bg-card border-border cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setLocation('/calendar')}
    >
      <CardHeader className="pb-3 bg-card">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {monthName} {currentDate.getFullYear()}
          </h3>
          <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-7 w-7 p-0 hover:bg-muted/50"
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-7 w-7 p-0 hover:bg-muted/50"
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="bg-card">
        <div className="space-y-1">
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="h-8" />;
              }

              const dayEvents = eventsByDay.get(day) ?? [];
              const isToday = isCurrentMonth && day === today.getDate();

              return (
                <div
                  key={`day-${day}`}
                  className={`h-8 flex items-center justify-center rounded cursor-pointer transition-colors ${
                    isToday
                      ? 'bg-foreground text-background font-semibold'
                      : 'bg-card text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className="text-sm">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-foreground mb-2">
            {greeting}{user?.displayName ? `, ${user.displayName}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">Here's what you have today</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AssignmentsWidget />
            <NotesWidget />
          </div>
          <CalendarComponent />
          <SimpleTodoList />
        </div>
      </div>
    </div>
  );
}

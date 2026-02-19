/**
 * Calendar Page — slim orchestrator.
 *
 * Logic lives in useCalendarPage(); UI in sub-components under ./calendar-page/.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

import { useCalendarPage } from './calendar-page/useCalendarPage';
import { AddEventDialog } from './calendar-page/AddEventDialog';
import { WeekView } from './calendar-page/WeekView';
import { MonthView } from './calendar-page/MonthView';
import { DayView } from './calendar-page/DayView';

export default function Calendar() {
  const cal = useCalendarPage();

  const weekDays = cal.getWeekDays();
  const calendarDays = cal.getCalendarDays();

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col py-4 px-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: Title */}
        <h2 className="text-2xl font-semibold text-foreground min-w-48">
          {cal.getHeaderTitle()}
        </h2>

        {/* Right: Navigation + Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={cal.goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={cal.goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={cal.goToToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={cal.handleSync}
            disabled={cal.isSyncing || cal.isCalendarLoading}
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${
                cal.isSyncing || cal.isCalendarLoading ? 'animate-spin' : ''
              }`}
            />
            {cal.isSyncing || cal.isCalendarLoading ? 'Syncing...' : 'Sync'}
          </Button>
          <AddEventDialog
            open={cal.isEventDialogOpen}
            onOpenChange={cal.setIsEventDialogOpen}
            newEvent={cal.newEvent}
            onFieldChange={cal.setNewEvent}
            onSubmit={cal.handleAddEvent}
          />
        </div>
      </div>

      {/* View: Week */}
      {cal.viewMode === 'week' && (
        <WeekView
          weekDays={weekDays}
          getEventsForDayInWeek={cal.getEventsForDayInWeek}
          getAllDayEventsForDay={cal.getAllDayEventsForDay}
          getEventStyle={cal.getEventStyle}
          onSelectDate={cal.setSelectedDate}
        />
      )}

      {/* View: Month */}
      {cal.viewMode === 'month' && (
        <MonthView
          calendarDays={calendarDays}
          currentDate={cal.currentDate}
          selectedDate={cal.selectedDate}
          getAllEventsForDate={cal.getAllEventsForDate}
          onSelectDate={cal.setSelectedDate}
        />
      )}

      {/* View: Day */}
      {cal.viewMode === 'day' && (
        <DayView
          currentDate={cal.currentDate}
          getEventsForDay={cal.getEventsForDayInWeek}
          getAllDayEventsForDay={cal.getAllDayEventsForDay}
          getEventStyle={cal.getEventStyle}
          onSelectDate={cal.setSelectedDate}
        />
      )}
    </div>
  );
}

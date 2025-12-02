"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateTimePickerProps {
  date?: Date
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showClear?: boolean
  minDate?: Date
}

// Generate hour options (12-hour format)
const hours = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
const minutes = [0, 15, 30, 45];

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = "Pick a date and time",
  className,
  disabled = false,
  showClear = true,
  minDate,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date);
  const [hour, setHour] = React.useState<number>(date ? (date.getHours() % 12 || 12) : 9);
  const [minute, setMinute] = React.useState<number>(date ? Math.floor(date.getMinutes() / 15) * 15 : 0);
  const [period, setPeriod] = React.useState<'AM' | 'PM'>(date ? (date.getHours() >= 12 ? 'PM' : 'AM') : 'AM');

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date);
      setHour(date.getHours() % 12 || 12);
      setMinute(Math.floor(date.getMinutes() / 15) * 15);
      setPeriod(date.getHours() >= 12 ? 'PM' : 'AM');
    } else {
      setSelectedDate(undefined);
    }
  }, [date]);

  const updateDateTime = (newDate?: Date, newHour?: number, newMinute?: number, newPeriod?: 'AM' | 'PM') => {
    const dateToUse = newDate ?? selectedDate;
    const hourToUse = newHour ?? hour;
    const minuteToUse = newMinute ?? minute;
    const periodToUse = newPeriod ?? period;

    if (!dateToUse) {
      onDateChange(undefined);
      return;
    }

    const result = new Date(dateToUse);
    let hours24 = hourToUse;
    if (periodToUse === 'PM' && hourToUse !== 12) {
      hours24 = hourToUse + 12;
    } else if (periodToUse === 'AM' && hourToUse === 12) {
      hours24 = 0;
    }
    result.setHours(hours24, minuteToUse, 0, 0);
    
    onDateChange(result);
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate);
    if (newDate) {
      updateDateTime(newDate, hour, minute, period);
    } else {
      onDateChange(undefined);
    }
  };

  const handleHourChange = (value: string) => {
    const newHour = parseInt(value);
    setHour(newHour);
    updateDateTime(selectedDate, newHour, minute, period);
  };

  const handleMinuteChange = (value: string) => {
    const newMinute = parseInt(value);
    setMinute(newMinute);
    updateDateTime(selectedDate, hour, newMinute, period);
  };

  const handlePeriodChange = (value: string) => {
    const newPeriod = value as 'AM' | 'PM';
    setPeriod(newPeriod);
    updateDateTime(selectedDate, hour, minute, newPeriod);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(undefined);
    onDateChange(undefined);
  };

  // Quick date presets
  const setToday = () => {
    const today = new Date();
    handleDateSelect(today);
  };

  const setTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    handleDateSelect(tomorrow);
  };

  const setNextWeek = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    handleDateSelect(nextWeek);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? (
              <span className="flex-1">
                {format(selectedDate, "PPP")} at {format(selectedDate, "h:mm a")}
              </span>
            ) : (
              <span className="flex-1">{placeholder}</span>
            )}
            {showClear && selectedDate && (
              <X 
                className="h-4 w-4 ml-2 opacity-50 hover:opacity-100" 
                onClick={handleClear}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={setToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={setTomorrow}>
                Tomorrow
              </Button>
              <Button variant="outline" size="sm" onClick={setNextWeek}>
                Next Week
              </Button>
            </div>
          </div>
          
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={minDate ? (date) => date < minDate : undefined}
            initialFocus
          />
          
          <div className="p-3 border-t">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Select value={hour.toString()} onValueChange={handleHourChange}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">:</span>
              <Select value={minute.toString()} onValueChange={handleMinuteChange}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

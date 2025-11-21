import { useState, useEffect } from 'react';
import { Clock, Globe, Calendar, X } from 'lucide-react';
import { getSessionFromDateTime, formatSessionDisplay, getSessionColor } from '@/constants/tradingSessions';

interface DateTimePickerProps {
  value: string | Date;
  onChange: (value: string) => void;
  label?: string;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'New York (EST/EDT)', flag: '🗽' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)', flag: '🏙️' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)', flag: '🌴' },
  { value: 'Europe/London', label: 'London (GMT/BST)', flag: '🏛️' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', flag: '🗼' },
  { value: 'Asia/Jerusalem', label: 'Israel (IST)', flag: '🇮🇱' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', flag: '🏜️' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', flag: '🗾' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', flag: '🏮' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', flag: '🦁' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)', flag: '🦘' },
  { value: 'system', label: 'My Local Time', flag: '📍' },
];

export default function DateTimePicker({ value, onChange, label = 'Date & Time' }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState('America/New_York');
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [detectedSession, setDetectedSession] = useState<string>('');

  // Initialize from value
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      
      // Format date for input (YYYY-MM-DD)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setDateValue(`${year}-${month}-${day}`);
      
      // Format time for input (HH:MM)
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      setTimeValue(`${hours}:${minutes}`);
      
      // Detect session
      updateSession(date);
    }
  }, [value]);

  // Update session when date/time changes
  const updateSession = (date: Date) => {
    const session = getSessionFromDateTime(date);
    setDetectedSession(session);
  };

  // Get display value
  const getDisplayValue = () => {
    if (!value) return 'Select date & time';
    
    const date = new Date(value);
    
    if (selectedTimezone === 'system') {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    return date.toLocaleString('en-US', {
      timeZone: selectedTimezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle save
  const handleSave = () => {
    if (!dateValue || !timeValue) return;
    
    // Combine date and time
    const dateTimeString = `${dateValue}T${timeValue}`;
    
    let finalDate: Date;
    
    if (selectedTimezone === 'system') {
      // Use local timezone
      finalDate = new Date(dateTimeString);
    } else {
      // Convert from selected timezone to UTC
      const tempDate = new Date(dateTimeString);
      
      // Get the time in the selected timezone
      const tzString = tempDate.toLocaleString('en-US', {
        timeZone: selectedTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Parse and create proper date
      finalDate = new Date(dateTimeString + ':00');
    }
    
    onChange(finalDate.toISOString());
    setIsOpen(false);
  };

  // Set to current time
  const setCurrentTime = () => {
    const now = new Date();
    
    if (selectedTimezone === 'system') {
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTimeValue(`${hours}:${minutes}`);
    } else {
      const tzTime = now.toLocaleString('en-US', {
        timeZone: selectedTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      setTimeValue(tzTime);
    }
    
    updateSession(now);
  };

  // Set to today
  const setToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    setDateValue(`${year}-${month}-${day}`);
  };

  // Set to yesterday
  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    setDateValue(`${year}-${month}-${day}`);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        {label} *
      </label>
      
      {/* Display Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-left text-zinc-300 hover:border-zinc-600 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <span>{getDisplayValue()}</span>
        </div>
        <Clock className="w-4 h-4 text-zinc-500" />
      </button>

      {/* Session Badge */}
      {detectedSession && (
        <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${getSessionColor(detectedSession)}`}>
          <span className="font-medium">
            Session: {formatSessionDisplay(detectedSession)}
          </span>
          <span className="text-zinc-500">(based on NY time)</span>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#C9A646]" />
                <h3 className="text-lg font-semibold text-white">Select Date & Time</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Timezone Selector */}
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                <Globe className="w-4 h-4" />
                Timezone:
              </label>
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#C9A646]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.flag} {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Select Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={setToday}
                className="px-4 py-2 bg-[#C9A646] hover:bg-[#B8962E] text-black rounded-lg text-sm font-medium transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={setYesterday}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
              >
                Yesterday
              </button>
            </div>

            {/* Date Input */}
            <div className="mb-4">
              <label className="text-sm text-zinc-400 mb-2 block">Date</label>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#C9A646]"
              />
            </div>

            {/* Time Input */}
            <div className="mb-4">
              <label className="text-sm text-zinc-400 mb-2 block">Time</label>
              <input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#C9A646]"
              />
              <button
                type="button"
                onClick={setCurrentTime}
                className="text-xs text-zinc-500 hover:text-zinc-300 mt-1 transition-colors"
              >
                Use current time
              </button>
            </div>

            {/* Preview */}
            <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="text-xs text-zinc-500 mb-1">Preview ({selectedTimezone === 'system' ? 'Local' : TIMEZONES.find(tz => tz.value === selectedTimezone)?.label})</div>
              <div className="text-lg font-semibold text-white">
                {dateValue && timeValue ? (
                  <>
                    {new Date(`${dateValue}T${timeValue}`).toLocaleString('en-US', {
                      timeZone: selectedTimezone === 'system' ? undefined : selectedTimezone,
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                ) : (
                  'Select date and time'
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!dateValue || !timeValue}
                className="flex-1 px-4 py-2.5 bg-[#C9A646] hover:bg-[#B8962E] disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-lg font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
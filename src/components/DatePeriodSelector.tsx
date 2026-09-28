import React from 'react';
import { Calendar as CalendarIcon, Clock, Filter, AlertTriangle } from 'lucide-react';
import { SelectedPeriod, PeriodMode } from '../types';
import { formatDisplayDate } from '../utils/dateUtils';

interface DatePeriodSelectorProps {
  minDate: string;
  maxDate: string;
  uniqueDateCount: number;
  selectedPeriod: SelectedPeriod;
  onPeriodChange: (period: SelectedPeriod) => void;
  onRunComparison: () => void;
  isProcessing: boolean;
  canRun: boolean;
}

export const DatePeriodSelector: React.FC<DatePeriodSelectorProps> = ({
  minDate,
  maxDate,
  uniqueDateCount,
  selectedPeriod,
  onPeriodChange,
  onRunComparison,
  isProcessing,
  canRun,
}) => {
  const handleQuickSelect = (mode: PeriodMode) => {
    if (!minDate || !maxDate) return;

    if (mode === 'day') {
      onPeriodChange({
        mode: 'day',
        fromDate: maxDate, // Default to max date
        toDate: maxDate,
        label: `Single Day (${formatDisplayDate(maxDate)})`,
      });
    } else if (mode === 'month') {
      onPeriodChange({
        mode: 'month',
        fromDate: minDate,
        toDate: maxDate,
        label: `Full Month (${formatDisplayDate(minDate)} – ${formatDisplayDate(maxDate)})`,
      });
    } else {
      onPeriodChange({
        mode,
        fromDate: minDate,
        toDate: maxDate,
        label: `${formatDisplayDate(minDate)} – ${formatDisplayDate(maxDate)}`,
      });
    }
  };

  const handleCustomDateChange = (from: string, to: string) => {
    onPeriodChange({
      mode: 'custom',
      fromDate: from,
      toDate: to,
      label: from === to ? formatDisplayDate(from) : `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Period Selection</h3>
            <p className="text-xs text-slate-500">
              Select reporting period. Only Task Report entries within this window will be aggregated.
            </p>
          </div>
        </div>

        {/* Available Dates Banner */}
        {minDate && maxDate ? (
          <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-600">Report Available Dates:</span>
            <span className="font-bold text-slate-900 font-mono">
              {minDate === maxDate
                ? formatDisplayDate(minDate)
                : `${formatDisplayDate(minDate)} – ${formatDisplayDate(maxDate)}`}
            </span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded-full text-[11px]">
              {uniqueDateCount} {uniqueDateCount === 1 ? 'day' : 'days'}
            </span>
          </div>
        ) : (
          <div className="px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Upload Task Report to auto-detect date range</span>
          </div>
        )}
      </div>

      <div className="pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Quick Period Buttons */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Quick Preset
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'day', label: 'Single Day' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Full Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map((preset) => {
              const isSelected = selectedPeriod.mode === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleQuickSelect(preset.id as PeriodMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Pickers */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={selectedPeriod.fromDate}
              onChange={(e) => handleCustomDateChange(e.target.value, selectedPeriod.toDate)}
              className="px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="text-slate-400 pt-4">→</div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={selectedPeriod.toDate}
              onChange={(e) => handleCustomDateChange(selectedPeriod.fromDate, e.target.value)}
              className="px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Run Comparison Trigger Button */}
          <div className="pt-4">
            <button
              onClick={onRunComparison}
              disabled={!canRun || isProcessing}
              className={`px-6 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                canRun && !isProcessing
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/20 active:scale-98'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Run Comparison</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

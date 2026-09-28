import React from 'react';
import { Check, Loader2 } from 'lucide-react';

interface ProcessingModalProps {
  isOpen: boolean;
  currentStepIndex: number;
}

export const PROCESSING_STEPS = [
  'Reading Task Report',
  'Reading Hours Billing Report',
  'Reading Count Billing Report',
  'Validating Column Schema',
  'Normalizing Task Names & Categories',
  'Filtering Selected Date Range',
  'Calculating Expected Hours (Task Level)',
  'Calculating Employee Headcount (HC Rules)',
  'Reconciling Hours Billing Data',
  'Reconciling Count Billing Data',
  'Detecting Duplicate Task Entries',
  'Detecting Missing Projects & Categories',
  'Detecting Unapproved Task Records',
  'Synthesizing Validation Report Dashboard',
];

export const ProcessingModal: React.FC<ProcessingModalProps> = ({ isOpen, currentStepIndex }) => {
  if (!isOpen) return null;

  const progressPercent = Math.min(100, Math.round(((currentStepIndex + 1) / PROCESSING_STEPS.length) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Processing Reports</h3>
          <p className="text-xs text-slate-500">
            Running 14-step high precision reconciliation engine...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700">Progress</span>
            <span className="text-emerald-700 font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stepper List */}
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-2 bg-slate-50 rounded-2xl border border-slate-200">
          {PROCESSING_STEPS.map((stepName, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={idx}
                className={`flex items-center space-x-3 text-xs p-2 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-white font-bold text-emerald-900 shadow-xs border border-emerald-200'
                    : isDone
                    ? 'text-slate-600'
                    : 'text-slate-400 opacity-60'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                </div>
                <span className="truncate">{stepName}</span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

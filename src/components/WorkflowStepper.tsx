import React from 'react';
import { Upload, Calendar, Play, FileCheck, Check } from 'lucide-react';

interface WorkflowStepperProps {
  currentStep: 1 | 2 | 3 | 4;
  onStepClick: (step: 1 | 2 | 3 | 4) => void;
  filesReady: boolean;
  hasResults: boolean;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  onStepClick,
  filesReady,
  hasResults,
}) => {
  const steps = [
    {
      num: 1,
      title: 'Step 1 — Upload Reports',
      desc: 'Task, Hours & Count Files',
      icon: Upload,
      available: true,
    },
    {
      num: 2,
      title: 'Step 2 — Select Period',
      desc: 'Day, Week, Month, Custom',
      icon: Calendar,
      available: filesReady,
    },
    {
      num: 3,
      title: 'Step 3 — Compare',
      desc: 'Run Reconciliation Engine',
      icon: Play,
      available: filesReady,
    },
    {
      num: 4,
      title: 'Step 4 — Validation Report',
      desc: 'Review Mismatches & Export',
      icon: FileCheck,
      available: hasResults,
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs py-3 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between w-full flex-wrap gap-2 md:gap-0">
            {steps.map((step, idx) => {
              const isCurrent = currentStep === step.num;
              const isCompleted = step.num < currentStep || (step.num === 4 && hasResults);
              const Icon = step.icon;

              return (
                <li key={step.num} className="flex-1 min-w-[200px] relative">
                  <button
                    onClick={() => step.available && onStepClick(step.num as 1 | 2 | 3 | 4)}
                    disabled={!step.available}
                    className={`w-full flex items-center p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-sm'
                        : isCompleted
                        ? 'bg-slate-50 border-slate-300 text-slate-900 hover:bg-slate-100'
                        : step.available
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        : 'bg-slate-50/60 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs mr-3 transition-colors ${
                        isCurrent
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-bold tracking-tight truncate ${
                          isCurrent ? 'text-emerald-900' : 'text-slate-800'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{step.desc}</p>
                    </div>
                  </button>

                  {idx < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 z-10 text-slate-300">
                      →
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
};

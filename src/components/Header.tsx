import React from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Printer,
  Download,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';

interface HeaderProps {
  onTrySampleData: () => void;
  onDownloadSamples: () => void;
  onReset: () => void;
  onOpenPrintReport: () => void;
  hasResults: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onTrySampleData,
  onDownloadSamples,
  onReset,
  onOpenPrintReport,
  hasResults,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-xl shadow-lg shadow-purple-500/20 text-white flex items-center justify-center">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                  Performance Summary Validator
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Enterprise Performance v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                <span>Task Hours & Headcount Validation Engine</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 italic font-mono text-[11px]">Billable • Idle • Rework • Non-Billable • Absent</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onDownloadSamples}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shadow-sm gap-1.5 cursor-pointer"
              title="Download sample templates for Task, Hours & Count Reports"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Sample Templates</span>
            </button>

            <button
              onClick={onTrySampleData}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-lg transition-all shadow-md shadow-emerald-950/40 gap-1.5 cursor-pointer"
              title="Load realistic demo dataset with 20+ projects, 150+ employees"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
              <span>Try Demo Data</span>
            </button>

            {hasResults && (
              <>
                <button
                  onClick={onOpenPrintReport}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-200 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/50 rounded-lg transition-colors gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Validation Report</span>
                </button>

                <button
                  onClick={onReset}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors gap-1.5 cursor-pointer"
                  title="Reset all uploaded reports & calculations"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

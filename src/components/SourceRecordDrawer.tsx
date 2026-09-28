import React from 'react';
import { X, FileSpreadsheet, CheckCircle2, AlertCircle, Clock, User, Calendar, Tag } from 'lucide-react';
import { TaskRecord, MismatchItem } from '../types';
import { formatMinutesToDuration } from '../utils/timeUtils';

interface SourceRecordDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mismatchItem?: MismatchItem | null;
  title?: string;
  projectName?: string;
  taskCategory?: string;
  records: TaskRecord[];
}

export const SourceRecordDrawer: React.FC<SourceRecordDrawerProps> = ({
  isOpen,
  onClose,
  mismatchItem,
  title,
  projectName,
  taskCategory,
  records,
}) => {
  if (!isOpen) return null;

  const displayProj = mismatchItem?.projectName || projectName || 'Project Audit';
  const displayTask = mismatchItem?.taskCategory || taskCategory || 'All Tasks';

  const totalMins = records.reduce((sum, r) => sum + r.totalMinutes, 0);
  const totalHc = records.reduce((sum, r) => sum + r.calculatedHc, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden">
        
        {/* Drawer Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Source Record Investigation
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">{displayProj}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>Category: <strong className="text-slate-200">{displayTask}</strong></span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-5">
          
          {/* Mismatch Context Card if opened from mismatch */}
          {mismatchItem && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Mismatch Details ({mismatchItem.type} Discrepancy)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded-full">
                  MISMATCH
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div className="bg-white p-2 rounded-xl border border-red-100 text-center">
                  <p className="text-[10px] text-slate-500">Expected</p>
                  <p className="font-bold text-slate-900 font-mono">{mismatchItem.expectedRaw}</p>
                </div>
                <div className="bg-white p-2 rounded-xl border border-red-100 text-center">
                  <p className="text-[10px] text-slate-500">Reported</p>
                  <p className="font-bold text-slate-900 font-mono">{mismatchItem.reportedRaw}</p>
                </div>
                <div className="bg-white p-2 rounded-xl border border-red-100 text-center">
                  <p className="text-[10px] text-slate-500">Difference</p>
                  <p className="font-bold text-red-600 font-mono">{mismatchItem.differenceRaw}</p>
                </div>
              </div>
            </div>
          )}

          {/* Aggregated Totals Summary for Filtered Records */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-700">Underlying Task Records:</span>
              <span className="font-bold text-slate-900">{records.length} entries</span>
            </div>
            <div className="flex items-center space-x-3 font-mono font-bold text-slate-900">
              <span>Sum Hours: {formatMinutesToDuration(totalMins)}</span>
              <span>•</span>
              <span>Sum HC: {totalHc.toFixed(2)}</span>
            </div>
          </div>

          {/* Employee Task Records Table */}
          {records.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <FileSpreadsheet className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-xs font-semibold">No Task Report records found for this category/period.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                    <th className="p-3">Emp No</th>
                    <th className="p-3">Employee Name</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Task Name</th>
                    <th className="p-3 text-right">Hours</th>
                    <th className="p-3 text-center">Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {records.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-medium text-slate-800">{r.employeeNo}</td>
                      <td className="p-3 font-semibold text-slate-900">{r.employeeName}</td>
                      <td className="p-3 font-mono text-slate-600">{r.date}</td>
                      <td className="p-3 text-slate-700 max-w-[150px] truncate" title={r.taskName}>
                        {r.taskName}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900 text-right">
                        {r.totalHoursRaw}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.approvalStatus === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.approvalStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Close Investigation
          </button>
        </div>

      </div>
    </div>
  );
};

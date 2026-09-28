import React from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { FullComparisonReport } from '../types';
import { formatMinutesToDuration, formatHc } from '../utils/timeUtils';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: FullComparisonReport;
  taskFileName?: string;
  hoursFileName?: string;
  countFileName?: string;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  report,
  taskFileName = 'Task_Report.xlsx',
  hoursFileName = 'Hours_Billing.xlsx',
  countFileName = 'Count_Billing.xlsx',
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col justify-between overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 no-print">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Executive Validation Report</h3>
              <p className="text-xs text-slate-400">Printable & Exportable Reconciliation Audit</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-6 bg-white text-slate-900" id="printable-report">
          
          {/* Document Title Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Task Billing Validation Report</h1>
              <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">
                Hours & Count Reconciliation Executive Audit
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-slate-900">Generated: {new Date(report.timestamp).toLocaleString()}</p>
              <p className="text-slate-600">Period: <strong className="text-emerald-700">{report.period.label}</strong></p>
            </div>
          </div>

          {/* Files Audited Info */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Task Report:</span>
              <span className="font-mono text-slate-800 font-bold truncate block">{taskFileName}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Hours Billing:</span>
              <span className="font-mono text-slate-800 font-bold truncate block">{hoursFileName}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Count Billing:</span>
              <span className="font-mono text-slate-800 font-bold truncate block">{countFileName}</span>
            </div>
          </div>

          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-slate-100 rounded-xl text-center border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Projects</span>
              <p className="text-lg font-bold text-slate-900">{report.summary.totalProjects}</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-center border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Employees</span>
              <p className="text-lg font-bold text-slate-900">{report.summary.totalEmployees}</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-center border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Expected Hours</span>
              <p className="text-lg font-bold font-mono text-slate-900">{formatMinutesToDuration(report.summary.totalExpectedMinutes)}</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-center border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Expected HC</span>
              <p className="text-lg font-bold font-mono text-slate-900">{formatHc(report.summary.totalExpectedHc)}</p>
            </div>
          </div>

          {/* Reconciliation Status Grid */}
          <div className="p-4 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Reconciliation Audit Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-900 font-medium">Hours Matched</span>
                <span className="font-bold text-emerald-800 font-mono">{report.summary.hoursMatchedCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-red-50 rounded-xl border border-red-200">
                <span className="text-red-900 font-medium">Hours Mismatched</span>
                <span className="font-bold text-red-800 font-mono">{report.summary.hoursMismatchedCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-teal-50 rounded-xl border border-teal-200">
                <span className="text-teal-900 font-medium">Count Matched</span>
                <span className="font-bold text-teal-800 font-mono">{report.summary.countMatchedCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-red-50 rounded-xl border border-red-200">
                <span className="text-red-900 font-medium">Count Mismatched</span>
                <span className="font-bold text-red-800 font-mono">{report.summary.countMismatchedCount}</span>
              </div>
            </div>
          </div>

          {/* Mismatch Highlights Table */}
          {report.mismatches.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-600" /> Discrepancies Requiring Investigation ({report.mismatches.length})
              </h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <th className="p-2">Project</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Type</th>
                    <th className="p-2 text-right">Expected</th>
                    <th className="p-2 text-right">Reported</th>
                    <th className="p-2 text-right">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.mismatches.slice(0, 15).map((m, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-semibold text-slate-900">{m.projectName}</td>
                      <td className="p-2 text-slate-700">{m.taskCategory}</td>
                      <td className="p-2 text-slate-600">{m.type}</td>
                      <td className="p-2 font-mono text-right font-bold">{m.expectedRaw}</td>
                      <td className="p-2 font-mono text-right font-bold">{m.reportedRaw}</td>
                      <td className="p-2 font-mono text-right font-bold text-red-600">{m.differenceRaw}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signoff Footer */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">QA / Operations Auditor Signature:</p>
              <div className="h-12 border-b border-slate-300 mt-2" />
              <p className="mt-1 text-[11px] text-slate-400">Date: ________________________</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Billing Manager Approval:</p>
              <div className="h-12 border-b border-slate-300 mt-2" />
              <p className="mt-1 text-[11px] text-slate-400">Date: ________________________</p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Close Preview
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>

      </div>
    </div>
  );
};

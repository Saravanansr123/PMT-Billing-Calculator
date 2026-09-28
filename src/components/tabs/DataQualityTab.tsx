import React, { useState } from 'react';
import { Copy, AlertCircle, ShieldAlert, FileQuestion, Check, ArrowRight, Eye } from 'lucide-react';
import { FullComparisonReport, TaskRecord } from '../../types';
import { formatMinutesToDuration, formatHc } from '../../utils/timeUtils';

interface DataQualityTabProps {
  report: FullComparisonReport;
  onNavigateTab: (tabId: string) => void;
  onOpenSourceDrawer: (records: TaskRecord[], projName: string, taskCat?: string) => void;
}

export const DataQualityTab: React.FC<DataQualityTabProps> = ({
  report,
  onNavigateTab,
  onOpenSourceDrawer,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'duplicates' | 'missing' | 'unapproved' | 'unknown'>('duplicates');

  const { duplicates, missingRecords, unapprovedTasks, unknownTasks } = report;

  return (
    <div className="space-y-6">
      
      {/* Sub Tab Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        <button
          onClick={() => setActiveSubTab('duplicates')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeSubTab === 'duplicates'
              ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Duplicate Records</span>
            <Copy className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900">{duplicates.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Identified identical entries</p>
        </button>

        <button
          onClick={() => setActiveSubTab('missing')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeSubTab === 'missing'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Missing Records</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900">{missingRecords.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Unmatched project & task categories</p>
        </button>

        <button
          onClick={() => setActiveSubTab('unapproved')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeSubTab === 'unapproved'
              ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20 text-red-950 shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Unapproved Tasks</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900">{unapprovedTasks.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Pending or unapproved status</p>
        </button>

        <button
          onClick={() => setActiveSubTab('unknown')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeSubTab === 'unknown'
              ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20 text-purple-950 shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Unmapped Tasks</span>
            <FileQuestion className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900">{unknownTasks.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Tasks requiring category mapping</p>
        </button>

      </div>

      {/* Sub Tab Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        
        {/* 1. DUPLICATE RECORDS */}
        {activeSubTab === 'duplicates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Duplicate Task Log Entries</h3>
                <p className="text-xs text-slate-500">
                  Detected entries with matching Date + Employee No + Project + Task + Hours. Inspect before deleting.
                </p>
              </div>
            </div>

            {duplicates.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Check className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="font-semibold text-xs text-slate-700">No duplicate records detected in this period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Date</th>
                      <th className="p-3">Emp No</th>
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Project</th>
                      <th className="p-3">Task Name</th>
                      <th className="p-3 text-right">Hours</th>
                      <th className="p-3 text-center">Duplicate Count</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {duplicates.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-600">{d.date}</td>
                        <td className="p-3 font-mono font-semibold text-slate-800">{d.employeeNo}</td>
                        <td className="p-3 font-semibold text-slate-900">{d.employeeName}</td>
                        <td className="p-3 text-slate-700">{d.projectName}</td>
                        <td className="p-3 text-slate-800">{d.taskName}</td>
                        <td className="p-3 font-mono font-bold text-slate-900 text-right">{d.hours}</td>
                        <td className="p-3 text-center font-bold text-indigo-700">{d.count}x</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => onOpenSourceDrawer(d.records, d.projectName, d.taskName)}
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                          >
                            Inspect Copies
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. MISSING RECORDS */}
        {activeSubTab === 'missing' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Missing & Unraised Records</h3>
              <p className="text-xs text-slate-500">
                Projects or task categories present in Task Report but missing in Billing Reports, or vice versa.
              </p>
            </div>

            {missingRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Check className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="font-semibold text-xs text-slate-700">All projects and task categories match alignment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Type</th>
                      <th className="p-3">Project Name</th>
                      <th className="p-3">Task Category</th>
                      <th className="p-3">Audit Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {missingRecords.map((mr, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {mr.type}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">{mr.projectName}</td>
                        <td className="p-3 font-semibold text-slate-800">{mr.taskCategory || 'N/A'}</td>
                        <td className="p-3 text-slate-600">{mr.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. UNAPPROVED TASKS */}
        {activeSubTab === 'unapproved' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Unapproved Task Entries</h3>
              <p className="text-xs text-slate-500">
                Task entries included in calculations whose Approval Status is not 'Approved'. Flagged for QA compliance.
              </p>
            </div>

            {unapprovedTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Check className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="font-semibold text-xs text-slate-700">100% of task records have Approved status.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[450px] custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Emp No</th>
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Team</th>
                      <th className="p-3">Project</th>
                      <th className="p-3">Task Name</th>
                      <th className="p-3 text-right">Hours</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {unapprovedTasks.map((u, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/50">
                        <td className="p-3 font-mono text-slate-600">{u.date}</td>
                        <td className="p-3 font-mono font-semibold text-slate-800">{u.employeeNo}</td>
                        <td className="p-3 font-semibold text-slate-900">{u.employeeName}</td>
                        <td className="p-3 text-slate-600">{u.team}</td>
                        <td className="p-3 text-slate-800">{u.projectName}</td>
                        <td className="p-3 text-slate-700">{u.taskName}</td>
                        <td className="p-3 font-mono font-bold text-slate-900 text-right">{u.totalHoursRaw}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {u.approvalStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. UNKNOWN / UNMAPPED TASKS */}
        {activeSubTab === 'unknown' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Unmapped Task Names</h3>
                <p className="text-xs text-slate-500">
                  Task names detected in Task Report that are not currently in your Task Mapping table.
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('configuration')}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer self-start"
              >
                <span>Configure Mappings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {unknownTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Check className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="font-semibold text-xs text-slate-700">All task names successfully mapped!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Unmapped Task Name</th>
                      <th className="p-3 text-center">Record Count</th>
                      <th className="p-3 text-right">Total Hours</th>
                      <th className="p-3 text-right">Estimated HC</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unknownTasks.map((ut, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/40">
                        <td className="p-3 font-bold text-purple-950">{ut.taskName}</td>
                        <td className="p-3 text-center font-mono font-semibold">{ut.recordCount} records</td>
                        <td className="p-3 font-mono font-bold text-right">{formatMinutesToDuration(ut.totalMinutes)}</td>
                        <td className="p-3 font-mono font-bold text-right text-purple-700">{formatHc(ut.estimatedHc)}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => onNavigateTab('configuration')}
                            className="px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors cursor-pointer"
                          >
                            + Map Task Now
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};

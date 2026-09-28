import React, { useState } from 'react';
import { Search, Users, UserCheck, UserX, HelpCircle, Download } from 'lucide-react';
import { FullComparisonReport } from '../../types';
import { formatMinutesToDuration, formatHc } from '../../utils/timeUtils';
import { exportCsvReport } from '../../services/exportService';

interface EmployeeReconcileTabProps {
  report: FullComparisonReport;
}

export const EmployeeReconcileTab: React.FC<EmployeeReconcileTabProps> = ({ report }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Absent' | 'Unaccounted'>('ALL');

  const recon = report.employeeReconciliation;
  const employees = recon.employees;

  const filtered = employees.filter((e) => {
    const matchesSearch =
      e.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employeeNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.team.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportCsv = () => {
    const headers = ['Employee No', 'Employee Name', 'Team', 'Days Worked', 'Total Hours', 'Total HC', 'Status', 'Projects'];
    const rows: (string | number)[][] = [headers];
    filtered.forEach((e) => {
      rows.push([
        e.employeeNo,
        e.employeeName,
        e.team,
        e.daysWorked,
        formatMinutesToDuration(e.totalHoursMinutes),
        formatHc(e.totalHc),
        e.status,
        e.projects.join('; '),
      ]);
    });
    exportCsvReport(rows, `Employee_Reconciliation_${report.period.fromDate}_to_${report.period.toDate}.csv`);
  };

  const isMathValid = recon.activeCount + recon.absentCount + recon.unaccountedCount === recon.totalEmployees;

  return (
    <div className="space-y-6">
      
      {/* Metric Cards Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Employee-Level Reconciliation</h3>
            <p className="text-xs text-slate-500">
              Aggregated resource metrics across logged task entries for selected date period.
            </p>
          </div>
          {isMathValid && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/60 self-start">
              ✓ Reconciliation Equation Valid: Active ({recon.activeCount}) + Absent ({recon.absentCount}) + Unaccounted ({recon.unaccountedCount}) = Total ({recon.totalEmployees})
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Employees</p>
              <p className="text-lg font-bold font-mono text-slate-900">{recon.totalEmployees}</p>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/60 flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-800 uppercase">Active</p>
              <p className="text-lg font-bold font-mono text-emerald-950">{recon.activeCount}</p>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/60 flex items-center space-x-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-800 uppercase">Absent</p>
              <p className="text-lg font-bold font-mono text-amber-950">{recon.absentCount}</p>
            </div>
          </div>

          <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200/60 flex items-center space-x-3">
            <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-purple-800 uppercase">Unaccounted</p>
              <p className="text-lg font-bold font-mono text-purple-950">{recon.unaccountedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee no, name, team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'Active' | 'Absent' | 'Unaccounted')}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Employees ({employees.length})</option>
              <option value="Active">Active Only ({recon.activeCount})</option>
              <option value="Absent">Absent Only ({recon.absentCount})</option>
              <option value="Unaccounted">Unaccounted ({recon.unaccountedCount})</option>
            </select>

            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Emp No</th>
                  <th className="p-3.5">Employee Name</th>
                  <th className="p-3.5">Team</th>
                  <th className="p-3.5 text-center">Days Worked</th>
                  <th className="p-3.5 text-right">Total Hours</th>
                  <th className="p-3.5 text-right">Total HC Generated</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5">Projects Worked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold text-xs">No employee records match search.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((e, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-900">{e.employeeNo}</td>
                      <td className="p-3.5 font-semibold text-slate-900">{e.employeeName}</td>
                      <td className="p-3.5 text-slate-600">{e.team}</td>
                      <td className="p-3.5 text-center font-mono font-semibold">{e.daysWorked} days</td>
                      <td className="p-3.5 font-mono font-bold text-slate-900 text-right">
                        {formatMinutesToDuration(e.totalHoursMinutes)}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-teal-700 text-right">
                        {formatHc(e.totalHc)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            e.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : e.status === 'Absent'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-[200px] truncate" title={e.projects.join(', ')}>
                        {e.projects.join(', ')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

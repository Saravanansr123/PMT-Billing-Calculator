import React, { useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Calendar, Layers, UserCheck } from 'lucide-react';
import { UploadedFileStatus } from '../types';

interface FileUploadSectionProps {
  taskFileStatus: UploadedFileStatus;
  hoursFileStatus: UploadedFileStatus;
  countFileStatus: UploadedFileStatus;
  onFileUpload: (type: 'task' | 'hours' | 'count', file: File) => void;
  onFileRemove: (type: 'task' | 'hours' | 'count') => void;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  taskFileStatus,
  hoursFileStatus,
  countFileStatus,
  onFileUpload,
  onFileRemove,
}) => {
  const taskInputRef = useRef<HTMLInputElement>(null);
  const hoursInputRef = useRef<HTMLInputElement>(null);
  const countInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (type: 'task' | 'hours' | 'count', e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(type, e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderUploadCard = (
    title: string,
    description: string,
    status: UploadedFileStatus,
    type: 'task' | 'hours' | 'count',
    inputRef: React.RefObject<HTMLInputElement | null>,
    badgeColor: string
  ) => {
    const isUploaded = !!status.file || status.rowCount > 0;
    const isError = !status.isValid && isUploaded;

    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(type, e)}
        className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden flex flex-col justify-between ${
          isError
            ? 'border-red-300 ring-2 ring-red-500/10 bg-red-50/20'
            : isUploaded
            ? 'border-emerald-300 ring-2 ring-emerald-500/10 bg-emerald-50/10'
            : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
        }`}
      >
        <div className="p-5">
          {/* Card Top Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <span className={`w-3 h-3 rounded-full ${badgeColor}`} />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
            </div>
            {isUploaded && status.isValid && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            )}
            {isError && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                <AlertCircle className="w-3.5 h-3.5" /> Validation Failed
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 mb-4 leading-relaxed">{description}</p>

          <input
            type="file"
            ref={inputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onFileUpload(type, e.target.files[0]);
              }
            }}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          {!isUploaded ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-100/60 transition-colors group"
            >
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 flex items-center justify-center transition-colors mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                Click to browse or drag & drop file
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Supports .xlsx, .xls, .csv</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{status.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {formatFileSize(status.size)} • {status.rowCount.toLocaleString()} rows
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onFileRemove(type)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Detected Date Range for Task Report */}
              {status.detectedDateRange && (
                <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/80 rounded-lg border border-emerald-200/60 text-xs">
                  <div className="flex items-center space-x-2 text-emerald-900 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Detected Dates:</span>
                  </div>
                  <span className="font-semibold text-emerald-800 font-mono text-[11px]">
                    {status.detectedDateRange.min} → {status.detectedDateRange.max} ({status.detectedDateRange.uniqueCount} days)
                  </span>
                </div>
              )}

              {/* Detected Columns Badges */}
              {status.columns.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-400" /> Detected Columns ({status.columns.length})
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar p-1.5 bg-slate-50/50 rounded-lg border border-slate-100">
                    {status.columns.slice(0, 10).map((col, i) => (
                      <span key={i} className="px-1.5 py-0.5 text-[10px] font-mono bg-white text-slate-700 border border-slate-200 rounded">
                        {col}
                      </span>
                    ))}
                    {status.columns.length > 10 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded">
                        +{status.columns.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Error messages if validation failed */}
              {isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-red-800 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-red-600" /> File validation failed
                  </p>
                  {status.missingColumns.length > 0 && (
                    <p className="text-red-700">
                      Missing required column(s): <span className="font-mono font-semibold">{status.missingColumns.join(', ')}</span>
                    </p>
                  )}
                  {status.errors.map((err, idx) => (
                    <p key={idx} className="text-red-600 text-[11px]">• {err}</p>
                  ))}
                  <p className="text-slate-600 text-[11px] pt-1 italic">
                    Tip: Ensure headers match standard terms (Date, Project Name, Employee No, Total Hours, etc.).
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Report File Uploads</h2>
            <p className="text-xs text-slate-500">
              Upload the 3 source reports to automatically validate column structures and reconcile hours & headcount.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderUploadCard(
            'Task Report',
            'Employee-level detailed log containing Date, Project, Task Name, Hours & Approval Status.',
            taskFileStatus,
            'task',
            taskInputRef,
            'bg-blue-500'
          )}
          {renderUploadCard(
            'Hours Billing Report',
            'Project-level summary containing billing task categories and total reported hours.',
            hoursFileStatus,
            'hours',
            hoursInputRef,
            'bg-indigo-500'
          )}
          {renderUploadCard(
            'Count Billing Report',
            'Project-level summary containing billing task categories and reported Headcount (HC).',
            countFileStatus,
            'count',
            countInputRef,
            'bg-emerald-500'
          )}
        </div>
      </div>
    </div>
  );
};

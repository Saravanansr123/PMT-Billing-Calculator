/**
 * Flexible column normalization utility.
 * Matches input column names against expected logical fields ignoring capitalization, spaces, underscores.
 */

export interface LogicalColumnDefinition {
  key: string;
  label: string;
  aliases: string[];
  required: boolean;
}

export const TASK_REPORT_REQUIRED_COLUMNS: LogicalColumnDefinition[] = [
  {
    key: 'date',
    label: 'Date',
    aliases: ['date', 'task_date', 'entry_date', 'work_date', 'report_date'],
    required: true,
  },
  {
    key: 'employeeNo',
    label: 'Employee No',
    aliases: ['employee_no', 'employeeno', 'emp_no', 'empno', 'employee_code', 'emp_id', 'employee_id', 'mployeen', 'mployeeno', 'employeen'],
    required: true,
  },
  {
    key: 'employeeName',
    label: 'Name',
    aliases: ['name', 'employee_name', 'employeename', 'emp_name', 'resource_name', 'user_name'],
    required: true,
  },
  {
    key: 'team',
    label: 'Team',
    aliases: ['team', 'team_name', 'department', 'group'],
    required: true,
  },
  {
    key: 'projectName',
    label: 'Project Name',
    aliases: ['project_name', 'projectname', 'project', 'proj_name', 'account', 'rojectnam', 'rojectname', 'projectnam'],
    required: true,
  },
  {
    key: 'taskCount',
    label: 'Task Count',
    aliases: ['task_count', 'taskcount', 'count', 'volume', 'qty', 'quantity', 'askcoun', 'taskcoun'],
    required: true,
  },
  {
    key: 'projectManager',
    label: 'Project Manager',
    aliases: ['project_manager', 'projectmanager', 'pm', 'mgr', 'manager', 'jectmana', 'projectmana'],
    required: true,
  },
  {
    key: 'approvalStatus',
    label: 'Approval Status',
    aliases: ['approval_status', 'approvalstatus', 'approval', 'status', 'approved_status'],
    required: true,
  },
  {
    key: 'totalHours',
    label: 'Total Hours',
    aliases: ['total_hours', 'totalhours', 'hours', 'hrs', 'duration', 'time_spent', 'spent_hours'],
    required: true,
  },
  {
    key: 'taskName',
    label: 'Task Name',
    aliases: ['task_name', 'taskname', 'task', 'activity', 'work_item', 'task_category'],
    required: true,
  },
  {
    key: 'lead',
    label: 'Lead',
    aliases: ['lead', 'team_lead', 'tl', 'lead_name'],
    required: false,
  },
];

export function cleanHeaderString(header: string): string {
  return header
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_\-\/\.\(\)]+/g, '');
}

export function normalizeCategoryHeaderKey(header: string): string {
  return header
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\b(hours|hour|hrs|hr|count|headcount|hc|total)\b/g, '')
    .replace(/[\s_\-\/\.\(\)]+/g, '');
}

export function detectColumnMapping(
  headers: string[],
  columnDefs: LogicalColumnDefinition[]
): { mapping: Record<string, string>; missing: string[] } {
  const mapping: Record<string, string> = {};
  const cleanedHeaders = headers.map((h) => ({ original: h, cleaned: cleanHeaderString(h) }));

  const missing: string[] = [];

  for (const def of columnDefs) {
    let foundOriginalHeader: string | null = null;

    // Direct alias matching after cleaning
    for (const alias of def.aliases) {
      const cleanedAlias = cleanHeaderString(alias);
      const match = cleanedHeaders.find((h) => h.cleaned === cleanedAlias);
      if (match) {
        foundOriginalHeader = match.original;
        break;
      }
    }

    // Fallback: substring contains match if not found
    if (!foundOriginalHeader) {
      const cleanedDefKey = cleanHeaderString(def.key);
      const cleanedDefLabel = cleanHeaderString(def.label);

      const match = cleanedHeaders.find(
        (h) => h.cleaned.includes(cleanedDefKey) || h.cleaned.includes(cleanedDefLabel)
      );
      if (match) {
        foundOriginalHeader = match.original;
      }
    }

    if (foundOriginalHeader) {
      mapping[def.key] = foundOriginalHeader;
    } else if (def.required) {
      missing.push(def.label);
    }
  }

  return { mapping, missing };
}

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { TaskRecord, HoursReportRow, CountReportRow, TaskMappingConfig, HcRuleConfig } from '../types';
import { parseDurationToMinutes } from '../utils/timeUtils';
import { calculateHcForMinutes } from '../utils/hcCalculator';
import { findTaskMapping } from '../utils/taskNormalizer';

const SAMPLE_PROJECTS = [
  'AIVI Spot Detection',
  'AMEX Financial Audit',
  'Healthcare Image Segmentation',
  'Autonomous Driving 3D Bounding',
  'Retail Object Recognition',
  'E-Commerce Product Classification',
  'OCR Invoice Extraction',
  'NLP Sentiment Labeling',
  'Satellite Land Mapping',
  'Audio Speech Transcription',
  'Lidar Point Cloud Labeling',
  'Facial Expression Analysis',
  'Medical X-Ray Annotation',
  'Sports Video Action Tagging',
  'Logistics Package Tracking',
  'Agritech Crop Health Tagging',
  'Security Feed Anomaly Detection',
  'Robotics Sensor Fusion',
  'Smart City Traffic Monitoring',
  'Document Structure Extraction',
];

const SAMPLE_MANAGERS = [
  'Sarah Jenkins',
  'David Miller',
  'Anita Sharma',
  'Carlos Rodriguez',
  'Marcus Vance',
  'Emily Chen',
];

const SAMPLE_TEAMS = ['Computer Vision', 'NLP & Speech', 'Data Quality & QC', 'Special Projects', 'Pilot Operations'];

const SAMPLE_TASKS = [
  'Initial Annotation - Billable',
  'Initial Annotation - Non Billable',
  'QC Annotation - Billable',
  'QC Annotation - Non Billable',
  'Project Pilot - Billable',
  'Spot QC - Billable',
  'Training - Billable',
  'Training - Non Billable',
  'Rework - Non Billable',
  'PM+SME - Billable',
  'Idle - Non Billable',
  'New Experimental Task - Billable', // Will be unmapped
];

export function generateSampleDataset(
  taskMappings: TaskMappingConfig[],
  hcRules: HcRuleConfig[]
): {
  taskRecords: TaskRecord[];
  hoursRows: HoursReportRow[];
  countRows: CountReportRow[];
  minDate: string;
  maxDate: string;
  uniqueDates: string[];
} {
  const dates = [
    '2026-09-22',
    '2026-09-23',
    '2026-09-24',
    '2026-09-25',
    '2026-09-26',
  ];

  const taskRecords: TaskRecord[] = [];
  const hoursMap = new Map<string, { team: string; pm: string; categories: Record<string, number> }>();
  const countMap = new Map<string, { team: string; pm: string; categories: Record<string, number> }>();

  let idCounter = 1;

  // Generate records for 20 projects x 15 employees per day
  SAMPLE_PROJECTS.forEach((proj, pIdx) => {
    const pm = SAMPLE_MANAGERS[pIdx % SAMPLE_MANAGERS.length];
    const team = SAMPLE_TEAMS[pIdx % SAMPLE_TEAMS.length];

    hoursMap.set(proj, { team, pm, categories: {} });
    countMap.set(proj, { team, pm, categories: {} });

    dates.forEach((dateStr) => {
      // 8 employees per project per day
      for (let e = 1; e <= 8; e++) {
        const empNo = `${1000 + (pIdx * 10) + e}`;
        const empName = `Employee ${empNo}`;
        const taskName = SAMPLE_TASKS[(pIdx + e + idCounter) % SAMPLE_TASKS.length];

        // Hours variation
        const hoursOptions = ['08:00', '07:30', '04:00', '02:30', '01:30', '04:40', '06:15'];
        const totalHoursRaw = hoursOptions[(e + idCounter) % hoursOptions.length];
        const totalMinutes = parseDurationToMinutes(totalHoursRaw);

        // Approval status (make 5% Not Approved)
        const isNotApproved = (idCounter % 17 === 0);
        const approvalStatus = isNotApproved ? 'Not Approved' : 'Approved';

        const mappedTask = findTaskMapping(taskName, taskMappings);
        const calculatedHc = calculateHcForMinutes(totalMinutes, hcRules);

        const rec: TaskRecord = {
          id: `sample-${idCounter++}`,
          rawDate: dateStr,
          date: dateStr,
          employeeNo: empNo,
          employeeName: empName,
          team,
          projectName: proj,
          taskCount: Math.floor(totalMinutes / 15),
          projectManager: pm,
          lead: 'Team Lead A',
          approvalStatus,
          totalHoursRaw,
          totalMinutes,
          taskName,
          normalizedTaskName: mappedTask.normalizedTaskName,
          billingCategory: mappedTask.billingCategory,
          billableType: mappedTask.billableType,
          calculatedHc,
        };

        taskRecords.push(rec);

        // Aggregate into billing maps for exact matches except a few intentional mismatches
        const cat = mappedTask.billingCategory;
        const hObj = hoursMap.get(proj)!;
        const cObj = countMap.get(proj)!;

        hObj.categories[cat] = (hObj.categories[cat] || 0) + totalMinutes;
        cObj.categories[cat] = (cObj.categories[cat] || 0) + calculatedHc;
      }
    });

    // Add intentional minor mismatch in 3 projects for QA testing demonstration
    if (pIdx === 1) {
      // AMEX Financial Audit mismatch
      const cat = 'Training Non-Billable';
      const hObj = hoursMap.get(proj)!;
      hObj.categories[cat] = (hObj.categories[cat] || 0) + 60; // Extra 1 hour reported
      const cObj = countMap.get(proj)!;
      cObj.categories[cat] = (cObj.categories[cat] || 0) + 0.5; // Extra 0.5 HC reported
    } else if (pIdx === 3) {
      // Autonomous Driving mismatch
      const cat = 'Initial Annotation Billable';
      const hObj = hoursMap.get(proj)!;
      hObj.categories[cat] = Math.max(0, (hObj.categories[cat] || 0) - 120); // 2 hours less reported
    }
  });

  // Add 1 duplicate record to test duplicate detection
  if (taskRecords.length > 0) {
    const dupRec = { ...taskRecords[0], id: `sample-dup-${idCounter++}` };
    taskRecords.push(dupRec);
  }

  // Convert hoursMap and countMap to Arrays
  const hoursRows: HoursReportRow[] = [];
  hoursMap.forEach((val, projName) => {
    let totBillMins = 0;
    let totNonBillMins = 0;
    Object.entries(val.categories).forEach(([cat, mins]) => {
      if (cat.toLowerCase().includes('non-billable') || cat.toLowerCase().includes('non billable')) {
        totNonBillMins += mins;
      } else {
        totBillMins += mins;
      }
    });

    hoursRows.push({
      projectName: projName,
      team: val.team,
      projectManager: val.pm,
      categories: val.categories,
      totalBillableMinutes: totBillMins,
      totalNonBillableMinutes: totNonBillMins,
      grandTotalMinutes: totBillMins + totNonBillMins,
      reportedHc: 0,
    });
  });

  const countRows: CountReportRow[] = [];
  countMap.forEach((val, projName) => {
    let totBillHc = 0;
    let totNonBillHc = 0;
    Object.entries(val.categories).forEach(([cat, hc]) => {
      if (cat.toLowerCase().includes('non-billable') || cat.toLowerCase().includes('non billable')) {
        totNonBillHc += hc;
      } else {
        totBillHc += hc;
      }
    });

    countRows.push({
      projectName: projName,
      team: val.team,
      projectManager: val.pm,
      categories: val.categories,
      totalBillableCount: totBillHc,
      totalNonBillableCount: totNonBillHc,
      grandTotalCount: totBillHc + totNonBillHc,
      reportedHc: totBillHc + totNonBillHc,
    });
  });

  return {
    taskRecords,
    hoursRows,
    countRows,
    minDate: dates[0],
    maxDate: dates[dates.length - 1],
    uniqueDates: dates,
  };
}

export function downloadSampleFiles() {
  // 1. Task Report Sample
  const taskRows = [
    ['Date', 'Employee No', 'Name', 'Team', 'Project Name', 'Task Count', 'Project Manager', 'Lead', 'Approval Status', 'Total Hours', 'Task Name'],
    ['2026-09-22', '1001', 'Ravin Balasubramanian', 'Computer Vision', 'AIVI Spot Detection', '15', 'Sarah Jenkins', 'Lead A', 'Approved', '08:00', 'Initial Annotation - Billable'],
    ['2026-09-22', '1002', 'Anita Kumar', 'Computer Vision', 'AIVI Spot Detection', '12', 'Sarah Jenkins', 'Lead A', 'Approved', '07:30', 'Initial Annotation - Billable'],
    ['2026-09-22', '1003', 'John Doe', 'Computer Vision', 'AIVI Spot Detection', '8', 'Sarah Jenkins', 'Lead A', 'Approved', '04:00', 'QC Annotation - Billable'],
    ['2026-09-22', '1004', 'Maria Garcia', 'Computer Vision', 'AMEX Financial Audit', '10', 'David Miller', 'Lead B', 'Approved', '08:00', 'Initial Annotation - Billable'],
    ['2026-09-22', '1005', 'Chen Wei', 'Computer Vision', 'AMEX Financial Audit', '2', 'David Miller', 'Lead B', 'Not Approved', '01:00', 'Training - Non Billable'],
  ];
  const wb1 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb1, XLSX.utils.aoa_to_sheet(taskRows), 'Task Report');
  const buf1 = XLSX.write(wb1, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf1]), 'Sample_Task_Report.xlsx');

  // 2. Hours Billing Report Sample
  const hoursRows = [
    ['Project', 'Team', 'Project Manager', 'Initial Annotation Billable', 'Initial Annotation Non-Billable', 'QC Annotation Billable', 'Training Non-Billable', 'Total Billable Hours', 'Grand Total Hours'],
    ['AIVI Spot Detection', 'Computer Vision', 'Sarah Jenkins', '15:30', '00:00', '04:00', '00:00', '19:30', '19:30'],
    ['AMEX Financial Audit', 'Computer Vision', 'David Miller', '08:00', '00:00', '00:00', '01:00', '08:00', '09:00'],
  ];
  const wb2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet(hoursRows), 'Hours Billing');
  const buf2 = XLSX.write(wb2, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf2]), 'Sample_Hours_Billing_Report.xlsx');

  // 3. Count Billing Report Sample
  const countRows = [
    ['Project', 'Team', 'Project Manager', 'Initial Annotation Billable', 'QC Annotation Billable', 'Training Non-Billable', 'Billable Headcount (HC)', 'Total Headcount (HC)'],
    ['AIVI Spot Detection', 'Computer Vision', 'Sarah Jenkins', '1.75', '0.50', '0.00', '2.25', '2.25'],
    ['AMEX Financial Audit', 'Computer Vision', 'David Miller', '1.00', '0.00', '0.25', '1.00', '1.25'],
  ];
  const wb3 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb3, XLSX.utils.aoa_to_sheet(countRows), 'Count Billing');
  const buf3 = XLSX.write(wb3, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf3]), 'Sample_Count_Billing_Report.xlsx');
}

export interface ParsedCsvRow {
  [key: string]: string;
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  reason: string;
}

export interface StudentValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: {
    studentId: string;
    rollNo: string;
    name: string;
    email: string;
    department: string;
    branch?: string;
    batch: string;
    graduationYear: number;
    cgpa: number;
    activeBacklogs: number;
    clearedBacklogs: number;
    tenthPercentage: number;
    twelfthPercentage: number;
    readinessScore: number;
    atsScore: number;
    tierCategory: 'Tier 1' | 'Tier 2' | 'Tier 3';
    skills: string[];
    verificationStatus: 'Verified' | 'Pending' | 'Flagged';
  };
}

export interface JobDriveValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: {
    jobId: string;
    companyName: string;
    role: string;
    ctcPackageLpa: number;
    stipendPerMonth?: number;
    tier: 'Dream (18+ LPA)' | 'Super Dream (12-18 LPA)' | 'Standard (6-12 LPA)' | 'Mass (3-6 LPA)';
    location: string;
    workMode: 'On-site' | 'Hybrid' | 'Remote';
    category: 'Core Tech' | 'FinTech' | 'Cloud/DevOps' | 'Data Science' | 'Consulting';
    minCgpa: number;
    maxBacklogs: number;
    eligibleDepartments: string[];
    graduationYear: number;
    deadline: Date;
    assessmentDate: Date;
    matchScore: number;
    requiredSkills: string[];
    positionsCount: number;
    description: string;
    status: 'Draft' | 'Pending Approval' | 'Approved' | 'Published';
  };
}

/**
 * Standard RFC 4180 compliant CSV parser
 */
export function parseCsv(text: string): ParsedCsvRow[] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF after CR
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((field) => field.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length < 2) {
    return [];
  }

  const rawHeaders = lines[0].map((h) => h.trim());
  const normalizedHeaders = rawHeaders.map((h) => normalizeColumnHeader(h));
  const results: ParsedCsvRow[] = [];

  for (let r = 1; r < lines.length; r++) {
    const row = lines[r];
    const record: ParsedCsvRow = {};
    for (let c = 0; c < normalizedHeaders.length; c++) {
      const header = normalizedHeaders[c];
      record[header] = row[c] !== undefined ? row[c].trim() : '';
    }
    results.push(record);
  }

  return results;
}

export function normalizeColumnHeader(header: string): string {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.includes('reg') || clean.includes('roll') || clean.includes('id')) return 'rollNo';
  if (clean.includes('studentname') || clean === 'name' || clean.includes('fullname')) return 'name';
  if (clean.includes('email') || clean.includes('mail')) return 'email';
  if (clean.includes('cgpa') || clean === 'gpa') return 'cgpa';
  if (clean.includes('backlog') || clean.includes('activebacklog')) return 'activeBacklogs';
  if (clean.includes('branch')) return 'branch';
  if (clean.includes('dept') || clean.includes('department')) return 'department';
  if (clean.includes('grad') || clean.includes('year') || clean.includes('batch')) return 'graduationYear';
  if (clean.includes('tenth') || clean.includes('10th')) return 'tenthPercentage';
  if (clean.includes('twelfth') || clean.includes('12th') || clean.includes('inter')) return 'twelfthPercentage';
  if (clean.includes('skill')) return 'skills';
  if (clean.includes('company')) return 'companyName';
  if (clean.includes('role') || clean.includes('title') || clean.includes('designation')) return 'role';
  if (clean.includes('ctc') || clean.includes('package') || clean.includes('salary')) return 'ctcPackageLpa';
  if (clean.includes('stipend')) return 'stipendPerMonth';
  if (clean.includes('tier')) return 'tier';
  if (clean.includes('location')) return 'location';
  if (clean.includes('workmode') || clean.includes('mode')) return 'workMode';
  if (clean.includes('deadline') || clean.includes('lastdate')) return 'deadline';
  if (clean.includes('vacanc') || clean.includes('position')) return 'positionsCount';
  if (clean.includes('desc')) return 'description';
  return clean;
}

const VFSTR_DEPARTMENT_MAP: Record<string, string> = {
  cse: 'Computer Science & Engineering',
  cs: 'Computer Science & Engineering',
  it: 'Information Technology',
  aiml: 'Artificial Intelligence & Machine Learning',
  ai: 'Artificial Intelligence & Machine Learning',
  ece: 'Electronics & Communication Engineering',
  ec: 'Electronics & Communication Engineering',
  eee: 'Electrical & Electronics Engineering',
  ee: 'Electrical & Electronics Engineering',
  mech: 'Mechanical Engineering',
  me: 'Mechanical Engineering',
  biotech: 'Biotechnology',
  bt: 'Biotechnology',
  civil: 'Civil Engineering',
  ce: 'Civil Engineering',
};

export function validateStudentRow(row: ParsedCsvRow, rowIndex: number): StudentValidationResult {
  const errors: ValidationError[] = [];

  const rawRoll = (row.rollNo || '').trim().toUpperCase();
  if (!rawRoll) {
    errors.push({ row: rowIndex, field: 'rollNo', value: row.rollNo, reason: 'Registration number (rollNo) is required.' });
  } else if (!/^[A-Z0-9]{5,15}$/.test(rawRoll)) {
    errors.push({ row: rowIndex, field: 'rollNo', value: rawRoll, reason: 'Invalid registration number format. Must be 5-15 alphanumeric characters (e.g. 21CS048, 251FA04I28).' });
  }

  const rawName = (row.name || '').trim();
  if (!rawName || rawName.length < 2) {
    errors.push({ row: rowIndex, field: 'name', value: row.name, reason: 'Student Name is required (minimum 2 characters).' });
  }

  const rawEmail = (row.email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!rawEmail || !emailRegex.test(rawEmail)) {
    errors.push({ row: rowIndex, field: 'email', value: row.email, reason: 'Valid university email address is required.' });
  }

  const rawCgpa = parseFloat(row.cgpa);
  if (isNaN(rawCgpa) || rawCgpa < 0 || rawCgpa > 10) {
    errors.push({ row: rowIndex, field: 'cgpa', value: row.cgpa, reason: 'CGPA must be a valid number between 0.00 and 10.00.' });
  }

  let rawBacklogs = 0;
  if (row.activeBacklogs) {
    rawBacklogs = parseInt(row.activeBacklogs, 10);
    if (isNaN(rawBacklogs) || rawBacklogs < 0) {
      errors.push({ row: rowIndex, field: 'activeBacklogs', value: row.activeBacklogs, reason: 'Active backlogs must be an integer >= 0.' });
    }
  }

  const rawDeptKey = (row.department || row.branch || 'CSE').toLowerCase().replace(/[^a-z]/g, '');
  const department = VFSTR_DEPARTMENT_MAP[rawDeptKey] || row.department || 'Computer Science & Engineering';

  let graduationYear = 2025;
  if (row.graduationYear) {
    const y = parseInt(row.graduationYear, 10);
    if (!isNaN(y) && y >= 2020 && y <= 2035) {
      graduationYear = y;
    }
  }

  const skills = (row.skills || '')
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      studentId: `stu-${rawRoll.toLowerCase()}`,
      rollNo: rawRoll,
      name: rawName,
      email: rawEmail,
      department,
      branch: department.split(' ')[0],
      batch: `${graduationYear - 4} - ${graduationYear} (Class of ${graduationYear})`,
      graduationYear,
      cgpa: Math.round(rawCgpa * 100) / 100,
      activeBacklogs: rawBacklogs,
      clearedBacklogs: 0,
      tenthPercentage: parseFloat(row.tenthPercentage) || 90.0,
      twelfthPercentage: parseFloat(row.twelfthPercentage) || 90.0,
      readinessScore: Math.min(100, Math.round(rawCgpa * 10 + 5)),
      atsScore: Math.min(100, Math.round(rawCgpa * 9.5)),
      tierCategory: rawCgpa >= 8.5 ? 'Tier 1' : rawCgpa >= 7.0 ? 'Tier 2' : 'Tier 3',
      skills: skills.length > 0 ? skills : ['DSA', 'Problem Solving', 'Python'],
      verificationStatus: 'Verified',
    },
  };
}

export function validateJobDriveRow(row: ParsedCsvRow, rowIndex: number): JobDriveValidationResult {
  const errors: ValidationError[] = [];

  const companyName = (row.companyName || '').trim();
  if (!companyName || companyName.length < 2) {
    errors.push({ row: rowIndex, field: 'companyName', value: row.companyName, reason: 'Company Name is required.' });
  }

  const role = (row.role || '').trim();
  if (!role || role.length < 2) {
    errors.push({ row: rowIndex, field: 'role', value: row.role, reason: 'Job Role is required.' });
  }

  const ctc = parseFloat(row.ctcPackageLpa);
  if (isNaN(ctc) || ctc <= 0) {
    errors.push({ row: rowIndex, field: 'ctcPackageLpa', value: row.ctcPackageLpa, reason: 'CTC package (LPA) must be a positive number.' });
  }

  const minCgpa = parseFloat(row.minCgpa || '7.0');
  if (isNaN(minCgpa) || minCgpa < 0 || minCgpa > 10) {
    errors.push({ row: rowIndex, field: 'minCgpa', value: row.minCgpa, reason: 'Min CGPA must be between 0.00 and 10.00.' });
  }

  const maxBacklogs = parseInt(row.maxBacklogs || '0', 10);
  if (isNaN(maxBacklogs) || maxBacklogs < 0) {
    errors.push({ row: rowIndex, field: 'maxBacklogs', value: row.maxBacklogs, reason: 'Max backlogs must be an integer >= 0.' });
  }

  const tier =
    ctc >= 18
      ? 'Dream (18+ LPA)'
      : ctc >= 12
      ? 'Super Dream (12-18 LPA)'
      : ctc >= 6
      ? 'Standard (6-12 LPA)'
      : 'Mass (3-6 LPA)';

  const skills = (row.skills || 'Data Structures, Problem Solving')
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);

  let deadline = new Date(Date.now() + 14 * 86400000);
  if (row.deadline) {
    const parsed = new Date(row.deadline);
    if (!isNaN(parsed.getTime())) {
      deadline = parsed;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const cleanSlug = `${companyName}-${role}`.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
  const jobId = `job-${cleanSlug}-${Date.now().toString().slice(-4)}`;

  return {
    valid: true,
    errors: [],
    data: {
      jobId,
      companyName,
      role,
      ctcPackageLpa: Math.round(ctc * 10) / 10,
      stipendPerMonth: parseFloat(row.stipendPerMonth || '0') || 0,
      tier,
      location: row.location || 'Bengaluru / Hyderabad',
      workMode: (row.workMode as any) || 'Hybrid',
      category: 'Core Tech',
      minCgpa: Math.round(minCgpa * 10) / 10,
      maxBacklogs,
      eligibleDepartments: [
        'Computer Science & Engineering',
        'Information Technology',
        'Artificial Intelligence & Machine Learning',
      ],
      graduationYear: 2025,
      deadline,
      assessmentDate: new Date(deadline.getTime() + 3 * 86400000),
      matchScore: 90,
      requiredSkills: skills,
      positionsCount: parseInt(row.positionsCount || '10', 10) || 10,
      description: row.description || `Campus placement drive by ${companyName} for the role of ${role}.`,
      status: 'Published',
    },
  };
}

export function generateSampleStudentsCsv(): string {
  return `Registration Number,Student Name,Verified University Email,Branch,Department,Graduation Year,CGPA,Active Backlogs,Skills
21CS048,Aarav Sharma,aarav.sharma@vignan.ac.in,CSE,Computer Science & Engineering,2025,8.92,0,"TypeScript, React 19, Node.js, Python, PostgreSQL, Docker, DSA"
251FA04I28,Sri Udbhav,v.sriudbhav68@gmail.com,CSE,Computer Science & Engineering,2025,9.24,0,"Distributed Systems, Python, React, Node.js, Docker, MongoDB"
21CS099,Priya Patel,priya.patel@vignan.ac.in,CSE,Computer Science & Engineering,2025,9.15,0,"C++, Python, Distributed Algorithms, System Design"
21IT023,Sneha Patel,sneha.patel@vignan.ac.in,IT,Information Technology,2025,8.74,0,"Java, Spring Boot, Microservices, AWS, Docker"
21EC089,Rohan Verma,rohan.verma@vignan.ac.in,ECE,Electronics & Communication Engineering,2025,8.45,0,"Embedded C, Python, Verilog, IoT, Signal Processing"
21EE034,Ananya Deshmukh,ananya.deshmukh@vignan.ac.in,EEE,Electrical & Electronics Engineering,2025,8.12,0,"Power Systems, MATLAB, Python, Embedded C"
21ME056,Kiran Kumar,kiran.kumar@vignan.ac.in,ME,Mechanical Engineering,2025,7.82,0,"AutoCAD, SolidWorks, Python, Thermodynamics"
21BT015,Divya Sri,divya.sri@vignan.ac.in,BT,Biotechnology,2025,8.65,0,"Bioinformatics, Bioprocess Engineering, Python, R"`;
}

export function generateSampleDrivesCsv(): string {
  return `Company Name,Job Role,CTC Package LPA,Stipend Per Month,Location,Work Mode,Min CGPA,Max Backlogs,Deadline,Positions,Required Skills,Description
Darwinbox,Associate Software Development Engineer,16.5,50000,Hyderabad / Bengaluru,Hybrid,8.0,0,2026-11-20,15,"TypeScript, React, Node.js, PostgreSQL","Core engineering team developing enterprise HR tech platform."
Cisco Systems,Network Software Engineer,17.5,70000,Bengaluru,Hybrid,7.5,0,2026-11-25,20,"C, C++, Networking Protocols, Linux, Python","Building next-generation enterprise routing and cloud switches."
TCS Digital,Digital Software Engineer,7.5,25000,Hyderabad / Pune,Hybrid,7.0,0,2026-11-30,45,"Java, Python, SQL, Cloud Fundamentals","Digital innovation unit developing enterprise banking platforms."`;
}


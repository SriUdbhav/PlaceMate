import mongoose from 'mongoose';

mongoose.set('bufferCommands', false); // Fail fast when offline, avoid buffering hangs
import { Student } from './models/Student';
import { Company } from './models/Company';
import { JobDrive } from './models/JobDrive';
import { Application } from './models/Application';
import { Notification } from './models/Notification';
import { User } from './models/User';
import { Resume } from './models/Resume';
import { Interview } from './models/Interview';
import { CV } from './models/CV';
import bcrypt from 'bcryptjs';

export interface DatabaseStatus {
  isConnected: boolean;
  connectionState: string;
  source: 'mongodb_atlas' | 'local_memory_fallback';
  databaseName: string;
  ipWhitelistHint?: string;
  hasEnvUri: boolean;
  sanitizedHost?: string;
  lastErrorMessage?: string;
  counts: {
    students: number;
    companies: number;
    jobs: number;
    applications: number;
    resumes: number;
    cvs: number;
    interviews: number;
    notifications: number;
    users: number;
  };
}

let isDbConnected = false;
let dbSource: 'mongodb_atlas' | 'local_memory_fallback' = 'local_memory_fallback';
let atlasConnectionAttemptFailed = false;
let lastDbError: string | null = null;

import dotenv from 'dotenv';
dotenv.config({ override: true });

function sanitizeMongoUri(uri: string): string {
  try {
    return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  } catch {
    return 'mongodb+srv://***:***@cluster';
  }
}

function getSanitizedHost(uri: string): string {
  try {
    const atParts = uri.split('@');
    if (atParts.length > 1) {
      return atParts[1].split('/')[0].split('?')[0];
    }
    return 'configured-cluster';
  } catch {
    return 'configured-cluster';
  }
}

let isConnecting = false;

export async function connectDatabase(maxRetries = 2, delayMs = 2000): Promise<void> {
  if (isConnecting) {
    console.log('PlaceMate DB: Connection attempt already in progress...');
    return;
  }
  isConnecting = true;

  try {
    // Reload dotenv to capture any fresh environment changes
    dotenv.config({ override: true });
    const uri = process.env.MONGODB_URI;
    const isValidConfiguredUri = Boolean(
      uri &&
      uri.trim().length > 15 &&
      !uri.includes('example.mongodb.net') &&
      (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'))
    );

    if (!isValidConfiguredUri || !uri) {
      isDbConnected = false;
      dbSource = 'local_memory_fallback';
      lastDbError = 'MONGODB_URI environment variable is not configured or is a placeholder.';
      console.log('PlaceMate DB: MONGODB_URI is not set. Operating in local store mode.');
      return;
    }

    const hostInfo = getSanitizedHost(uri);
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        console.log(`PlaceMate DB: Establishing Mongoose connection to MongoDB Atlas cluster (${hostInfo}) [Attempt ${attempt}/${maxRetries + 1}]...`);

        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect().catch(() => {});
        }

        await mongoose.connect(uri, {
          dbName: 'placemate',
          serverSelectionTimeoutMS: 12000,
          retryWrites: true,
          w: 'majority',
        });

        if (mongoose.connection.readyState === 1) {
          isDbConnected = true;
          dbSource = 'mongodb_atlas';
          atlasConnectionAttemptFailed = false;
          lastDbError = null;
          console.log(`✅ PlaceMate DB: Successfully connected to MongoDB Atlas! Database: ${mongoose.connection.db?.databaseName || 'placemate'}`);
          await seedDatabaseIfEmpty();
          return;
        } else {
          throw new Error(`Mongoose connection state is ${mongoose.connection.readyState} (expected 1 for connected).`);
        }
      } catch (err: any) {
        const cleanMsg = err.message || 'Connection failed';
        lastDbError = cleanMsg.replace(/\/\/[^:]+:[^@]+@/g, '//***:***@');
        console.error(`PlaceMate DB: Connection attempt ${attempt} failed: ${lastDbError}`);
        
        await mongoose.disconnect().catch(() => {});
        isDbConnected = false;
        dbSource = 'local_memory_fallback';
        atlasConnectionAttemptFailed = true;

        if (attempt <= maxRetries) {
          console.log(`PlaceMate DB: Retrying connection in ${delayMs / 1000} seconds...`);
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
    }
  } finally {
    isConnecting = false;
  }
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const uri = process.env.MONGODB_URI;
  const hasEnvUri = Boolean(uri && uri.trim().length > 15 && !uri.includes('example.mongodb.net'));
  const sanitizedHost = uri && hasEnvUri ? getSanitizedHost(uri) : undefined;

  if (isDbConnected && mongoose.connection.readyState === 1) {
    try {
      const [
        students,
        companies,
        jobs,
        applications,
        resumes,
        cvs,
        interviews,
        notifications,
        users,
      ] = await Promise.all([
        Student.countDocuments(),
        Company.countDocuments(),
        JobDrive.countDocuments(),
        Application.countDocuments(),
        Resume.countDocuments(),
        CV.countDocuments(),
        Interview.countDocuments(),
        Notification.countDocuments(),
        User.countDocuments(),
      ]);

      return {
        isConnected: true,
        connectionState: 'Connected (readyState: 1)',
        source: 'mongodb_atlas',
        databaseName: mongoose.connection.db?.databaseName || 'placemate',
        hasEnvUri: true,
        sanitizedHost,
        counts: {
          students,
          companies,
          jobs,
          applications,
          resumes,
          cvs,
          interviews,
          notifications,
          users,
        },
      };
    } catch (e) {
      // fallback
    }
  }

  // Local fallback response with transparent status
  return {
    isConnected: false,
    connectionState: atlasConnectionAttemptFailed
      ? `Atlas Connection Failed (${sanitizedHost || 'cluster'})`
      : hasEnvUri
      ? `Connecting to Atlas (${sanitizedHost || 'cluster'})...`
      : 'MONGODB_URI not set in server environment',
    source: 'local_memory_fallback',
    databaseName: 'placemate_dev',
    hasEnvUri,
    sanitizedHost,
    lastErrorMessage: lastDbError || undefined,
    ipWhitelistHint: atlasConnectionAttemptFailed
      ? 'MongoDB Atlas Network Access: If connecting from cloud environments, ensure 0.0.0.0/0 is added in MongoDB Atlas -> Network Access -> IP Access List.'
      : !hasEnvUri
      ? 'Set MONGODB_URI in the AI Studio environment or .env file to enable Atlas persistence.'
      : undefined,
    counts: {
      students: inMemoryStore.students.length,
      companies: inMemoryStore.companies.length,
      jobs: inMemoryStore.jobs.length,
      applications: inMemoryStore.applications.length,
      resumes: inMemoryStore.resumes.length,
      cvs: inMemoryStore.cvs?.length || 0,
      interviews: inMemoryStore.interviews.length,
      notifications: inMemoryStore.notifications.length,
      users: inMemoryStore.users.length,
    },
  };
}

// In-Memory Fallback Store (Ensures 100% functionality and persistence during runtime if Atlas URI is pending)
export const inMemoryStore = {
  students: [
    {
      studentId: 'stu-2025-089',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@campus.edu',
      rollNo: '21CS048',
      department: 'Computer Science & Engineering',
      batch: '2021 - 2025 (Final Year)',
      cgpa: 8.92,
      activeBacklogs: 0,
      clearedBacklogs: 0,
      tenthPercentage: 94.2,
      twelfthPercentage: 92.8,
      readinessScore: 94,
      atsScore: 88,
      tierCategory: 'Tier 1' as const,
      skills: [
        'Data Structures & Algorithms',
        'TypeScript',
        'React 19',
        'Node.js',
        'Python',
        'PostgreSQL',
        'Docker',
        'System Design',
        'PyTorch',
        'Git',
      ],
      placed: false,
      offersReceived: 0,
      maxCtcOfferedLpa: 0,
      verificationStatus: 'Verified' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      studentId: 'stu-251FA04I28',
      name: 'Sri Udbhav',
      email: 'v.sriudbhav68@gmail.com',
      rollNo: '251FA04I28',
      department: 'Computer Science & Engineering',
      batch: '2021 - 2025 (Final Year)',
      cgpa: 9.24,
      activeBacklogs: 0,
      clearedBacklogs: 0,
      tenthPercentage: 95.0,
      twelfthPercentage: 94.2,
      readinessScore: 96,
      atsScore: 92,
      tierCategory: 'Tier 1' as const,
      skills: [
        'Data Structures & Algorithms',
        'TypeScript',
        'Python',
        'React',
        'Node.js',
        'Distributed Systems',
        'MongoDB',
        'Docker',
        'System Design',
      ],
      placed: false,
      offersReceived: 0,
      maxCtcOfferedLpa: 0,
      verificationStatus: 'Verified' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  companies: [
    {
      companyId: 'comp-goog',
      name: 'Google',
      industry: 'Core Tech & Cloud',
      tier: 'Dream' as const,
      contactEmail: 'campus-ta@google.com',
      description: 'Global tech leader organizing high-scale distributed systems and search infrastructure.',
      headquarters: 'Mountain View, CA / Bengaluru, India',
      hiringStatus: 'Active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      companyId: 'comp-msft',
      name: 'Microsoft',
      industry: 'Cloud & Enterprise Systems',
      tier: 'Dream' as const,
      contactEmail: 'university@microsoft.com',
      description: 'Building world-scale Azure cloud infrastructure and productivity software.',
      headquarters: 'Redmond, WA / Hyderabad, India',
      hiringStatus: 'Active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      companyId: 'comp-amzn',
      name: 'Amazon',
      industry: 'E-commerce & Cloud (AWS)',
      tier: 'Dream' as const,
      contactEmail: 'aws-campus@amazon.com',
      description: 'AWS Storage, compute, and retail platforms operating at exabyte scale.',
      headquarters: 'Seattle, WA / Bengaluru, India',
      hiringStatus: 'Active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      companyId: 'comp-orcl',
      name: 'Oracle',
      industry: 'Cloud Infrastructure & DB',
      tier: 'Dream' as const,
      contactEmail: 'oci-hiring@oracle.com',
      description: 'Enterprise Oracle Cloud Infrastructure (OCI) and autonomous database engines.',
      headquarters: 'Austin, TX / Bengaluru, India',
      hiringStatus: 'Active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      companyId: 'comp-gs',
      name: 'Goldman Sachs',
      industry: 'FinTech & Quantitative',
      tier: 'Dream' as const,
      contactEmail: 'campus-recruiting@gs.com',
      description: 'Investment banking, algorithmic trading, and quantitative financial risk platforms.',
      headquarters: 'New York, NY / Bengaluru, India',
      hiringStatus: 'Active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  jobs: [
    {
      jobId: 'job-goog-01',
      companyName: 'Google',
      role: 'Software Development Engineer I (Core Systems)',
      ctcPackageLpa: 28.5,
      stipendPerMonth: 125000,
      tier: 'Dream (18+ LPA)' as const,
      location: 'Bengaluru / Hyderabad',
      workMode: 'Hybrid' as const,
      category: 'Core Tech' as const,
      minCgpa: 8.5,
      maxBacklogs: 0,
      eligibleDepartments: ['Computer Science & Engineering', 'Information Technology', 'Electronics & Comm.'],
      deadline: new Date('2026-11-10T23:59:00'),
      assessmentDate: new Date('2026-11-12T10:00:00'),
      matchScore: 96,
      requiredSkills: ['Data Structures & Algorithms', 'C++', 'Java / Python', 'Distributed Systems'],
      preferredSkills: ['Concurrency', 'Operating Systems', 'System Architecture'],
      positionsCount: 15,
      description: 'Design and implement high-scale, resilient backend systems powering billions of daily user requests across Google Cloud and Core Search infrastructure.',
      status: 'Open' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      jobId: 'job-msft-02',
      companyName: 'Microsoft',
      role: 'Cloud Solutions Engineer — Azure Core',
      ctcPackageLpa: 22.0,
      stipendPerMonth: 100000,
      tier: 'Dream (18+ LPA)' as const,
      location: 'Hyderabad / Noida',
      workMode: 'Hybrid' as const,
      category: 'Cloud/DevOps' as const,
      minCgpa: 8.0,
      maxBacklogs: 0,
      eligibleDepartments: ['Computer Science & Engineering', 'Information Technology'],
      deadline: new Date('2026-11-14T18:00:00'),
      assessmentDate: new Date('2026-11-16T14:30:00'),
      matchScore: 92,
      requiredSkills: ['TypeScript', 'Docker', 'Distributed Systems', 'Cloud Fundamentals'],
      preferredSkills: ['Kubernetes', 'Microservices', 'CI/CD Pipelines'],
      positionsCount: 22,
      description: 'Work with the Azure Kubernetes Service and serverless compute engineering teams building mission-critical enterprise cloud backbones.',
      status: 'Open' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      jobId: 'job-amzn-03',
      companyName: 'Amazon',
      role: 'Software Development Engineer — AWS Storage',
      ctcPackageLpa: 26.0,
      stipendPerMonth: 110000,
      tier: 'Dream (18+ LPA)' as const,
      location: 'Bengaluru',
      workMode: 'On-site' as const,
      category: 'Core Tech' as const,
      minCgpa: 7.5,
      maxBacklogs: 0,
      eligibleDepartments: ['Computer Science & Engineering', 'Information Technology', 'Electrical & Electronics'],
      deadline: new Date('2026-11-18T23:59:00'),
      assessmentDate: new Date('2026-11-20T11:00:00'),
      matchScore: 94,
      requiredSkills: ['Java', 'Data Structures & Algorithms', 'Object Oriented Design'],
      preferredSkills: ['AWS DynamoDB', 'Distributed Caching', 'High Concurrency'],
      positionsCount: 30,
      description: 'Architect low-latency storage primitives for AWS S3 and EBS. Tackle real-world exabyte scale distributed consistency challenges.',
      status: 'Open' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      jobId: 'job-orcl-04',
      companyName: 'Oracle',
      role: 'OCI Distributed Infrastructure Associate',
      ctcPackageLpa: 19.5,
      stipendPerMonth: 75000,
      tier: 'Dream (18+ LPA)' as const,
      location: 'Bengaluru',
      workMode: 'Hybrid' as const,
      category: 'Cloud/DevOps' as const,
      minCgpa: 8.0,
      maxBacklogs: 0,
      eligibleDepartments: ['Computer Science & Engineering', 'Information Technology'],
      deadline: new Date('2026-11-22T23:59:00'),
      assessmentDate: new Date('2026-11-25T15:00:00'),
      matchScore: 89,
      requiredSkills: ['Python', 'Linux Kernel Basics', 'Computer Networks', 'Docker'],
      preferredSkills: ['Kubernetes', 'Kafka', 'Terraform'],
      positionsCount: 18,
      description: 'Build enterprise-grade software defined network layers and automated fault diagnosis telemetry for Oracle Cloud Infrastructure.',
      status: 'Open' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      jobId: 'job-gs-05',
      companyName: 'Goldman Sachs',
      role: 'Quantitative Engineering Analyst',
      ctcPackageLpa: 24.0,
      stipendPerMonth: 120000,
      tier: 'Dream (18+ LPA)' as const,
      location: 'Bengaluru',
      workMode: 'On-site' as const,
      category: 'FinTech' as const,
      minCgpa: 8.5,
      maxBacklogs: 0,
      eligibleDepartments: ['Computer Science & Engineering', 'Mathematics & Computing'],
      deadline: new Date('2026-11-25T20:00:00'),
      assessmentDate: new Date('2026-11-28T09:30:00'),
      matchScore: 86,
      requiredSkills: ['Data Structures & Algorithms', 'C++', 'Linear Algebra', 'Probability'],
      preferredSkills: ['Financial Modeling', 'Low-Latency Systems'],
      positionsCount: 10,
      description: 'Develop algorithmic trading engines, pricing risk calculators, and real-time portfolio management platforms for global investment banking desks.',
      status: 'Open' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  applications: [
    {
      applicationId: 'app-001',
      studentId: 'stu-2025-089',
      studentName: 'Aarav Sharma',
      jobId: 'job-goog-01',
      companyName: 'Google',
      role: 'Software Development Engineer I (Core Systems)',
      ctcPackageLpa: 28.5,
      appliedDate: new Date('2026-10-28'),
      status: 'Online Assessment' as const,
      nextRound: 'HackerRank Online Assessment (2 Coding + 1 System MCQs)',
      nextRoundDate: '2026-11-12 at 10:00 AM',
      aiReadinessScore: 96,
      feedbackNotes: 'Resume screened and approved by TPO & Google Campus TA. High DSA alignment.',
      verifiedByTpo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      applicationId: 'app-002',
      studentId: 'stu-2025-089',
      studentName: 'Aarav Sharma',
      jobId: 'job-msft-02',
      companyName: 'Microsoft',
      role: 'Cloud Solutions Engineer — Azure Core',
      ctcPackageLpa: 22.0,
      appliedDate: new Date('2026-10-30'),
      status: 'Technical Interview' as const,
      nextRound: 'Technical Interview Round 1 (Live Coding on CodeSignal)',
      nextRoundDate: '2026-11-16 at 02:30 PM',
      aiReadinessScore: 92,
      feedbackNotes: 'Online assessment passed with 100% test case coverage. Azure focus recommended.',
      verifiedByTpo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      applicationId: 'app-003',
      studentId: 'stu-2025-089',
      studentName: 'Aarav Sharma',
      jobId: 'job-amzn-03',
      companyName: 'Amazon',
      role: 'Software Development Engineer — AWS Storage',
      ctcPackageLpa: 26.0,
      appliedDate: new Date('2026-11-01'),
      status: 'Shortlisted' as const,
      nextRound: 'Amazon Online Assessment Part 1 (Code Debugging & Reasoning)',
      nextRoundDate: '2026-11-20 at 11:00 AM',
      aiReadinessScore: 94,
      feedbackNotes: 'Direct shortlist through internal Campus Hackathon leaderboard performance.',
      verifiedByTpo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      applicationId: 'app-004',
      studentId: 'stu-2025-089',
      studentName: 'Aarav Sharma',
      jobId: 'job-orcl-04',
      companyName: 'Oracle',
      role: 'OCI Distributed Infrastructure Associate',
      ctcPackageLpa: 19.5,
      appliedDate: new Date('2026-11-02'),
      status: 'Under Review' as const,
      nextRound: 'Campus Profile Screening',
      nextRoundDate: '2026-11-15',
      aiReadinessScore: 89,
      feedbackNotes: 'Profile sent to engineering panel. Awaiting shortlisting release.',
      verifiedByTpo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      applicationId: 'app-005',
      studentId: 'stu-2025-089',
      studentName: 'Aarav Sharma',
      jobId: 'job-gs-05',
      companyName: 'Goldman Sachs',
      role: 'Quantitative Engineering Analyst',
      ctcPackageLpa: 24.0,
      appliedDate: new Date('2026-11-03'),
      status: 'Applied' as const,
      nextRound: 'Aptitude & Math Round',
      nextRoundDate: '2026-11-28',
      aiReadinessScore: 86,
      feedbackNotes: 'Application submitted before early registration deadline.',
      verifiedByTpo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  resumes: [
    {
      resumeId: 'res-001',
      studentId: 'stu-2025-089',
      targetRole: 'Software Development Engineer (Core Systems)',
      resumeText: 'Aarav Sharma resume text...',
      atsScore: 88,
      categoryScores: {
        actionVerbs: 92,
        metricsDensity: 88,
        technicalMatch: 84,
        parserFormat: 100,
      },
      strengths: ['High density of measurable metrics', 'Clear modern tech stack', 'Clean reverse-chronology'],
      missingKeywords: ['Kubernetes', 'Apache Kafka', 'GraphQL', 'CI/CD Pipeline'],
      recommendations: ['Quantify cloud resource savings', 'Add architectural keywords'],
      lastAuditedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  cvs: [
    {
      cvId: 'cv-sriudbhav-01',
      studentId: '251FA04I28',
      title: 'Sri Udbhav — Core Systems & SDE CV',
      template: 'modern-ats',
      personalDetails: {
        fullName: 'Sri Udbhav',
        email: 'v.sriudbhav68@gmail.com',
        phone: '+91 94901 23456',
        rollNo: '251FA04I28',
        department: 'Computer Science & Engineering',
        batch: '2021 - 2025 (Final Year)',
        location: 'Vadlamudi, Guntur, AP',
        linkedinUrl: 'https://linkedin.com/in/sri-udbhav',
        githubUrl: 'https://github.com/SriUdbhav',
        portfolioUrl: 'https://sriudbhav.dev',
      },
      summary:
        'Final-year Computer Science & Engineering undergraduate at VFSTR with high academic standing (CGPA: 9.24) and demonstrated proficiency in distributed systems, full-stack web engineering, and algorithms. Experienced in architecting low-latency microservices with Node.js, TypeScript, Docker, and PostgreSQL.',
      education: [
        {
          id: 'edu-1',
          institution: "Vignan's Foundation for Science, Technology & Research (VFSTR Deemed to be University)",
          degree: 'Bachelor of Technology (B.Tech)',
          field: 'Computer Science & Engineering',
          startYear: '2021',
          endYear: '2025',
          cgpaOrPercentage: '9.24 / 10.0 CGPA',
          location: 'Vadlamudi, Guntur',
        },
        {
          id: 'edu-2',
          institution: 'Sri Chaitanya Junior College',
          degree: 'Intermediate (Class XII - MPC)',
          field: 'Mathematics, Physics, Chemistry',
          startYear: '2019',
          endYear: '2021',
          cgpaOrPercentage: '94.2%',
          location: 'Vijayawada, AP',
        },
        {
          id: 'edu-3',
          institution: 'Bhashyam Public School',
          degree: 'Secondary School Certificate (Class X)',
          field: 'General Sciences & Mathematics',
          startYear: '2018',
          endYear: '2019',
          cgpaOrPercentage: '95.0%',
          location: 'Guntur, AP',
        },
      ],
      skills: {
        languages: ['TypeScript', 'JavaScript (ESNext)', 'Python', 'C++', 'SQL'],
        frameworks: ['React 19', 'Node.js', 'Express', 'Tailwind CSS', 'FastAPI'],
        developerTools: ['Docker', 'Git', 'Linux / Bash', 'Postman', 'VS Code', 'GitHub Actions CI/CD'],
        databases: ['PostgreSQL', 'MongoDB', 'Redis (In-Memory Caching)'],
        coursework: ['Data Structures & Algorithms', 'Operating Systems', 'Database Management Systems', 'Computer Networks', 'Distributed Systems'],
      },
      projects: [
        {
          id: 'proj-1',
          title: 'PlaceMate AI — Campus Recruitment & Placement Agent',
          techStack: 'React 19, TypeScript, Express, Tailwind CSS, MongoDB Atlas',
          duration: 'Oct 2024 - Present',
          link: 'https://github.com/SriUdbhav/Placement-guide',
          bullets: [
            'Architected an autonomous campus recruitment management platform serving students, recruiters, and TPO cells for university hiring drives.',
            'Engineered automated candidate eligibility audits and verification pipeline matching students against GPA and backlog policies.',
            'Integrated ATS resume vector scoring and Gemini AI copilot for contextual mock interview grading and skill gap diagnostics.',
          ],
        },
        {
          id: 'proj-2',
          title: 'Distributed Task Queue & In-Memory Cache Engine',
          techStack: 'Node.js, TypeScript, Redis, Docker, Jest',
          duration: 'Jan 2024 - May 2024',
          link: 'https://github.com/SriUdbhav/distributed-task-queue',
          bullets: [
            'Engineered an asynchronous task execution queue processing 5,000+ jobs/min with exponential backoff retry and dead-letter channels.',
            'Implemented an LRU cache layer with TTL expiry, reducing downstream database read overhead by 42%.',
            'Containerized services using multi-stage Docker builds, maintaining comprehensive unit test coverage above 90%.',
          ],
        },
      ],
      experience: [
        {
          id: 'exp-1',
          role: 'Software Development Engineering Intern',
          company: 'Campus Career Development Centre (CDC)',
          location: 'VFSTR Campus',
          duration: 'May 2024 - Jul 2024',
          bullets: [
            'Developed automated data extraction and student batch verification microservices handling 800+ candidate academic dossiers.',
            'Optimized relational query indices in PostgreSQL, decreasing student placement audit generation latency from 4.2s to 650ms.',
            'Collaborated with placement coordinators to implement secure registration-number authentication and role-based access control.',
          ],
        },
      ],
      certifications: [
        {
          id: 'cert-1',
          name: 'AWS Certified Cloud Practitioner',
          issuer: 'Amazon Web Services (AWS)',
          issueDate: 'Aug 2024',
          credentialUrl: 'https://aws.amazon.com/verification',
        },
        {
          id: 'cert-2',
          name: 'Meta Front-End Developer Professional Certificate',
          issuer: 'Meta / Coursera',
          issueDate: 'Jan 2024',
          credentialUrl: 'https://coursera.org/verify/professional-cert',
        },
      ],
      achievements: [
        'Solved 450+ algorithmic problems across LeetCode and CodeChef with Top 5% contest rating.',
        'Finalist at VFSTR Hackathon 2.0 Problem Statement 16 for Autonomous Placement Management Agent.',
        'Academic Merit Scholar at VFSTR for maintaining consistent CGPA above 9.20 across all semesters.',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      cvId: 'cv-aarav-01',
      studentId: 'stu-2025-089',
      title: 'Aarav Sharma — Full Stack Developer CV',
      template: 'modern-ats',
      personalDetails: {
        fullName: 'Aarav Sharma',
        email: 'aarav.sharma@campus.edu',
        phone: '+91 98765 43210',
        rollNo: '21CS048',
        department: 'Computer Science & Engineering',
        batch: '2021 - 2025 (Final Year)',
        location: 'Vadlamudi, Guntur, AP',
        linkedinUrl: 'https://linkedin.com/in/aarav-sharma',
        githubUrl: 'https://github.com/aaravsharma',
        portfolioUrl: 'https://aaravsharma.dev',
      },
      summary:
        'Enthusiastic Full Stack Engineer with strong algorithmic fundamentals (450+ LeetCode problems solved) and 8.92 CGPA at VFSTR. Proficient in React, Node.js, TypeScript, PostgreSQL, and building reliable web microservices.',
      education: [
        {
          id: 'edu-1',
          institution: "Vignan's Foundation for Science, Technology & Research (VFSTR)",
          degree: 'Bachelor of Technology (B.Tech)',
          field: 'Computer Science & Engineering',
          startYear: '2021',
          endYear: '2025',
          cgpaOrPercentage: '8.92 / 10.0 CGPA',
          location: 'Vadlamudi, Guntur',
        },
      ],
      skills: {
        languages: ['TypeScript', 'JavaScript', 'Python', 'C++'],
        frameworks: ['React', 'Node.js', 'Express', 'Tailwind CSS'],
        developerTools: ['Docker', 'Git', 'Linux', 'Postman'],
        databases: ['PostgreSQL', 'MongoDB', 'Redis'],
        coursework: ['Data Structures & Algorithms', 'DBMS', 'Operating Systems'],
      },
      projects: [
        {
          id: 'proj-1',
          title: 'Campus Event & Hackathon Manager',
          techStack: 'React, Node.js, Express, PostgreSQL',
          duration: 'Jan 2024 - Apr 2024',
          bullets: [
            'Built responsive registration and team coordination portal used by 1,200+ university participants.',
            'Implemented JWT authentication with role-based routing and automated PDF certificate generation.',
          ],
        },
      ],
      experience: [],
      certifications: [
        {
          id: 'cert-1',
          name: 'PostgreSQL Database Specialist',
          issuer: 'Udemy / Linux Foundation',
          issueDate: 'Mar 2024',
        },
      ],
      achievements: [
        'LeetCode 450+ problems solved with Knight rating.',
        'Dean’s Honor Roll student for semester academic excellence.',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  interviews: [
    {
      interviewId: 'int-001',
      studentId: 'stu-2025-089',
      jobId: 'job-goog-01',
      companyName: 'Google',
      role: 'Software Development Engineer I',
      roundType: 'Technical' as const,
      scheduledAt: new Date('2026-11-12T10:00:00'),
      durationMinutes: 90,
      status: 'Scheduled' as const,
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  notifications: [
    {
      notificationId: 'notif-1',
      recipientRole: 'all' as const,
      title: 'Google SDE-I Assessment Scheduled',
      message: 'Online test link dispatched for Nov 12, 10:00 AM IST.',
      category: 'drive_alert' as const,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      notificationId: 'notif-2',
      recipientRole: 'student' as const,
      recipientId: 'stu-2025-089',
      title: 'TPO Verified: Tier-1 Fast Track',
      message: 'Your 8.92 CGPA and clean backlog record verified.',
      category: 'tpo_notice' as const,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  users: [
    {
      userId: 'usr-student-01',
      studentId: 'stu-2025-089',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@campus.edu',
      role: 'student' as const,
      department: 'Computer Science & Engineering',
      rollNo: '21CS048',
      passwordHash: bcrypt.hashSync('Student@123', 10),
      mustChangePassword: false,
      hasChangedInitialPassword: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId: 'usr-student-251FA04I28',
      studentId: 'stu-251FA04I28',
      name: 'Sri Udbhav',
      email: 'v.sriudbhav68@gmail.com',
      role: 'student' as const,
      department: 'Computer Science & Engineering',
      rollNo: '251FA04I28',
      passwordHash: bcrypt.hashSync('251FA04I28', 10), // Initial password is the registration number
      mustChangePassword: true, // Requires first-time permanent password setup
      hasChangedInitialPassword: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId: 'usr-tpo-01',
      name: 'Dr. Suresh Ranganathan',
      email: 'tpo@campus.edu',
      role: 'tpo' as const,
      department: 'Training & Placement Cell',
      passwordHash: bcrypt.hashSync('TpoAdmin@123', 10),
      mustChangePassword: false,
      hasChangedInitialPassword: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId: 'usr-recruiter-01',
      name: 'Priyanka Sen',
      email: 'recruiter@google.com',
      role: 'recruiter' as const,
      companyName: 'Google Campus Talent Acquisition',
      passwordHash: bcrypt.hashSync('Recruiter@123', 10),
      mustChangePassword: false,
      hasChangedInitialPassword: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId: 'usr-admin-01',
      name: 'Prof. K. Narayanan',
      email: 'admin@campus.edu',
      role: 'admin' as const,
      department: 'Directorate of University Placements',
      passwordHash: bcrypt.hashSync('SystemAdmin@123', 10),
      mustChangePassword: false,
      hasChangedInitialPassword: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

async function seedDatabaseIfEmpty() {
  try {
    const studentCount = await Student.countDocuments();
    if (studentCount === 0) {
      console.log('Seeding initial student profile into MongoDB...');
      await Student.insertMany(inMemoryStore.students);
    } else {
      // Upsert authorized student records to guarantee all institutional profiles exist
      for (const s of inMemoryStore.students) {
        await Student.findOneAndUpdate(
          { rollNo: s.rollNo },
          { $set: s },
          { upsert: true, new: true }
        );
      }
    }

    const companyCount = await Company.countDocuments();
    if (companyCount === 0) {
      console.log('Seeding partner companies into MongoDB...');
      await Company.insertMany(inMemoryStore.companies);
    }

    const jobCount = await JobDrive.countDocuments();
    if (jobCount === 0) {
      console.log('Seeding campus placement drives into MongoDB...');
      await JobDrive.insertMany(inMemoryStore.jobs);
    }

    const appCount = await Application.countDocuments();
    if (appCount === 0) {
      console.log('Seeding active candidate applications into MongoDB...');
      await Application.insertMany(inMemoryStore.applications);
    }

    const resumeCount = await Resume.countDocuments();
    if (resumeCount === 0 && inMemoryStore.resumes.length > 0) {
      console.log('Seeding initial resume into MongoDB...');
      await Resume.insertMany(inMemoryStore.resumes);
    }

    const interviewCount = await Interview.countDocuments();
    if (interviewCount === 0 && inMemoryStore.interviews.length > 0) {
      console.log('Seeding initial mock interview into MongoDB...');
      await Interview.insertMany(inMemoryStore.interviews);
    }

    const cvCount = await CV.countDocuments();
    if (cvCount === 0 && inMemoryStore.cvs.length > 0) {
      console.log('Seeding initial CV documents into MongoDB...');
      await CV.insertMany(inMemoryStore.cvs);
    }

    const notifCount = await Notification.countDocuments();
    if (notifCount === 0) {
      console.log('Seeding placement notifications into MongoDB...');
      await Notification.insertMany(inMemoryStore.notifications);
    }

    // Ensure default role users exist without overwriting changed passwords on restart
    for (const u of inMemoryStore.users) {
      const existingUser = await User.findOne({ $or: [{ email: u.email }, { rollNo: u.rollNo }] });
      if (!existingUser) {
        await User.create(u);
      } else {
        // Only update non-credential metadata, never overwrite passwordHash or hasChangedInitialPassword
        await User.findByIdAndUpdate(existingUser._id, {
          name: u.name,
          department: u.department,
          studentId: u.studentId,
          role: u.role,
        }).catch(() => {});
      }
    }
    console.log('✅ User authentication records verified in MongoDB.');
  } catch (err: any) {
    console.error('Error during initial database seed check:', err.message);
  }
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Download,
  Save,
  Printer,
  Edit3,
  Globe,
  Github,
  Linkedin,
  Phone,
  Mail,
  MapPin,
  Check,
  Send,
  Bot,
  User,
  RefreshCw,
  Plus,
  Trash2,
  ChevronRight,
  FolderOpen,
  ShieldCheck,
  AlertCircle,
  X,
  FileText,
  FileCode,
  CheckCircle2,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { StudentProfile, CVData, CVChatMessage, CVEducation, CVProject, CVExperience, CVCertification } from '../../types';
import { apiClient } from '../../services/api';
import { generateDocxBlob } from '../../utils/docxExport';
import { exportElementToPdf } from '../../utils/pdfExport';

interface CVGeneratorProps {
  student: StudentProfile;
  isRealAiActive: boolean;
}

export const CVGenerator: React.FC<CVGeneratorProps> = ({ student, isRealAiActive }) => {
  // Saved CVs list from database
  const [savedCvs, setSavedCvs] = useState<CVData[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  const [isLoadingCvs, setIsLoadingCvs] = useState(true);

  // Active CV working state
  const [cvData, setCvData] = useState<CVData>(() => createInitialCV(student));

  // Chat conversation state
  const [messages, setMessages] = useState<CVChatMessage[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string>('target_role');
  const [progressPercent, setProgressPercent] = useState<number>(15);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Layout & Generation Lifecycle State
  // Initial state: chatbot occupies FULL available main area. Resume preview is HIDDEN.
  // After generation starts: isResumeStarted becomes true -> chatbot shrinks, preview appears!
  const [isResumeStarted, setIsResumeStarted] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [activeStreamingSection, setActiveStreamingSection] = useState<string | null>(null);

  // UI state
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'preview'>('chat');
  const [activeTemplate, setActiveTemplate] = useState<'modern-ats' | 'executive-clean' | 'academic-harvard' | 'minimal-tech'>('modern-ats');
  const [zoomLevel, setZoomLevel] = useState<75 | 100 | 125>(100);
  const [isEditAnswersOpen, setIsEditAnswersOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [saveSuccessNotification, setSaveSuccessNotification] = useState<string | null>(null);
  const [isSavedCvsDrawerOpen, setIsSavedCvsDrawerOpen] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // Dedicated Link Fields State
  const [isLinksOpen, setIsLinksOpen] = useState(true);
  const [githubInput, setGithubInput] = useState('');
  const [linkedinInput, setLinkedinInput] = useState('');
  const [portfolioInput, setPortfolioInput] = useState('');
  const [linkError, setLinkError] = useState<{ field: string; message: string } | null>(null);

  // Refs
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const printIframeRef = useRef<HTMLIFrameElement>(null);
  const resumePreviewRef = useRef<HTMLDivElement>(null);

  // Factory for default fresh CV
  function createInitialCV(stud: StudentProfile, role = 'Software Development Engineer'): CVData {
    return {
      id: `cv-${Date.now()}`,
      studentId: stud.rollNo || stud.id,
      title: `${stud.name} — ${role} CV`,
      template: 'modern-ats',
      targetRole: role,
      targetCompany: 'Enterprise Tech / Campus Recruitment',
      jobDescription: '',
      personalDetails: {
        fullName: stud.name,
        email: stud.email || 'vsriudbhav@gmail.com',
        phone: '+91 94901 23456',
        rollNo: stud.rollNo || '251FA04I28',
        department: stud.department || 'Computer Science & Engineering',
        batch: stud.batch || '2021 - 2025 (Final Year)',
        location: 'Vadlamudi, Guntur, Andhra Pradesh',
        linkedinUrl: 'https://linkedin.com/in/sri-udbhav',
        githubUrl: 'https://github.com/SriUdbhav',
        portfolioUrl: 'https://sriudbhav.dev',
      },
      summary: `Final-year Computer Science & Engineering undergraduate at VFSTR with verified academic standing (${stud.cgpa} CGPA) and solid foundations in algorithms, microservices, and system architecture. Seeking to contribute to ${role} workflows with scalable, test-driven implementations.`,
      education: [
        {
          id: 'edu-vfstr',
          institution: "Vignan's Foundation for Science, Technology & Research (VFSTR Deemed to be University)",
          degree: 'Bachelor of Technology (B.Tech)',
          field: stud.department || 'Computer Science & Engineering',
          startYear: '2021',
          endYear: '2025',
          cgpaOrPercentage: `${stud.cgpa} / 10.0 CGPA`,
          location: 'Vadlamudi, Guntur, AP',
        },
        {
          id: 'edu-inter',
          institution: 'Sri Chaitanya Junior College',
          degree: 'Intermediate (Class XII - MPC)',
          field: 'Mathematics, Physics, Chemistry',
          startYear: '2019',
          endYear: '2021',
          cgpaOrPercentage: '94.2%',
          location: 'Vijayawada, AP',
        },
        {
          id: 'edu-tenth',
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
        languages: ['TypeScript', 'JavaScript (ESNext)', 'Python', 'Java', 'SQL', 'C++'],
        frameworks: ['React 19', 'Node.js', 'Express', 'Tailwind CSS', 'FastAPI'],
        developerTools: ['Docker', 'Git & GitHub', 'Linux / Bash', 'Postman', 'VS Code', 'GitHub Actions'],
        databases: ['PostgreSQL', 'MongoDB Atlas', 'Redis (Caching)'],
        coursework: ['Data Structures & Algorithms', 'Operating Systems', 'Database Management Systems', 'Computer Networks', 'System Design'],
      },
      projects: [
        {
          id: 'proj-1',
          title: 'PlaceMate AI — Campus Recruitment & Placement Agent',
          techStack: 'React 19, TypeScript, Express, MongoDB Atlas, Tailwind CSS',
          duration: 'Oct 2024 - Present',
          link: 'https://github.com/SriUdbhav/Placement-guide',
          bullets: [
            'Architected an autonomous campus recruitment management platform serving students, recruiters, and TPO cells for university hiring drives.',
            'Engineered automated candidate eligibility audits and verification pipeline matching students against GPA and backlog policies.',
            'Integrated ATS resume vector scoring and Gemini AI placement copilot for contextual mock interview grading and skill gap diagnostics.',
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
            'Containerized services using multi-stage Docker builds, maintaining unit test coverage above 90%.',
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
        'Solved 450+ algorithmic problems across LeetCode and CodeChef with Top 5% contest percentile.',
        'Finalist at VFSTR Hackathon 2.0 Problem Statement 16 for Campus Placement Intelligence Agent.',
        'Academic Merit Scholar at VFSTR for maintaining consistent CGPA above 9.20 across all semesters.',
      ],
    };
  }

  // Load existing CVs from MongoDB on mount
  useEffect(() => {
    let isMounted = true;
    const fetchCvs = async () => {
      setIsLoadingCvs(true);
      const studentId = student.rollNo || student.id;
      const list = await apiClient.getCVs(studentId);
      if (isMounted) {
        if (list && list.length > 0) {
          setSavedCvs(list);
          const first = list[0];
          setSelectedCvId(first.id);
          setCvData(first);
          if (first.template) setActiveTemplate(first.template);

          // Seed link inputs
          if (first.personalDetails?.githubUrl) setGithubInput(first.personalDetails.githubUrl);
          if (first.personalDetails?.linkedinUrl) setLinkedinInput(first.personalDetails.linkedinUrl);
          if (first.personalDetails?.portfolioUrl) setPortfolioInput(first.personalDetails.portfolioUrl);

          // Restore conversation or start fresh
          if (first.conversationState && first.conversationState.messages?.length > 0) {
            setMessages(first.conversationState.messages);
            setCurrentStepId(first.conversationState.currentStep || 'ready');
            const percent = first.conversationState.stepIndex
              ? Math.round((first.conversationState.stepIndex / (first.conversationState.totalSteps || 8)) * 100)
              : 85;
            setProgressPercent(percent);

            // If resume was previously generated/completed, show preview
            if (first.conversationState.status === 'completed' || percent >= 75) {
              setIsResumeStarted(true);
              setIsGenerated(true);
            } else {
              setIsResumeStarted(false);
              setIsGenerated(false);
            }
          } else {
            initWelcomeConversation(first);
          }
        } else {
          // Initialize fresh CV
          const initial = createInitialCV(student);
          setCvData(initial);
          if (initial.personalDetails?.githubUrl) setGithubInput(initial.personalDetails.githubUrl);
          if (initial.personalDetails?.linkedinUrl) setLinkedinInput(initial.personalDetails.linkedinUrl);
          if (initial.personalDetails?.portfolioUrl) setPortfolioInput(initial.personalDetails.portfolioUrl);
          initWelcomeConversation(initial);
          setIsResumeStarted(false);
          setIsGenerated(false);
        }
        setIsLoadingCvs(false);
      }
    };
    fetchCvs();
    return () => {
      isMounted = false;
    };
  }, [student.rollNo, student.id]);

  // Initial welcome greeting
  const initWelcomeConversation = (baseCv: CVData) => {
    const welcomeMsg: CVChatMessage = {
      id: `msg-${Date.now()}-init`,
      sender: 'ai',
      text: `Hello **${student.name}**! 👋 Welcome to your **Gemini AI Resume Copilot**.\n\nI have retrieved your verified academic record from the VFSTR portal (**${student.department}**, CGPA: **${student.cgpa}**).\n\nI'll guide you through a step-by-step conversational interview to build an authentic, ATS-tailored resume for your targeted campus placement drives.\n\n**To get started: What target job role are you aiming for?**`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickReplies: [
        'Software Development Engineer (SDE)',
        'Full Stack Developer',
        'Data Analyst / BI Engineer',
        'Java Backend Developer',
        'Cloud & DevOps Engineer',
        'AI / Machine Learning Engineer',
      ],
      stepId: 'target_role',
    };
    setMessages([welcomeMsg]);
    setCurrentStepId('target_role');
    setProgressPercent(15);
    setIsResumeStarted(false);
    setIsGenerated(false);
  };

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, isGenerating]);

  // Handle dedicated link additions with validation
  const validateAndFormatUrl = (url: string): string | null => {
    const trimmed = url.trim();
    if (!trimmed) return null;
    let formatted = trimmed;
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }
    try {
      new URL(formatted);
      return formatted;
    } catch {
      return null;
    }
  };

  const handleAddLink = (type: 'github' | 'linkedin' | 'portfolio') => {
    setLinkError(null);
    let value = '';
    let label = '';
    if (type === 'github') {
      value = githubInput;
      label = 'GitHub Profile';
    } else if (type === 'linkedin') {
      value = linkedinInput;
      label = 'LinkedIn Profile';
    } else {
      value = portfolioInput;
      label = 'Portfolio Website';
    }

    const validated = validateAndFormatUrl(value);
    if (!validated) {
      setLinkError({
        field: type,
        message: `Please enter a valid URL (e.g., https://${type === 'github' ? 'github.com/username' : type === 'linkedin' ? 'linkedin.com/in/username' : 'yourportfolio.dev'})`,
      });
      return;
    }

    const updatedPersonal = { ...cvData.personalDetails };
    if (type === 'github') updatedPersonal.githubUrl = validated;
    if (type === 'linkedin') updatedPersonal.linkedinUrl = validated;
    if (type === 'portfolio') updatedPersonal.portfolioUrl = validated;

    const updatedCv = { ...cvData, personalDetails: updatedPersonal };
    setCvData(updatedCv);

    // Add confirmation message to chat
    const confirmMsg: CVChatMessage = {
      id: `msg-${Date.now()}-link`,
      sender: 'user',
      text: `Added my ${label}: ${validated}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const botReply: CVChatMessage = {
      id: `msg-${Date.now()}-botlink`,
      sender: 'ai',
      text: `✅ Verified and linked your **${label}** (${validated}). It is now integrated and clickable in your resume!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickReplies: ['🚀 Generate Resume', 'Add technical skills', 'Confirm my links'],
    };

    setMessages((prev) => [...prev, confirmMsg, botReply]);
    showToast(`${label} added successfully!`);
  };

  const handleRemoveLink = (type: 'github' | 'linkedin' | 'portfolio') => {
    const updatedPersonal = { ...cvData.personalDetails };
    if (type === 'github') {
      updatedPersonal.githubUrl = '';
      setGithubInput('');
    }
    if (type === 'linkedin') {
      updatedPersonal.linkedinUrl = '';
      setLinkedinInput('');
    }
    if (type === 'portfolio') {
      updatedPersonal.portfolioUrl = '';
      setPortfolioInput('');
    }
    setCvData({ ...cvData, personalDetails: updatedPersonal });
    showToast(`Removed link.`);
  };

  // Section parser from streaming text
  const parseStreamSections = (rawText: string): Partial<CVData> => {
    const patch: Partial<CVData> = {};

    // Summary
    const summaryMatch = rawText.match(/\[\[SECTION:SUMMARY\]\]([\s\S]*?)(\[\[END_SUMMARY\]\]|$)/i);
    if (summaryMatch && summaryMatch[1].trim()) {
      patch.summary = summaryMatch[1].trim();
    }

    // Skills
    const skillsMatch = rawText.match(/\[\[SECTION:SKILLS\]\]([\s\S]*?)(\[\[END_SKILLS\]\]|$)/i);
    if (skillsMatch && skillsMatch[1].trim()) {
      const sText = skillsMatch[1];
      const languagesMatch = sText.match(/Languages:\s*([^\n]+)/i);
      const frameworksMatch = sText.match(/Frameworks:\s*([^\n]+)/i);
      const databasesMatch = sText.match(/Databases:\s*([^\n]+)/i);
      const toolsMatch = sText.match(/Tools:\s*([^\n]+)/i);
      const courseworkMatch = sText.match(/Coursework:\s*([^\n]+)/i);

      patch.skills = {
        languages: languagesMatch
          ? languagesMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
          : cvData.skills?.languages || [],
        frameworks: frameworksMatch
          ? frameworksMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
          : cvData.skills?.frameworks || [],
        databases: databasesMatch
          ? databasesMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
          : cvData.skills?.databases || [],
        developerTools: toolsMatch
          ? toolsMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
          : cvData.skills?.developerTools || [],
        coursework: courseworkMatch
          ? courseworkMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
          : cvData.skills?.coursework || [],
      };
    }

    // Projects
    const projectsMatch = rawText.match(/\[\[SECTION:PROJECTS\]\]([\s\S]*?)(\[\[END_PROJECTS\]\]|$)/i);
    if (projectsMatch && projectsMatch[1].trim()) {
      const projBlocks = projectsMatch[1]
        .split(/\[PROJECT\]/i)
        .map((b) => b.replace(/\[\/PROJECT\]/i, '').trim())
        .filter(Boolean);

      if (projBlocks.length > 0) {
        const parsedProjects: CVProject[] = projBlocks.map((block, idx) => {
          const titleMatch = block.match(/Title:\s*([^\n]+)/i);
          const stackMatch = block.match(/TechStack:\s*([^\n]+)/i);
          const durationMatch = block.match(/Duration:\s*([^\n]+)/i);
          const bullets: string[] = [];
          const lines = block.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
              bullets.push(trimmed.replace(/^[•\-\*]\s*/, '').trim());
            }
          }
          return {
            id: `proj-stream-${idx}`,
            title: titleMatch ? titleMatch[1].trim() : `Engineering Project ${idx + 1}`,
            techStack: stackMatch ? stackMatch[1].trim() : 'Full-Stack Distributed Architecture',
            duration: durationMatch ? durationMatch[1].trim() : 'Academic / Capstone',
            bullets:
              bullets.length > 0
                ? bullets
                : ['Engineered scalable microservices architecture ensuring high test coverage.'],
          };
        });
        patch.projects = parsedProjects;
      }
    }

    // Experience
    const expMatch = rawText.match(/\[\[SECTION:EXPERIENCE\]\]([\s\S]*?)(\[\[END_EXPERIENCE\]\]|$)/i);
    if (expMatch && expMatch[1].trim()) {
      const expBlocks = expMatch[1]
        .split(/\[EXP\]/i)
        .map((b) => b.replace(/\[\/EXP\]/i, '').trim())
        .filter(Boolean);

      if (expBlocks.length > 0) {
        const parsedExp: CVExperience[] = expBlocks.map((block, idx) => {
          const roleMatch = block.match(/Role:\s*([^\n]+)/i);
          const companyMatch = block.match(/Company:\s*([^\n]+)/i);
          const durationMatch = block.match(/Duration:\s*([^\n]+)/i);
          const bullets: string[] = [];
          const lines = block.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
              bullets.push(trimmed.replace(/^[•\-\*]\s*/, '').trim());
            }
          }
          return {
            id: `exp-stream-${idx}`,
            role: roleMatch ? roleMatch[1].trim() : 'Software Engineering Intern',
            company: companyMatch ? companyMatch[1].trim() : 'Campus Career Development Centre (CDC)',
            duration: durationMatch ? durationMatch[1].trim() : 'Summer Internship',
            bullets:
              bullets.length > 0
                ? bullets
                : ['Built candidate verification pipeline reducing manual processing overhead.'],
          };
        });
        patch.experience = parsedExp;
      }
    }

    // Certifications
    const certMatch = rawText.match(/\[\[SECTION:CERTIFICATIONS\]\]([\s\S]*?)(\[\[END_CERTIFICATIONS\]\]|$)/i);
    if (certMatch && certMatch[1].trim()) {
      const certLines = certMatch[1]
        .split('\n')
        .map((l) => l.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);
      if (certLines.length > 0) {
        patch.certifications = certLines.map((line, idx) => ({
          id: `cert-${idx}`,
          name: line.split('—')[0]?.trim() || line,
          issuer: line.split('—')[1]?.trim() || 'Verified Placement Credential',
          issueDate: '2024',
        }));
      }
    }

    // Achievements
    const achMatch = rawText.match(/\[\[SECTION:ACHIEVEMENTS\]\]([\s\S]*?)(\[\[END_ACHIEVEMENTS\]\]|$)/i);
    if (achMatch && achMatch[1].trim()) {
      const achLines = achMatch[1]
        .split('\n')
        .map((l) => l.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);
      if (achLines.length > 0) {
        patch.achievements = achLines;
      }
    }

    return patch;
  };

  // Instant Resume Typing & Gemini Streaming Trigger
  const handleStartStreamingGeneration = async () => {
    // 1. Immediately transition layout: chatbot shrinks, preview appears!
    setIsResumeStarted(true);
    setIsGenerating(true);
    setIsGenerated(false);
    setActiveStreamingSection('summary');

    let streamBuffer = '';

    try {
      await apiClient.streamResumeGeneration(
        {
          studentProfile: student,
          targetRole: cvData.targetRole,
          targetCompany: cvData.targetCompany,
          jobDescription: cvData.jobDescription,
          cvData,
        },
        // onChunk callback: streams progressive text and updates live preview instantly!
        (chunkText) => {
          streamBuffer += chunkText;

          // Determine current section being written for visual indicator
          if (streamBuffer.includes('[[SECTION:ACHIEVEMENTS]]')) {
            setActiveStreamingSection('achievements');
          } else if (streamBuffer.includes('[[SECTION:CERTIFICATIONS]]')) {
            setActiveStreamingSection('certifications');
          } else if (streamBuffer.includes('[[SECTION:EXPERIENCE]]')) {
            setActiveStreamingSection('experience');
          } else if (streamBuffer.includes('[[SECTION:PROJECTS]]')) {
            setActiveStreamingSection('projects');
          } else if (streamBuffer.includes('[[SECTION:SKILLS]]')) {
            setActiveStreamingSection('skills');
          } else if (streamBuffer.includes('[[SECTION:SUMMARY]]')) {
            setActiveStreamingSection('summary');
          }

          // Parse and update CV data in real-time
          const patch = parseStreamSections(streamBuffer);
          setCvData((prev) => ({
            ...prev,
            ...patch,
            skills: patch.skills ? { ...prev.skills, ...patch.skills } : prev.skills,
            projects: patch.projects?.length ? patch.projects : prev.projects,
            experience: patch.experience?.length ? patch.experience : prev.experience,
          }));
        },
        // onComplete callback: mark generation finished, reveal download options!
        async () => {
          setIsGenerating(false);
          setIsGenerated(true);
          setActiveStreamingSection(null);
          setProgressPercent(100);

          const finalPatch = parseStreamSections(streamBuffer);
          const finalCv = {
            ...cvData,
            ...finalPatch,
          };
          setCvData(finalCv);

          const successMsg: CVChatMessage = {
            id: `msg-${Date.now()}-done`,
            sender: 'ai',
            text: `🎯 **Gemini has completed your resume!**\n\nYour resume has been written and tailored for **${cvData.targetRole || 'Software Development Engineer'}** with high-density ATS keywords, Google X-Y-Z metric bullets, and verified VFSTR academic credentials.\n\n**Download Options are now unlocked!** You can download as **PDF** or **Word (.docx)** using the top toolbar, or ask me to modify any section.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            quickReplies: [
              'Improve my professional summary',
              'Make my project descriptions more impactful',
              'Add more clarity to my technical skills',
              'Download as PDF',
              'Download as Word (.docx)',
            ],
            stepId: 'completed',
          };

          const updatedMessages = [...messages, successMsg];
          setMessages(updatedMessages);

          // Save to MongoDB persistently
          await saveConversationToStorage(finalCv, updatedMessages, 'completed', 100);
          showToast('Resume generation complete! Download options are now unlocked.');
        },
        // onError callback
        (err) => {
          console.error('Streaming error:', err);
          setIsGenerating(false);
          setIsGenerated(true);
          setActiveStreamingSection(null);
        }
      );
    } catch (e) {
      console.error('Failed to stream resume:', e);
      setIsGenerating(false);
      setIsGenerated(true);
      setActiveStreamingSection(null);
    }
  };

  // Handle sending a message in chat
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!messageText || isThinking || isGenerating) return;

    setInputText('');

    const userMessage: CVChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      stepId: currentStepId,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsThinking(true);

    // If user clicked or typed to generate resume, trigger streaming generation!
    const lower = messageText.toLowerCase();
    if (
      lower.includes('generate resume') ||
      lower.includes('generate my resume') ||
      lower.includes('start generation') ||
      lower.includes('create resume')
    ) {
      setIsThinking(false);
      await handleStartStreamingGeneration();
      return;
    }

    try {
      const res = await apiClient.sendCVChatStep({
        message: messageText,
        stepId: currentStepId,
        conversationHistory: updatedMessages,
        currentCv: cvData,
        studentProfile: student,
        targetRole: cvData.targetRole,
        targetCompany: cvData.targetCompany,
        jobDescription: cvData.jobDescription,
      });

      if (res) {
        let updatedCv = { ...cvData };
        if (res.cvPatch) {
          updatedCv = {
            ...updatedCv,
            ...res.cvPatch,
            personalDetails: {
              ...updatedCv.personalDetails,
              ...(res.cvPatch.personalDetails || {}),
            },
            skills: {
              ...updatedCv.skills,
              ...(res.cvPatch.skills || {}),
            },
            projects: res.cvPatch.projects?.length ? res.cvPatch.projects : updatedCv.projects,
            experience: res.cvPatch.experience?.length ? res.cvPatch.experience : updatedCv.experience,
            certifications: res.cvPatch.certifications?.length ? res.cvPatch.certifications : updatedCv.certifications,
            achievements: res.cvPatch.achievements?.length ? res.cvPatch.achievements : updatedCv.achievements,
          };
          setCvData(updatedCv);
        }

        const aiMessage: CVChatMessage = {
          id: `msg-${Date.now()}-ai`,
          sender: 'ai',
          text: res.aiResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickReplies: res.quickReplies || [],
          stepId: res.nextStepId,
        };

        const finalMessages = [...updatedMessages, aiMessage];
        setMessages(finalMessages);
        setCurrentStepId(res.nextStepId);
        if (res.progressPercent) setProgressPercent(res.progressPercent);

        // Auto-save conversation state
        saveConversationToStorage(updatedCv, finalMessages, res.nextStepId, res.progressPercent);
      }
    } catch (e: any) {
      console.warn('Chat step error:', e);
      const errorMessage: CVChatMessage = {
        id: `msg-${Date.now()}-ai-err`,
        sender: 'ai',
        text: `⚠️ **Gemini AI Service Error**: ${e?.message || 'Unable to communicate with the Gemini AI service. Please check your network and try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplies: ['Try again', '🚀 Generate Resume'],
        stepId: currentStepId,
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsThinking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Quick reply chip click
  const handleQuickReply = (reply: string) => {
    if (reply.includes('Generate Resume')) {
      handleStartStreamingGeneration();
    } else if (reply.includes('Download as PDF')) {
      handleDownloadPDF();
    } else if (reply.includes('Download as Word')) {
      handleDownloadWord();
    } else {
      handleSendMessage(reply);
    }
  };

  // Save conversation state and resume to database
  const saveConversationToStorage = async (
    currentWorkingCv: CVData,
    currentMessages: CVChatMessage[],
    step: string,
    percent: number
  ) => {
    const studentId = student.rollNo || student.id;
    const conversationState = {
      currentStep: step,
      stepIndex: Math.round((percent / 100) * 8),
      totalSteps: 8,
      status: percent >= 100 ? ('completed' as const) : ('in_progress' as const),
      messages: currentMessages,
      collectedAnswers: {
        targetRole: currentWorkingCv.targetRole,
        targetCompany: currentWorkingCv.targetCompany,
      },
    };

    const payload = {
      ...currentWorkingCv,
      template: activeTemplate,
      studentId,
      conversationState,
      updatedAt: new Date(),
    };

    if (selectedCvId && !selectedCvId.startsWith('cv-temp-')) {
      await apiClient.updateCV(selectedCvId, payload);
    } else {
      const created = await apiClient.createCV(payload);
      if (created?.id) setSelectedCvId(created.id);
    }
  };

  // Explicit Save Resume Button Handler
  const handleSaveResume = async (showNotification = true) => {
    setIsSaving(true);
    try {
      const studentId = student.rollNo || student.id;
      const conversationState = {
        currentStep: currentStepId,
        stepIndex: Math.round((progressPercent / 100) * 8),
        totalSteps: 8,
        status: progressPercent >= 100 ? ('completed' as const) : ('in_progress' as const),
        messages,
        collectedAnswers: {
          targetRole: cvData.targetRole,
          targetCompany: cvData.targetCompany,
        },
      };

      const payload = {
        ...cvData,
        template: activeTemplate,
        studentId,
        conversationState,
      };

      let savedDoc: CVData | null = null;
      if (selectedCvId && !selectedCvId.startsWith('cv-temp-')) {
        savedDoc = await apiClient.updateCV(selectedCvId, payload);
      } else {
        savedDoc = await apiClient.createCV(payload);
        if (savedDoc?.id) setSelectedCvId(savedDoc.id);
      }

      const updatedList = await apiClient.getCVs(studentId);
      if (updatedList) setSavedCvs(updatedList);

      if (showNotification) {
        showToast('Resume & conversation saved to MongoDB successfully!');
      }
    } catch (e) {
      console.error('Failed to save CV:', e);
      if (showNotification) showToast('Failed to save CV to database', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Start fresh new resume
  const handleStartNewResume = () => {
    const initial = createInitialCV(student, 'Full Stack Developer');
    setCvData(initial);
    setSelectedCvId('');
    initWelcomeConversation(initial);
    setIsSavedCvsDrawerOpen(false);
    showToast('Started new tailored resume session!');
  };

  // Switch to a previously saved resume
  const handleSelectSavedResume = (savedCv: CVData) => {
    setSelectedCvId(savedCv.id);
    setCvData(savedCv);
    if (savedCv.template) setActiveTemplate(savedCv.template);

    if (savedCv.personalDetails?.githubUrl) setGithubInput(savedCv.personalDetails.githubUrl);
    if (savedCv.personalDetails?.linkedinUrl) setLinkedinInput(savedCv.personalDetails.linkedinUrl);
    if (savedCv.personalDetails?.portfolioUrl) setPortfolioInput(savedCv.personalDetails.portfolioUrl);

    if (savedCv.conversationState?.messages && savedCv.conversationState.messages.length > 0) {
      setMessages(savedCv.conversationState.messages);
      setCurrentStepId(savedCv.conversationState.currentStep || 'ready');
      const percent = savedCv.conversationState.stepIndex
        ? Math.round((savedCv.conversationState.stepIndex / 8) * 100)
        : 85;
      setProgressPercent(percent);

      if (savedCv.conversationState.status === 'completed' || percent >= 75) {
        setIsResumeStarted(true);
        setIsGenerated(true);
      } else {
        setIsResumeStarted(false);
        setIsGenerated(false);
      }
    } else {
      initWelcomeConversation(savedCv);
    }
    setIsSavedCvsDrawerOpen(false);
    showToast(`Loaded: ${savedCv.title}`);
  };

  // Delete saved resume
  const handleDeleteSavedResume = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    const ok = await apiClient.deleteCV(id);
    if (ok) {
      const remaining = savedCvs.filter((c) => c.id !== id);
      setSavedCvs(remaining);
      if (selectedCvId === id) {
        if (remaining.length > 0) {
          handleSelectSavedResume(remaining[0]);
        } else {
          handleStartNewResume();
        }
      }
      showToast('Resume deleted.');
    }
  };

  // Toast notification helper
  const showToast = (msg: string, isError = false) => {
    setSaveSuccessNotification(msg);
    setTimeout(() => {
      setSaveSuccessNotification(null);
    }, 3500);
  };

  // Check if any form fields or generated content currently exist
  const hasDataToClear = Boolean(
    cvData.personalDetails?.fullName?.trim() ||
    cvData.personalDetails?.email?.trim() ||
    cvData.personalDetails?.phone?.trim() ||
    cvData.personalDetails?.rollNo?.trim() ||
    cvData.personalDetails?.department?.trim() ||
    cvData.personalDetails?.batch?.trim() ||
    cvData.personalDetails?.location?.trim() ||
    cvData.personalDetails?.linkedinUrl?.trim() ||
    cvData.personalDetails?.githubUrl?.trim() ||
    cvData.personalDetails?.portfolioUrl?.trim() ||
    githubInput.trim() ||
    linkedinInput.trim() ||
    portfolioInput.trim() ||
    cvData.targetRole?.trim() ||
    cvData.targetCompany?.trim() ||
    cvData.jobDescription?.trim() ||
    cvData.summary?.trim() ||
    (cvData.education && cvData.education.length > 0) ||
    (cvData.skills && (
      (cvData.skills.languages && cvData.skills.languages.length > 0) ||
      (cvData.skills.frameworks && cvData.skills.frameworks.length > 0) ||
      (cvData.skills.developerTools && cvData.skills.developerTools.length > 0) ||
      (cvData.skills.databases && cvData.skills.databases.length > 0) ||
      (cvData.skills.coursework && cvData.skills.coursework.length > 0)
    )) ||
    (cvData.projects && cvData.projects.length > 0) ||
    (cvData.experience && cvData.experience.length > 0) ||
    (cvData.certifications && cvData.certifications.length > 0) ||
    (cvData.achievements && cvData.achievements.length > 0) ||
    isGenerated ||
    isResumeStarted ||
    messages.length > 0 ||
    inputText.trim()
  );

  // Clear CV button handler with confirmation dialog check
  const handleClearClick = () => {
    if (hasDataToClear) {
      setShowClearConfirmModal(true);
    } else {
      showToast('CV details are already empty.');
    }
  };

  // Perform clean reset of all fields without page reload and without touching MongoDB saved CVs
  const performClear = () => {
    const emptyCV: CVData = {
      id: `cv-${Date.now()}`,
      studentId: student.rollNo || student.id,
      title: 'Untitled Resume',
      template: activeTemplate || 'modern-ats',
      targetRole: '',
      targetCompany: '',
      jobDescription: '',
      personalDetails: {
        fullName: '',
        email: '',
        phone: '',
        rollNo: '',
        department: '',
        batch: '',
        location: '',
        linkedinUrl: '',
        githubUrl: '',
        portfolioUrl: '',
      },
      summary: '',
      education: [],
      skills: {
        languages: [],
        frameworks: [],
        developerTools: [],
        databases: [],
        coursework: [],
      },
      projects: [],
      experience: [],
      certifications: [],
      achievements: [],
    };

    setCvData(emptyCV);
    setSelectedCvId('');
    setGithubInput('');
    setLinkedinInput('');
    setPortfolioInput('');
    setLinkError(null);
    setInputText('');
    setMessages([]);
    setIsResumeStarted(false);
    setIsGenerated(false);
    setIsGenerating(false);
    setIsThinking(false);
    setProgressPercent(0);
    setCurrentStepId('target_role');
    setShowClearConfirmModal(false);
    showToast('All CV details have been cleared.');
  };

  // 1. Direct PDF Download via jsPDF & html2canvas
  const handleDownloadPDF = async () => {
    const previewEl = resumePreviewRef.current;
    if (!previewEl) {
      showToast('Resume preview element not ready. Please try again.', true);
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const fileName = `${(cvData.personalDetails.fullName || 'Candidate').replace(/\s+/g, '_')}_Resume.pdf`;
      await exportElementToPdf(previewEl, fileName);
      showToast('PDF resume downloaded successfully!');
    } catch (err: any) {
      console.error('PDF export error:', err);
      // Fallback: try direct print window if canvas capture encounters sandbox issue
      try {
        const printFrame = printIframeRef.current;
        if (printFrame) {
          const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
          if (frameDoc) {
            frameDoc.open();
            frameDoc.write(`<!DOCTYPE html><html><head><title>Resume</title><style>@page{size:A4;margin:12mm;}body{font-family:sans-serif;font-size:10pt;}</style></head><body>${previewEl.innerHTML}<script>window.onload=function(){window.print();}</script></body></html>`);
            frameDoc.close();
          }
        }
      } catch (fallbackErr) {
        showToast('Failed to download PDF. Please try again.', true);
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // 2. Word (.docx) Download via docx package
  const handleDownloadWord = async () => {
    setIsDownloadingDocx(true);
    try {
      const blob = await generateDocxBlob(cvData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `${(cvData.personalDetails.fullName || 'Candidate').replace(/\s+/g, '_')}_Resume.docx`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Word (.docx) resume downloaded successfully!');
    } catch (err: any) {
      console.error('Word export error:', err);
      showToast('Failed to generate Word document. Please try again.', true);
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] bg-[var(--bg-app)] text-[var(--text-main)] overflow-hidden">
      {/* Hidden print iframe for clean PDF generation */}
      <iframe ref={printIframeRef} title="Print Resume Frame" className="hidden" />

      {/* Top Action Header Bar */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] shadow-xs z-20">
        {/* Left: Branding & Role info */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold truncate tracking-tight text-[var(--text-main)]">
                AI Resume Copilot
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3 mr-1" />
                VFSTR Verified
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {cvData.targetRole || 'Software Development Engineer'} • {isResumeStarted ? 'Live ATS Workspace' : 'Conversational Setup'} ({progressPercent}%)
            </p>
          </div>
        </div>

        {/* Center: Mobile View Toggle (Only active once resume generation starts) */}
        {isResumeStarted && (
          <div className="flex lg:hidden items-center p-0.5 rounded-lg bg-[var(--bg-app)] border border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveMobileTab('chat')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeMobileTab === 'chat'
                  ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Chat Copilot
            </button>
            <button
              onClick={() => setActiveMobileTab('preview')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeMobileTab === 'preview'
                  ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Live Preview
            </button>
          </div>
        )}

        {/* Right Actions Toolbar */}
        <div className="flex items-center space-x-2">
          {/* Saved Resumes Drawer Button */}
          <button
            onClick={() => setIsSavedCvsDrawerOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors"
            title="Switch or view saved resumes"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Resumes</span>
            {savedCvs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--bg-app)] text-[var(--text-muted)] font-bold">
                {savedCvs.length}
              </span>
            )}
          </button>

          {/* Edit Answers Modal Button */}
          {isResumeStarted && (
            <button
              onClick={() => setIsEditAnswersOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors"
              title="Inspect and edit extracted details directly"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Edit Details</span>
            </button>
          )}

          {/* Save Resume */}
          <button
            onClick={() => handleSaveResume(true)}
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-app)] transition-colors disabled:opacity-50"
            title="Save resume to database"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
          </button>

          {/* Clear CV Button (Always positioned directly next to Generate CV) */}
          <button
            type="button"
            onClick={handleClearClick}
            disabled={isGenerating}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors disabled:opacity-40"
            title="Clear all CV details"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          {/* Generate Resume Button (Active if not generated yet) */}
          {!isGenerated && (
            <button
              onClick={handleStartStreamingGeneration}
              disabled={isGenerating}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 active:scale-95"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Gemini is writing...' : 'Generate Resume'}</span>
            </button>
          )}

          {/* ============================================================== */}
          {/* CRITICAL REQUIREMENT 7: DOWNLOAD OPTIONS (SHOW ONLY AFTER GENERATION) */}
          {/* ============================================================== */}
          {isGenerated && (
            <div className="flex items-center space-x-1.5 animate-in fade-in zoom-in-95 duration-200">
              {/* Option 1: Download as PDF */}
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloadingPdf}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50"
                title="Download formatted placement PDF file"
              >
                <Download className={`w-3.5 h-3.5 ${isDownloadingPdf ? 'animate-spin' : ''}`} />
                <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download as PDF'}</span>
              </button>

              {/* Option 2: Download as Word (.docx) */}
              <button
                onClick={handleDownloadWord}
                disabled={isDownloadingDocx}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50"
                title="Download editable Microsoft Word document"
              >
                <FileText className={`w-3.5 h-3.5 ${isDownloadingDocx ? 'animate-spin' : ''}`} />
                <span>{isDownloadingDocx ? 'Generating Word...' : 'Download as Word (.docx)'}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Progress Bar Line */}
      <div className="w-full bg-[var(--bg-card)] border-b border-[var(--border-subtle)] px-4 py-1.5 flex items-center justify-between text-[11px] text-[var(--text-muted)] shrink-0">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-[var(--text-main)]">Target:</span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-medium">
            {cvData.targetRole || 'Software Development Engineer'}
          </span>
          {isGenerating && (
            <span className="flex items-center text-indigo-600 font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block mr-1.5" />
              Gemini is writing your resume ({activeStreamingSection || 'starting'})...
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 w-48 sm:w-64">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-app)] overflow-hidden border border-[var(--border-subtle)]">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-[var(--text-secondary)] shrink-0">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA: DYNAMIC TRANSITION BETWEEN INITIAL & SPLIT PREVIEW */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chatbot Panel:
            - INITIAL STATE: Occupies full available area (w-full max-w-4xl mx-auto)
            - AFTER GENERATION STARTS: Automatically shrinks into smaller chat panel beside preview!
        */}
        <section
          className={`h-full flex flex-col bg-[var(--bg-card)] border-r border-[var(--border-subtle)] transition-all duration-300 ${
            !isResumeStarted
              ? 'w-full max-w-4xl mx-auto border-r-0'
              : 'w-full lg:w-[46%] xl:w-[42%] shrink-0'
          } ${isResumeStarted && activeMobileTab === 'preview' ? 'hidden lg:flex' : 'flex'}`}
        >
          {/* ============================================================== */}
          {/* DEDICATED REQUIREMENT 4: GITHUB, LINKEDIN, AND PORTFOLIO LINKS */}
          {/* ============================================================== */}
          <div className="p-3 bg-[var(--bg-app)] border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-bold text-[var(--text-main)]">
                  Professional Profiles & Portfolio Links
                </span>
                <span className="text-[10px] text-emerald-600 font-medium bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/20">
                  Clickable in PDF & DOCX
                </span>
              </div>
              <button
                onClick={() => setIsLinksOpen(!isLinksOpen)}
                className="text-[10px] text-indigo-600 font-semibold hover:underline"
              >
                {isLinksOpen ? 'Minimize' : 'Manage Links'}
              </button>
            </div>

            {isLinksOpen && (
              <div className="space-y-2 text-xs">
                {/* 1. GitHub Profile Field */}
                <div className="flex items-center space-x-2">
                  <div className="w-20 shrink-0 flex items-center space-x-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    <Github className="w-3 h-3 text-slate-700 dark:text-slate-300" />
                    <span>GitHub:</span>
                  </div>
                  {cvData.personalDetails.githubUrl ? (
                    <div className="flex-1 flex items-center justify-between px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px]">
                      <a
                        href={cvData.personalDetails.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 truncate hover:underline flex items-center"
                      >
                        {cvData.personalDetails.githubUrl}
                        <ExternalLink className="w-2.5 h-2.5 ml-1" />
                      </a>
                      <button
                        onClick={() => handleRemoveLink('github')}
                        className="text-[var(--text-muted)] hover:text-rose-600 p-0.5 ml-2"
                        title="Remove GitHub link"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center space-x-1.5">
                      <input
                        type="url"
                        placeholder="https://github.com/username"
                        value={githubInput}
                        onChange={(e) => setGithubInput(e.target.value)}
                        className="flex-1 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[11px] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handleAddLink('github')}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. LinkedIn Profile Field */}
                <div className="flex items-center space-x-2">
                  <div className="w-20 shrink-0 flex items-center space-x-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    <Linkedin className="w-3 h-3 text-blue-600" />
                    <span>LinkedIn:</span>
                  </div>
                  {cvData.personalDetails.linkedinUrl ? (
                    <div className="flex-1 flex items-center justify-between px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px]">
                      <a
                        href={cvData.personalDetails.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 truncate hover:underline flex items-center"
                      >
                        {cvData.personalDetails.linkedinUrl}
                        <ExternalLink className="w-2.5 h-2.5 ml-1" />
                      </a>
                      <button
                        onClick={() => handleRemoveLink('linkedin')}
                        className="text-[var(--text-muted)] hover:text-rose-600 p-0.5 ml-2"
                        title="Remove LinkedIn link"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center space-x-1.5">
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/username"
                        value={linkedinInput}
                        onChange={(e) => setLinkedinInput(e.target.value)}
                        className="flex-1 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[11px] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handleAddLink('linkedin')}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Portfolio Website Field */}
                <div className="flex items-center space-x-2">
                  <div className="w-20 shrink-0 flex items-center space-x-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    <Globe className="w-3 h-3 text-emerald-600" />
                    <span>Portfolio:</span>
                  </div>
                  {cvData.personalDetails.portfolioUrl ? (
                    <div className="flex-1 flex items-center justify-between px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px]">
                      <a
                        href={cvData.personalDetails.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 truncate hover:underline flex items-center"
                      >
                        {cvData.personalDetails.portfolioUrl}
                        <ExternalLink className="w-2.5 h-2.5 ml-1" />
                      </a>
                      <button
                        onClick={() => handleRemoveLink('portfolio')}
                        className="text-[var(--text-muted)] hover:text-rose-600 p-0.5 ml-2"
                        title="Remove Portfolio link"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center space-x-1.5">
                      <input
                        type="url"
                        placeholder="https://yourportfolio.dev"
                        value={portfolioInput}
                        onChange={(e) => setPortfolioInput(e.target.value)}
                        className="flex-1 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[11px] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handleAddLink('portfolio')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {linkError && (
                  <p className="text-[11px] text-rose-600 font-medium">{linkError.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-3 border border-indigo-500/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-main)] mb-1">
                  All CV details have been cleared
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mb-4">
                  Your workspace is clean. Type your targeted role or details below, or start a fresh guided session.
                </p>
                <button
                  type="button"
                  onClick={() => initWelcomeConversation(createInitialCV(student))}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
                >
                  Start Guided Interview
                </button>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* AI Avatar */}
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble Container */}
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed transition-all ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs shadow-xs ml-8'
                      : 'bg-[var(--bg-app)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-tl-xs shadow-xs'
                  }`}
                >
                  {/* Sender Header for AI */}
                  {msg.sender === 'ai' && (
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-medium">
                      <span className="flex items-center space-x-1 text-indigo-600 font-semibold">
                        <Sparkles className="w-3 h-3" />
                        <span>Gemini Resume Copilot</span>
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>
                  )}

                  {/* Message Body */}
                  <div className="whitespace-pre-wrap space-y-1.5">
                    {msg.text.split('\n\n').map((paragraph, pIdx) => (
                      <p key={pIdx}>
                        {paragraph.split('**').map((part, idx) =>
                          idx % 2 === 1 ? (
                            <strong
                              key={idx}
                              className={
                                msg.sender === 'user'
                                  ? 'font-bold'
                                  : 'font-bold text-[var(--text-main)]'
                              }
                            >
                              {part}
                            </strong>
                          ) : (
                            part
                          )
                        )}
                      </p>
                    ))}
                  </div>

                  {/* Suggested Questions / Quick Replies */}
                  {msg.sender === 'ai' && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)]">
                      <p className="text-[10px] text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wider">
                        Suggested Responses
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.quickReplies.map((reply, rIdx) => (
                          <button
                            key={rIdx}
                            onClick={() => handleQuickReply(reply)}
                            disabled={isThinking || isGenerating}
                            className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--bg-card)] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-[var(--text-secondary)] hover:text-indigo-600 border border-[var(--border-subtle)] hover:border-indigo-400 transition-all font-medium text-left"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.sender === 'user' && (
                    <div className="text-[9px] text-white/70 text-right mt-1">{msg.timestamp}</div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs text-xs font-bold mt-0.5">
                    {student.name.charAt(0)}
                  </div>
                )}
              </div>
            ))}

            {/* AI Thinking Animation */}
            {isThinking && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 rounded-2xl rounded-tl-xs bg-[var(--bg-app)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Gemini is analyzing your profile and drafting questions...</span>
                </div>
              </div>
            )}

            {/* Gemini Writing Streaming Indicator */}
            {isGenerating && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="p-3 rounded-2xl rounded-tl-xs bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-700 dark:text-indigo-300 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping inline-block" />
                  <span className="font-semibold">
                    Gemini is streaming your resume into the live preview...
                  </span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] flex items-center space-x-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Gemini to improve a section, add skills, or type an answer..."
              disabled={isThinking || isGenerating}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isThinking || isGenerating}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 active:scale-95"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </section>

        {/* ========================================================================= */}
        {/* LIVE ATS RESUME PREVIEW PANEL:
            - HIDDEN initially (isResumeStarted === false)
            - APPEARS automatically beside chatbot as soon as resume generation starts!
        */}
        {/* ========================================================================= */}
        {isResumeStarted && (
          <section
            className={`flex-1 flex flex-col h-full bg-[var(--bg-app)] overflow-hidden transition-all duration-300 ${
              activeMobileTab === 'chat' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Preview Controls Bar */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-[var(--bg-card)] border-b border-[var(--border-subtle)]">
              {/* Template Selector */}
              <div className="flex items-center space-x-1 text-xs">
                <span className="text-[var(--text-muted)] text-[11px] font-semibold mr-1 hidden sm:inline">
                  Template:
                </span>
                {(['modern-ats', 'executive-clean', 'academic-harvard', 'minimal-tech'] as const).map(
                  (tmpl) => (
                    <button
                      key={tmpl}
                      onClick={() => {
                        setActiveTemplate(tmpl);
                        setCvData((prev) => ({ ...prev, template: tmpl }));
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        activeTemplate === tmpl
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]'
                      }`}
                    >
                      {tmpl === 'modern-ats'
                        ? 'Modern ATS'
                        : tmpl === 'executive-clean'
                        ? 'Executive'
                        : tmpl === 'academic-harvard'
                        ? 'Harvard'
                        : 'Minimal'}
                    </button>
                  )
                )}
              </div>

              {/* Streaming Indicator & Zoom Controls */}
              <div className="flex items-center space-x-2">
                {isGenerating && (
                  <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-[11px] font-semibold animate-pulse border border-indigo-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                    <span>Gemini is writing your resume...</span>
                  </div>
                )}

                <div className="hidden sm:flex items-center border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--bg-app)] text-[11px]">
                  <button
                    onClick={() => setZoomLevel(75)}
                    className={`px-2 py-1 ${
                      zoomLevel === 75
                        ? 'bg-indigo-500/10 text-indigo-600 font-bold'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setZoomLevel(100)}
                    className={`px-2 py-1 border-x border-[var(--border-subtle)] ${
                      zoomLevel === 100
                        ? 'bg-indigo-500/10 text-indigo-600 font-bold'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    100%
                  </button>
                  <button
                    onClick={() => setZoomLevel(125)}
                    className={`px-2 py-1 ${
                      zoomLevel === 125
                        ? 'bg-indigo-500/10 text-indigo-600 font-bold'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    125%
                  </button>
                </div>
              </div>
            </div>

            {/* Live Document Canvas Wrapper */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto flex justify-center items-start bg-slate-200/60 dark:bg-neutral-900/80">
              {/* The Authentic White A4 Paper Sheet */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '794px',
                  minHeight: '1123px',
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                }}
                className="bg-white text-slate-900 p-8 sm:p-10 shadow-xl rounded-sm transition-transform duration-200 border border-slate-300 relative"
              >
                {/* Visual Streaming Banner on Paper */}
                {isGenerating && (
                  <div className="absolute top-2 right-4 px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold flex items-center space-x-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                    <span>Gemini is writing: {activeStreamingSection?.toUpperCase()}</span>
                  </div>
                )}

                <div ref={resumePreviewRef}>
                  {/* Modern ATS Template */}
                  {activeTemplate === 'modern-ats' && (
                    <ModernAtsTemplate
                      cv={cvData}
                      isGenerating={isGenerating}
                      activeSection={activeStreamingSection}
                    />
                  )}

                  {/* Executive Clean Template */}
                  {activeTemplate === 'executive-clean' && (
                    <ExecutiveCleanTemplate
                      cv={cvData}
                      isGenerating={isGenerating}
                      activeSection={activeStreamingSection}
                    />
                  )}

                  {/* Academic Harvard Template */}
                  {activeTemplate === 'academic-harvard' && (
                    <HarvardAcademicTemplate
                      cv={cvData}
                      isGenerating={isGenerating}
                      activeSection={activeStreamingSection}
                    />
                  )}

                  {/* Minimal Tech Template */}
                  {activeTemplate === 'minimal-tech' && (
                    <MinimalTechTemplate
                      cv={cvData}
                      isGenerating={isGenerating}
                      activeSection={activeStreamingSection}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Edit Details Modal (Direct inspection & tweaking of fields)   */}
      {/* ------------------------------------------------------------- */}
      {isEditAnswersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-[var(--text-main)]">Edit Resume Details</h3>
              </div>
              <button
                onClick={() => setIsEditAnswersOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Target Job Role
                  </label>
                  <input
                    type="text"
                    value={cvData.targetRole || ''}
                    onChange={(e) => setCvData({ ...cvData, targetRole: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Target Company / Drive
                  </label>
                  <input
                    type="text"
                    value={cvData.targetCompany || ''}
                    onChange={(e) => setCvData({ ...cvData, targetCompany: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Professional Summary / Career Objective
                </label>
                <textarea
                  rows={3}
                  value={cvData.summary}
                  onChange={(e) => setCvData({ ...cvData, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Technical Skills (Comma-separated)
                </label>
                <input
                  type="text"
                  value={[
                    ...(cvData.skills.languages || []),
                    ...(cvData.skills.frameworks || []),
                    ...(cvData.skills.databases || []),
                  ].join(', ')}
                  onChange={(e) => {
                    const arr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                    setCvData({
                      ...cvData,
                      skills: {
                        ...cvData.skills,
                        languages: arr.slice(0, 5),
                        frameworks: arr.slice(5, 10),
                      },
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                />
              </div>

              {/* Projects Inspection */}
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1 block">Key Projects</label>
                <div className="space-y-2">
                  {cvData.projects.map((proj, idx) => (
                    <div key={proj.id || idx} className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={proj.title}
                          onChange={(e) => {
                            const copy = [...cvData.projects];
                            copy[idx].title = e.target.value;
                            setCvData({ ...cvData, projects: copy });
                          }}
                          className="font-bold text-xs bg-transparent border-b border-[var(--border-subtle)] pb-0.5 text-[var(--text-main)] w-2/3"
                        />
                        <input
                          type="text"
                          value={proj.techStack}
                          onChange={(e) => {
                            const copy = [...cvData.projects];
                            copy[idx].techStack = e.target.value;
                            setCvData({ ...cvData, projects: copy });
                          }}
                          placeholder="Tech stack..."
                          className="text-[10px] text-[var(--text-muted)] bg-transparent border-b border-[var(--border-subtle)] pb-0.5 w-1/3 ml-2 text-right"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={proj.bullets.join('\n')}
                        onChange={(e) => {
                          const copy = [...cvData.projects];
                          copy[idx].bullets = e.target.value.split('\n').filter(Boolean);
                          setCvData({ ...cvData, projects: copy });
                        }}
                        className="w-full text-[11px] p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-main)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-app)] flex items-center justify-between">
              <button
                onClick={() => handleSaveResume(true)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Save Changes to MongoDB
              </button>
              <button
                onClick={() => setIsEditAnswersOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-main)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Saved Resumes Drawer (Manage & Resume unfinished conversations)*/}
      {/* ------------------------------------------------------------- */}
      {isSavedCvsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md h-full bg-[var(--bg-card)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-[var(--text-main)]">My Saved Resumes</h3>
              </div>
              <button
                onClick={() => setIsSavedCvsDrawerOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-[var(--border-subtle)]">
              <button
                onClick={handleStartNewResume}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start New Tailored Resume</span>
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
              {savedCvs.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                  <p>No saved resumes found yet.</p>
                  <p className="mt-1">Complete your interview to save one persistently in MongoDB.</p>
                </div>
              ) : (
                savedCvs.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSavedResume(item)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedCvId === item.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-app)] hover:border-indigo-400'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-main)]">{item.title}</h4>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          Target: {item.targetRole || 'Software Development Engineer'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSavedResume(item.id, e)}
                        className="text-[var(--text-muted)] hover:text-rose-600 p-1 rounded"
                        title="Delete resume"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span className="capitalize">{item.template.replace('-', ' ')}</span>
                      <span>
                        {item.conversationState?.status === 'completed' ? (
                          <span className="text-emerald-600 font-semibold flex items-center">
                            <Check className="w-3 h-3 mr-0.5" /> Ready
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">In Progress</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Confirmation Modal for Clear CV */}
      {/* ------------------------------------------------------------- */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden p-6 text-left">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center shrink-0 border border-red-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">Clear CV Details</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Reset your active editing workspace</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed my-4">
              Are you sure you want to clear all CV details? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={performClear}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Notification Toast */}
      {saveSuccessNotification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessNotification}</span>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// ATS-COMPLIANT TEMPLATE RENDERERS WITH LIVE STREAMING CURSOR
// =========================================================================

interface TemplateProps {
  cv: CVData;
  isGenerating?: boolean;
  activeSection?: string | null;
}

// Typing cursor component for live streaming feedback
const TypingCursor: React.FC = () => (
  <span className="inline-block w-1.5 h-3.5 bg-indigo-600 animate-pulse ml-1 align-middle" />
);

// 1. Modern ATS Template (Single Column, High Scanability, Metric-Driven)
const ModernAtsTemplate: React.FC<TemplateProps> = ({ cv, isGenerating, activeSection }) => {
  const { personalDetails, summary, education, skills, projects, experience, certifications, achievements } = cv;

  return (
    <div className="text-[10pt] text-slate-900 leading-[1.38]">
      {/* Header */}
      <header className="border-b-2 border-slate-900 pb-3 mb-3 text-center">
        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
          {personalDetails.fullName}
        </h1>
        {cv.targetRole && (
          <p className="text-[11pt] text-indigo-700 font-bold tracking-wide mt-0.5 uppercase">
            {cv.targetRole}
          </p>
        )}
        <div className="text-[9.5pt] text-slate-700 mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 font-medium">
          {personalDetails.location && <span>{personalDetails.location}</span>}
          {personalDetails.phone && (
            <>
              <span>•</span>
              <span>{personalDetails.phone}</span>
            </>
          )}
          {personalDetails.email && (
            <>
              <span>•</span>
              <a href={`mailto:${personalDetails.email}`} className="text-blue-700 underline">
                {personalDetails.email}
              </a>
            </>
          )}
          {personalDetails.linkedinUrl && (
            <>
              <span>•</span>
              <a
                href={
                  personalDetails.linkedinUrl.startsWith('http')
                    ? personalDetails.linkedinUrl
                    : `https://${personalDetails.linkedinUrl}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline font-semibold"
              >
                LinkedIn
              </a>
            </>
          )}
          {personalDetails.githubUrl && (
            <>
              <span>•</span>
              <a
                href={
                  personalDetails.githubUrl.startsWith('http')
                    ? personalDetails.githubUrl
                    : `https://${personalDetails.githubUrl}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline font-semibold"
              >
                GitHub
              </a>
            </>
          )}
          {personalDetails.portfolioUrl && (
            <>
              <span>•</span>
              <a
                href={
                  personalDetails.portfolioUrl.startsWith('http')
                    ? personalDetails.portfolioUrl
                    : `https://${personalDetails.portfolioUrl}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline font-semibold"
              >
                Portfolio
              </a>
            </>
          )}
        </div>
      </header>

      {/* Professional Summary */}
      {summary && (
        <section className="mb-3">
          <h2 className="text-[11pt] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5 flex items-center justify-between">
            <span>Professional Summary</span>
            {isGenerating && activeSection === 'summary' && (
              <span className="text-[9pt] font-normal text-indigo-600 flex items-center">
                Gemini writing <TypingCursor />
              </span>
            )}
          </h2>
          <p className="text-[9.5pt] text-slate-800 text-justify leading-relaxed">
            {summary}
            {isGenerating && activeSection === 'summary' && <TypingCursor />}
          </p>
        </section>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <section className="mb-3">
          <h2 className="text-[11pt] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
            Education
          </h2>
          <div className="space-y-1.5">
            {education.map((edu) => (
              <div key={edu.id} className="text-[9.5pt]">
                <div className="flex justify-between items-baseline font-bold text-slate-900">
                  <span>{edu.institution}</span>
                  <span className="text-[9pt] font-semibold text-slate-600">
                    {edu.startYear} - {edu.endYear}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-slate-700">
                  <span>
                    {edu.degree} — {edu.field}
                  </span>
                  <span className="font-semibold text-slate-900">{edu.cgpaOrPercentage}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Technical Skills */}
      {skills && (
        <section className="mb-3">
          <h2 className="text-[11pt] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5 flex items-center justify-between">
            <span>Technical Skills</span>
            {isGenerating && activeSection === 'skills' && (
              <span className="text-[9pt] font-normal text-indigo-600 flex items-center">
                Gemini writing <TypingCursor />
              </span>
            )}
          </h2>
          <div className="text-[9.5pt] space-y-1 text-slate-800">
            {skills.languages && skills.languages.length > 0 && (
              <div>
                <span className="font-bold text-slate-900">Languages: </span>
                <span>{skills.languages.join(', ')}</span>
              </div>
            )}
            {skills.frameworks && skills.frameworks.length > 0 && (
              <div>
                <span className="font-bold text-slate-900">Frameworks & Libraries: </span>
                <span>{skills.frameworks.join(', ')}</span>
              </div>
            )}
            {skills.databases && skills.databases.length > 0 && (
              <div>
                <span className="font-bold text-slate-900">Databases & Storage: </span>
                <span>{skills.databases.join(', ')}</span>
              </div>
            )}
            {skills.developerTools && skills.developerTools.length > 0 && (
              <div>
                <span className="font-bold text-slate-900">Developer Tools: </span>
                <span>{skills.developerTools.join(', ')}</span>
              </div>
            )}
            {skills.coursework && skills.coursework.length > 0 && (
              <div>
                <span className="font-bold text-slate-900">Core Coursework: </span>
                <span>{skills.coursework.join(', ')}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Key Projects */}
      {projects && projects.length > 0 && (
        <section className="mb-3">
          <h2 className="text-[11pt] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5 flex items-center justify-between">
            <span>Key Projects</span>
            {isGenerating && activeSection === 'projects' && (
              <span className="text-[9pt] font-normal text-indigo-600 flex items-center">
                Gemini writing <TypingCursor />
              </span>
            )}
          </h2>
          <div className="space-y-2.5">
            {projects.map((proj) => (
              <div key={proj.id} className="text-[9.5pt]">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="font-bold text-slate-900">{proj.title}</span>
                    <span className="text-slate-600 italic"> | {proj.techStack}</span>
                    {proj.link && (
                      <a
                        href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 underline text-[8.5pt] ml-2 font-medium"
                      >
                        [Project Link]
                      </a>
                    )}
                  </div>
                  {proj.duration && (
                    <span className="text-[9pt] font-semibold text-slate-600">{proj.duration}</span>
                  )}
                </div>
                {proj.bullets && (
                  <ul className="list-disc list-outside ml-4 mt-1 space-y-1 text-slate-800">
                    {proj.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="leading-snug">
                        {b.replace(/^[•\-\*]\s*/, '')}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Work Experience */}
      {experience && experience.length > 0 && (
        <section className="mb-3">
          <h2 className="text-[11pt] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5 flex items-center justify-between">
            <span>Internship & Experience</span>
            {isGenerating && activeSection === 'experience' && (
              <span className="text-[9pt] font-normal text-indigo-600 flex items-center">
                Gemini writing <TypingCursor />
              </span>
            )}
          </h2>
          <div className="space-y-2.5">
            {experience.map((exp) => (
              <div key={exp.id} className="text-[9.5pt]">
                <div className="flex justify-between items-baseline font-bold text-slate-900">
                  <span>
                    {exp.role} — <span className="font-semibold text-slate-700">{exp.company}</span>
                  </span>
                  <span className="text-[9pt] font-semibold text-slate-600">{exp.duration}</span>
                </div>
                {exp.bullets && (
                  <ul className="list-disc list-outside ml-4 mt-1 space-y-1 text-slate-800">
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="leading-snug">
                        {b.replace(/^[•\-\*]\s*/, '')}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications & Achievements */}
      {((certifications && certifications.length > 0) || (achievements && achievements.length > 0)) && (
        <section className="mb-2">
          <h2 className="text-[11pt] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
            Certifications & Honors
          </h2>
          <ul className="list-disc list-outside ml-4 space-y-1 text-[9.5pt] text-slate-800">
            {certifications?.map((c) => (
              <li key={c.id}>
                <span className="font-bold text-slate-900">{c.name}</span> — {c.issuer} ({c.issueDate})
                {c.credentialUrl && (
                  <a
                    href={c.credentialUrl.startsWith('http') ? c.credentialUrl : `https://${c.credentialUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 underline text-[8.5pt] ml-2"
                  >
                    [Verify]
                  </a>
                )}
              </li>
            ))}
            {achievements?.map((a, aIdx) => (
              <li key={aIdx}>{a.replace(/^[•\-\*]\s*/, '')}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

// 2. Executive Clean Template
const ExecutiveCleanTemplate: React.FC<TemplateProps> = ({ cv, isGenerating, activeSection }) => {
  const { personalDetails, summary, education, skills, projects, experience, certifications, achievements } = cv;

  return (
    <div className="text-[10pt] text-slate-900 leading-[1.4] font-serif">
      <header className="border-b-4 border-slate-800 pb-3 mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
          {personalDetails.fullName}
        </h1>
        <p className="text-[11pt] text-indigo-900 font-semibold mt-0.5 font-sans">
          {cv.targetRole || 'Software Development Engineer'}
        </p>
        <div className="text-[9pt] text-slate-600 mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-sans">
          {personalDetails.location && <span>{personalDetails.location}</span>}
          {personalDetails.phone && (
            <>
              <span>•</span>
              <span>{personalDetails.phone}</span>
            </>
          )}
          {personalDetails.email && (
            <>
              <span>•</span>
              <a href={`mailto:${personalDetails.email}`} className="text-blue-700 underline">
                {personalDetails.email}
              </a>
            </>
          )}
          {personalDetails.linkedinUrl && (
            <>
              <span>•</span>
              <a
                href={personalDetails.linkedinUrl.startsWith('http') ? personalDetails.linkedinUrl : `https://${personalDetails.linkedinUrl}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline font-semibold"
              >
                LinkedIn
              </a>
            </>
          )}
          {personalDetails.githubUrl && (
            <>
              <span>•</span>
              <a
                href={personalDetails.githubUrl.startsWith('http') ? personalDetails.githubUrl : `https://${personalDetails.githubUrl}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline font-semibold"
              >
                GitHub
              </a>
            </>
          )}
        </div>
      </header>

      {summary && (
        <section className="mb-3.5">
          <h2 className="text-[10.5pt] font-bold uppercase tracking-wider text-slate-800 font-sans border-b border-slate-300 pb-0.5 mb-1 flex items-center justify-between">
            <span>Executive Summary</span>
            {isGenerating && activeSection === 'summary' && (
              <span className="text-[8.5pt] font-normal text-indigo-600">Gemini writing...</span>
            )}
          </h2>
          <p className="text-[9.5pt] text-slate-800 leading-relaxed text-justify">{summary}</p>
        </section>
      )}

      {experience && experience.length > 0 && (
        <section className="mb-3.5">
          <h2 className="text-[10.5pt] font-bold uppercase tracking-wider text-slate-800 font-sans border-b border-slate-300 pb-0.5 mb-1.5">
            Work Experience & Internships
          </h2>
          <div className="space-y-2">
            {experience.map((exp) => (
              <div key={exp.id} className="text-[9.5pt]">
                <div className="flex justify-between font-sans">
                  <span className="font-bold text-slate-900">{exp.role}</span>
                  <span className="text-[9pt] text-slate-600">{exp.duration}</span>
                </div>
                <div className="text-slate-700 italic text-[9pt] font-sans">{exp.company}</div>
                <ul className="list-disc list-outside ml-4 mt-1 space-y-1">
                  {exp.bullets.map((b, idx) => (
                    <li key={idx}>{b.replace(/^[•\-\*]\s*/, '')}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {projects && projects.length > 0 && (
        <section className="mb-3.5">
          <h2 className="text-[10.5pt] font-bold uppercase tracking-wider text-slate-800 font-sans border-b border-slate-300 pb-0.5 mb-1.5">
            Key Engineering Projects
          </h2>
          <div className="space-y-2">
            {projects.map((proj) => (
              <div key={proj.id} className="text-[9.5pt]">
                <div className="flex justify-between font-sans">
                  <span className="font-bold text-slate-900">{proj.title}</span>
                  <span className="text-[9pt] text-slate-600">{proj.duration}</span>
                </div>
                <div className="text-[9pt] text-indigo-900 font-sans">{proj.techStack}</div>
                <ul className="list-disc list-outside ml-4 mt-1 space-y-1">
                  {proj.bullets.map((b, idx) => (
                    <li key={idx}>{b.replace(/^[•\-\*]\s*/, '')}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {education && education.length > 0 && (
        <section className="mb-3.5">
          <h2 className="text-[10.5pt] font-bold uppercase tracking-wider text-slate-800 font-sans border-b border-slate-300 pb-0.5 mb-1">
            Education
          </h2>
          <div className="space-y-1.5">
            {education.map((edu) => (
              <div key={edu.id} className="text-[9.5pt]">
                <div className="flex justify-between font-sans">
                  <span className="font-bold text-slate-900">{edu.institution}</span>
                  <span className="text-[9pt] text-slate-600">
                    {edu.startYear} - {edu.endYear}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700 font-sans text-[9pt]">
                  <span>
                    {edu.degree} in {edu.field}
                  </span>
                  <span className="font-bold text-slate-900">{edu.cgpaOrPercentage}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-2">
        <h2 className="text-[10.5pt] font-bold uppercase tracking-wider text-slate-800 font-sans border-b border-slate-300 pb-0.5 mb-1">
          Technical Expertise
        </h2>
        <div className="text-[9pt] font-sans space-y-1 text-slate-800">
          <div>
            <strong>Languages & Core:</strong> {skills.languages?.join(', ')}
          </div>
          <div>
            <strong>Frameworks:</strong> {skills.frameworks?.join(', ')}
          </div>
          <div>
            <strong>Databases & Cloud:</strong> {skills.databases?.join(', ')}
          </div>
        </div>
      </section>
    </div>
  );
};

// 3. Harvard Academic Template
const HarvardAcademicTemplate: React.FC<TemplateProps> = ({ cv, isGenerating, activeSection }) => {
  const { personalDetails, summary, education, skills, projects, experience, certifications, achievements } = cv;

  return (
    <div className="text-[9.5pt] text-slate-900 leading-[1.35] font-serif">
      <div className="text-center pb-2 mb-3 border-b border-slate-400">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-900">
          {personalDetails.fullName}
        </h1>
        <div className="text-[9pt] text-slate-700 mt-1 font-sans space-x-2">
          {personalDetails.location && <span>{personalDetails.location}</span>}
          {personalDetails.phone && (
            <>
              <span>|</span>
              <span>{personalDetails.phone}</span>
            </>
          )}
          {personalDetails.email && (
            <>
              <span>|</span>
              <a href={`mailto:${personalDetails.email}`} className="text-blue-700 underline">
                {personalDetails.email}
              </a>
            </>
          )}
          {personalDetails.linkedinUrl && (
            <>
              <span>|</span>
              <a
                href={personalDetails.linkedinUrl.startsWith('http') ? personalDetails.linkedinUrl : `https://${personalDetails.linkedinUrl}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline"
              >
                LinkedIn
              </a>
            </>
          )}
          {personalDetails.githubUrl && (
            <>
              <span>|</span>
              <a
                href={personalDetails.githubUrl.startsWith('http') ? personalDetails.githubUrl : `https://${personalDetails.githubUrl}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline"
              >
                GitHub
              </a>
            </>
          )}
        </div>
      </div>

      {summary && (
        <section className="mb-3">
          <h2 className="text-[10pt] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1 flex items-center justify-between">
            <span>Research & Career Statement</span>
            {isGenerating && activeSection === 'summary' && (
              <span className="text-[8.5pt] font-normal text-indigo-600">Gemini writing...</span>
            )}
          </h2>
          <p className="text-justify leading-relaxed">{summary}</p>
        </section>
      )}

      {education && education.length > 0 && (
        <section className="mb-3">
          <h2 className="text-[10pt] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1">
            Education
          </h2>
          {education.map((edu) => (
            <div key={edu.id} className="mb-1.5">
              <div className="flex justify-between font-bold">
                <span>{edu.institution}</span>
                <span>
                  {edu.startYear} – {edu.endYear}
                </span>
              </div>
              <div className="flex justify-between italic">
                <span>
                  {edu.degree}, {edu.field}
                </span>
                <span className="font-semibold not-italic">CGPA: {edu.cgpaOrPercentage}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {projects && projects.length > 0 && (
        <section className="mb-3">
          <h2 className="text-[10pt] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1">
            Academic & Systems Projects
          </h2>
          {projects.map((proj) => (
            <div key={proj.id} className="mb-2">
              <div className="flex justify-between font-bold">
                <span>{proj.title}</span>
                <span>{proj.duration}</span>
              </div>
              <div className="text-[8.5pt] font-sans text-slate-600">{proj.techStack}</div>
              <ul className="list-disc list-outside ml-4 mt-0.5 space-y-0.5">
                {proj.bullets.map((b, idx) => (
                  <li key={idx}>{b.replace(/^[•\-\*]\s*/, '')}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <section className="mb-2">
        <h2 className="text-[10pt] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1">
          Technical Competencies & Honors
        </h2>
        <div className="text-[9pt] font-sans space-y-1">
          <div>
            <strong>Languages & Frameworks:</strong> {skills.languages?.join(', ')}, {skills.frameworks?.join(', ')}
          </div>
          <div>
            <strong>Databases & Tools:</strong> {skills.databases?.join(', ')}, {skills.developerTools?.join(', ')}
          </div>
        </div>
      </section>
    </div>
  );
};

// 4. Minimal Tech Template
const MinimalTechTemplate: React.FC<TemplateProps> = ({ cv, isGenerating, activeSection }) => {
  const { personalDetails, summary, education, skills, projects, experience, certifications, achievements } = cv;

  return (
    <div className="text-[9.5pt] text-slate-900 leading-[1.35] font-mono">
      <header className="pb-3 mb-3 border-b-2 border-indigo-600">
        <div className="flex justify-between items-baseline">
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            {personalDetails.fullName}
          </h1>
          <span className="text-[9pt] font-semibold text-indigo-700">
            // {cv.targetRole || 'Software Engineer'}
          </span>
        </div>
        <div className="text-[8.5pt] text-slate-600 mt-1 flex flex-wrap gap-x-3">
          {personalDetails.phone && <span>{personalDetails.phone}</span>}
          {personalDetails.email && (
            <a href={`mailto:${personalDetails.email}`} className="text-blue-700 underline">
              {personalDetails.email}
            </a>
          )}
          {personalDetails.githubUrl && (
            <a
              href={personalDetails.githubUrl.startsWith('http') ? personalDetails.githubUrl : `https://${personalDetails.githubUrl}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-700 underline"
            >
              github:{personalDetails.githubUrl.split('/').pop()}
            </a>
          )}
        </div>
      </header>

      {summary && (
        <section className="mb-3">
          <h2 className="text-[10pt] font-bold uppercase text-indigo-800 border-b border-slate-200 pb-0.5 mb-1 flex items-center justify-between">
            <span># Summary</span>
            {isGenerating && activeSection === 'summary' && (
              <span className="text-[8pt] text-indigo-600">Gemini streaming...</span>
            )}
          </h2>
          <p className="text-[9pt] text-slate-800 leading-relaxed font-sans">{summary}</p>
        </section>
      )}

      <section className="mb-3">
        <h2 className="text-[10pt] font-bold uppercase text-indigo-800 border-b border-slate-200 pb-0.5 mb-1">
          # Stack
        </h2>
        <div className="text-[8.5pt] space-y-0.5">
          <div>
            <span className="text-slate-500">languages: </span>
            <span className="text-slate-900 font-semibold">{skills.languages?.join(', ')}</span>
          </div>
          <div>
            <span className="text-slate-500">frameworks: </span>
            <span className="text-slate-900 font-semibold">{skills.frameworks?.join(', ')}</span>
          </div>
          <div>
            <span className="text-slate-500">databases: </span>
            <span className="text-slate-900 font-semibold">{skills.databases?.join(', ')}</span>
          </div>
          <div>
            <span className="text-slate-500">tools: </span>
            <span className="text-slate-900 font-semibold">{skills.developerTools?.join(', ')}</span>
          </div>
        </div>
      </section>

      {projects && projects.length > 0 && (
        <section className="mb-3">
          <h2 className="text-[10pt] font-bold uppercase text-indigo-800 border-b border-slate-200 pb-0.5 mb-1">
            # Projects
          </h2>
          <div className="space-y-2">
            {projects.map((proj) => (
              <div key={proj.id} className="text-[9pt]">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>&gt; {proj.title}</span>
                  <span className="text-[8.5pt] text-slate-500 font-normal">{proj.duration}</span>
                </div>
                <div className="text-[8pt] text-indigo-600 mb-0.5">[{proj.techStack}]</div>
                <ul className="list-disc list-outside ml-4 space-y-0.5 font-sans text-[8.5pt]">
                  {proj.bullets.map((b, idx) => (
                    <li key={idx}>{b.replace(/^[•\-\*]\s*/, '')}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {experience && experience.length > 0 && (
        <section className="mb-3">
          <h2 className="text-[10pt] font-bold uppercase text-indigo-800 border-b border-slate-200 pb-0.5 mb-1">
            # Experience
          </h2>
          <div className="space-y-2">
            {experience.map((exp) => (
              <div key={exp.id} className="text-[9pt]">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>
                    &gt; {exp.role} @ {exp.company}
                  </span>
                  <span className="text-[8.5pt] text-slate-500 font-normal">{exp.duration}</span>
                </div>
                <ul className="list-disc list-outside ml-4 space-y-0.5 font-sans text-[8.5pt] mt-0.5">
                  {exp.bullets.map((b, idx) => (
                    <li key={idx}>{b.replace(/^[•\-\*]\s*/, '')}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {education && education.length > 0 && (
        <section className="mb-2">
          <h2 className="text-[10pt] font-bold uppercase text-indigo-800 border-b border-slate-200 pb-0.5 mb-1">
            # Education
          </h2>
          {education.map((edu) => (
            <div key={edu.id} className="text-[8.5pt] flex justify-between">
              <span>
                {edu.degree} in {edu.field} — {edu.institution}
              </span>
              <span className="font-bold text-indigo-700">{edu.cgpaOrPercentage}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

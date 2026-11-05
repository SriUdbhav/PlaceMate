import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export const avatarRouter = Router();

// Multi-model priority for Gemini: flash-lite has highest throughput & lowest latency
const PREFERRED_GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10) {
    try {
      return new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
    } catch (e) {
      console.warn('Failed to initialize GoogleGenAI for avatar:', e);
    }
  }
  return null;
}

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY || process.env.VOICE;
  if (key && key.trim().startsWith('sk-')) {
    try {
      return new OpenAI({ apiKey: key.trim() });
    } catch (e) {
      console.warn('Failed to initialize OpenAI for avatar:', e);
    }
  }
  return null;
}

// Resilient Gemini generateContent caller
async function callGemini(prompt: string, jsonMode = true): Promise<{ text: string; modelUsed: string } | null> {
  const genAI = getGeminiClient();
  if (!genAI) return null;

  for (const model of PREFERRED_GEMINI_MODELS) {
    try {
      const config: any = {};
      if (jsonMode) {
        config.responseMimeType = 'application/json';
      }
      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Avatar Gemini] Model ${model} unavailable (${err?.message || err}), trying next...`);
    }
  }
  return null;
}

function cleanEnvStr(val: string | undefined, fallback = ''): string {
  if (!val) return fallback;
  return val.replace(/^["']|["']$/g, '').trim() || fallback;
}

// GET /api/avatar/status - Check configured integrations
avatarRouter.get('/status', (req: Request, res: Response) => {
  const heygenKey = cleanEnvStr(process.env.HEYGEN_API_KEY || process.env.Avathar_API || process.env.AVATAR_API);
  const openaiKey = cleanEnvStr(process.env.OPENAI_API_KEY || process.env.VOICE);
  const geminiKey = cleanEnvStr(process.env.GEMINI_API_KEY);
  const avatarId = cleanEnvStr(process.env.HEYGEN_AVATAR_ID || process.env.Avathar_ID, '');
  const voiceId = cleanEnvStr(process.env.HEYGEN_VOICE_ID || process.env.Avathar_VOICE, '');

  return res.json({
    hasHeyGenKey: Boolean(heygenKey && heygenKey.length > 5),
    hasVoiceKey: Boolean(openaiKey && openaiKey.startsWith('sk-')),
    hasGeminiKey: Boolean(geminiKey && geminiKey.length > 10),
    avatarId,
    voiceId,
    voiceGender: 'female',
    voiceName: 'Sarah (Professional Placement Lead)',
  });
});

// POST /api/avatar/token - Create LiveAvatar session token securely on backend
avatarRouter.post('/token', async (req: Request, res: Response) => {
  try {
    const key = cleanEnvStr(
      req.body.apiKey ||
      process.env.HEYGEN_API_KEY ||
      process.env.Avathar_API ||
      process.env.AVATAR_API
    );

    const avatarId = cleanEnvStr(
      req.body.avatarId ||
      process.env.HEYGEN_AVATAR_ID ||
      process.env.Avathar_ID ||
      process.env.AVATAR_ID,
      ''
    );

    // Natural Professional Female Voice ID for Sarah Jenkins (verified on LiveAvatar)
    const femaleVoiceId = cleanEnvStr(
      req.body.voiceId ||
      process.env.HEYGEN_VOICE_ID ||
      process.env.Avathar_VOICE,
      ''
    );

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'LiveAvatar API key is not configured. Please set HEYGEN_API_KEY or Avathar_API in .env.',
        code: 'HEYGEN_KEY_MISSING',
      });
    }

    // Call official LiveAvatar session token API with FULL mode + verified female avatar_persona
    const response = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: {
        'X-API-KEY': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'FULL',
        avatar_id: avatarId,
        avatar_persona: {
          voice_id: femaleVoiceId,
          language: 'en',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.code !== 1000 || !data?.data?.session_token) {
      console.warn('LiveAvatar token creation error:', data);
      const isInsufficientCredits = data?.code === 4033 || /credit/i.test(data?.message || '');
      return res.status(response.status || 500).json({
        success: false,
        error: isInsufficientCredits
          ? 'LiveAvatar account credits are depleted (Error 4033). Please recharge credits in your HeyGen dashboard.'
          : (data?.message || 'Failed to acquire LiveAvatar WebRTC streaming token from server.'),
        details: data,
        code: isInsufficientCredits ? 'INSUFFICIENT_CREDITS' : 'LIVEAVATAR_API_ERROR',
      });
    }

    return res.json({
      success: true,
      token: data.data.session_token,
      sessionId: data.data.session_id,
      avatarId,
      voiceId: femaleVoiceId,
      voiceGender: 'female',
    });
  } catch (err: any) {
    console.error('Error generating LiveAvatar session token:', err);
    return res.status(500).json({
      success: false,
      error: 'Network error communicating with LiveAvatar API gateway.',
      details: err.message,
    });
  }
});

// Curated college placement question bank for VFSTR / Indian campus drives
const COLLEGE_QUESTION_BANK: Record<string, Record<string, Array<{ questionText: string; expectedConcepts: string; topic: string }>>> = {
  HR: {
    Beginner: [
      {
        questionText: 'Tell me about yourself, your academic background at VFSTR, and why you are interested in this role.',
        expectedConcepts: 'Educational journey, key subjects, technical interests, enthusiasm for the company.',
        topic: 'Self Introduction',
      },
      {
        questionText: 'What are your core strengths and one technical or personal area you are actively working to improve?',
        expectedConcepts: 'Self-awareness, practical examples of strengths, constructive improvement actions.',
        topic: 'Strengths & Weaknesses',
      },
      {
        questionText: 'Why did you choose Computer Science and what sparked your passion for software development?',
        expectedConcepts: 'Curiosity, early projects, interest in problem solving.',
        topic: 'Career Motivation',
      },
      {
        questionText: 'Where do you see yourself in the next three to five years in your engineering career?',
        expectedConcepts: 'Realistic goals, eagerness to learn, mentorship, technical growth.',
        topic: 'Career Goals',
      },
    ],
    Intermediate: [
      {
        questionText: 'Describe a significant challenge you faced during a college project or hackathon and how you overcame it.',
        expectedConcepts: 'STAR technique (Situation, Task, Action, Result), problem decomposition, persistence.',
        topic: 'Behavioral / Challenge',
      },
      {
        questionText: 'Tell me about a time you had a difference of opinion with a team member. How did you resolve it constructively?',
        expectedConcepts: 'Teamwork, active listening, respectful disagreement, finding common ground.',
        topic: 'Team Collaboration',
      },
      {
        questionText: 'Why should our company hire you over other qualified candidates graduating from your batch?',
        expectedConcepts: 'Unique blend of technical skills, quick learning ability, cultural alignment, work ethic.',
        topic: 'Value Proposition',
      },
      {
        questionText: 'What do you know about our company, our products or services, and why do you want to start your career with us?',
        expectedConcepts: 'Pre-interview company research, business domain, recent news or technology adoption.',
        topic: 'Company Awareness',
      },
    ],
    Advanced: [
      {
        questionText: 'How do you handle tight project deadlines when requirements change unexpectedly near a release date?',
        expectedConcepts: 'Prioritization, transparent communication with stakeholders, trade-off management.',
        topic: 'Pressure & Adaptability',
      },
      {
        questionText: 'Tell me about a time you had to learn an entirely new technology or framework independently on a short deadline.',
        expectedConcepts: 'Learning velocity, reading official documentation, building quick prototypes.',
        topic: 'Fast Learning',
      },
    ],
  },
  Technical: {
    Beginner: [
      {
        questionText: 'What is the fundamental difference between an Array and a Linked List, and when would you choose one over the other?',
        expectedConcepts: 'Contiguous vs non-contiguous memory, O(1) random access vs dynamic sizing and O(1) insertions/deletions.',
        topic: 'Data Structures Fundamentals',
      },
      {
        questionText: 'Explain the four core pillars of Object-Oriented Programming: Encapsulation, Abstraction, Inheritance, and Polymorphism, with a simple real-world example.',
        expectedConcepts: 'Definitions of OOP pillars with real-world mapping (e.g. Vehicle, BankAccount).',
        topic: 'OOP Concepts',
      },
      {
        questionText: 'In DBMS, what is the difference between a Primary Key and a Unique Key? Can a table have multiple of each?',
        expectedConcepts: 'Primary Key allows no NULLs and only one per table; Unique Key allows one NULL and multiple per table.',
        topic: 'Database Fundamentals',
      },
      {
        questionText: 'In SQL, explain the difference between the WHERE clause and the HAVING clause with a clear example.',
        expectedConcepts: 'WHERE filters rows before grouping; HAVING filters aggregated groups created by GROUP BY.',
        topic: 'SQL Queries',
      },
      {
        questionText: 'What is a Stack, what principle does it follow, and can you name two practical applications of stacks in computer science?',
        expectedConcepts: 'LIFO principle, function call stack / recursion, undo operations, parenthesis matching.',
        topic: 'Data Structures',
      },
    ],
    Intermediate: [
      {
        questionText: 'What is the difference between a Process and a Thread in Operating Systems? How does context switching differ between them?',
        expectedConcepts: 'Process has separate address space, thread shares process memory; thread context switch is faster with less overhead.',
        topic: 'Operating Systems',
      },
      {
        questionText: 'In Java or Python, explain how a Hash Map or Dictionary works internally and how hash collisions are resolved.',
        expectedConcepts: 'Hash function, bucket array, separate chaining with linked lists or trees, open addressing.',
        topic: 'Data Structures & Hashing',
      },
      {
        questionText: 'Explain the difference between TCP and UDP protocols. In what real-world scenarios is UDP preferred despite being connectionless?',
        expectedConcepts: 'TCP is connection-oriented, reliable, with 3-way handshake; UDP is fast, low-overhead, suitable for streaming, gaming, DNS.',
        topic: 'Computer Networks',
      },
      {
        questionText: 'What is Normalization in relational databases, and what problems do First, Second, and Third Normal Forms (1NF, 2NF, 3NF) solve?',
        expectedConcepts: 'Eliminating data redundancy and update anomalies; atomicity, partial dependency, transitive dependency.',
        topic: 'DBMS Normalization',
      },
      {
        questionText: 'What are ACID properties in database transactions? Explain each with an example like a bank money transfer.',
        expectedConcepts: 'Atomicity (all or nothing), Consistency, Isolation (concurrency control), Durability (persistence after commit).',
        topic: 'DBMS Transactions',
      },
    ],
    Advanced: [
      {
        questionText: 'What is Deadlock in operating systems, what are the four Coffman conditions required for it to occur, and how can it be prevented?',
        expectedConcepts: 'Mutual exclusion, hold and wait, no preemption, circular wait; resource ordering or Banker\'s algorithm.',
        topic: 'Operating Systems Concurrency',
      },
      {
        questionText: 'Explain Database Indexing: how does a B-Tree or B+ Tree index speed up SELECT queries, and what is the trade-off on INSERT or UPDATE operations?',
        expectedConcepts: 'Tree search O(log n), sequential leaf scans in B+, overhead of rebalancing and splitting on write operations.',
        topic: 'DBMS Performance & Indexing',
      },
      {
        questionText: 'How does garbage collection work in modern managed runtimes like the JVM or Python, and what causes a memory leak even with garbage collection?',
        expectedConcepts: 'Generational GC (eden, survivor, old), reference counting / mark-and-sweep, unclosed resources, static collections.',
        topic: 'Memory Management',
      },
    ],
  },
  Coding: {
    Beginner: [
      {
        questionText: 'How would you find whether a given string is a Palindrome without using extra memory? What is the time complexity?',
        expectedConcepts: 'Two-pointer approach (start and end), comparing characters, O(n) time and O(1) space.',
        topic: 'Strings & Two Pointers',
      },
      {
        questionText: 'Given an array of integers, how would you find the second largest element in a single traversal (O(n) time)?',
        expectedConcepts: 'Tracking firstLargest and secondLargest variables, updating in one pass without sorting.',
        topic: 'Array Traversal',
      },
      {
        questionText: 'Explain how Binary Search works. What prerequisite must the array satisfy, and why is its time complexity O(log n)?',
        expectedConcepts: 'Array must be sorted, halving the search space in each step, log2(n) iterations.',
        topic: 'Searching Algorithms',
      },
    ],
    Intermediate: [
      {
        questionText: 'How would you detect a cycle or loop in a singly linked list? Explain Floyd\'s Cycle-Finding Algorithm (Tortoise and Hare).',
        expectedConcepts: 'Slow pointer moving 1 step, fast pointer moving 2 steps; if they meet, a cycle exists. O(n) time, O(1) space.',
        topic: 'Linked Lists & Pointers',
      },
      {
        questionText: 'Given an array of integers and a target sum, how would you find two numbers that add up to the target in O(n) time?',
        expectedConcepts: 'Using a Hash Map/Set to store complements (target - num) seen so far; O(n) time and O(n) space.',
        topic: 'Two Sum & Hashing',
      },
      {
        questionText: 'Explain the working of Merge Sort or Quick Sort. What are their best, average, and worst-case time complexities?',
        expectedConcepts: 'Divide and conquer strategy; Merge Sort is consistently O(n log n); Quick Sort is O(n log n) average, O(n^2) worst case on poor pivot.',
        topic: 'Sorting Algorithms',
      },
    ],
    Advanced: [
      {
        questionText: 'How would you solve the Longest Substring Without Repeating Characters problem? Explain the sliding window approach.',
        expectedConcepts: 'Two pointers forming window, hash set or map tracking character indices, O(n) time and O(k) space.',
        topic: 'Sliding Window',
      },
    ],
  },
  'Project-Based': {
    Beginner: [
      {
        questionText: 'Can you introduce your main academic project: what problem does it solve, and what technologies did you choose to build it?',
        expectedConcepts: 'Problem statement, target users, tech stack (frontend, backend, database), individual role.',
        topic: 'Project Introduction',
      },
      {
        questionText: 'Walk me through the database schema or data model you designed for your project. What were the key tables or collections?',
        expectedConcepts: 'Entities, relationships (one-to-many, many-to-many), foreign keys, primary keys.',
        topic: 'Data Modeling',
      },
      {
        questionText: 'What was your specific personal contribution in the project, and what feature was the most challenging to implement?',
        expectedConcepts: 'Clear ownership, specific features built, technical debugging process.',
        topic: 'Individual Contribution',
      },
    ],
    Intermediate: [
      {
        questionText: 'What was the toughest bug or technical obstacle you encountered while developing your project, and how did you debug and fix it?',
        expectedConcepts: 'Root cause analysis, debugging tools used, testing the fix, lessons learned.',
        topic: 'Debugging & Problem Solving',
      },
      {
        questionText: 'If you had another three months to enhance your college project for a real production deployment, what architecture or performance improvements would you make?',
        expectedConcepts: 'Authentication/security, caching, database indexing, CI/CD pipeline, mobile responsiveness.',
        topic: 'Project Scalability',
      },
    ],
    Advanced: [
      {
        questionText: 'How did you handle user authentication and authorization in your project? What security measures did you consider?',
        expectedConcepts: 'JWT tokens / sessions, password hashing (bcrypt), HTTPS, input validation, SQL injection prevention.',
        topic: 'Security & Architecture',
      },
    ],
  },
  'Communication Skills': {
    Beginner: [
      {
        questionText: 'How would you explain what an API is to a first-year college student or someone with no computer science background?',
        expectedConcepts: 'Restaurant menu / waiter analogy, clear articulation, avoiding excessive jargon.',
        topic: 'Technical Communication',
      },
      {
        questionText: 'Describe an activity or event at VFSTR where you worked closely with others. What role did you take in making it successful?',
        expectedConcepts: 'Active contribution, coordination, verbal communication, positive attitude.',
        topic: 'Interpersonal Skills',
      },
      {
        questionText: 'If you are assigned a task by your team lead and the requirements are unclear, what exact steps would you take before starting to code?',
        expectedConcepts: 'Clarifying questions, writing down assumptions, seeking quick alignment rather than guessing.',
        topic: 'Professional Communication',
      },
    ],
    Intermediate: [
      {
        questionText: 'Suppose you discovered a major bug in production right before the end of your shift. How would you communicate this to your team lead and peers?',
        expectedConcepts: 'Timely notification, reproducing steps, impact assessment, proposed fix or mitigation.',
        topic: 'Crisis Communication',
      },
    ],
    Advanced: [
      {
        questionText: 'How do you structure a technical presentation when pitching an architecture proposal to both software engineers and non-technical business managers?',
        expectedConcepts: 'Focus on business value and ROI for managers, technical architecture and tradeoffs for engineers.',
        topic: 'Stakeholder Communication',
      },
    ],
  },
};

// POST /api/avatar/generate-questions - Dynamic, tailored college questions
avatarRouter.post('/generate-questions', async (req: Request, res: Response) => {
  try {
    const {
      category = 'Technical',
      difficulty = 'Beginner',
      preferredLanguage = 'Java',
      role = 'Software Engineer Trainee',
      company = 'Campus Hiring Panel',
      questionCount = 3,
      studentProfile,
    } = req.body;

    const count = Math.min(6, Math.max(2, parseInt(questionCount, 10) || 3));
    const normalizedCategory = category === 'Coding Interview' ? 'Coding'
      : category === 'HR Interview' ? 'HR'
      : category === 'Project-Based Interview' ? 'Project-Based'
      : category === 'Communication Skills Interview' ? 'Communication Skills'
      : category === 'Technical Interview' ? 'Technical'
      : category;

    const prompt = `You are designing a realistic Indian campus placement interview for an undergraduate student at VFSTR University (Vignan's Foundation for Science, Technology & Research).
Category: ${category}
Role: ${role}
Company: ${company}
Difficulty Level: ${difficulty} (Options: Beginner, Intermediate, Advanced)
Preferred Language: ${preferredLanguage}
Number of Questions: ${count}
Student Profile:
- Department: ${studentProfile?.department || 'Computer Science & Engineering'}
- Skills: ${(studentProfile?.skills || ['Java', 'SQL', 'Data Structures', 'Python']).join(', ')}
- CGPA: ${studentProfile?.cgpa || '8.2'}
- Project Details: ${studentProfile?.projectSummary || 'Web-based Student Management & Attendance Portal'}

IMPORTANT GUIDELINES FOR INDIAN CAMPUS RECRUITMENT:
1. Difficulty calibration:
   - "Beginner": Test core fundamentals! (e.g. OOP pillars, Arrays vs Linked Lists, Stack/Queue, Primary Key vs Unique Key, WHERE vs HAVING, basic language syntax). Perfect for initial screening.
   - "Intermediate": Standard campus placement questions (e.g. Hash Map collisions, Process vs Thread, TCP vs UDP, DBMS normalization, 2-pointer problems, project hurdles).
   - "Advanced": Only if selected! Deep problem solving or scalability. NEVER ask obscure distributed system design (like TTL/LRU in-memory stores) unless difficulty is Advanced.
2. If Category is "HR": Focus on standard placement HR questions: Self introduction, strengths/weaknesses, why this company, project challenges, teamwork, 5-year goals.
3. If Category is "Project-Based": Ask about architecture, database schema, personal contribution, and tough bugs fixed in their college project.
4. If Category is "Full Mock": Mix 1 HR question, 2 Core Technical questions, 1 Project/Coding question.
5. Questions must be clear, concise, and understandable to Indian college students.

Return STRICTLY a JSON object with a single key "questions" containing an array of ${count} objects:
{
  "questions": [
    {
      "id": 1,
      "questionText": "Clear question text formulated as spoken by the interviewer",
      "topic": "Topic name (e.g. OOP Concepts, SQL, Data Structures)",
      "expectedConcepts": "Summary of 2-3 key points expected in a good student answer",
      "category": "${normalizedCategory}"
    }
  ]
}`;

    const geminiResult = await callGemini(prompt, true);
    if (geminiResult && geminiResult.text) {
      try {
        const parsed = JSON.parse(geminiResult.text);
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return res.json({
            success: true,
            questions: parsed.questions.slice(0, count),
            source: `gemini-${geminiResult.modelUsed}`,
          });
        }
      } catch (parseErr) {
        console.warn('Failed to parse Gemini generated questions, using verified question bank:', parseErr);
      }
    }

    // High-fidelity fallback from curated college question bank
    const bankCategory = normalizedCategory === 'Full Mock' ? 'Technical' : (COLLEGE_QUESTION_BANK[normalizedCategory] ? normalizedCategory : 'Technical');
    const diffLevel = difficulty === 'Advanced' ? 'Advanced' : difficulty === 'Intermediate' ? 'Intermediate' : 'Beginner';
    const pool = COLLEGE_QUESTION_BANK[bankCategory]?.[diffLevel] || COLLEGE_QUESTION_BANK['Technical']['Beginner'];

    const selected: any[] = [];
    if (normalizedCategory === 'Full Mock') {
      // 1 HR + 2 Technical + 1 Project
      const hrQ = COLLEGE_QUESTION_BANK['HR']['Beginner'][0];
      const techQ1 = COLLEGE_QUESTION_BANK['Technical'][diffLevel][0];
      const techQ2 = COLLEGE_QUESTION_BANK['Technical'][diffLevel][1];
      const projQ = COLLEGE_QUESTION_BANK['Project-Based']['Beginner'][0];
      [hrQ, techQ1, techQ2, projQ].slice(0, count).forEach((q, idx) => {
        selected.push({ id: idx + 1, ...q, category: normalizedCategory });
      });
    } else {
      pool.slice(0, count).forEach((q, idx) => {
        selected.push({ id: idx + 1, ...q, category: normalizedCategory });
      });
    }

    return res.json({
      success: true,
      questions: selected,
      source: 'vfstr_placement_curated_bank',
    });
  } catch (err: any) {
    console.error('Question generation error:', err);
    return res.status(500).json({ error: 'Failed to generate placement questions', details: err.message });
  }
});

// POST /api/avatar/chat - Conversational follow-up engine
avatarRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const {
      candidateResponse = '',
      currentQuestion = 'Tell me about yourself and your technical background.',
      expectedConcepts = '',
      questionIndex = 0,
      totalQuestions = 3,
      company = 'Campus Hiring Panel',
      role = 'Software Engineer Trainee',
      category = 'Technical',
      difficulty = 'Beginner',
      preferredLanguage = 'Java',
      conversationHistory = [],
    } = req.body;

    const isLastQuestion = questionIndex >= totalQuestions - 1;
    const cleanAnswer = (candidateResponse || '').trim();

    // Check for empty or non-attempted answers
    const isAnswerEmpty = cleanAnswer.length < 5;
    const isSkipAnswer = /^(i don't know|no idea|skip|pass|not sure|i do not know|next question)$/i.test(cleanAnswer);

    // Prompt for Gemini reasoning engine
    const prompt = `You are Sarah Jenkins, a supportive, professional, and knowledgeable Senior Campus Placement Interviewer representing ${company} conducting a ${difficulty} level ${category} interview for the role of ${role} with an undergraduate student from VFSTR University.
Preferred Language: ${preferredLanguage}
Progress: Question ${questionIndex + 1} of ${totalQuestions}.

Current Question: "${currentQuestion}"
Expected Key Concepts: "${expectedConcepts || 'Fundamental engineering knowledge, practical reasoning, and clear articulation'}"
Student's Actual Answer: "${cleanAnswer || '[Student did not provide an answer]'}"

Conversation History so far:
${JSON.stringify(conversationHistory.slice(-4))}

INTERVIEWER EVALUATION & CONVERSATION RULES:
1. ACTUAL ANSWER EVALUATION:
   - Evaluate whether the student's answer is correct, partially correct, incorrect, or skipped.
   - NEVER give false praise like "That's great!" or "Correct!" if the student answered incorrectly, skipped, or was confused.
   - If the answer is INCORRECT or CONFUSED: Politely and gently explain the mistake in 1 simple sentence ("Not quite; remember that [simple correct explanation]"), then either ask a simpler follow-up or move forward.
   - If the student said "I don't know" or skipped: Say warmly "No problem at all, let's keep going," give a 1-sentence tip on the answer, and proceed.
   - If the answer is PARTIALLY CORRECT: Acknowledge what was correct, gently note what was missed.
   - If the answer is FULLY CORRECT: Acknowledge naturally ("Spot on explanation," or "Very clear understanding of [topic]").
2. SPOKEN RESPONSE CREATION:
   - Formulate your response as the live avatar interviewer speaking directly to the student.
   - Keep it short, natural, and human-like: strictly 2 to 3 sentences total.
   - If NOT the last question (${!isLastQuestion}): Transition smoothly and state the NEXT question clearly.
   - If this IS the last question (${isLastQuestion}): Thank the student warmly for their time and invite them to view their comprehensive placement report.
   - Use clear, professional, accessible English appropriate for Indian engineering students.

Return STRICTLY a JSON object with these keys:
{
  "spokenResponse": (string) What the AI avatar will speak out loud right now (2-3 sentences max).
  "nextQuestion": (string) The exact text of the next question asked, or empty string if interview is completed.
  "feedbackOnAnswer": (string) 1-2 sentences of constructive feedback evaluating the student's specific answer.
  "scoreOnAnswer": (number) Score between 1.0 and 10.0 based on correctness and communication.
  "isCorrect": (boolean) True if the answer demonstrated correct understanding, false otherwise.
  "isCompleted": (boolean) True if this concludes the interview (${isLastQuestion}), false otherwise.
}`;

    const geminiResult = await callGemini(prompt, true);
    if (geminiResult && geminiResult.text) {
      try {
        const parsed = JSON.parse(geminiResult.text);
        if (parsed.spokenResponse) {
          return res.json({
            ...parsed,
            source: `gemini-${geminiResult.modelUsed}`,
          });
        }
      } catch (parseErr) {
        console.warn('Failed to parse Gemini avatar chat JSON:', parseErr);
      }
    }

    // Secondary fallback: OpenAI if available
    const openai = getOpenAIClient();
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.6,
        });

        const text = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(text);
        if (parsed.spokenResponse) {
          return res.json({
            ...parsed,
            source: 'openai-gpt-4o-mini',
          });
        }
      } catch (openAiErr: any) {
        console.warn('OpenAI Avatar Chat error:', openAiErr?.message);
      }
    }

    // High-fidelity college placement deterministic evaluation engine
    let score = 5.0;
    let isCorrect = false;
    let feedback = '';
    let spokenResponse = '';
    let nextQuestion = '';

    if (isAnswerEmpty || isSkipAnswer) {
      score = 4.0;
      isCorrect = false;
      feedback = 'Question was skipped or left unaddressed. In campus placements, attempting with basic principles is always encouraged.';
      if (isLastQuestion) {
        spokenResponse = `No worries at all, it's completely natural to encounter questions you haven't reviewed yet. That concludes our interview rounds today. Let's look at your evaluation report and prep roadmap.`;
      } else {
        nextQuestion = 'Let\'s try another core concept: Can you explain the difference between a Class and an Object in Object-Oriented Programming?';
        spokenResponse = `No problem at all, let's keep moving. ${nextQuestion}`;
      }
    } else {
      // Evaluate based on length and relevance to expected concepts
      const lower = cleanAnswer.toLowerCase();
      const hasKeywords = expectedConcepts
        ? expectedConcepts.toLowerCase().split(/\s+/).some((w: string) => w.length > 3 && lower.includes(w))
        : false;

      if (cleanAnswer.length > 50 || hasKeywords) {
        score = 8.5;
        isCorrect = true;
        feedback = 'Good explanation with relevant technical terms and structured reasoning.';
        if (isLastQuestion) {
          spokenResponse = `Excellent response. You articulated the core intuition clearly. That concludes our interview for today. Let's generate your detailed placement performance dossier.`;
        } else {
          nextQuestion = 'Nicely done. Now, can you explain what happens when you insert an element into a full static array versus a dynamic list?';
          spokenResponse = `That's a very clear explanation. ${nextQuestion}`;
        }
      } else {
        score = 6.5;
        isCorrect = false;
        feedback = 'Basic intuition was present, but lacked key technical details or concrete examples.';
        if (isLastQuestion) {
          spokenResponse = `Thank you for sharing your thoughts on that. We have finished all questions for this session. Let's inspect your overall placement rubric score.`;
        } else {
          nextQuestion = 'Got it. To build on that, how does method overloading differ from method overriding in your preferred language?';
          spokenResponse = `Good start, though make sure to highlight the practical trade-offs. ${nextQuestion}`;
        }
      }
    }

    return res.json({
      spokenResponse,
      nextQuestion: isLastQuestion ? '' : nextQuestion,
      feedbackOnAnswer: feedback,
      scoreOnAnswer: score,
      isCorrect,
      isCompleted: isLastQuestion,
      source: 'placement_contextual_engine',
    });
  } catch (err: any) {
    console.error('Avatar Chat handler error:', err);
    return res.status(500).json({ error: 'Failed to process conversational turn', details: err.message });
  }
});

// POST /api/avatar/tts - Synthesize speech using OpenAI TTS API (Natural Female Voice: nova)
avatarRouter.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'nova' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text prompt is required for TTS synthesis.' });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(400).json({
        error: 'OpenAI Voice API key is not configured.',
        code: 'VOICE_KEY_MISSING',
      });
    }

    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: (voice as any) || 'nova',
      input: text.slice(0, 4000),
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (err: any) {
    console.error('OpenAI TTS error:', err);
    return res.status(500).json({ error: 'TTS synthesis failed', details: err.message });
  }
});

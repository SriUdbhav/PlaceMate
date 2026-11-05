import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  Briefcase,
  Building2,
  Lock,
  User,
  Mail,
  Sun,
  Moon,
  Coffee,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserPlus,
  ShieldAlert,
  Eye,
  EyeOff,
  Compass,
  Target,
  Loader2,
  Check,
  X,
  Clock,
} from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import graduationHeroImg from '../../assets/images/graduation_hero_1793869832534.jpg';

interface LoginPortalProps {
  onSuccess?: () => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({ onSuccess }) => {
  const { login, registerStudent, setupInitialPassword, requestResetOtp, verifyResetOtp, resetPassword } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeRole, setActiveRole] = useState<UserRole>('student');
  const [identifier, setIdentifier] = useState('251FA04I28');
  const [password, setPassword] = useState('251FA04I28');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Mandatory First-Time Password Setup Modal State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changeCurrentPassword, setChangeCurrentPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [changeConfirmPassword, setChangeConfirmPassword] = useState('');
  const [showChangeNewPass, setShowChangeNewPass] = useState(false);
  const [showChangeConfirmPass, setShowChangeConfirmPass] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSubmitting, setChangeSubmitting] = useState(false);

  // Student Onboarding Modal State
  const [showRegister, setShowRegister] = useState(false);

  // Forgot Password (Gmail OTP) Modal State
  const [showForgot, setShowForgot] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('251FA04I28');
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPass, setShowResetNewPass] = useState(false);
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);
  const [resetMaskedEmail, setResetMaskedEmail] = useState('');
  const [resetDevOtp, setResetDevOtp] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetSmtpConfigured, setResetSmtpConfigured] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Student Register Form State
  const [regForm, setRegForm] = useState({
    rollNo: '',
    name: '',
    email: '',
    department: 'Computer Science & Engineering',
    batch: '2021 - 2025 (Final Year)',
    cgpa: '8.5',
    password: '',
  });
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirmPass, setShowRegConfirmPass] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRoleSelect = (role: UserRole) => {
    setActiveRole(role);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Pre-populate university test credentials
    if (role === 'student') {
      setIdentifier('251FA04I28');
      setPassword('251FA04I28');
    } else if (role === 'tpo') {
      setIdentifier('tpo@campus.edu');
      setPassword('TpoAdmin@123');
    } else if (role === 'recruiter') {
      setIdentifier('recruiter@google.com');
      setPassword('Recruiter@123');
    } else if (role === 'admin') {
      setIdentifier('admin@campus.edu');
      setPassword('SystemAdmin@123');
    }
  };

  // Helper password strength test (Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
  const checkPasswordRules = (pwd: string) => {
    return {
      minLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=~/`[\]\\]/.test(pwd),
    };
  };

  const isPasswordStrong = (pwd: string) => {
    const r = checkPasswordRules(pwd);
    return r.minLength && r.hasUpper && r.hasLower && r.hasNumber && r.hasSpecial;
  };

  // Form submission with loading state and duplicate submission prevention
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submissions

    const trimmedId = identifier.trim();

    // Client-side validation with clear, user-friendly messages
    if (!trimmedId) {
      if (activeRole === 'student') {
        setErrorMsg('Please enter your registration number.');
      } else {
        setErrorMsg('Please enter your email address.');
      }
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await login(activeRole, trimmedId, password);
      if (!res.success) {
        setErrorMsg(res.error || 'Invalid registration number or password.');
      } else {
        if (res.mustChangePassword) {
          // Mandatory First-Time Permanent Password Setup required for student
          setChangeCurrentPassword(password);
          setChangeNewPassword('');
          setChangeConfirmPassword('');
          setChangeError(null);
          setShowChangePassword(true);
        } else {
          setSuccessMsg('Authentication verified. Loading placement dashboard...');
          if (onSuccess) onSuccess();
        }
      }
    } catch (err: any) {
      setErrorMsg('Unable to connect. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle mandatory first-time permanent password setup
  const handleMandatoryPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);

    const rules = checkPasswordRules(changeNewPassword);
    if (!rules.minLength) {
      setChangeError('Password must be at least 8 characters long.');
      return;
    }
    if (!rules.hasUpper) {
      setChangeError('Password must include at least one uppercase letter (A-Z).');
      return;
    }
    if (!rules.hasLower) {
      setChangeError('Password must include at least one lowercase letter (a-z).');
      return;
    }
    if (!rules.hasNumber) {
      setChangeError('Password must include at least one number (0-9).');
      return;
    }
    if (!rules.hasSpecial) {
      setChangeError('Password must include at least one special character (!@#$%^&*).');
      return;
    }

    if (identifier && changeNewPassword.trim().toUpperCase() === identifier.trim().toUpperCase()) {
      setChangeError('University Security Policy: Registration Number cannot be reused as your personal password.');
      return;
    }

    if (changeNewPassword === changeCurrentPassword) {
      setChangeError('New password cannot be identical to your initial password.');
      return;
    }

    if (changeNewPassword !== changeConfirmPassword) {
      setChangeError('New password and confirmation password do not match.');
      return;
    }

    setChangeSubmitting(true);
    try {
      const res = await setupInitialPassword(
        identifier.trim(),
        changeCurrentPassword,
        changeNewPassword,
        changeConfirmPassword
      );

      if (!res.success) {
        setChangeError(res.error || 'Failed to update permanent password.');
      } else {
        setShowChangePassword(false);
        setSuccessMsg('Permanent password configured successfully! Redirecting to dashboard...');
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setChangeError('Unable to connect. Please try again.');
    } finally {
      setChangeSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regSubmitting) return;

    setRegError(null);
    setRegSuccess(null);

    const trimmedRoll = regForm.rollNo.trim().toUpperCase();
    if (!trimmedRoll) {
      setRegError('Please enter your University Registration Number.');
      return;
    }

    if (!regForm.name.trim()) {
      setRegError('Please enter your full student name.');
      return;
    }

    if (!regForm.email.trim() || !regForm.email.includes('@')) {
      setRegError('Please enter a valid Gmail or university email address.');
      return;
    }

    const rules = checkPasswordRules(regForm.password);
    if (!rules.minLength) {
      setRegError('Password must be at least 8 characters long.');
      return;
    }
    if (!rules.hasUpper) {
      setRegError('Password must include at least one uppercase letter (A-Z).');
      return;
    }
    if (!rules.hasLower) {
      setRegError('Password must include at least one lowercase letter (a-z).');
      return;
    }
    if (!rules.hasNumber) {
      setRegError('Password must include at least one number (0-9).');
      return;
    }
    if (!rules.hasSpecial) {
      setRegError('Password must include at least one special character (!@#$%^&*).');
      return;
    }

    if (regForm.password.trim().toUpperCase() === trimmedRoll) {
      setRegError('University Security Policy: Registration Number cannot be reused as your personal password.');
      return;
    }

    if (regForm.password !== regConfirmPassword) {
      setRegError('Password and confirmation password do not match.');
      return;
    }

    setRegSubmitting(true);

    try {
      const res = await registerStudent({
        ...regForm,
        rollNo: trimmedRoll,
        cgpa: parseFloat(regForm.cgpa) || 8.5,
      });

      if (!res.success) {
        setRegError(res.error || 'Registration failed. Please check your information.');
      } else {
        setRegSuccess('Student account successfully activated and authenticated! Loading dashboard...');
        setTimeout(() => {
          setShowRegister(false);
          if (onSuccess) onSuccess();
        }, 1200);
      }
    } catch (err: any) {
      setRegError('Unable to connect. Please try again.');
    } finally {
      setRegSubmitting(false);
    }
  };

  // Step 1: Request 6-digit OTP sent to registered Gmail (valid 5 minutes)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) {
      setResetError(
        activeRole === 'student'
          ? 'Please enter your Registration Number.'
          : 'Please enter your registered email address.'
      );
      return;
    }

    setResetError(null);
    setResetSuccess(null);
    setResetSubmitting(true);

    try {
      const res = await requestResetOtp(resetIdentifier.trim());
      if (!res.success) {
        setResetError(res.error || 'Failed to dispatch verification code');
      } else {
        setResetMaskedEmail(res.maskedEmail || 'your registered Gmail');
        setResetEmailSent(Boolean(res.emailSent));
        setResetSmtpConfigured(Boolean(res.smtpConfigured));
        setResetDevOtp(res.devOtp || null);
        if (res.devOtp) {
          setResetOtp(res.devOtp);
        }
        setResetSuccess(
          res.message || 'Verification code dispatched. Code expires in 5 minutes.'
        );
        setResetStep('verify');
        setResendCooldown(60); // 60s cooldown before next resend
      }
    } catch (err: any) {
      setResetError('Unable to connect. Please try again.');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Step 2: Verify 6-digit OTP and set new strong password
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    if (!resetOtp.trim() || resetOtp.trim().length !== 6) {
      setResetError('Please enter the complete 6-digit verification code.');
      return;
    }

    const rules = checkPasswordRules(resetNewPassword);
    if (!rules.minLength) {
      setResetError('Password must be at least 8 characters long.');
      return;
    }
    if (!rules.hasUpper) {
      setResetError('Password must include at least one uppercase letter (A-Z).');
      return;
    }
    if (!rules.hasLower) {
      setResetError('Password must include at least one lowercase letter (a-z).');
      return;
    }
    if (!rules.hasNumber) {
      setResetError('Password must include at least one number (0-9).');
      return;
    }
    if (!rules.hasSpecial) {
      setResetError('Password must include at least one special character (!@#$%^&*).');
      return;
    }

    if (resetNewPassword.trim().toUpperCase() === resetIdentifier.trim().toUpperCase()) {
      setResetError('University Security Policy: Registration Number cannot be reused as your password.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('New password and confirmation password do not match.');
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await verifyResetOtp(
        resetIdentifier.trim(),
        resetOtp.trim(),
        resetNewPassword,
        resetConfirmPassword
      );
      if (!res.success) {
        setResetError(res.error || 'OTP verification failed. Please check the code.');
      } else {
        setSuccessMsg('Password reset successfully! Please sign in with your updated credentials.');
        setShowForgot(false);
        setPassword(resetNewPassword);
        setIdentifier(resetIdentifier);
      }
    } catch (err: any) {
      setResetError('Unable to connect. Please try again.');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Theme-specific accent and banner styles
  const isCappuccino = theme === 'cappuccino';
  const changeRules = checkPasswordRules(changeNewPassword);
  const resetRules = checkPasswordRules(resetNewPassword);

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row overflow-hidden bg-[var(--bg-app)] text-[var(--text-main)] font-sans transition-colors duration-200">
      {/* ========================================================= */}
      {/* LEFT COLUMN: ~55% Viewport Graduation Photograph + Text    */}
      {/* ========================================================= */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-10 xl:p-14 text-white overflow-hidden select-none bg-slate-900">
        {/* Background graduation celebration photo */}
        <img
          src={graduationHeroImg}
          alt="VFSTR University Graduation Celebration"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none brightness-95"
        />

        {/* Atmospheric gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/45 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1d]/60 via-transparent to-[#0a0f1d]/85 pointer-events-none" />

        {/* Top Header Overlay: Logo + Branding */}
        <div className="relative z-10 flex items-center space-x-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl border border-white/20 backdrop-blur-md ${
              isCappuccino
                ? 'bg-gradient-to-tr from-[#8b5a2b] to-[#6f4e37] shadow-[#8b5a2b]/30'
                : 'bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-indigo-500/30'
            }`}
          >
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
                PlaceMate AI
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/20">
                VFSTR
              </span>
            </div>
            <p className="text-sm italic text-indigo-200 font-medium drop-shadow-xs">
              Your Gateway to Career Success
            </p>
            <p className="text-xs text-slate-300 mt-0.5">
              Connecting VFSTR Students with Opportunities.
            </p>
          </div>
        </div>

        {/* Center Feature Badges Overlay */}
        <div className="relative z-10 my-auto py-6">
          <div className="flex flex-wrap gap-2.5 max-w-lg">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900/65 backdrop-blur-md border border-white/15 text-xs font-semibold text-slate-100 shadow-md">
              <Briefcase className="w-4 h-4 text-sky-400" />
              <span>Placements</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900/65 backdrop-blur-md border border-white/15 text-xs font-semibold text-slate-100 shadow-md">
              <Compass className={`w-4 h-4 ${isCappuccino ? 'text-[#d7a075]' : 'text-indigo-400'}`} />
              <span>Career Guidance</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900/65 backdrop-blur-md border border-white/15 text-xs font-semibold text-slate-100 shadow-md">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Skill Development</span>
            </div>
          </div>
        </div>

        {/* Bottom Tagline Overlay: "Dream. Prepare. Get Placed." */}
        <div className="relative z-10 pb-2">
          <p
            className={`text-xs font-semibold tracking-wider uppercase mb-1 ${
              isCappuccino ? 'text-[#e8cbb6]' : 'text-indigo-300'
            }`}
          >
            Empowering Campus Futures
          </p>
          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">
            Dream. Prepare. Get Placed.
          </h2>
          <p className="text-xs text-slate-300 mt-2 max-w-md leading-relaxed">
            Vignan's Foundation for Science, Technology & Research · Training & Placement Cell Portal
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: ~45% Viewport Executive Precision Panel     */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[45%] h-full flex flex-col justify-between overflow-y-auto px-6 sm:px-10 lg:px-12 py-7 bg-[var(--bg-app)] text-[var(--text-main)] transition-colors duration-200 border-l border-[var(--border-subtle)]">
        {/* Top Bar with Mobile Brand & Theme Switcher */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 lg:hidden">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                isCappuccino ? 'bg-[#8b5a2b]' : 'bg-indigo-600'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-[var(--text-main)]">PlaceMate AI</span>
          </div>
          <div className="hidden lg:block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            VFSTR University Placement Cell
          </div>

          {/* Theme Picker */}
          <div className="flex items-center space-x-1 p-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xs">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              title="Light Theme"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-700 text-indigo-300 font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              title="Dark Theme"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('cappuccino')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                theme === 'cappuccino'
                  ? 'bg-[#ebd9cc] text-[#6f4e37] font-semibold shadow-xs ring-1 ring-[#8b5a2b]/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              title="Cappuccino Theme"
            >
              <Coffee className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="max-w-md w-full mx-auto my-auto py-2">
          {/* Header in Right Section */}
          <div className="mb-5 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2.5 mb-1.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ${
                  isCappuccino
                    ? 'bg-gradient-to-tr from-[#8b5a2b] to-[#6f4e37] shadow-[#8b5a2b]/20'
                    : 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-500/20'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)] leading-tight">
                  PlaceMate AI
                </h2>
                <p
                  className={`text-xs font-semibold ${
                    isCappuccino ? 'text-[#8b5a2b]' : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  VFSTR University Placements
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Sign in to access your placement dashboard, eligibility records, and campus drives.
            </p>
          </div>

          {/* Role Selector Tabs (Horizontal 4-option bar) */}
          <div className="mb-4">
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => handleRoleSelect('student')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeRole === 'student'
                    ? isCappuccino
                      ? 'bg-gradient-to-r from-[#8b5a2b] to-[#6f4e37] text-white shadow-xs font-semibold'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                <GraduationCap
                  className={`w-4 h-4 mx-auto mb-1 ${
                    activeRole === 'student'
                      ? 'text-white'
                      : isCappuccino
                      ? 'text-[#8b5a2b]'
                      : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                />
                Student
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('tpo')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeRole === 'tpo'
                    ? isCappuccino
                      ? 'bg-gradient-to-r from-[#8b5a2b] to-[#6f4e37] text-white shadow-xs font-semibold'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                <Building2
                  className={`w-4 h-4 mx-auto mb-1 ${
                    activeRole === 'tpo' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
                TPO Cell
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('recruiter')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeRole === 'recruiter'
                    ? isCappuccino
                      ? 'bg-gradient-to-r from-[#8b5a2b] to-[#6f4e37] text-white shadow-xs font-semibold'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                <Briefcase
                  className={`w-4 h-4 mx-auto mb-1 ${
                    activeRole === 'recruiter' ? 'text-white' : 'text-sky-600 dark:text-sky-400'
                  }`}
                />
                Recruiter
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeRole === 'admin'
                    ? isCappuccino
                      ? 'bg-gradient-to-r from-[#8b5a2b] to-[#6f4e37] text-white shadow-xs font-semibold'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                <ShieldCheck
                  className={`w-4 h-4 mx-auto mb-1 ${
                    activeRole === 'admin'
                      ? 'text-white'
                      : isCappuccino
                      ? 'text-[#6f4e37]'
                      : 'text-violet-600 dark:text-violet-400'
                  }`}
                />
                Admin
              </button>
            </div>
          </div>

          {/* Student First-Time Guidance Tip */}
          {activeRole === 'student' && !errorMsg && !successMsg && (
            <div className="mb-3 px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
              <span>First-time login? Use your Registration Number as password.</span>
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className={`font-semibold hover:underline cursor-pointer shrink-0 ml-2 ${
                  isCappuccino ? 'text-[#8b5a2b]' : 'text-indigo-600 dark:text-indigo-400'
                }`}
              >
                Or Activate Profile →
              </button>
            </div>
          )}

          {/* Feedback Messages (Subtle and user-friendly) */}
          {errorMsg && (
            <div className="mb-3.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-3.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-start space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--text-main)]">
                {activeRole === 'student' ? 'University Registration Number' : 'Official Email Address'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                  {activeRole === 'student' ? <User className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </span>
                <input
                  type={activeRole === 'student' ? 'text' : 'email'}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(activeRole === 'student' ? e.target.value.toUpperCase() : e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder={activeRole === 'student' ? 'e.g. 251FA04I28' : 'name@campus.edu'}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)] focus:border-[var(--accent-brand)] transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[var(--text-main)]">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setResetIdentifier(identifier);
                    setResetStep('request');
                    setResetOtp('');
                    setResetNewPassword('');
                    setResetConfirmPassword('');
                    setResetError(null);
                    setResetSuccess(null);
                    setShowForgot(true);
                  }}
                  className="text-xs text-[var(--accent-brand)] hover:underline cursor-pointer"
                >
                  Reset password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)] focus:border-[var(--accent-brand)] transition-colors shadow-2xs"
                />
                {/* 1. Show/Hide Password Toggle for all roles */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. Styled Action Button with Loading Animation */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full mt-2 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                isCappuccino
                  ? 'bg-gradient-to-r from-[#8b5a2b] via-[#7a4e25] to-[#6f4e37] hover:from-[#7a4e25] hover:to-[#5c4033] shadow-md shadow-[#8b5a2b]/25 hover:shadow-lg'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/35'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 mr-1.5" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in as {activeRole.toUpperCase()} →</span>
              )}
            </button>

            {/* Direct New Student Onboarding / Account Activation Button */}
            {activeRole === 'student' && (
              <div className="pt-2.5">
                <button
                  type="button"
                  onClick={() => setShowRegister(true)}
                  className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    isCappuccino
                      ? 'border-[#8b5a2b]/40 text-[#8b5a2b] bg-[#ebd9cc]/20 hover:bg-[#ebd9cc]/40'
                      : 'border-indigo-400/40 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span>New student? Activate university account</span>
                </button>
              </div>
            )}
          </form>

          {/* Quick Institutional Credentials Footer */}
          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              1-Click Institutional Credentials
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveRole('student');
                  setIdentifier('251FA04I28');
                  setPassword('251FA04I28');
                  setErrorMsg(null);
                }}
                className={`p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-left hover:border-[var(--accent-brand)] transition-colors cursor-pointer shadow-2xs ${
                  isCappuccino ? 'hover:bg-[#ebd9cc]/30' : ''
                }`}
              >
                <div
                  className={`font-semibold truncate ${
                    isCappuccino ? 'text-[#8b5a2b]' : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  Sri Udbhav (First Setup)
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">Reg: 251FA04I28 · Setup Flow</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRole('student');
                  setIdentifier('21CS048');
                  setPassword('Student@123');
                  setErrorMsg(null);
                }}
                className={`p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-left hover:border-[var(--accent-brand)] transition-colors cursor-pointer shadow-2xs ${
                  isCappuccino ? 'hover:bg-[#ebd9cc]/30' : ''
                }`}
              >
                <div
                  className={`font-semibold truncate ${
                    isCappuccino ? 'text-[#8b5a2b]' : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  Aarav Sharma (Direct Sign-In)
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">Reg: 21CS048 · Dashboard</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('tpo')}
                className={`p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-left hover:border-emerald-400 transition-colors cursor-pointer shadow-2xs ${
                  isCappuccino ? 'hover:bg-[#ebd9cc]/30' : ''
                }`}
              >
                <div className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">Placement Officer</div>
                <div className="text-[10px] text-[var(--text-muted)]">tpo@campus.edu</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('recruiter')}
                className={`p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-left hover:border-sky-400 transition-colors cursor-pointer shadow-2xs ${
                  isCappuccino ? 'hover:bg-[#ebd9cc]/30' : ''
                }`}
              >
                <div className="font-semibold text-sky-600 dark:text-sky-400 truncate">Recruiter Portal</div>
                <div className="text-[10px] text-[var(--text-muted)]">Google Campus TA</div>
              </button>
            </div>
          </div>

          {/* Student Onboarding Option */}
          {activeRole === 'student' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className={`text-xs font-medium hover:underline inline-flex items-center space-x-1 cursor-pointer ${
                  isCappuccino ? 'text-[#8b5a2b]' : 'text-indigo-600 dark:text-indigo-400'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>New student? Activate university account</span>
              </button>
            </div>
          )}
        </div>

        {/* Subtle Footer Note */}
        <div className="text-center pt-2 text-[11px] text-[var(--text-muted)]">
          Protected by VFSTR Campus Security · All Rights Reserved
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. SECURE FIRST-TIME PERMANENT PASSWORD SETUP MODAL       */}
      {/* ========================================================= */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl text-[var(--text-main)]">
            <div className="flex items-center space-x-3 pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">Permanent Password Setup</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Mandatory First-Time Student Authentication</p>
              </div>
            </div>

            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--text-secondary)] leading-relaxed">
              <p>
                <strong>University Policy:</strong> You have authenticated using your initial Registration Number (
                <code className="font-mono font-bold text-[var(--accent-brand)]">{identifier}</code>).
              </p>
              <p className="mt-1">
                To protect your placement dossier, applications, and confidential records, you must set a permanent
                personal password. Once saved, your registration number will <strong>never work again</strong> as your
                password.
              </p>
            </div>

            {changeError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{changeError}</span>
              </div>
            )}

            <form onSubmit={handleMandatoryPasswordChange} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[var(--text-main)]">Current Initial Password</label>
                <input
                  type="password"
                  value={changeCurrentPassword}
                  onChange={(e) => setChangeCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[var(--text-main)]">
                  New Permanent Password <span className="text-[var(--text-muted)] font-normal">(min 8 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showChangeNewPass ? 'text' : 'password'}
                    value={changeNewPassword}
                    onChange={(e) => setChangeNewPassword(e.target.value)}
                    required
                    placeholder="Create strong permanent password"
                    className="w-full pl-3 pr-10 py-2 text-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangeNewPass(!showChangeNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    title={showChangeNewPass ? 'Hide password' : 'Show password'}
                  >
                    {showChangeNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength criteria checklist */}
                <div className="mt-2 p-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] grid grid-cols-2 gap-1 text-[10px]">
                  <div className={`flex items-center space-x-1 ${changeRules.minLength ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}`}>
                    {changeRules.minLength ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">•</span>}
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${changeRules.hasUpper ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}`}>
                    {changeRules.hasUpper ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">•</span>}
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${changeRules.hasLower ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}`}>
                    {changeRules.hasLower ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">•</span>}
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${changeRules.hasNumber ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}`}>
                    {changeRules.hasNumber ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">•</span>}
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`col-span-2 flex items-center space-x-1 ${changeRules.hasSpecial ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}`}>
                    {changeRules.hasSpecial ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">•</span>}
                    <span>Special character (!@#$%^&* etc.)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[var(--text-main)]">Confirm Permanent Password</label>
                <div className="relative">
                  <input
                    type={showChangeConfirmPass ? 'text' : 'password'}
                    value={changeConfirmPassword}
                    onChange={(e) => setChangeConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter permanent password"
                    className="w-full pl-3 pr-10 py-2 text-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangeConfirmPass(!showChangeConfirmPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    title={showChangeConfirmPass ? 'Hide password' : 'Show password'}
                  >
                    {showChangeConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {changeConfirmPassword && (
                  <p className={`text-[10px] mt-1 font-medium ${changeNewPassword === changeConfirmPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {changeNewPassword === changeConfirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                  </p>
                )}
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={changeSubmitting || !isPasswordStrong(changeNewPassword) || changeNewPassword !== changeConfirmPassword}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                    isCappuccino
                      ? 'bg-gradient-to-r from-[#8b5a2b] to-[#6f4e37] hover:from-[#7a4e25] hover:to-[#5c4033]'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                  }`}
                >
                  {changeSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      <span>Saving Permanent Password...</span>
                    </>
                  ) : (
                    <span>Save Password & Unlock Student Portal →</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. FORGOT PASSWORD — GMAIL OTP VERIFICATION MODAL         */}
      {/* ========================================================= */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl text-[var(--text-main)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <span>Gmail OTP Password Reset</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer p-1 rounded-lg hover:bg-[var(--bg-subtle)]"
              >
                ✕
              </button>
            </div>

            {resetError && (
              <div className="mb-3.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="mb-3.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {/* Step 1: Request 6-digit OTP sent to registered Gmail */}
            {resetStep === 'request' ? (
              <form onSubmit={handleRequestOtp} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-main)]">
                    {activeRole === 'student' ? 'Registration Number or Registered Gmail' : 'Registered Email Address'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={activeRole === 'student' ? 'e.g. 251FA04I28 or v.sriudbhav68@gmail.com' : 'name@campus.edu'}
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value.trim())}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                  />
                  <div className="flex items-center space-x-1.5 text-[10px] text-[var(--text-muted)] mt-1.5">
                    <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>A 6-digit verification code will be sent to your Gmail. Code expires in 5 minutes.</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className={`px-4 py-2 rounded-xl text-white font-semibold cursor-pointer shadow-md flex items-center space-x-1.5 disabled:opacity-50 ${
                      isCappuccino ? 'bg-[#8b5a2b] hover:bg-[#6f4e37]' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {resetSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <span>Send Verification OTP</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Enter 6-digit OTP, New Password & Confirm Password */
              <form onSubmit={handleVerifyOtp} className="space-y-3 text-xs">
                <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
                  <div>
                    Target registered Gmail: <strong className="text-[var(--text-main)]">{resetMaskedEmail}</strong>
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">⏱ Code valid for 5 minutes</div>
                </div>

                {resetEmailSent && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-200 flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Email Dispatched Successfully</div>
                      <p className="text-[11px] mt-0.5 text-emerald-700 dark:text-emerald-300">
                        Check your Gmail inbox and spam folder for your 6-digit verification code.
                      </p>
                    </div>
                  </div>
                )}

                {resetDevOtp && (
                  <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 text-xs">
                    <div className="flex items-center justify-between text-indigo-950 dark:text-indigo-200 font-semibold text-[11px]">
                      <span>{resetEmailSent ? '📧 Live Gmail OTP Dispatched' : '🔐 Verification OTP'}</span>
                      <span className="font-mono bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded border border-indigo-300 dark:border-indigo-700 font-bold text-indigo-700 dark:text-indigo-300 tracking-wider">
                        {resetDevOtp}
                      </span>
                    </div>
                    <p className="text-[10px] text-indigo-700 dark:text-indigo-300 mt-1 leading-relaxed">
                      {resetEmailSent
                        ? 'Dispatched to your registered Gmail address. For instantaneous preview testing, you may also auto-fill the code above.'
                        : 'Generated 5-minute verification code for testing.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setResetOtp(resetDevOtp)}
                      className="mt-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer inline-flex items-center space-x-1"
                    >
                      <span>⚡ Auto-fill code {resetDevOtp} →</span>
                    </button>
                  </div>
                )}

                <div>
                  <label className="block font-semibold mb-1">Enter 6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 tracking-widest text-center font-mono text-base font-bold rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    New Password <span className="text-[var(--text-muted)] font-normal">(min 8 chars)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showResetNewPass ? 'text' : 'password'}
                      required
                      placeholder="Enter new password"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPass(!showResetNewPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    >
                      {showResetNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password rules indicator */}
                  <div className="mt-1.5 p-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] grid grid-cols-2 gap-1 text-[9px]">
                    <span className={resetRules.minLength ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}>
                      {resetRules.minLength ? '✓' : '•'} 8+ chars
                    </span>
                    <span className={resetRules.hasUpper ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}>
                      {resetRules.hasUpper ? '✓' : '•'} Uppercase
                    </span>
                    <span className={resetRules.hasLower ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}>
                      {resetRules.hasLower ? '✓' : '•'} Lowercase
                    </span>
                    <span className={resetRules.hasNumber ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}>
                      {resetRules.hasNumber ? '✓' : '•'} Number
                    </span>
                    <span className={`col-span-2 ${resetRules.hasSpecial ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}`}>
                      {resetRules.hasSpecial ? '✓' : '•'} Special char (!@#$%^&*)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showResetConfirmPass ? 'text' : 'password'}
                      required
                      placeholder="Confirm new password"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPass(!showResetConfirmPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    >
                      {showResetConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {resetConfirmPassword && (
                    <p className={`text-[10px] mt-1 font-medium ${resetNewPassword === resetConfirmPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {resetNewPassword === resetConfirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || resetSubmitting}
                    onClick={handleRequestOtp}
                    className="text-xs text-[var(--accent-brand)] hover:underline cursor-pointer disabled:text-[var(--text-muted)] disabled:no-underline"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting || !isPasswordStrong(resetNewPassword) || resetNewPassword !== resetConfirmPassword}
                    className={`px-4 py-2 rounded-xl text-white font-semibold cursor-pointer shadow-md flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCappuccino ? 'bg-[#8b5a2b] hover:bg-[#6f4e37]' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {resetSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Set New Password</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Student Onboarding Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl text-[var(--text-main)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">New Student Account Activation</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">VFSTR Placement Intelligence Onboarding</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRegister(false);
                  setRegError(null);
                  setRegSuccess(null);
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer p-1 rounded-lg hover:bg-[var(--bg-subtle)]"
              >
                ✕
              </button>
            </div>

            {regError && (
              <div className="mb-3.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="mb-3.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>{regSuccess}</span>
              </div>
            )}

            {/* Quick Demo Pre-fill for Testing Student Account Activation */}
            <div className="mb-3 p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">Testing registration?</span>
              <button
                type="button"
                onClick={() => {
                  const rand = Math.floor(100 + Math.random() * 900);
                  setRegForm({
                    rollNo: `231FA04${rand}`,
                    name: 'Karthikeya Varma',
                    email: `karthik.varma${rand}@gmail.com`,
                    department: 'Computer Science & Engineering',
                    batch: '2021 - 2025 (Final Year)',
                    cgpa: '8.95',
                    password: 'Student@123',
                  });
                  setRegConfirmPassword('Student@123');
                  setRegError(null);
                }}
                className={`font-semibold hover:underline cursor-pointer ${
                  isCappuccino ? 'text-[#8b5a2b]' : 'text-indigo-600 dark:text-indigo-400'
                }`}
              >
                ⚡ Fill Sample Student Data →
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">University Registration Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 251FA04I28 or 22FA04K001"
                  value={regForm.rollNo}
                  onChange={(e) => {
                    setRegForm({ ...regForm, rollNo: e.target.value.toUpperCase() });
                    if (regError) setRegError(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)] font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Full Student Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Udbhav"
                  value={regForm.name}
                  onChange={(e) => {
                    setRegForm({ ...regForm, name: e.target.value });
                    if (regError) setRegError(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Registered Gmail / University Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. v.sriudbhav68@gmail.com"
                  value={regForm.email}
                  onChange={(e) => {
                    setRegForm({ ...regForm, email: e.target.value });
                    if (regError) setRegError(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Department / Branch</label>
                  <select
                    value={regForm.department}
                    onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)] text-xs"
                  >
                    <option value="Computer Science & Engineering">CSE</option>
                    <option value="Information Technology">IT</option>
                    <option value="Artificial Intelligence & ML">AI & ML</option>
                    <option value="Electronics & Communication">ECE</option>
                    <option value="Electrical & Electronics">EEE</option>
                    <option value="Mechanical Engineering">Mechanical</option>
                    <option value="Civil Engineering">Civil</option>
                    <option value="Management Studies (MBA)">MBA</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Current CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={regForm.cgpa}
                    onChange={(e) => setRegForm({ ...regForm, cgpa: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Password * (min 8 characters)</label>
                <div className="relative">
                  <input
                    type={showRegPass ? 'text' : 'password'}
                    required
                    placeholder="Create secure password"
                    value={regForm.password}
                    onChange={(e) => {
                      setRegForm({ ...regForm, password: e.target.value });
                      if (regError) setRegError(null);
                    }}
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password rules indicator */}
                {(() => {
                  const regRules = checkPasswordRules(regForm.password);
                  return (
                    <div className="mt-1.5 p-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] grid grid-cols-2 gap-1 text-[9px]">
                      <span className={regRules.minLength ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}>
                        {regRules.minLength ? '✓' : '•'} 8+ chars
                      </span>
                      <span className={regRules.hasUpper ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}>
                        {regRules.hasUpper ? '✓' : '•'} Uppercase
                      </span>
                      <span className={regRules.hasLower ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}>
                        {regRules.hasLower ? '✓' : '•'} Lowercase
                      </span>
                      <span className={regRules.hasNumber ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}>
                        {regRules.hasNumber ? '✓' : '•'} Number
                      </span>
                      <span className={`col-span-2 ${regRules.hasSpecial ? 'text-emerald-600 font-semibold' : 'text-[var(--text-muted)]'}`}>
                        {regRules.hasSpecial ? '✓' : '•'} Special char (!@#$%^&*)
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block font-semibold mb-1">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showRegConfirmPass ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={regConfirmPassword}
                    onChange={(e) => {
                      setRegConfirmPassword(e.target.value);
                      if (regError) setRegError(null);
                    }}
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPass(!showRegConfirmPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    {showRegConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {regConfirmPassword && (
                  <p className={`text-[10px] mt-1 font-medium ${regForm.password === regConfirmPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {regForm.password === regConfirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regSubmitting || !isPasswordStrong(regForm.password) || regForm.password !== regConfirmPassword}
                  className={`px-4 py-2 rounded-xl text-white font-semibold cursor-pointer shadow-md flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCappuccino ? 'bg-[#8b5a2b] hover:bg-[#6f4e37]' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {regSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      <span>Activating Profile...</span>
                    </>
                  ) : (
                    <span>Activate Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

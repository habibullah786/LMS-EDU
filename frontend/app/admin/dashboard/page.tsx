'use client';

import { API_BASE_URL } from '@/lib/apiClient';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

// ── Types ───────────────────────────────────────────────────────────────────

type View = 'dashboard' | 'leads' | 'trial_enrollments' | 'parents' | 'users' | 'classes' | 'settings' | 'notifications' | 'workflows' | 'attendance' | 'continuing_ed';
type SettingsSection = 'locations' | 'courses' | 'ageGroups' | 'types';
type ConfigItem = { id: string; value: string; label: string };

type CourseModule = { title: string; description: string };

type ClassItem = {
  id: string; curriculum: string; locations: string[]; ageGroups: string[];
  course: string; type: 'Trial' | 'Paid'; semester: string; price: number;
  date: string; time: string; availableSlots: number; instructor: string; maxStudents: number;
  hideWhenFull: boolean; department: string; modules: CourseModule[];
};

type Student = {
  name: string; dob: string; classId: string; className: string;
  course: string; location: string; instructor: string; price: number; type: string;
};

type Enrollment = {
  id: string; parentName: string; parentPhone: string; parentEmail: string;
  students: Student[]; totalAmount: number; bookingDate: string; status: string;
  confirmationRequestSentAt?: string; confirmationRespondedAt?: string; confirmationResponseChannel?: string;
};

type Filters = { location: string; course: string; status: string; dateRange: string };
type DashboardCounts = { enrollments: number; pending_enrollments: number; leads: number; trial_enrollments: number; parents: number; users: number; classes: number; notification_logs: number; notification_logs_sent: number; workflows: number; revenue: number };

type AppUser = { id: number; name: string; email: string; phone: string | null; role: string; created_at: string };
type LeadReminderCall = { id: number; called_at: string; operator?: { id: number; name: string } | null };
type LeadReminderEmail = { id: number; reminder_day: number; sent_at: string };
type Lead = { id: number; name: string; email: string; phone: string; age_group: string | null; course: string | null; location: string | null; source: string; is_registered: boolean; reminder_call_count: number; reminder_call_time: string | null; reminder_calls: LeadReminderCall[]; scheduled_call_time: string | null; reminder_email_count: number; reminder_email_time: string | null; reminder_emails: LeadReminderEmail[]; next_reminder_email_at: string | null; created_at: string; updated_at: string };

// ── Constants ────────────────────────────────────────────────────────────────

const API_URL = API_BASE_URL;

const KEYS = {
  locations: 'exceed_config_locations',
  courses:   'exceed_config_courses',
  ageGroups: 'exceed_config_age_groups',
};

const DEFAULT_LOCATIONS: ConfigItem[] = [
  { id: '1', value: '1', label: 'Thornhill' },
  { id: '3', value: '3', label: 'Richmond Hill' },
  { id: '6', value: '6', label: 'Yonge & Lawrence' },
];

const DEFAULT_COURSES: ConfigItem[] = [
  { id: '4000281', value: '4000281', label: 'Robotics' },
  { id: '4000282', value: '4000282', label: 'Coding' },
];

const DEFAULT_AGE_GROUPS: ConfigItem[] = [
  { id: '4001270', value: '4001270', label: '7 Years Old' },
  { id: '4001271', value: '4001271', label: '8 Years Old' },
  { id: '4001272', value: '4001272', label: '9–11 Years Old' },
  { id: '4001273', value: '4001273', label: '12–15 Years Old (Robotics)' },
  { id: '4001274', value: '4001274', label: '12–15 Years Old (Coding)' },
];

const BLANK_CLASS: Omit<ClassItem, 'id'> = {
  curriculum: '', locations: [], ageGroups: [], course: '',
  type: 'Trial', semester: '4000979', price: 0,
  date: '', time: '', availableSlots: 6, instructor: '', maxStudents: 6,
  hideWhenFull: false, department: '', modules: [],
};

function toggleItem(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

type NotifLog = {
  id: number; type: 'email' | 'sms'; event: string;
  recipient: string; subject: string | null; status: 'sent' | 'failed' | 'skipped';
  error_message: string | null; created_at: string;
};

type CustomWorkflow = {
  id: string;
  name: string;
  description: string;
  triggerType: 'manual' | 'event';
  eventKey: string;
  conditionLocation: string;
  conditionCourse: string;
  scheduledAt: string;
  scheduledSentAt: string;
  emailEnabled: boolean;
  emailRecipient: 'parent' | 'admin' | 'both';
  emailSubject: string;
  emailBody: string;
  smsEnabled: boolean;
  smsRecipient: 'parent' | 'admin';
  smsBody: string;
  active: boolean;
  createdAt: string;
};

const BLANK_CUSTOM_WF: Omit<CustomWorkflow, 'id' | 'createdAt'> = {
  name: '', description: '', triggerType: 'manual', eventKey: '',
  conditionLocation: '', conditionCourse: '',
  scheduledAt: '', scheduledSentAt: '',
  emailEnabled: true, emailRecipient: 'parent', emailSubject: '', emailBody: '',
  smsEnabled: false, smsRecipient: 'parent', smsBody: '',
  active: true,
};

const WORKFLOWS = [
  {
    key: 'user_registered',
    label: 'User Registered',
    desc: 'Parent creates an account',
    channels: [
      { ch: 'Email', to: 'Parent', msg: 'Welcome email with dashboard link' },
      { ch: 'SMS',   to: 'Parent', msg: 'Welcome SMS with login link' },
    ],
  },
  {
    key: 'enrollment_created',
    label: 'Enrollment Created',
    desc: 'Parent books a class (status: pending)',
    channels: [
      { ch: 'Email', to: 'Parent', msg: 'Booking summary — child, class, location, price' },
      { ch: 'SMS',   to: 'Parent', msg: 'Booking received — confirmation coming soon' },
      { ch: 'Email', to: 'Admin',  msg: 'New enrollment alert with full details' },
    ],
  },
  {
    key: 'enrollment_confirmed',
    label: 'Enrollment Confirmed',
    desc: 'Admin marks enrollment as confirmed',
    channels: [
      { ch: 'Email', to: 'Parent', msg: 'Confirmation with class details, what to bring' },
      { ch: 'SMS',   to: 'Parent', msg: 'Confirmed! Class details in one SMS' },
    ],
  },
  {
    key: 'enrollment_cancelled',
    label: 'Enrollment Cancelled',
    desc: 'Admin marks enrollment as cancelled',
    channels: [
      { ch: 'Email', to: 'Parent', msg: 'Cancellation notice with offer to rebook' },
      { ch: 'SMS',   to: 'Parent', msg: 'Cancellation notice with rebook prompt' },
    ],
  },
  {
    key: 'class_reminder',
    label: 'Class Reminder (24h)',
    desc: 'Scheduled daily at 09:00 — sent 24h before class',
    channels: [
      { ch: 'Email', to: 'Parent', msg: 'Tomorrow reminder — class, location, time' },
      { ch: 'SMS',   to: 'Parent', msg: 'Short reminder SMS with class time and location' },
    ],
  },
];

type CouponItem = {
  id: number; code: string; discount_type: 'percent' | 'fixed'; discount_value: string;
  min_amount: string; max_uses: number | null; used_count: number;
  expires_at: string | null; active: boolean;
};

const BLANK_COUPON = {
  code: '', discount_type: 'percent' as 'percent' | 'fixed', discount_value: '',
  min_amount: '', max_uses: '', expires_at: '', active: true,
};

type WaitlistEntry = {
  id: number; school_class_id: number; parent_name: string; parent_email: string;
  parent_phone: string | null; student_name: string; position: number;
  status: 'waiting' | 'approved' | 'rejected';
  school_class?: { curriculum: string };
};

type CertificateItem = {
  id: number; certificate_number: string; student_name: string;
  course: string | null; location: string | null; issued_at: string;
};

type EligibleStudent = {
  id: number; first_name: string; last_name: string; course: string; location: string;
  curriculum: string; attended: boolean | null;
};

type CompanyItem = {
  id: number; name: string; code: string; contact_email: string | null;
  discount_coupon_id: number | null; active: boolean;
  discount_coupon?: { code: string } | null;
};

const BLANK_COMPANY = { name: '', code: '', contact_email: '', discount_coupon_id: '' };

type InvoiceItem = {
  id: number; invoice_number: string; amount: string; method: 'invoice' | 'purchase_order';
  purchase_order_number: string | null; status: 'unpaid' | 'paid' | 'void';
  due_date: string | null; parent_name: string; parent_email: string;
};

type CampaignItem = {
  id: number; name: string; channel: 'email' | 'sms' | 'both'; subject: string | null;
  body: string; filter_location: string | null; filter_course: string | null;
  sent_count: number; sent_at: string | null;
};

const BLANK_CAMPAIGN = {
  name: '', channel: 'email' as 'email' | 'sms' | 'both', subject: '', body: '',
  filter_location: '', filter_course: '',
};

type ReportSummary = {
  total_enrollments: number; total_students: number; total_revenue: number;
  by_status: Record<string, number>; by_course: Record<string, number>; by_location: Record<string, number>;
};

// ── Storage helpers ──────────────────────────────────────────────────────────

function loadConfig(key: string, defaults: ConfigItem[]): ConfigItem[] {
  if (typeof window === 'undefined') return defaults;
  const raw = localStorage.getItem(key);
  if (!raw) return defaults;
  try { return JSON.parse(raw) as ConfigItem[]; } catch { return defaults; }
}
function saveConfig(key: string, items: ConfigItem[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

// ── SVG Icons ────────────────────────────────────────────────────────────────

type IconProps = { size?: number; className?: string };

const IcoHome    = ({ size = 17, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoUsers   = ({ size = 17, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const IcoBook    = ({ size = 17, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
const IcoSync    = ({ size = 17, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>;
const IcoGear    = ({ size = 17, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const IcoChevR   = ({ size = 14, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 18 15 12 9 6"/></svg>;
const IcoChevD   = ({ size = 14, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 12 15 18 9"/></svg>;
const IcoSearch  =({ size = 16, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoPerson  = ({ size = 17, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoBell    = ({ size = 17, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
const IcoZap     = ({ size = 17, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IcoClip    = ({ size = 17, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>;
const IcoTag     = ({ size = 17, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20.59 13.41L11 3.83A2 2 0 009.59 3.17H4a1 1 0 00-1 1v5.59a2 2 0 00.59 1.42l9.58 9.58a2 2 0 002.82 0l6.6-6.6a2 2 0 000-2.83z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>;
const IcoPlus    = ({ size = 17, className = '' }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

// ── Main component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  const [view, setView]                       = useState<View>('dashboard');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('locations');
  const [settingsOpen, setSettingsOpen]       = useState(false);
  const [dashboardCounts, setDashboardCounts] = useState<DashboardCounts | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/dashboard-counts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load dashboard counts');
        return response.json();
      })
      .then(data => setDashboardCounts(data as DashboardCounts))
      .catch(() => setDashboardCounts(null));
  }, [user]);

  // Enrollments
  const [enrollments, setEnrollments]   = useState<Enrollment[]>([]);
  const [filters, setFilters]           = useState<Filters>({ location: 'All', course: 'All', status: 'All', dateRange: 'All' });
  const [expandedRow, setExpandedRow]   = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/enrollments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const raw: Record<string, unknown>[] = Array.isArray(data) ? data : (data.data ?? []);
        const mapped: Enrollment[] = raw.map(e => {
          // Merge enrollment_students + trial_enrollment_students into one array
          const regStudents = (e.students as Record<string, unknown>[] | undefined) ?? [];
          const trialStudents = (e.trial_students as Record<string, unknown>[] | undefined) ?? [];
          const allStudents: Student[] = [
            ...regStudents.map(s => ({
              name: String(s.class_name ?? ''),
              dob: '',
              classId: String(s.class_id ?? ''),
              className: String(s.class_name ?? ''),
              course: String(s.course ?? ''),
              location: String(s.location ?? ''),
              instructor: String(s.instructor ?? ''),
              price: Number(s.price ?? 0),
              type: String(s.type ?? ''),
            })),
            ...trialStudents.map(s => ({
              name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim(),
              dob: String(s.date_of_birth ?? ''),
              classId: String(s.orbund_class_id ?? ''),
              className: String(s.orbund_class_id ?? ''),
              course: String(s.course ?? ''),
              location: String(s.location ?? ''),
              instructor: '',
              price: Number(s.price ?? 0),
              type: 'Trial',
            })),
          ];
          return {
            id: String(e.id),
            parentName:  String(e.parent_name  ?? ''),
            parentEmail: String(e.parent_email ?? ''),
            parentPhone: String(e.parent_phone ?? ''),
            totalAmount: Number(e.total_amount ?? 0),
            bookingDate: String(e.booking_date ?? e.created_at ?? ''),
            status:      String(e.status ?? 'pending'),
            confirmationRequestSentAt: String(e.confirmation_request_sent_at ?? ''),
            confirmationRespondedAt: String(e.confirmation_responded_at ?? ''),
            confirmationResponseChannel: String(e.confirmation_response_channel ?? ''),
            students:    allStudents,
          };
        });
        setEnrollments(mapped);
      })
      .catch(() => {
        const stored = localStorage.getItem('lmsedu_admin_enrollments');
        if (stored) try { setEnrollments(JSON.parse(stored) as Enrollment[]); } catch { /* ignore */ }
      });
  }, [user]);

  const filteredEnrollments = useMemo(() => enrollments.filter(e => {
    if (filters.location !== 'All' && !e.students.some(s => s.location === filters.location)) return false;
    if (filters.course   !== 'All' && !e.students.some(s => s.course   === filters.course))   return false;
    if (filters.status   !== 'All' && e.status !== filters.status) return false;
    if (filters.dateRange !== 'All') {
      const d    = new Date(e.bookingDate);
      const now  = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
      if (filters.dateRange === 'Today'        && diff !== 0) return false;
      if (filters.dateRange === 'Last 7 days'  && diff >  7) return false;
      if (filters.dateRange === 'Last 30 days' && diff > 30) return false;
      if (filters.dateRange === 'This month'   &&
        (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
    }
    return true;
  }), [enrollments, filters]);

  const trialEnrollments = enrollments.filter(e => e.students.some(s => s.type === 'Trial'));
  const visibleEnrollmentCount = view === 'trial_enrollments' ? trialEnrollments.length : enrollments.length;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [callTimes, setCallTimes] = useState<Record<number, string>>({});
  const [scheduledCallTimes, setScheduledCallTimes] = useState<Record<number, string>>({});
  useEffect(() => {
    if (view !== 'leads' || !user || user.role !== 'admin') return;
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    setLeadsLoading(true);
    fetch(`${API_URL}/admin/leads?per_page=100`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => setLeads(Array.isArray(data) ? data : (data.data ?? [])))
      .catch(() => setLeads([])).finally(() => setLeadsLoading(false));
  }, [view, user]);

  const updateLeadRegistration = async (leadId: number, isRegistered: boolean) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const response = await fetch(`${API_URL}/admin/leads/${leadId}/registration`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_registered: isRegistered }),
    });
    if (!response.ok) return;
    const data = await response.json();
    setLeads(current => current.map(lead => lead.id === leadId ? data.lead : lead));
  };

  const addReminderCall = async (leadId: number) => {
    const token = localStorage.getItem('auth_token');
    const calledAt = callTimes[leadId];
    if (!token || !calledAt) return;
    const response = await fetch(`${API_URL}/admin/leads/${leadId}/calls`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ called_at: new Date(calledAt).toISOString() }),
    });
    if (!response.ok) return;
    const data = await response.json();
    setLeads(current => current.map(lead => lead.id === leadId ? data.lead : lead));
    setCallTimes(current => ({ ...current, [leadId]: '' }));
  };

  const saveScheduledCall = async (leadId: number) => {
    const token = localStorage.getItem('auth_token');
    const scheduledAt = scheduledCallTimes[leadId];
    if (!token || !scheduledAt) return;
    const response = await fetch(`${API_URL}/admin/leads/${leadId}/call-schedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ scheduled_call_time: new Date(scheduledAt).toISOString() }),
    });
    if (!response.ok) return;
    const data = await response.json();
    setLeads(current => current.map(lead => lead.id === leadId ? data.lead : lead));
    setScheduledCallTimes(current => ({ ...current, [leadId]: '' }));
  };

  // Users
  const [appUsers,     setAppUsers]     = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch,   setUserSearch]   = useState('');

  useEffect(() => {
    if ((view !== 'parents' && view !== 'users') || !user || user.role !== 'admin') return;
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    setUsersLoading(true);
    const endpoint = view === 'parents' ? 'parents' : 'users';
    fetch(`${API_URL}/admin/${endpoint}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setAppUsers(Array.isArray(data) ? data : []))
      .catch(() => setAppUsers([]))
      .finally(() => setUsersLoading(false));
  }, [view, user]);

  const filteredUsers = appUsers.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone ?? '').includes(q);
  });

  // Notification logs
  const [notifLogs,        setNotifLogs]        = useState<NotifLog[]>([]);
  const [notifLoading,     setNotifLoading]      = useState(false);
  const [notifFilter,      setNotifFilter]       = useState({ type: 'All', event: 'All', status: 'All' });

  const fetchNotifLogs = () => {
    if (!user || user.role !== 'admin') return;
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    setNotifLoading(true);
    const params = new URLSearchParams();
    if (notifFilter.type   !== 'All') params.set('type',   notifFilter.type);
    if (notifFilter.event  !== 'All') params.set('event',  notifFilter.event);
    if (notifFilter.status !== 'All') params.set('status', notifFilter.status);
    fetch(`${API_URL}/admin/notification-logs?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setNotifLogs(Array.isArray(data) ? data : []))
      .catch(() => setNotifLogs([]))
      .finally(() => setNotifLoading(false));
  };

  useEffect(() => {
    if (view === 'notifications') fetchNotifLogs();
  }, [view, user]);

  // Workflow toggles (stored in localStorage)
  const [wfEnabled, setWfEnabled] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('exceed_wf_enabled') ?? '{}'); } catch { return {}; }
  });
  const toggleWf = (key: string) => {
    setWfEnabled(prev => {
      const next = { ...prev, [key]: !(prev[key] ?? true) };
      localStorage.setItem('exceed_wf_enabled', JSON.stringify(next));
      return next;
    });
  };
  const isWfOn = (key: string) => wfEnabled[key] !== false;

  // Custom workflows — saved to DB
  const [customWfs,       setCustomWfs]       = useState<CustomWorkflow[]>([]);
  const [customWfModal,   setCustomWfModal]   = useState(false);
  const [customWfForm,    setCustomWfForm]    = useState<Omit<CustomWorkflow, 'id' | 'createdAt'>>(BLANK_CUSTOM_WF);
  const [customWfError,   setCustomWfError]   = useState('');
  const [, setCustomWfSaving]  = useState(false);
  const [firingWfId,      setFiringWfId]      = useState<string | null>(null);
  const [fireResult,      setFireResult]      = useState<{ id: string; msg: string } | null>(null);

  // Workflow events — fetched from DB, editable by admin
  type WfEvent = { id: number; key: string; label: string; description: string };
  const [wfEvents,        setWfEvents]        = useState<WfEvent[]>([]);
  const [wfEventModal,    setWfEventModal]    = useState(false);
  const [wfEventForm,     setWfEventForm]     = useState({ key: '', label: '', description: '' });
  const [wfEventError,    setWfEventError]    = useState('');

  const fetchWfEvents = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/workflow-events`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setWfEvents(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const saveWfEvent = async () => {
    if (!wfEventForm.label.trim()) { setWfEventError('Label is required.'); return; }
    if (!wfEventForm.key.trim()) { setWfEventError('Event key is required.'); return; }
    if (!/^[a-z0-9_]+$/.test(wfEventForm.key)) { setWfEventError('Key must be lowercase letters, numbers and underscores only.'); return; }
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_URL}/admin/workflow-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(wfEventForm),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Save failed'); }
      setWfEventModal(false);
      setWfEventForm({ key: '', label: '', description: '' });
      setWfEventError('');
      fetchWfEvents();
    } catch (e: unknown) { setWfEventError(e instanceof Error ? e.message : 'Failed to save.'); }
  };

  const deleteWfEvent = async (id: number) => {
    const token = localStorage.getItem('auth_token');
    await fetch(`${API_URL}/admin/workflow-events/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchWfEvents();
  };

  const fetchCustomWfs = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/workflows`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setCustomWfs(Array.isArray(data) ? data.map((w: Record<string, unknown>) => ({
        id: String(w.id), name: String(w.name), description: String(w.description ?? ''),
        triggerType: (w.trigger_type as 'manual' | 'event') ?? 'manual',
        eventKey: String(w.event_key ?? ''),
        conditionLocation: String(w.condition_location ?? ''),
        conditionCourse: String(w.condition_course ?? ''),
        scheduledAt: String(w.scheduled_at ?? ''),
        scheduledSentAt: String(w.scheduled_sent_at ?? ''),
        emailEnabled: Boolean(w.email_enabled), emailRecipient: (w.email_recipient as 'parent' | 'admin' | 'both') ?? 'parent',
        emailSubject: String(w.email_subject ?? ''), emailBody: String(w.email_body ?? ''),
        smsEnabled: Boolean(w.sms_enabled), smsRecipient: (w.sms_recipient as 'parent' | 'admin') ?? 'parent',
        smsBody: String(w.sms_body ?? ''),
        active: Boolean(w.active),
        createdAt: String(w.created_at ?? ''),
      })) : []))
      .catch(() => {});
  };

  useEffect(() => { if (view === 'workflows') { fetchCustomWfs(); fetchWfEvents(); } }, [view, user]);

  const saveCustomWf = async () => {
    if (!customWfForm.name.trim()) { setCustomWfError('Workflow name is required.'); return; }
    if (!customWfForm.emailEnabled && !customWfForm.smsEnabled) { setCustomWfError('Enable at least one channel.'); return; }
    if (customWfForm.emailEnabled && !customWfForm.emailSubject.trim()) { setCustomWfError('Email subject is required.'); return; }
    if (customWfForm.smsEnabled && !customWfForm.smsBody.trim()) { setCustomWfError('SMS message is required.'); return; }
    setCustomWfSaving(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_URL}/admin/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: customWfForm.name, description: customWfForm.description,
          trigger_type: customWfForm.triggerType, event_key: customWfForm.eventKey,
          condition_location: customWfForm.conditionLocation || null,
          condition_course: customWfForm.conditionCourse || null,
          scheduled_at: customWfForm.scheduledAt || null,
          email_enabled: customWfForm.emailEnabled, email_recipient: customWfForm.emailRecipient,
          email_subject: customWfForm.emailSubject, email_body: customWfForm.emailBody,
          sms_enabled: customWfForm.smsEnabled, sms_recipient: customWfForm.smsRecipient,
          sms_body: customWfForm.smsBody, active: true,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setCustomWfModal(false);
      setCustomWfForm(BLANK_CUSTOM_WF);
      setCustomWfError('');
      fetchCustomWfs();
    } catch { setCustomWfError('Failed to save. Please try again.'); }
    finally { setCustomWfSaving(false); }
  };

  const deleteCustomWf = async (id: string) => {
    const token = localStorage.getItem('auth_token');
    await fetch(`${API_URL}/admin/workflows/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setCustomWfs(prev => prev.filter(w => w.id !== id));
  };

  const toggleCustomWfActive = async (id: string, active: boolean) => {
    const token = localStorage.getItem('auth_token');
    await fetch(`${API_URL}/admin/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active }),
    }).catch(() => {});
    setCustomWfs(prev => prev.map(w => w.id === id ? { ...w, createdAt: w.createdAt } : w));
    fetchCustomWfs();
  };

  const fireWorkflow = async (id: string) => {
    setFiringWfId(id); setFireResult(null);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_URL}/admin/workflows/${id}/fire`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFireResult({ id, msg: data.message ?? 'Done' });
    } catch { setFireResult({ id, msg: 'Failed to fire workflow' }); }
    finally { setFiringWfId(null); }
  };

  // Attendance tracking
  type AttendanceStudent = {
    id: number; first_name: string; last_name: string;
    course: string; location: string; curriculum: string;
    class_date: string; class_time: string;
    attended: boolean | null;
    enrollment_id: number; parent_name: string; parent_email: string; parent_phone: string;
  };
  const formatAttendanceDate = (value: string) => {
    if (!value) return '—';
    const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const [attendanceDate,       setAttendanceDate]       = useState('');
  const [attendanceCurriculum, setAttendanceCurriculum] = useState('');
  const [attendanceCurricula,  setAttendanceCurricula]  = useState<string[]>([]);
  const [attendanceStudents,   setAttendanceStudents]   = useState<AttendanceStudent[]>([]);
  const [attendanceLoading,    setAttendanceLoading]    = useState(false);
  const [emailNoShowModal,     setEmailNoShowModal]     = useState(false);
  const [noShowForm,           setNoShowForm]           = useState({ subject: '', body: '', sendSms: false, smsBody: '' });
  const [noShowSending,        setNoShowSending]        = useState(false);
  const [noShowResult,         setNoShowResult]         = useState('');

  const fetchCurricula = (date = attendanceDate) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    fetch(`${API_URL}/admin/attendance/curricula?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const list: string[] = Array.isArray(data) ? data : [];
        setAttendanceCurricula(list);
        // Reset curriculum selection if the current value is no longer in the list
        setAttendanceCurriculum(prev => list.includes(prev) ? prev : '');
      })
      .catch(() => {});
  };

  const fetchAttendance = (date = attendanceDate, curriculum = attendanceCurriculum) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    setAttendanceLoading(true);
    const params = new URLSearchParams();
    if (date)       params.set('date',       date);
    if (curriculum) params.set('curriculum', curriculum);
    fetch(`${API_URL}/admin/attendance?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setAttendanceStudents(Array.isArray(data) ? data : []))
      .catch(() => setAttendanceStudents([]))
      .finally(() => setAttendanceLoading(false));
  };

  // Re-fetch curricula when date changes; re-fetch students when either filter changes
  useEffect(() => {
    if (view === 'attendance' && user?.role === 'admin') fetchCurricula(attendanceDate);
  }, [view, attendanceDate, user]);

  useEffect(() => {
    if (view === 'attendance' && user?.role === 'admin') fetchAttendance(attendanceDate, attendanceCurriculum);
  }, [view, attendanceDate, attendanceCurriculum, user]);

  const markAttendance = async (id: number, attended: boolean | null) => {
    const token = localStorage.getItem('auth_token');
    setAttendanceStudents(prev => prev.map(s => s.id === id ? { ...s, attended } : s));
    await fetch(`${API_URL}/admin/attendance/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ attended }),
    }).catch(() => {});
  };

  const sendNoShowEmails = async () => {
    if (!noShowForm.subject.trim() || !noShowForm.body.trim()) return;
    setNoShowSending(true); setNoShowResult('');
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_URL}/admin/attendance/email-no-shows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          date:          attendanceDate     || null,
          curriculum:    attendanceCurriculum || null,
          email_subject: noShowForm.subject,
          email_body:    noShowForm.body,
          send_sms:      noShowForm.sendSms,
          sms_body:      noShowForm.smsBody || null,
        }),
      });
      const data = await res.json();
      setNoShowResult(data.message ?? 'Done');
    } catch { setNoShowResult('Failed to send. Please try again.'); }
    finally { setNoShowSending(false); }
  };

  const noShowCount = attendanceStudents.filter(s => s.attended === false).length;

  // ── Continuing Education: Coupons, Waitlist, Certificates ──────────────────
  const [coupons,        setCoupons]        = useState<CouponItem[]>([]);
  const [couponForm,     setCouponForm]     = useState(BLANK_COUPON);
  const [couponModalOpen,setCouponModalOpen]= useState(false);
  const [couponSaving,   setCouponSaving]   = useState(false);
  const [couponError,    setCouponError]    = useState('');

  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const [certificates,      setCertificates]      = useState<CertificateItem[]>([]);
  const [eligibleStudents,  setEligibleStudents]  = useState<EligibleStudent[]>([]);
  const [issuingCertFor,    setIssuingCertFor]    = useState<number | null>(null);

  const fetchCoupons = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/coupons`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setCoupons(Array.isArray(data) ? data : []))
      .catch(() => setCoupons([]));
  };

  const fetchWaitlist = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    setWaitlistLoading(true);
    fetch(`${API_URL}/admin/class-waitlist`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setWaitlistEntries(Array.isArray(data) ? data : []))
      .catch(() => setWaitlistEntries([]))
      .finally(() => setWaitlistLoading(false));
  };

  const fetchCertificates = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/certificates`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setCertificates(Array.isArray(data) ? data : []))
      .catch(() => setCertificates([]));
  };

  const fetchEligibleStudents = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/attendance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setEligibleStudents(Array.isArray(data) ? data.filter((s: EligibleStudent) => s.attended === true) : []))
      .catch(() => setEligibleStudents([]));
  };

  useEffect(() => {
    if (view === 'continuing_ed' && user?.role === 'admin') {
      fetchCoupons(); fetchWaitlist(); fetchCertificates(); fetchEligibleStudents();
    }
  }, [view, user]);

  const submitCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code.trim())       { setCouponError('Code is required.'); return; }
    if (!couponForm.discount_value)    { setCouponError('Discount value is required.'); return; }
    setCouponSaving(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_URL}/admin/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code:            couponForm.code,
          discount_type:   couponForm.discount_type,
          discount_value:  Number(couponForm.discount_value),
          min_amount:      couponForm.min_amount ? Number(couponForm.min_amount) : 0,
          max_uses:        couponForm.max_uses ? Number(couponForm.max_uses) : null,
          expires_at:      couponForm.expires_at || null,
          active:          couponForm.active,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message ?? 'Save failed'); }
      setCouponModalOpen(false); setCouponForm(BLANK_COUPON); setCouponError('');
      fetchCoupons();
    } catch (err) { setCouponError(err instanceof Error ? err.message : 'Failed to save coupon.'); }
    finally { setCouponSaving(false); }
  };

  const deleteCoupon = async (id: number) => {
    const token = localStorage.getItem('auth_token');
    await fetch(`${API_URL}/admin/coupons/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  const approveWaitlistEntry = async (id: number) => {
    const token = localStorage.getItem('auth_token');
    await fetch(`${API_URL}/admin/class-waitlist/${id}/approve`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    fetchWaitlist();
  };

  const rejectWaitlistEntry = async (id: number) => {
    const token = localStorage.getItem('auth_token');
    await fetch(`${API_URL}/admin/class-waitlist/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: 'Rejected by admin' }),
    }).catch(() => {});
    fetchWaitlist();
  };

  const issueCertificate = async (studentId: number) => {
    setIssuingCertFor(studentId);
    const token = localStorage.getItem('auth_token');
    try {
      await fetch(`${API_URL}/admin/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ trial_enrollment_student_id: studentId }),
      });
      fetchCertificates();
    } catch { /* non-fatal */ }
    finally { setIssuingCertFor(null); }
  };

  // ── Corporate portal, Invoices, Campaigns, Reports ──────────────────────────
  const [companies,       setCompanies]       = useState<CompanyItem[]>([]);
  const [companyForm,     setCompanyForm]     = useState(BLANK_COMPANY);
  const [companyModalOpen,setCompanyModalOpen]= useState(false);
  const [companySaving,   setCompanySaving]   = useState(false);
  const [companyError,    setCompanyError]    = useState('');

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [markingPaidFor, setMarkingPaidFor] = useState<number | null>(null);

  const [campaigns,        setCampaigns]        = useState<CampaignItem[]>([]);
  const [campaignForm,     setCampaignForm]     = useState(BLANK_CAMPAIGN);
  const [campaignModalOpen,setCampaignModalOpen]= useState(false);
  const [campaignSending,  setCampaignSending]  = useState(false);
  const [campaignResult,   setCampaignResult]   = useState('');

  const [reportFilters, setReportFilters] = useState({ course: '', location: '', status: '' });
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);

  const fetchCompanies = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/companies`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]));
  };

  const fetchInvoices = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/invoices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setInvoices(Array.isArray(data) ? data : []))
      .catch(() => setInvoices([]));
  };

  const fetchCampaigns = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/campaigns`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setCampaigns([]));
  };

  const fetchReportSummary = (filters = reportFilters) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const params = new URLSearchParams();
    if (filters.course)   params.set('course',   filters.course);
    if (filters.location) params.set('location', filters.location);
    if (filters.status)   params.set('status',   filters.status);
    fetch(`${API_URL}/admin/reports?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => setReportSummary(data && typeof data.total_enrollments === 'number' ? data : null))
      .catch(() => setReportSummary(null));
  };

  useEffect(() => {
    if (view === 'continuing_ed' && user?.role === 'admin') {
      fetchCompanies(); fetchInvoices(); fetchCampaigns(); fetchReportSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, user]);

  const submitCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name.trim()) { setCompanyError('Name is required.'); return; }
    if (!companyForm.code.trim()) { setCompanyError('Code is required.'); return; }
    setCompanySaving(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_URL}/admin/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name:               companyForm.name,
          code:               companyForm.code,
          contact_email:      companyForm.contact_email || null,
          discount_coupon_id: companyForm.discount_coupon_id ? Number(companyForm.discount_coupon_id) : null,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message ?? 'Save failed'); }
      setCompanyModalOpen(false); setCompanyForm(BLANK_COMPANY); setCompanyError('');
      fetchCompanies();
    } catch (err) { setCompanyError(err instanceof Error ? err.message : 'Failed to save company.'); }
    finally { setCompanySaving(false); }
  };

  const deleteCompany = async (id: number) => {
    const token = localStorage.getItem('auth_token');
    await fetch(`${API_URL}/admin/companies/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  const markInvoicePaid = async (id: number) => {
    setMarkingPaidFor(id);
    const token = localStorage.getItem('auth_token');
    try {
      await fetch(`${API_URL}/admin/invoices/${id}/mark-paid`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      fetchInvoices();
    } catch { /* non-fatal */ }
    finally { setMarkingPaidFor(null); }
  };

  const submitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.name.trim()) return;
    if (!campaignForm.body.trim()) return;
    setCampaignSending(true); setCampaignResult('');
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_URL}/admin/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name:            campaignForm.name,
          channel:         campaignForm.channel,
          subject:         campaignForm.subject || null,
          body:            campaignForm.body,
          filter_location: campaignForm.filter_location || null,
          filter_course:   campaignForm.filter_course || null,
        }),
      });
      const d = await res.json();
      setCampaignResult(d.message ?? 'Sent');
      setCampaignModalOpen(false); setCampaignForm(BLANK_CAMPAIGN);
      fetchCampaigns();
    } catch { setCampaignResult('Failed to send campaign.'); }
    finally { setCampaignSending(false); }
  };

  // Configs — locations + ageGroups from DB; courses from localStorage
  const [locations,  setLocations]  = useState<ConfigItem[]>([]);
  const [courses,    setCourses]    = useState<ConfigItem[]>([]);
  const [ageGroups,  setAgeGroups]  = useState<ConfigItem[]>([]);

  const fetchLocations = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/trial-config/locations`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setLocations(Array.isArray(data) ? data.map((l: Record<string, unknown>) => ({
        id: String(l.id), label: String(l.name ?? ''), value: String(l.orbund_campus_type ?? ''),
      })) : DEFAULT_LOCATIONS))
      .catch(() => setLocations(DEFAULT_LOCATIONS));
  };

  const fetchAgeGroups = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/trial-config/age-groups`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setAgeGroups(Array.isArray(data) ? data.map((a: Record<string, unknown>) => ({
        id: String(a.id), label: String(a.name ?? ''), value: String(a.orbund_program_id ?? ''),
      })) : DEFAULT_AGE_GROUPS))
      .catch(() => setAgeGroups(DEFAULT_AGE_GROUPS));
  };

  useEffect(() => {
    setCourses(loadConfig(KEYS.courses, DEFAULT_COURSES));
    if (user?.role === 'admin') { fetchLocations(); fetchAgeGroups(); }
  }, [user]);

  const removeConfigItem = async (section: SettingsSection, id: string) => {
    if (section === 'courses') {
      const next = courses.filter(i => i.id !== id);
      setCourses(next); saveConfig(KEYS.courses, next);
      return;
    }
    const token = localStorage.getItem('auth_token');
    if (section === 'locations') {
      setLocations(prev => prev.filter(i => i.id !== id));
      await fetch(`${API_URL}/admin/trial-config/locations/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      }).catch(fetchLocations);
    } else if (section === 'ageGroups') {
      setAgeGroups(prev => prev.filter(i => i.id !== id));
      await fetch(`${API_URL}/admin/trial-config/age-groups/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      }).catch(fetchAgeGroups);
    }
  };

  // Config popup modal — extended for age groups (course + level_id)
  const [configModal, setConfigModal] = useState<{
    section: SettingsSection; title: string; lph: string; vph: string;
    showCourse?: boolean; lph2?: string; vph2?: string;
  } | null>(null);
  const [configForm, setConfigForm] = useState({ label: '', value: '', value2: '', course: 'Robotics' });
  const [configSaving, setConfigSaving] = useState(false);

  const openConfigModal = (section: SettingsSection, title: string, lph: string, vph: string, opts?: { showCourse?: boolean; lph2?: string; vph2?: string }) => {
    setConfigForm({ label: '', value: '', value2: '', course: 'Robotics' });
    setConfigModal({ section, title, lph, vph, ...opts });
  };

  const handleAddConfig = async () => {
    if (!configModal || !configForm.label.trim() || !configForm.value.trim()) return;
    const { section } = configModal;
    setConfigSaving(true);
    const token = localStorage.getItem('auth_token');
    try {
      if (section === 'courses') {
        const next = [...courses, { id: Date.now().toString(), value: configForm.value.trim(), label: configForm.label.trim() }];
        setCourses(next); saveConfig(KEYS.courses, next);
      } else if (section === 'locations') {
        await fetch(`${API_URL}/admin/trial-config/locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: configForm.label.trim(), orbund_campus_type: configForm.value.trim() }),
        });
        fetchLocations();
      } else if (section === 'ageGroups') {
        await fetch(`${API_URL}/admin/trial-config/age-groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name:              configForm.label.trim(),
            course:            configForm.course,
            orbund_program_id: configForm.value.trim(),
            orbund_level_id:   configForm.value2.trim(),
          }),
        });
        fetchAgeGroups();
      }
      setConfigModal(null);
      setConfigForm({ label: '', value: '', value2: '', course: 'Robotics' });
    } catch { /* keep modal open */ }
    finally { setConfigSaving(false); }
  };

  // Classes
  const [classes,        setClasses]        = useState<ClassItem[]>([]);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classForm,      setClassForm]      = useState<Omit<ClassItem, 'id'>>(BLANK_CLASS);
  const [classError,     setClassError]     = useState('');
  const [classSaving,    setClassSaving]    = useState(false);

  const fetchClasses = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${API_URL}/admin/classes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setClasses(Array.isArray(data) ? data.map((c: Record<string, unknown>) => ({
        id:             String(c.id),
        curriculum:     String(c.curriculum ?? ''),
        locations:      Array.isArray(c.locations) ? c.locations as string[] : [],
        ageGroups:      Array.isArray(c.age_groups) ? c.age_groups as string[] : [],
        course:         String(c.course ?? ''),
        type:           (c.type as 'Trial' | 'Paid') ?? 'Trial',
        semester:       String(c.semester ?? '4000979'),
        price:          Number(c.price ?? 0),
        date:           String(c.date ?? ''),
        time:           String(c.time ?? ''),
        availableSlots: Number(c.available_slots ?? 6),
        instructor:     String(c.instructor ?? ''),
        maxStudents:    Number(c.max_students ?? 6),
        hideWhenFull:   Boolean(c.hide_when_full ?? false),
        department:     String(c.department ?? ''),
        modules:        Array.isArray(c.modules) ? c.modules as CourseModule[] : [],
      })) : []))
      .catch(() => {});
  };

  useEffect(() => { if (user?.role === 'admin') fetchClasses(); }, [user]);

  const submitClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.curriculum.trim())      { setClassError('Curriculum name is required.');   return; }
    if (classForm.locations.length === 0)  { setClassError('Select at least one location.'); return; }
    if (!classForm.course)                 { setClassError('Select a course.');               return; }
    if (classForm.ageGroups.length === 0)  { setClassError('Select at least one age group.'); return; }
    if (!classForm.instructor.trim())      { setClassError('Instructor is required.');        return; }
    setClassSaving(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_URL}/admin/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          curriculum:      classForm.curriculum,
          locations:       classForm.locations,
          age_groups:      classForm.ageGroups,
          course:          classForm.course,
          type:            classForm.type,
          semester:        classForm.semester,
          price:           classForm.price,
          date:            classForm.date || null,
          time:            classForm.time || null,
          available_slots: classForm.availableSlots,
          instructor:      classForm.instructor,
          max_students:    classForm.maxStudents,
          hide_when_full:  classForm.hideWhenFull,
          department:      classForm.department || null,
          modules:         classForm.modules.filter(m => m.title.trim()),
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setClassModalOpen(false); setClassForm(BLANK_CLASS); setClassError('');
      fetchClasses();
    } catch { setClassError('Failed to save class. Please try again.'); }
    finally { setClassSaving(false); }
  };

  const deleteClass = async (id: string) => {
    const token = localStorage.getItem('auth_token');
    setClasses(prev => prev.filter(c => c.id !== id));
    await fetch(`${API_URL}/admin/classes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  const [confirmClear,  setConfirmClear]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const syncToStorage = (next: Enrollment[]) => {
    localStorage.setItem('lmsedu_admin_enrollments', JSON.stringify(next));
  };

  const clearAllEnrollments = () => {
    localStorage.removeItem('lmsedu_admin_enrollments');
    localStorage.removeItem('lmsedu_cart');
    setEnrollments([]);
    setConfirmClear(false);
    setFilters({ location: 'All', course: 'All', status: 'All', dateRange: 'All' });
  };

  const deleteEnrollment = async (id: string) => {
    const token = localStorage.getItem('auth_token');
    try {
      const response = await fetch(`${API_URL}/admin/enrollments/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Unable to update enrollment status');
    } catch { /* ignore — update local state regardless */ }
    const next = enrollments.filter(e => e.id !== id);
    setEnrollments(next);
    syncToStorage(next);
    setConfirmDelete(null);
  };

  const updateStatus = async (id: string, status: string) => {
    const token = localStorage.getItem('auth_token');
    try {
      await fetch(`${API_URL}/enrollments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status }),
      });
    } catch { /* ignore */ }
    const next = enrollments.map(e => e.id === id ? { ...e, status } : e);
    setEnrollments(next);
    syncToStorage(next);
  };


  const navTo = (v: View) => setView(v);
  const goSettings = (s: SettingsSection) => { setView('settings'); setSettingsSection(s); setSettingsOpen(true); };
  const recentEnrollments = enrollments.slice(0, 4);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f2f5' }}>
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAuthenticated || user?.role !== 'admin') return null;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f2f5' }}>

      {/* ══════════════════ SIDEBAR ══════════════════ */}
      <aside className="w-56 flex-shrink-0 flex flex-col select-none" style={{ background: '#1e3f8b' }}>

        {/* Logo */}
        <div className="px-5 h-14 flex items-center gap-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold" style={{ color: '#1e3f8b' }}>ER</span>
          </div>
          <span className="text-white font-semibold text-sm">Exceed Robotics</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <SidebarBtn icon={<IcoHome />}  label="Home"        active={view === 'dashboard'}   onClick={() => navTo('dashboard')} />
          <SidebarBtn icon={<IcoClip />} label="Leads" active={view === 'leads'} onClick={() => navTo('leads')}
            badge={dashboardCounts ? String(dashboardCounts.leads) : '…'} />
          <SidebarBtn icon={<IcoUsers />} label="Trial Enrollments" active={view === 'trial_enrollments'} onClick={() => navTo('trial_enrollments')}
            badge={dashboardCounts ? String(dashboardCounts.trial_enrollments) : '…'} />
          <SidebarBtn icon={<IcoPerson />} label="Parents" active={view === 'parents'} onClick={() => navTo('parents')}
            badge={dashboardCounts ? String(dashboardCounts.parents) : '…'} />
          <SidebarBtn icon={<IcoUsers />} label="Users" active={view === 'users'} onClick={() => navTo('users')} badge={dashboardCounts ? String(dashboardCounts.users) : '…'} />
          <SidebarBtn icon={<IcoBook />}  label="Classes"     active={view === 'classes'}     onClick={() => navTo('classes')}
            badge={dashboardCounts ? String(dashboardCounts.classes) : '…'} />
          <SidebarBtn icon={<IcoBell />}  label="Notifications" active={view === 'notifications'} onClick={() => navTo('notifications')}
            badge={dashboardCounts ? String(dashboardCounts.notification_logs) : '…'} />
          <SidebarBtn icon={<IcoZap />}   label="Workflows"   active={view === 'workflows'}   onClick={() => navTo('workflows')}
            badge={dashboardCounts ? String(WORKFLOWS.length + dashboardCounts.workflows) : '…'} />
          <SidebarBtn icon={<IcoClip />}  label="Attendance"  active={view === 'attendance'}  onClick={() => navTo('attendance')} />
          <SidebarBtn icon={<IcoTag />}   label="Continuing Ed" active={view === 'continuing_ed'} onClick={() => navTo('continuing_ed')} />

          <div className="my-2 mx-1" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} />

          <SidebarBtn
            icon={<IcoGear />}
            label="Account & Settings"
            active={view === 'settings'}
            hasArrow
            arrowOpen={view === 'settings' || settingsOpen}
            onClick={() => {
              if (view === 'settings') { setSettingsOpen(o => !o); }
              else { navTo('settings'); setSettingsOpen(true); }
            }}
          />
          {(view === 'settings' || settingsOpen) && (
            <div className="ml-3 pl-3 space-y-0.5 border-l" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              {([
                { key: 'locations' as SettingsSection, label: 'Locations'  },
                { key: 'courses'   as SettingsSection, label: 'Courses'    },
                { key: 'ageGroups' as SettingsSection, label: 'Age Groups' },
                { key: 'types'     as SettingsSection, label: 'Types'      },
              ]).map(s => {
                const isActive = view === 'settings' && settingsSection === s.key;
                return (
                  <button key={s.key} onClick={() => goSettings(s.key)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs transition-colors"
                    style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.55)', background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent' }}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t flex items-center gap-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            {(user?.name ?? 'A').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name ?? 'Admin'}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Administrator</p>
          </div>
        </div>
      </aside>

      {/* ══════════════════ MAIN ══════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6 pt-0">

          {/* ══════ DASHBOARD ══════ */}
          {view === 'dashboard' && (
            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-700 p-8 text-white shadow-[0_25px_80px_-35px_rgba(15,23,42,0.75)]">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">Operations Center</p>
                    <h2 className="mt-2 text-3xl font-semibold">Keep every class, parent, and enrollment moving smoothly.</h2>
                    <p className="mt-3 text-sm text-blue-100/90">Monitor booking activity, manage outreach, and stay ahead of class demand from a single professional workspace.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Trial Enrollments', value: dashboardCounts ? dashboardCounts.trial_enrollments : '…', color: 'text-blue-600', bg: 'bg-blue-50', icon: '✦' },
                  { label: 'Users', value: dashboardCounts ? dashboardCounts.users : '…', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: '◎' },
                  { label: 'Classes', value: dashboardCounts ? dashboardCounts.classes : '…', color: 'text-orange-600', bg: 'bg-orange-50', icon: '⬢' },
                  { label: 'Revenue', value: dashboardCounts ? `$${Number(dashboardCounts.revenue).toLocaleString()}` : '…', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '↗' },
                ].map(s => (
                  <div key={s.label} className={`rounded-3xl border border-slate-200/80 ${s.bg} p-6 shadow-sm`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-3xl font-semibold ${s.color}`}>{s.value}</p>
                        <p className="mt-2 text-sm font-medium text-slate-600">{s.label}</p>
                      </div>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl text-lg ${s.color} bg-white/70`}>
                        {s.icon}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="dashboard-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Latest enrollments</h3>
                      <p className="dashboard-subtle mt-1">A real-time snapshot of recent parent activity</p>
                    </div>
                    <button onClick={() => navTo('trial_enrollments')} className="text-sm font-medium text-blue-600 hover:text-blue-700">Manage all</button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {recentEnrollments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        No enrollments yet. They will appear here as soon as parents book classes.
                      </div>
                    ) : recentEnrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-800">{enrollment.parentName}</p>
                          <p className="text-sm text-slate-500">{enrollment.students.length} student{enrollment.students.length !== 1 ? 's' : ''} • {enrollment.bookingDate}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                          {enrollment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="dashboard-card p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Quick actions</h3>
                    <div className="mt-4 space-y-2">
                      <button onClick={() => navTo('trial_enrollments')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700">
                        <span>Review enrollments</span>
                        <span>→</span>
                      </button>
                      <button onClick={() => navTo('notifications')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700">
                        <span>Manage notifications</span>
                        <span>→</span>
                      </button>
                      <button onClick={() => navTo('classes')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700">
                        <span>Open class list</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-card p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Performance snapshot</h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-slate-600">Enrollment coverage</span>
                          <span className="font-semibold text-slate-900">82%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 w-[82%] rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-slate-600">Pending follow-up</span>
                          <span className="font-semibold text-slate-900">{dashboardCounts ? dashboardCounts.pending_enrollments : '…'}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 w-[68%] rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════ ENROLLMENTS ══════ */}
          {view === 'trial_enrollments' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Trial Enrollments</h1>
                  <p className="text-xs text-gray-400 mt-0.5">{visibleEnrollmentCount} total record{visibleEnrollmentCount !== 1 ? 's' : ''}</p>
                </div>
                {enrollments.length > 0 && !confirmClear && (
                  <button onClick={() => setConfirmClear(true)}
                    className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 rounded-lg px-3 py-1.5 transition-colors">
                    Clear All Data
                  </button>
                )}
                {confirmClear && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                    <p className="text-sm text-red-700">Delete all {enrollments.length} records?</p>
                    <button onClick={clearAllEnrollments}
                      className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg px-3 py-1.5 transition-colors">
                      Yes, clear
                    </button>
                    <button onClick={() => setConfirmClear(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Search row */}
              {enrollments.length > 0 && (
                <div className="flex flex-wrap items-end gap-3">
                  {([
                    { label: 'Status',     field: 'status'    as const, options: ['All', 'confirmed', 'pending', 'cancelled'] },
                    { label: 'Date Range', field: 'dateRange' as const, options: ['All', 'Today', 'Last 7 days', 'Last 30 days', 'This month'] },
                  ] as const).map(f => (
                    <div key={f.field}>
                      <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                      <select className="input-field py-1.5 text-sm min-w-[130px]"
                        value={filters[f.field]}
                        onChange={e => setFilters(p => ({ ...p, [f.field]: e.target.value }))}>
                        {f.options.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                  <button className="btn-secondary py-1.5 text-sm"
                    onClick={() => setFilters({ location: 'All', course: 'All', status: 'All', dateRange: 'All' })}>
                    Reset
                  </button>
                  <p className="text-xs text-gray-400 ml-auto self-end">{filteredEnrollments.length} of {enrollments.length} shown</p>
                </div>
              )}

              {visibleEnrollmentCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <IcoUsers size={28} className="text-gray-300" />
                  </div>
                  <p className="text-base font-semibold text-gray-400">No enrollments yet</p>
                  <p className="text-sm text-gray-300 mt-1">Enrollments will appear here once students sign up.</p>
                </div>
              ) : filteredEnrollments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl bg-gray-50">
                  <p className="text-sm font-medium text-gray-400">No results match the current filters</p>
                  <button onClick={() => setFilters({ location: 'All', course: 'All', status: 'All', dateRange: 'All' })}
                    className="text-xs text-primary mt-2 hover:underline">Clear filters</button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                      <tr>
                        {['Parent', 'Email', 'Phone', 'Students', 'Amount', 'Status', 'Parent Response', 'Date', ''].map(h => (
                          <th key={h} className="px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredEnrollments.filter(e => e.students.some(s => s.type === 'Trial')).map(e => (
                        <>
                        <tr key={e.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedRow(expandedRow === e.id ? null : e.id)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-primary">
                                  {(e.parentName ?? '?').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-900">{e.parentName}</span>
                                <span className="ml-2 text-gray-400 text-xs">{expandedRow === e.id ? '▲' : '▼'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{e.parentEmail}</td>
                          <td className="px-4 py-3 text-gray-500">{e.parentPhone || <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 text-gray-700">{e.students.length}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {!e.totalAmount || Number(e.totalAmount) === 0 ? 'Free' : `$${Number(e.totalAmount).toLocaleString()}`}
                          </td>

                          {/* Status — inline dropdown */}
                          <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                            <select
                              value={e.status}
                              onChange={ev => updateStatus(e.id, ev.target.value)}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                                e.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                e.status === 'pending'   ? 'bg-yellow-100 text-yellow-700' :
                                                           'bg-red-100 text-red-700'
                              }`}
                            >
                              <option value="confirmed">confirmed</option>
                              <option value="pending">pending</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                          </td>

                          <td className="px-4 py-3 text-xs text-gray-500">
                            {e.confirmationRespondedAt ? <><div className="font-medium text-gray-700">{(e.confirmationResponseChannel || 'admin').replaceAll('_', ' ')}</div><div>{new Date(e.confirmationRespondedAt).toLocaleString('en-CA')}</div></> : e.confirmationRequestSentAt ? <><div className="text-amber-700">Awaiting response</div><div>{new Date(e.confirmationRequestSentAt).toLocaleString('en-CA')}</div></> : <span className="text-gray-300">Not sent</span>}
                          </td>

                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(e.bookingDate).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {confirmDelete === e.id ? (
                              <span className="inline-flex items-center gap-2">
                                <button onClick={() => deleteEnrollment(e.id)}
                                  className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg px-2.5 py-1 transition-colors">
                                  Confirm
                                </button>
                                <button onClick={() => setConfirmDelete(null)}
                                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button onClick={ev => { ev.stopPropagation(); setConfirmDelete(e.id); }}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors">
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedRow === e.id && (
                          <tr key={`${e.id}-detail`} className="bg-indigo-50/50">
                            <td colSpan={8} className="px-6 py-3">
                              {e.students.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No student details available.</p>
                              ) : (
                                <div className="flex flex-wrap gap-3">
                                  {e.students.map((s, i) => (
                                    <div key={i} className="bg-white border border-indigo-100 rounded-lg px-3 py-2 text-xs text-gray-700 min-w-[180px]">
                                      <div className="font-semibold text-gray-900 mb-1">{s.name || '—'}</div>
                                      <div className="text-indigo-700 font-medium">{s.className || s.classId}</div>
                                      <div className="text-gray-500 mt-0.5 space-y-0.5">
                                        {s.course   && <div>Course: {s.course}</div>}
                                        {s.location && <div>Location: {s.location}</div>}
                                        {s.dob      && <div>DOB: {s.dob}</div>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════ USERS ══════ */}
          {view === 'leads' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
              <div><h1 className="text-xl font-semibold text-gray-900">Leads</h1><p className="text-xs text-gray-400 mt-0.5">All step-one submissions, including registered parents</p></div>
              {leadsLoading ? <p className="py-12 text-center text-gray-400">Loading leads…</p> : leads.length === 0 ? (
                <p className="py-16 text-center text-gray-400">No leads yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100"><table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase"><tr>{['Name','Email','Phone','Course','Age Group','Location','Registered','Reminder Call Count','Reminder Call Time','Scheduled Call Time','Reminder Email Count','Reminder Email Time','Submitted','Updated At'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">{leads.map(lead => <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td><td className="px-4 py-3">{lead.email}</td><td className="px-4 py-3">{lead.phone}</td>
                    <td className="px-4 py-3">{lead.course || '—'}</td><td className="px-4 py-3">{lead.age_group || '—'}</td><td className="px-4 py-3">{lead.location || '—'}</td>
                    <td className="px-4 py-3"><select value={lead.is_registered ? 'yes' : 'no'} onChange={e => updateLeadRegistration(lead.id, e.target.value === 'yes')}
                      className={`rounded-full px-2 py-1 text-xs font-medium border-0 ${lead.is_registered ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      <option value="no">No</option><option value="yes">Yes</option>
                    </select></td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className="font-medium">{lead.reminder_call_count ?? 0}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500 min-w-[240px]">
                      {lead.reminder_calls?.length ? <div className="space-y-1 mb-2">{lead.reminder_calls.map(call => <div key={call.id}>{new Date(call.called_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}</div>)}</div> : <div className="mb-2">—</div>}
                      <div className="flex items-center gap-1">
                        <input type="datetime-local" value={callTimes[lead.id] ?? ''}
                          onChange={e => setCallTimes(current => ({ ...current, [lead.id]: e.target.value }))}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700" />
                        <button disabled={!callTimes[lead.id]} onClick={() => addReminderCall(lead.id)}
                          className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-40">Add</button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 min-w-[240px]">
                      <div className="mb-2 whitespace-nowrap">{lead.scheduled_call_time ? new Date(lead.scheduled_call_time).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled'}</div>
                      <div className="flex items-center gap-1">
                        <input type="datetime-local" value={scheduledCallTimes[lead.id] ?? ''}
                          onChange={e => setScheduledCallTimes(current => ({ ...current, [lead.id]: e.target.value }))}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700" />
                        <button disabled={!scheduledCallTimes[lead.id]} onClick={() => saveScheduledCall(lead.id)}
                          className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-40">Save</button>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className="font-medium text-gray-700">{lead.reminder_email_count ?? 0} / 3</span>{lead.next_reminder_email_at && <div className="text-[11px] text-blue-600">Next: {new Date(lead.next_reminder_email_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}</div>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{lead.reminder_emails?.length ? <div className="space-y-1">{lead.reminder_emails.map(email => <div key={email.id}><span className="font-medium text-gray-600">Day {email.reminder_day}:</span> {new Date(email.sent_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}</div>)}</div> : (lead.is_registered ? 'Stopped — registered' : 'Not sent')}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(lead.created_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(lead.updated_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  </tr>)}</tbody>
                </table></div>
              )}
            </div>
          )}

          {(view === 'parents' || view === 'users') && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{view === 'parents' ? 'Parents' : 'Users'}</h1>
                  <p className="text-xs text-gray-400 mt-0.5">{appUsers.length} account{appUsers.length !== 1 ? 's' : ''} registered</p>
                </div>
              </div>

              {/* Search */}
              {appUsers.length > 0 && (
                <div className="relative max-w-xs">
                  <IcoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email or phone…"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
                  />
                </div>
              )}

              {/* Loading */}
              {usersLoading ? (
                <div className="flex items-center justify-center py-16 gap-3">
                  <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">Loading users…</span>
                </div>

              ) : appUsers.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <IcoPerson size={28} className="text-gray-300" />
                  </div>
                  <p className="text-base font-semibold text-gray-400">No {view === 'parents' ? 'parents' : 'users'} registered yet</p>
                  <p className="text-sm text-gray-300 mt-1">{view === 'parents' ? 'Parents' : 'Users'} will appear here after they create an account.</p>
                </div>

              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                      <tr>
                        {['Name', 'Email', 'Phone', 'Role', 'Registered'].map(h => (
                          <th key={h} className="px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(userSearch ? filteredUsers : appUsers).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                            No users match &quot;{userSearch}&quot;
                          </td>
                        </tr>
                      ) : (
                        (userSearch ? filteredUsers : appUsers).map(u => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-semibold text-primary">
                                    {(u.name ?? '?').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-medium text-gray-900">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{u.email}</td>
                            <td className="px-4 py-3 text-gray-500">{u.phone ?? <span className="text-gray-300">—</span>}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {new Date(u.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════ CLASSES ══════ */}
          {view === 'classes' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Classes</h1>
                  <p className="text-xs text-gray-400 mt-0.5">Classes added here appear on the search / enrollment page.</p>
                </div>
                <button className="btn-primary"
                  onClick={() => { setClassModalOpen(true); setClassError(''); setClassForm(BLANK_CLASS); }}>
                  + Add Class
                </button>
              </div>

              {classes.length === 0 ? (
                <div className="text-center py-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm">No classes yet. Click &quot;+ Add Class&quot; to create one.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                      <tr>{['Curriculum','Locations','Course','Age Groups','Date / Time','Type','Instructor','Enrolled',''].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {classes.map(cls => (
                        <tr key={cls.id} className="hover:bg-gray-50 align-top">
                          <td className="px-4 py-3 font-medium text-gray-900">{cls.curriculum}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {(cls.locations ?? []).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{cls.course}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            <div className="flex flex-col gap-0.5">
                              {(cls.ageGroups ?? []).map(a => <span key={a}>{a}</span>)}
                              {(cls.ageGroups ?? []).length === 0 && '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                            {cls.date ? <><span className="font-medium text-gray-800">{new Date(cls.date + 'T00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>{cls.time && <><br />{cls.time}</>}</> : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls.type === 'Trial' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                              {cls.type === 'Trial' ? 'Free Trial' : 'Paid'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{cls.instructor}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            <span className={(cls.maxStudents - cls.availableSlots) >= cls.maxStudents ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                              {cls.maxStudents - cls.availableSlots}/{cls.maxStudents}
                            </span>
                            <span className="text-gray-400 ml-1">enrolled</span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => deleteClass(cls.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════ SETTINGS ══════ */}
          {view === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-gray-100 overflow-x-auto">
                {([
                  { key: 'locations' as SettingsSection, label: 'Locations'  },
                  { key: 'courses'   as SettingsSection, label: 'Courses'    },
                  { key: 'ageGroups' as SettingsSection, label: 'Age Groups' },
                  { key: 'types'     as SettingsSection, label: 'Types'      },
                ]).map(t => (
                  <button key={t.key} onClick={() => setSettingsSection(t.key)}
                    className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                      settingsSection === t.key
                        ? 'text-primary border-b-2 border-primary bg-blue-50/40'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="p-6 space-y-5">

              {settingsSection === 'locations' && (
                <ConfigSection title="Locations" subtitle="Used in the trial booking form and class dropdowns."
                  items={locations} onRemove={id => removeConfigItem('locations', id)}
                  onAddClick={() => openConfigModal('locations', 'Location', 'Location name (e.g. Mississauga)', 'Campus type ID (e.g. 7)')} />
              )}
              {settingsSection === 'courses' && (
                <ConfigSection title="Courses" subtitle="Appear in the Course dropdown when adding a class."
                  items={courses} onRemove={id => removeConfigItem('courses', id)}
                  onAddClick={() => openConfigModal('courses', 'Course', 'Course name (e.g. AI & Robotics)', 'Level ID (e.g. 4000283)')} />
              )}
              {settingsSection === 'ageGroups' && (
                <ConfigSection title="Age Groups" subtitle="Used in the trial booking form and class dropdowns."
                  items={ageGroups} onRemove={id => removeConfigItem('ageGroups', id)}
                  onAddClick={() => openConfigModal('ageGroups', 'Age Group', 'Age group label (e.g. 16–18 Years Old)', 'Orbund Program ID (e.g. 4001275)', { showCourse: true, lph2: 'Orbund Level ID (e.g. 4000281)', vph2: '' })} />
              )}
              {settingsSection === 'types' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Types control pricing and enrollment flow.</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-700">Active</span>
                        <span className="font-semibold text-gray-900">Free Trial</span>
                      </div>
                      <p className="text-sm text-gray-700">Price: $0</p>
                      <p className="text-xs font-mono text-gray-500 mt-1">Semester: 4000979</p>
                      <p className="text-xs text-gray-500 mt-3">Trial classes always available for enrollment.</p>
                    </div>
                    <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 opacity-60">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-200 text-gray-500">Coming Soon</span>
                        <span className="font-semibold text-gray-900">Paid</span>
                      </div>
                      <p className="text-sm text-gray-700">Custom pricing · Dynamic semester</p>
                      <p className="text-xs text-gray-500 mt-3">Will be enabled once Orbund schedules are published.</p>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {/* ══════ NOTIFICATIONS ══════ */}
          {view === 'notifications' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Notification Log</h1>
                  <p className="text-xs text-gray-400 mt-0.5">{notifLogs.length} record{notifLogs.length !== 1 ? 's' : ''} — most recent first</p>
                </div>
                <button onClick={fetchNotifLogs}
                  className="flex items-center gap-2 text-sm text-primary border border-primary/30 hover:border-primary rounded-xl px-3 py-1.5 transition-colors">
                  <IcoSync size={14} /> Refresh
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-end">
                {([
                  { label: 'Type',   field: 'type'   as const, opts: ['All', 'email', 'sms'] },
                  { label: 'Event',  field: 'event'  as const, opts: ['All', 'user_registered', 'enrollment_created', 'enrollment_confirmed', 'enrollment_cancelled', 'class_reminder'] },
                  { label: 'Status', field: 'status' as const, opts: ['All', 'sent', 'skipped', 'failed'] },
                ] as const).map(f => (
                  <div key={f.field}>
                    <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                    <select className="input-field py-1.5 text-sm min-w-[130px]"
                      value={notifFilter[f.field]}
                      onChange={e => setNotifFilter(p => ({ ...p, [f.field]: e.target.value }))}>
                      {f.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <button onClick={fetchNotifLogs} className="btn-primary text-sm py-1.5">Apply</button>
                <button onClick={() => { setNotifFilter({ type: 'All', event: 'All', status: 'All' }); setTimeout(fetchNotifLogs, 0); }}
                  className="btn-secondary text-sm py-1.5">Reset</button>
              </div>

              {notifLoading ? (
                <div className="flex items-center justify-center py-16 gap-3">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">Loading…</span>
                </div>
              ) : notifLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <IcoBell size={26} className="text-gray-300" />
                  </div>
                  <p className="text-base font-semibold text-gray-400">No notifications logged yet</p>
                  <p className="text-sm text-gray-300 mt-1">Logs appear here once leads, enrollments, or registrations are submitted.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                      <tr>
                        {['Type', 'Event', 'Recipient', 'Subject', 'Status', 'Time'].map(h => (
                          <th key={h} className="px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {notifLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              log.type === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {log.type === 'email' ? '✉ Email' : '📱 SMS'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{log.event}</td>
                          <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{log.recipient}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{log.subject ?? <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              log.status === 'sent'    ? 'bg-green-100 text-green-700' :
                              log.status === 'skipped' ? 'bg-yellow-100 text-yellow-700' :
                                                         'bg-red-100 text-red-700'
                            }`}>
                              {log.status === 'sent' ? '✓ Sent' : log.status === 'skipped' ? '⚡ Skipped' : '✗ Failed'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs text-gray-400 pt-1">
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Sent — real credentials used, API accepted</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Skipped — replace dummy credentials in .env to enable</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Failed — API rejected the request</span>
              </div>
            </div>
          )}

          {/* ══════ WORKFLOWS ══════ */}
          {view === 'workflows' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 mb-1">Notification Workflows</h1>
                  <p className="text-sm text-gray-500">
                    Each event triggers email and/or SMS automatically. Toggles saved locally.
                    Replace dummy credentials in{' '}
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">backend-laravel/.env</span> to go live.
                  </p>
                </div>
                <button onClick={() => { setCustomWfForm(BLANK_CUSTOM_WF); setCustomWfError(''); setCustomWfModal(true); }}
                  className="btn-primary flex-shrink-0 text-sm">
                  + Add Workflow
                </button>
              </div>

              {WORKFLOWS.map(wf => {
                const on = isWfOn(wf.key);
                return (
                  <div key={wf.key} className={`bg-white rounded-2xl shadow-sm border transition-colors ${on ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                    <div className="px-6 py-5">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-base font-semibold text-gray-900">{wf.label}</span>
                            <span className="font-mono text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{wf.key}</span>
                          </div>
                          <p className="text-xs text-gray-500">{wf.desc}</p>
                        </div>
                        {/* Toggle switch */}
                        <button onClick={() => toggleWf(wf.key)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${on ? 'bg-primary' : 'bg-gray-200'}`}
                          role="switch" aria-checked={on}>
                          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Channel rows */}
                      <div className="space-y-2">
                        {wf.channels.map((c, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 mt-0.5 ${
                              c.ch === 'Email' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {c.ch === 'Email' ? '✉ Email' : '📱 SMS'}
                            </span>
                            <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0 mt-0.5 ${
                              c.to === 'Admin' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                            }`}>
                              → {c.to}
                            </span>
                            <span className="text-xs text-gray-600">{c.msg}</span>
                          </div>
                        ))}
                      </div>

                      {/* Recent count from logs */}
                      {notifLogs.length > 0 && (
                        <p className="text-xs text-gray-400 mt-3">
                          {notifLogs.filter(l => l.event === wf.key).length} logged ·{' '}
                          {notifLogs.filter(l => l.event === wf.key && l.status === 'sent').length} sent ·{' '}
                          {notifLogs.filter(l => l.event === wf.key && l.status === 'skipped').length} skipped
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ── Manage Trigger Events ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Trigger Events</p>
                    <p className="text-xs text-gray-400 mt-0.5">Events available in the workflow trigger dropdown</p>
                  </div>
                  <button onClick={() => { setWfEventForm({ key: '', label: '', description: '' }); setWfEventError(''); setWfEventModal(true); }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-lg px-3 py-1.5 transition-colors">
                    + Add Event
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {wfEvents.map(ev => (
                    <div key={ev.id} className="px-6 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-900">{ev.label}</span>
                        {ev.description && <span className="text-xs text-gray-400 ml-2">— {ev.description}</span>}
                        <span className="font-mono text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 ml-2">{ev.key}</span>
                      </div>
                      <button onClick={() => deleteWfEvent(ev.id)}
                        className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 transition-colors">
                        Remove
                      </button>
                    </div>
                  ))}
                  {wfEvents.length === 0 && (
                    <p className="px-6 py-4 text-sm text-gray-400">No events yet.</p>
                  )}
                </div>
              </div>

              {/* ── Custom Workflows ── */}
              {customWfs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Custom Workflows ({customWfs.length})</p>
                  {customWfs.map(wf => (
                    <div key={wf.id} className={`bg-white rounded-2xl shadow-sm border transition-colors ${wf.active ? 'border-indigo-100' : 'border-gray-200 opacity-60'}`}>
                      <div className="px-6 py-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="text-base font-semibold text-gray-900">{wf.name}</span>
                              <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${wf.triggerType === 'manual' ? 'bg-indigo-100 text-indigo-600' : 'bg-teal-100 text-teal-700'}`}>
                                {wf.triggerType === 'manual' ? 'Manual' : 'Event'}
                              </span>
                              {wf.triggerType === 'event' && wf.eventKey && (
                                <span className="font-mono text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{wf.eventKey}</span>
                              )}
                              {wf.conditionLocation && (
                                <span className="text-[10px] font-medium bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">📍 {wf.conditionLocation}</span>
                              )}
                              {wf.conditionCourse && (
                                <span className="text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded-full">🎓 {wf.conditionCourse}</span>
                              )}
                              {wf.scheduledSentAt && (
                                <span className="text-[10px] font-medium bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full">✓ Sent {new Date(wf.scheduledSentAt).toLocaleString()}</span>
                              )}
                              {wf.scheduledAt && !wf.scheduledSentAt && (
                                <span className="text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">🕐 {new Date(wf.scheduledAt).toLocaleString()}</span>
                              )}
                            </div>
                            {wf.description && <p className="text-xs text-gray-500 mt-0.5">{wf.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {wf.triggerType === 'manual' && (
                              <button onClick={() => fireWorkflow(wf.id)} disabled={firingWfId === wf.id}
                                className="text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5">
                                {firingWfId === wf.id
                                  ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Sending…</>
                                  : '▶ Send Now'}
                              </button>
                            )}
                            <button onClick={() => toggleCustomWfActive(wf.id, !wf.active)}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${wf.active ? 'bg-indigo-500' : 'bg-gray-200'}`}
                              role="switch" aria-checked={wf.active}>
                              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${wf.active ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                            <button onClick={() => deleteCustomWf(wf.id)}
                              className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                          </div>
                        </div>

                        {fireResult?.id === wf.id && (
                          <div className="mb-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs px-3 py-2">{fireResult.msg}</div>
                        )}

                        <div className="space-y-2">
                          {wf.emailEnabled && (
                            <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
                              <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 mt-0.5 bg-blue-100 text-blue-700">✉ Email</span>
                              <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0 mt-0.5 ${wf.emailRecipient === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                → {wf.emailRecipient === 'both' ? 'Parent + Admin' : wf.emailRecipient.charAt(0).toUpperCase() + wf.emailRecipient.slice(1)}
                              </span>
                              <span className="text-xs text-gray-600">{wf.emailSubject}</span>
                            </div>
                          )}
                          {wf.smsEnabled && (
                            <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
                              <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 mt-0.5 bg-purple-100 text-purple-700">📱 SMS</span>
                              <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0 mt-0.5 ${wf.smsRecipient === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                → {wf.smsRecipient.charAt(0).toUpperCase() + wf.smsRecipient.slice(1)}
                              </span>
                              <span className="text-xs text-gray-600 truncate">{wf.smsBody.substring(0, 80)}{wf.smsBody.length > 80 ? '…' : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {customWfs.length === 0 && (
                <button onClick={() => { setCustomWfForm(BLANK_CUSTOM_WF); setCustomWfError(''); setCustomWfModal(true); }}
                  className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-8 text-sm text-gray-400 hover:border-primary hover:text-primary transition-colors">
                  + Create your first custom workflow
                </button>
              )}

            </div>
          )}

          {/* ══════ ATTENDANCE ══════ */}
          {view === 'attendance' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Attendance Tracker</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Filter by date and location to mark who attended and who didn&apos;t.</p>
                  </div>
                  {noShowCount > 0 && (
                    <button onClick={() => { setNoShowForm({ subject: '', body: '', sendSms: false, smsBody: '' }); setNoShowResult(''); setEmailNoShowModal(true); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                      ✉ Email {noShowCount} No-Show{noShowCount !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Class Date</label>
                    <input type="date" className="input-field" value={attendanceDate}
                      onChange={e => setAttendanceDate(e.target.value)} />
                  </div>
                  <div className="min-w-[260px]">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Class</label>
                    <select className="input-field" value={attendanceCurriculum}
                      onChange={e => setAttendanceCurriculum(e.target.value)}>
                      <option value="">All classes</option>
                      {attendanceCurricula.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  {attendanceLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 pb-0.5">
                      <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Loading…
                    </div>
                  )}
                </div>
              </div>

              {/* Student list */}
              {attendanceStudents.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Summary bar */}
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-sm">
                    <span className="font-semibold text-gray-700">{attendanceStudents.length} students</span>
                    <span className="text-green-600 font-medium">{attendanceStudents.filter(s => s.attended === true).length} attended</span>
                    <span className="text-red-500 font-medium">{noShowCount} no-show</span>
                    <span className="text-gray-400">{attendanceStudents.filter(s => s.attended === null).length} not marked</span>
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => attendanceStudents.forEach(s => s.attended !== true && markAttendance(s.id, true))}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium transition-colors">
                        Mark all attended
                      </button>
                    </div>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Student</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Parent</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Class</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Date / Time</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceStudents.map((s, i) => (
                        <tr key={s.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                          <td className="px-6 py-3">
                            <p className="font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-gray-400">{s.location}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-700">{s.parent_name}</p>
                            <p className="text-xs text-gray-400">{s.parent_email}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px]">{s.curriculum || s.course || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatAttendanceDate(s.class_date)}{s.class_time ? ` · ${s.class_time}` : ''}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => markAttendance(s.id, true)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${s.attended === true ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'}`}>
                                Attended
                              </button>
                              <button onClick={() => markAttendance(s.id, false)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${s.attended === false ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600'}`}>
                                No-Show
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {attendanceStudents.length === 0 && !attendanceLoading && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center">
                  <p className="text-gray-400 text-sm">
                    {attendanceDate || attendanceCurriculum
                    ? `No students found${attendanceDate ? ` for ${attendanceDate}` : ''}${attendanceCurriculum ? ` · ${attendanceCurriculum}` : ''}.`
                    : 'No enrolled students yet.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {view === 'continuing_ed' && (
            <div className="space-y-4">

              {/* Coupons */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Coupons</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Discount codes for continuing education registrations.</p>
                  </div>
                  <button onClick={() => { setCouponModalOpen(true); setCouponError(''); setCouponForm(BLANK_COUPON); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors" style={{ background: '#1e3f8b' }}>
                    <IcoPlus size={16} /> Add Coupon
                  </button>
                </div>
                {coupons.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">No coupons yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Code</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Discount</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Min Amount</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Uses</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Expires</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map(c => (
                        <tr key={c.id} className="border-b border-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-900">{c.code}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {c.discount_type === 'percent' ? `${Number(c.discount_value)}%` : `$${Number(c.discount_value).toFixed(2)}`}
                          </td>
                          <td className="px-4 py-3 text-gray-500">${Number(c.min_amount).toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-500">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                          <td className="px-4 py-3 text-gray-500">{c.expires_at ? c.expires_at.slice(0, 10) : '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {c.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => deleteCoupon(c.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Waitlist */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Class Waitlist</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Approve or reject students waiting for a spot in a full class.</p>
                  </div>
                  {waitlistLoading && <span className="text-xs text-gray-400">Loading…</span>}
                </div>
                {waitlistEntries.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">No waitlist entries.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">#</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Student</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Parent</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Class</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitlistEntries.map(w => (
                        <tr key={w.id} className="border-b border-gray-50">
                          <td className="px-4 py-3 text-gray-500">{w.position}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{w.student_name}</td>
                          <td className="px-4 py-3 text-gray-600">
                            <p>{w.parent_name}</p>
                            <p className="text-xs text-gray-400">{w.parent_email}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs max-w-[220px]">{w.school_class?.curriculum ?? `#${w.school_class_id}`}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              w.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                              w.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>{w.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {w.status === 'waiting' && (
                              <>
                                <button onClick={() => approveWaitlistEntry(w.id)} className="text-green-600 hover:text-green-800 text-xs font-medium mr-3">Approve</button>
                                <button onClick={() => rejectWaitlistEntry(w.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Reject</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Certificates */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">Digital Credentials</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Issue a certificate of completion for attended students, or review those already issued.</p>
                </div>

                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Eligible for a certificate (attended)</h3>
                {eligibleStudents.length === 0 ? (
                  <p className="text-sm text-gray-400 pb-5">No attended students yet — mark attendance first.</p>
                ) : (
                  <table className="w-full text-sm mb-6">
                    <tbody>
                      {eligibleStudents.map(s => {
                        const already = certificates.some(c => c.student_name === `${s.first_name} ${s.last_name}`.trim());
                        return (
                          <tr key={s.id} className="border-b border-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-900">{s.first_name} {s.last_name}</td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs">{s.course} · {s.location}</td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                disabled={already || issuingCertFor === s.id}
                                onClick={() => issueCertificate(s.id)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                  already ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                }`}>
                                {already ? 'Issued' : issuingCertFor === s.id ? 'Issuing…' : 'Issue Certificate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Issued certificates</h3>
                {certificates.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">No certificates issued yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Certificate #</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Student</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Course</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Issued</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificates.map(c => (
                        <tr key={c.id} className="border-b border-gray-50">
                          <td className="px-4 py-3 font-mono text-xs">
                            <a href={`/certificates/${c.certificate_number}`} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline">
                              {c.certificate_number}
                            </a>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{c.student_name}</td>
                          <td className="px-4 py-3 text-gray-600">{c.course} · {c.location}</td>
                          <td className="px-4 py-3 text-gray-500">{c.issued_at.slice(0, 10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Corporate Portal */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Corporate Portal</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Companies whose employees can register using a corporate code for an automatic discount.</p>
                  </div>
                  <button onClick={() => { setCompanyModalOpen(true); setCompanyError(''); setCompanyForm(BLANK_COMPANY); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors" style={{ background: '#1e3f8b' }}>
                    <IcoPlus size={16} /> Add Company
                  </button>
                </div>
                {companies.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">No companies yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Company</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Code</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Discount</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Contact</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map(c => (
                        <tr key={c.id} className="border-b border-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-indigo-700">{c.code}</td>
                          <td className="px-4 py-3 text-gray-600">{c.discount_coupon?.code ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{c.contact_email ?? '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => deleteCompany(c.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Invoices */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Registrations paid by invoice or purchase order. Mark paid once payment is received.</p>
                </div>
                {invoices.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">No invoices yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Invoice #</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Parent</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Amount</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Method</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Due</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => (
                        <tr key={inv.id} className="border-b border-gray-50">
                          <td className="px-4 py-3 font-mono text-xs">
                            <a href={`/invoices/${inv.invoice_number}`} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline">
                              {inv.invoice_number}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{inv.parent_name}</p>
                            <p className="text-xs text-gray-400">{inv.parent_email}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700">${Number(inv.amount).toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {inv.method === 'purchase_order' ? `PO ${inv.purchase_order_number ?? ''}` : 'Invoice'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{inv.due_date?.slice(0, 10) ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                              inv.status === 'unpaid' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                            }`}>{inv.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {inv.status === 'unpaid' && (
                              <button onClick={() => markInvoicePaid(inv.id)} disabled={markingPaidFor === inv.id}
                                className="text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-50">
                                {markingPaidFor === inv.id ? 'Marking…' : 'Mark Paid'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Campaigns */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Marketing Campaigns</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Send a one-off SMS/email blast to parents matching a location or course filter.</p>
                  </div>
                  <button onClick={() => { setCampaignModalOpen(true); setCampaignForm(BLANK_CAMPAIGN); setCampaignResult(''); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors" style={{ background: '#1e3f8b' }}>
                    <IcoPlus size={16} /> New Campaign
                  </button>
                </div>
                {campaignResult && (
                  <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm">{campaignResult}</div>
                )}
                {campaigns.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">No campaigns sent yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Name</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Channel</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Filter</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => (
                        <tr key={c.id} className="border-b border-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                          <td className="px-4 py-3 text-gray-600 uppercase text-xs">{c.channel}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{[c.filter_location, c.filter_course].filter(Boolean).join(' · ') || 'All'}</td>
                          <td className="px-4 py-3 text-gray-700">{c.sent_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Custom Reports */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">Custom Reports</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Filter enrollments to fit a specific program's reporting needs, or export to CSV.</p>
                </div>
                <div className="flex flex-wrap gap-3 items-end mb-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Course</label>
                    <input type="text" className="input-field" placeholder="e.g. Robotics" value={reportFilters.course}
                      onChange={e => setReportFilters(f => ({ ...f, course: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
                    <input type="text" className="input-field" placeholder="e.g. Thornhill" value={reportFilters.location}
                      onChange={e => setReportFilters(f => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                    <input type="text" className="input-field" placeholder="e.g. confirmed" value={reportFilters.status}
                      onChange={e => setReportFilters(f => ({ ...f, status: e.target.value }))} />
                  </div>
                  <button onClick={() => fetchReportSummary()} className="btn-secondary">Run Report</button>
                  <a href={`${API_URL}/admin/reports/export.csv?course=${encodeURIComponent(reportFilters.course)}&location=${encodeURIComponent(reportFilters.location)}&status=${encodeURIComponent(reportFilters.status)}`}
                    target="_blank" rel="noopener noreferrer" className="btn-outline">
                    Export CSV
                  </a>
                </div>
                {reportSummary && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">Total Enrollments</p>
                      <p className="text-2xl font-bold text-gray-900">{reportSummary.total_enrollments}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">Total Students</p>
                      <p className="text-2xl font-bold text-gray-900">{reportSummary.total_students}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">${Number(reportSummary.total_revenue).toFixed(2)}</p>
                    </div>
                    <div className="col-span-3 grid grid-cols-2 gap-4 mt-1">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">By Course</p>
                        {Object.entries(reportSummary.by_course ?? {}).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-sm py-1 border-b border-gray-50">
                            <span className="text-gray-600">{k}</span><span className="font-medium text-gray-900">{v}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">By Location</p>
                        {Object.entries(reportSummary.by_location ?? {}).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-sm py-1 border-b border-gray-50">
                            <span className="text-gray-600">{k}</span><span className="font-medium text-gray-900">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </main>
      </div>

      {/* ══ ADD CLASS MODAL ══ */}
      {classModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-lg">Add New Class</h3>
              <button onClick={() => setClassModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={submitClass} className="px-8 py-7 grid grid-cols-3 gap-5">

              {/* Curriculum — full width */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Curriculum Name *</label>
                <input type="text" className="input-field" placeholder="e.g. Robotics Level 1"
                  value={classForm.curriculum}
                  onChange={e => setClassForm(f => ({ ...f, curriculum: e.target.value }))} />
              </div>

              {/* Location — full width */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-2">Location * <span className="font-normal text-gray-400">(select all that apply)</span></label>
                <div className="flex flex-wrap gap-2">
                  {locations.map(l => {
                    const checked = classForm.locations.includes(l.label);
                    return (
                      <label key={l.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 cursor-pointer text-sm select-none transition-colors ${checked ? 'border-primary bg-blue-50 text-primary font-medium' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                        <input type="checkbox" className="sr-only" checked={checked}
                          onChange={() => setClassForm(f => ({ ...f, locations: toggleItem(f.locations, l.label) }))} />
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'bg-primary border-primary' : 'border-gray-400'}`}>
                          {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        {l.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Age Group — full width */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-2">Age Group * <span className="font-normal text-gray-400">(select all that apply)</span></label>
                <div className="flex flex-wrap gap-2">
                  {ageGroups.map(a => {
                    const checked = classForm.ageGroups.includes(a.label);
                    return (
                      <label key={a.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 cursor-pointer text-sm select-none transition-colors ${checked ? 'border-primary bg-blue-50 text-primary font-medium' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                        <input type="checkbox" className="sr-only" checked={checked}
                          onChange={() => setClassForm(f => ({ ...f, ageGroups: toggleItem(f.ageGroups, a.label) }))} />
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'bg-primary border-primary' : 'border-gray-400'}`}>
                          {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        {a.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Course */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Course *</label>
                <select className="input-field" value={classForm.course}
                  onChange={e => setClassForm(f => ({ ...f, course: e.target.value }))}>
                  <option value="">— Select —</option>
                  {courses.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                </select>
              </div>

              {/* Instructor */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Instructor *</label>
                <input type="text" className="input-field" placeholder="e.g. Ms. Nisha"
                  value={classForm.instructor}
                  onChange={e => setClassForm(f => ({ ...f, instructor: e.target.value }))} />
              </div>

              {/* Max Students */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Max Students</label>
                <input type="number" min={1} className="input-field" value={classForm.maxStudents}
                  onChange={e => setClassForm(f => ({ ...f, maxStudents: Number(e.target.value), availableSlots: Number(e.target.value) }))} />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
                <input type="date" className="input-field" value={classForm.date}
                  onChange={e => setClassForm(f => ({ ...f, date: e.target.value }))} />
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Time</label>
                <input type="time" className="input-field" value={classForm.time}
                  onChange={e => setClassForm(f => ({ ...f, time: e.target.value }))} />
              </div>

              {/* Hide when full */}
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="hideWhenFull" checked={classForm.hideWhenFull}
                  onChange={e => setClassForm(f => ({ ...f, hideWhenFull: e.target.checked }))} />
                <label htmlFor="hideWhenFull" className="text-xs font-medium text-gray-600">Hide from listing when sold out</label>
              </div>

              {/* Department */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Department (optional)</label>
                <input type="text" className="input-field" placeholder="e.g. Thornhill Campus" value={classForm.department}
                  onChange={e => setClassForm(f => ({ ...f, department: e.target.value }))} />
              </div>

              {/* Course modules / structure */}
              <div className="col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-600">Course Modules (optional)</label>
                  <button type="button"
                    onClick={() => setClassForm(f => ({ ...f, modules: [...f.modules, { title: '', description: '' }] }))}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add Module</button>
                </div>
                <div className="space-y-2">
                  {classForm.modules.map((m, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <input type="text" className="input-field flex-1" placeholder="Module title"
                        value={m.title}
                        onChange={e => setClassForm(f => ({ ...f, modules: f.modules.map((mod, j) => j === i ? { ...mod, title: e.target.value } : mod) }))} />
                      <input type="text" className="input-field flex-[2]" placeholder="Description"
                        value={m.description}
                        onChange={e => setClassForm(f => ({ ...f, modules: f.modules.map((mod, j) => j === i ? { ...mod, description: e.target.value } : mod) }))} />
                      <button type="button" onClick={() => setClassForm(f => ({ ...f, modules: f.modules.filter((_, j) => j !== i) }))}
                        className="text-red-500 hover:text-red-700 text-xs px-2 py-2">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {classError && (
                <div className="col-span-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{classError}</div>
              )}
              <div className="col-span-3 flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setClassModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={classSaving} className="btn-primary disabled:opacity-50">
                  {classSaving ? 'Saving…' : 'Add Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ ADD COUPON MODAL ══ */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-lg">Add Coupon</h3>
              <button onClick={() => setCouponModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={submitCoupon} className="px-7 py-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Code *</label>
                <input type="text" className="input-field" placeholder="e.g. WELCOME10"
                  value={couponForm.code}
                  onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Discount Type</label>
                  <select className="input-field" value={couponForm.discount_type}
                    onChange={e => setCouponForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed' }))}>
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Discount Value *</label>
                  <input type="number" min={0} step="0.01" className="input-field" value={couponForm.discount_value}
                    onChange={e => setCouponForm(f => ({ ...f, discount_value: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Min Order Amount</label>
                  <input type="number" min={0} step="0.01" className="input-field" value={couponForm.min_amount}
                    onChange={e => setCouponForm(f => ({ ...f, min_amount: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Max Uses</label>
                  <input type="number" min={1} className="input-field" placeholder="Unlimited" value={couponForm.max_uses}
                    onChange={e => setCouponForm(f => ({ ...f, max_uses: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Expires On</label>
                <input type="date" className="input-field" value={couponForm.expires_at}
                  onChange={e => setCouponForm(f => ({ ...f, expires_at: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="couponActive" checked={couponForm.active}
                  onChange={e => setCouponForm(f => ({ ...f, active: e.target.checked }))} />
                <label htmlFor="couponActive" className="text-xs font-medium text-gray-600">Active</label>
              </div>

              {couponError && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{couponError}</div>
              )}
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setCouponModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={couponSaving} className="btn-primary disabled:opacity-50">
                  {couponSaving ? 'Saving…' : 'Add Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ ADD COMPANY MODAL ══ */}
      {companyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-lg">Add Company</h3>
              <button onClick={() => setCompanyModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={submitCompany} className="px-7 py-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Name *</label>
                <input type="text" className="input-field" placeholder="e.g. TechCorp Inc." value={companyForm.name}
                  onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Corporate Code *</label>
                <input type="text" className="input-field" placeholder="e.g. TECHCORP" value={companyForm.code}
                  onChange={e => setCompanyForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Contact Email</label>
                <input type="email" className="input-field" value={companyForm.contact_email}
                  onChange={e => setCompanyForm(f => ({ ...f, contact_email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Discount Coupon</label>
                <select className="input-field" value={companyForm.discount_coupon_id}
                  onChange={e => setCompanyForm(f => ({ ...f, discount_coupon_id: e.target.value }))}>
                  <option value="">None</option>
                  {coupons.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
              </div>
              {companyError && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{companyError}</div>
              )}
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setCompanyModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={companySaving} className="btn-primary disabled:opacity-50">
                  {companySaving ? 'Saving…' : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ NEW CAMPAIGN MODAL ══ */}
      {campaignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-lg">New Campaign</h3>
              <button onClick={() => setCampaignModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={submitCampaign} className="px-7 py-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Campaign Name *</label>
                <input type="text" className="input-field" value={campaignForm.name}
                  onChange={e => setCampaignForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Channel</label>
                <select className="input-field" value={campaignForm.channel}
                  onChange={e => setCampaignForm(f => ({ ...f, channel: e.target.value as 'email' | 'sms' | 'both' }))}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="both">Both</option>
                </select>
              </div>
              {campaignForm.channel !== 'sms' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Subject *</label>
                  <input type="text" className="input-field" value={campaignForm.subject}
                    onChange={e => setCampaignForm(f => ({ ...f, subject: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Message *</label>
                <textarea className="input-field" rows={4} value={campaignForm.body}
                  onChange={e => setCampaignForm(f => ({ ...f, body: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Filter: Location</label>
                  <input type="text" className="input-field" placeholder="Any" value={campaignForm.filter_location}
                    onChange={e => setCampaignForm(f => ({ ...f, filter_location: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Filter: Course</label>
                  <input type="text" className="input-field" placeholder="Any" value={campaignForm.filter_course}
                    onChange={e => setCampaignForm(f => ({ ...f, filter_course: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setCampaignModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={campaignSending} className="btn-primary disabled:opacity-50">
                  {campaignSending ? 'Sending…' : 'Send Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ ADD CONFIG MODAL (Location / Course / Age Group) ══ */}
      {configModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Add {configModal.title}</h3>
              <button onClick={() => setConfigModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Label / Name</label>
                <input type="text" autoFocus className="input-field" placeholder={configModal.lph}
                  value={configForm.label}
                  onChange={e => setConfigForm(f => ({ ...f, label: e.target.value }))} />
              </div>
              {configModal.showCourse && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Course</label>
                  <select className="input-field" value={configForm.course}
                    onChange={e => setConfigForm(f => ({ ...f, course: e.target.value }))}>
                    <option value="Robotics">Robotics</option>
                    <option value="Coding">Coding</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {configModal.showCourse ? 'Orbund Program ID' : 'Value / ID'}
                </label>
                <input type="text" className="input-field" placeholder={configModal.vph}
                  value={configForm.value}
                  onChange={e => setConfigForm(f => ({ ...f, value: e.target.value }))} />
              </div>
              {configModal.lph2 !== undefined && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Orbund Level ID</label>
                  <input type="text" className="input-field" placeholder={configModal.lph2}
                    value={configForm.value2}
                    onChange={e => setConfigForm(f => ({ ...f, value2: e.target.value }))} />
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setConfigModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleAddConfig}
                  disabled={configSaving || !configForm.label.trim() || !configForm.value.trim() || (configModal.lph2 !== undefined && !configForm.value2.trim())}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {configSaving ? 'Saving…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ EMAIL NO-SHOWS MODAL ══ */}
      {emailNoShowModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Email No-Shows</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Sending to <span className="font-semibold text-red-500">{noShowCount} no-show student{noShowCount !== 1 ? 's' : ''}</span>
                  {attendanceDate ? ` — ${attendanceDate}` : ''}
                  {attendanceCurriculum ? ` · ${attendanceCurriculum}` : ''}
                </p>
              </div>
              <button onClick={() => setEmailNoShowModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto px-7 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Subject *</label>
                <input type="text" className="input-field" placeholder="e.g. We missed you today!"
                  value={noShowForm.subject}
                  onChange={e => setNoShowForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Message *</label>
                <textarea rows={5} className="input-field resize-none" placeholder="Write your message to the parents…"
                  value={noShowForm.body}
                  onChange={e => setNoShowForm(f => ({ ...f, body: e.target.value }))} />
                <p className="text-xs text-gray-400 mt-1">Student name, class, location and date will be included automatically below the message.</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={noShowForm.sendSms}
                  onChange={e => setNoShowForm(f => ({ ...f, sendSms: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-gray-700">Also send SMS</span>
              </label>
              {noShowForm.sendSms && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    SMS Message * <span className="font-normal text-gray-400">({noShowForm.smsBody.length}/160)</span>
                  </label>
                  <textarea rows={3} maxLength={160} className="input-field resize-none" placeholder="Short SMS text…"
                    value={noShowForm.smsBody}
                    onChange={e => setNoShowForm(f => ({ ...f, smsBody: e.target.value }))} />
                </div>
              )}
              {noShowResult && (
                <div className={`rounded-xl border text-sm p-3 ${noShowResult.startsWith('Sent') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {noShowResult}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setEmailNoShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={sendNoShowEmails} disabled={noShowSending || !noShowForm.subject.trim() || !noShowForm.body.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                {noShowSending ? 'Sending…' : `Send to ${noShowCount} Parent${noShowCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD WORKFLOW EVENT MODAL ══ */}
      {wfEventModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-lg">Add Trigger Event</h3>
              <button onClick={() => setWfEventModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="px-7 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Display Name *</label>
                <input type="text" className="input-field" placeholder="e.g. Payment Completed"
                  value={wfEventForm.label}
                  onChange={e => setWfEventForm(f => ({ ...f, label: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Event Key * <span className="font-normal text-gray-400">(lowercase, underscores only)</span></label>
                <input type="text" className="input-field font-mono" placeholder="e.g. payment_completed"
                  value={wfEventForm.key}
                  onChange={e => setWfEventForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))} />
                <p className="text-xs text-gray-400 mt-1">Must also be wired in <span className="font-mono">NotificationService.php</span> to auto-trigger.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <input type="text" className="input-field" placeholder="e.g. Parent completes payment"
                  value={wfEventForm.description}
                  onChange={e => setWfEventForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              {wfEventError && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{wfEventError}</div>}
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-gray-100">
              <button onClick={() => setWfEventModal(false)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={saveWfEvent} className="flex-1 btn-primary">Add Event</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD CUSTOM WORKFLOW MODAL ══ */}
      {customWfModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-semibold text-gray-900 text-lg">Create Custom Workflow</h3>
              <button onClick={() => setCustomWfModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto px-7 py-5 space-y-5">

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Workflow Name *</label>
                <input type="text" className="input-field" placeholder="e.g. Trial class reminder blast"
                  value={customWfForm.name}
                  onChange={e => setCustomWfForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <input type="text" className="input-field" placeholder="What triggers this or what it does"
                  value={customWfForm.description}
                  onChange={e => setCustomWfForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* Trigger type */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Trigger Type</label>
                <div className="flex gap-3">
                  {(['manual', 'event'] as const).map(t => (
                    <label key={t} className={`flex-1 flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors ${
                      customWfForm.triggerType === t ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" className="sr-only" checked={customWfForm.triggerType === t}
                        onChange={() => setCustomWfForm(f => ({ ...f, triggerType: t }))} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t === 'manual' ? 'Manual' : 'Event-based'}</p>
                        <p className="text-xs text-gray-500">{t === 'manual' ? 'Triggered from admin panel' : 'Auto-fires on a backend event'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Event key + conditions (for event-based) */}
              {customWfForm.triggerType === 'event' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">When this event fires</label>
                    <select className="input-field" value={customWfForm.eventKey}
                      onChange={e => setCustomWfForm(f => ({ ...f, eventKey: e.target.value }))}>
                      <option value="">— Select an event —</option>
                      {wfEvents.map(ev => (
                        <option key={ev.key} value={ev.key}>
                          {ev.label}{ev.description ? ` — ${ev.description}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-700">Conditions <span className="font-normal text-gray-400 text-xs">(optional — leave blank to fire for all)</span></p>
                    </div>
                    <div className="p-5 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Only fire for location</label>
                        <select className="input-field" value={customWfForm.conditionLocation}
                          onChange={e => setCustomWfForm(f => ({ ...f, conditionLocation: e.target.value }))}>
                          <option value="">All locations</option>
                          <option value="Thornhill">Thornhill</option>
                          <option value="Richmond Hill">Richmond Hill</option>
                          <option value="Yonge & Lawrence">Yonge &amp; Lawrence</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Only fire for course</label>
                        <select className="input-field" value={customWfForm.conditionCourse}
                          onChange={e => setCustomWfForm(f => ({ ...f, conditionCourse: e.target.value }))}>
                          <option value="">All courses</option>
                          <option value="Robotics">Robotics</option>
                          <option value="Coding">Coding</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Schedule (manual only) */}
              {customWfForm.triggerType === 'manual' && (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-700">🕐 Schedule <span className="font-normal text-gray-400 text-xs">(optional — leave blank to send manually)</span></p>
                  </div>
                  <div className="p-5">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Send automatically at</label>
                    <input
                      type="datetime-local"
                      className="input-field"
                      value={customWfForm.scheduledAt}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      onChange={e => setCustomWfForm(f => ({ ...f, scheduledAt: e.target.value }))}
                    />
                    {customWfForm.scheduledAt && (
                      <button
                        type="button"
                        onClick={() => setCustomWfForm(f => ({ ...f, scheduledAt: '' }))}
                        className="mt-2 text-xs text-red-500 hover:text-red-700"
                      >
                        × Clear schedule
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Email channel */}
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <label className="flex items-center gap-3 px-5 py-3.5 cursor-pointer bg-gray-50 border-b border-gray-100">
                  <input type="checkbox" checked={customWfForm.emailEnabled}
                    onChange={e => setCustomWfForm(f => ({ ...f, emailEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded text-primary" />
                  <span className="text-sm font-semibold text-gray-700">✉ Email Channel</span>
                </label>
                {customWfForm.emailEnabled && (
                  <div className="p-5 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Send To</label>
                      <select className="input-field" value={customWfForm.emailRecipient}
                        onChange={e => setCustomWfForm(f => ({ ...f, emailRecipient: e.target.value as 'parent' | 'admin' | 'both' }))}>
                        <option value="parent">Parent</option>
                        <option value="admin">Admin</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Subject *</label>
                      <input type="text" className="input-field" placeholder="Email subject line"
                        value={customWfForm.emailSubject}
                        onChange={e => setCustomWfForm(f => ({ ...f, emailSubject: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Message Body</label>
                      <textarea rows={3} className="input-field resize-none" placeholder="Email body content…"
                        value={customWfForm.emailBody}
                        onChange={e => setCustomWfForm(f => ({ ...f, emailBody: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>

              {/* SMS channel */}
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <label className="flex items-center gap-3 px-5 py-3.5 cursor-pointer bg-gray-50 border-b border-gray-100">
                  <input type="checkbox" checked={customWfForm.smsEnabled}
                    onChange={e => setCustomWfForm(f => ({ ...f, smsEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded text-primary" />
                  <span className="text-sm font-semibold text-gray-700">📱 SMS Channel</span>
                </label>
                {customWfForm.smsEnabled && (
                  <div className="p-5 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Send To</label>
                      <select className="input-field" value={customWfForm.smsRecipient}
                        onChange={e => setCustomWfForm(f => ({ ...f, smsRecipient: e.target.value as 'parent' | 'admin' }))}>
                        <option value="parent">Parent</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Message * <span className="font-normal text-gray-400">({customWfForm.smsBody.length}/160 chars)</span>
                      </label>
                      <textarea rows={3} maxLength={160} className="input-field resize-none" placeholder="SMS message text…"
                        value={customWfForm.smsBody}
                        onChange={e => setCustomWfForm(f => ({ ...f, smsBody: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>

              {customWfError && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{customWfError}</div>
              )}
            </div>

            <div className="flex gap-3 px-7 py-5 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setCustomWfModal(false)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={saveCustomWf} className="flex-1 btn-primary">Save Workflow</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SidebarBtn({ icon, label, active, onClick, badge, hasArrow, arrowOpen }: {
  icon: ReactNode; label: string; active?: boolean; onClick?: () => void;
  badge?: string; hasArrow?: boolean; arrowOpen?: boolean;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left"
      style={{
        background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
        color: active ? '#fff' : 'rgba(255,255,255,0.65)',
      }}>
      <span style={{ opacity: active ? 1 : 0.75 }}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-primary text-white">
          {badge}
        </span>
      )}
      {hasArrow && (
        <span style={{ opacity: 0.5 }}>
          {arrowOpen ? <IcoChevD size={13} /> : <IcoChevR size={13} />}
        </span>
      )}
    </button>
  );
}

function ConfigSection({ title, subtitle, items, onRemove, onAddClick }: {
  title: string; subtitle: string; items: ConfigItem[];
  onRemove: (id: string) => void; onAddClick: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{subtitle}</p>
        <button onClick={onAddClick} className="btn-primary text-sm py-1.5 px-4">+ Add {title.replace(/s$/, '')}</button>
      </div>
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center py-10 text-sm text-gray-400">No {title.toLowerCase()} configured yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Value / ID</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.value}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => onRemove(item.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

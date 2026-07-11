const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function authHeaders(token?: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const lmsApi = {
  // ── Trial config (Step 1 form dropdowns) ─────────────────────────────────
  async trialConfig(): Promise<{
    locations: Array<{ id: number; name: string; orbund_campus_type: string }>;
    age_groups: Array<{ id: number; name: string; course: string; orbund_program_id: string; orbund_level_id: string }>;
    semester_id: string;
  }> {
    const res = await fetch(`${BASE}/trial/config`, { headers: authHeaders() });
    return res.json();
  },

  // ── Auth ─────────────────────────────────────────────────────────────────
  async me(): Promise<{ id: number; name: string; email: string; phone?: string } | null> {
    if (typeof window === 'undefined') return null;

    // AuthContext caches the full user object under the 'user' key — use it directly
    const cached = localStorage.getItem('user');
    if (cached) {
      try {
        const u = JSON.parse(cached);
        if (u?.email) return { id: Number(u.id) || 0, name: u.name || '', email: u.email, phone: u.phone || undefined };
      } catch { /* fall through */ }
    }

    // Fallback: trial-flow users have lms_token but no 'user' key
    const token = localStorage.getItem('lms_token') || localStorage.getItem('auth_token');
    if (!token) return null;
    const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? data ?? null;
  },

  async login(email: string, password: string) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async register(name: string, email: string, password: string, phone?: string) {
    const res = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, email, password, phone }),
    });
    return res.json();
  },

  // ── Leads (Step 1) ────────────────────────────────────────────────────────
  async saveLead(payload: {
    name: string;
    email: string;
    phone: string;
    age_group?: string;
    orbund_program_id?: string;
    location?: string;
    orbund_campus_type?: string;
    level_id?: string;
    semester_id?: string;
    source?: string;
    page_url?: string;
    orbund_session_id?: string;
  }) {
    const res = await fetch(`${BASE}/leads`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // ── Enrollment (Step 5) ───────────────────────────────────────────────────
  async saveTrialEnrollment(payload: {
    parent_name: string;
    parent_email: string;
    parent_phone?: string;
    total_amount?: number;
    source?: string;
    lead_id?: number | null;
    trial_ref_id?: string | null;
    location?: string;
    course?: string;
    students?: Array<{
      orbund_unique_id?: string;
      first_name: string;
      last_name: string;
      date_of_birth?: string;
      orbund_class_id: string;
      class_date?: string | null;
      class_time?: string | null;
      course?: string;
    }>;
  }) {
    const res = await fetch(`${BASE}/trial/enrollment`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // ── Payment (Step 6) ──────────────────────────────────────────────────────
  async saveTrialPayment(payload: {
    enrollment_id: number;
    amount: number;
    orbund_transaction_id?: string;
    payment_method?: string;
  }) {
    const res = await fetch(`${BASE}/trial/payment`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // ── Confirm enrollment (Step 7) ───────────────────────────────────────────
  async confirmEnrollment(enrollmentId: number) {
    const res = await fetch(`${BASE}/trial/enrollment/${enrollmentId}/confirm`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    return res.json();
  },
};

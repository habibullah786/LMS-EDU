const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const enrollmentAPI = {
  async list(filters: {
    status?: string;
    location?: string;
    course?: string;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_order?: string;
    per_page?: number;
  } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.append(key, String(value));
    });
    const res = await fetch(`${BASE}/enrollments?${params}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch enrollments');
    return res.json();
  },

  async getStats() {
    const res = await fetch(`${BASE}/enrollments/stats`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getFilterOptions() {
    const res = await fetch(`${BASE}/enrollments/filter-options`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch filter options');
    return res.json();
  },

  async create(data: {
    parent_name: string;
    parent_email: string;
    parent_phone: string;
    total_amount: number;
    status: string;
    booking_date: string;
    students: Array<{
      student_id: number;
      class_id: string;
      class_name: string;
      course: string;
      location: string;
      instructor: string;
      price: number;
      type: string;
    }>;
  }) {
    const res = await fetch(`${BASE}/enrollments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async get(id: number) {
    const res = await fetch(`${BASE}/enrollments/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch enrollment');
    return res.json();
  },

  async update(id: number, data: Record<string, unknown>) {
    const res = await fetch(`${BASE}/enrollments/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async delete(id: number) {
    const res = await fetch(`${BASE}/enrollments/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete enrollment');
    return res.json();
  },
};

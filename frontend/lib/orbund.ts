const BASE_URL = 'https://exceed.orbundsis.com/api';
const CLIENT_ID = 'exceed';
const SECRET_KEY = 'e0b6d2f0-f73a-4af2-bd3a-5b88872a3c5e';

function headers(sessionId?: string): HeadersInit {
  return {
    clientId: CLIENT_ID,
    secretKey: SECRET_KEY,
    'Content-Type': 'application/json',
    ...(sessionId ? { sessionId } : {}),
  };
}

export const orbund = {
  // Step 1 — get a fresh session token
  async getSessionId(): Promise<string> {
    const res = await fetch(`${BASE_URL}/public/session-id`, {
      headers: headers(),
    });
    const data = await res.json();
    return data.sessionId;
  },

  // Step 1 — fetch semester options
  async getSemesters(sessionId: string) {
    const res = await fetch(`${BASE_URL}/cart/filter/semester`, {
      headers: headers(sessionId),
    });
    return res.json();
  },

  // Step 2 — list available trial classes
  async getClasses(
    sessionId: string,
    params: { campusType: string; levelId: string; programId: string; semesterId: string }
  ) {
    const query = new URLSearchParams({ ...params, programLevelId: '-1' }).toString();
    const res = await fetch(
      `${BASE_URL}/cart/multiple/program-list-with-courses?${query}`,
      { headers: headers(sessionId) }
    );
    return res.json();
  },

  // Step 3 — display cart with pricing
  async displayCart(
    sessionId: string,
    payload: { displayCartStudents: unknown[]; couponCode: string }
  ) {
    const res = await fetch(`${BASE_URL}/cart/multiple/display-cart`, {
      method: 'POST',
      headers: headers(sessionId),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Step 4 — login to Orbund
  async login(sessionId: string, username: string, password: string) {
    const res = await fetch(
      `${BASE_URL}/cart/registration/multiple/contact/login`,
      {
        method: 'POST',
        headers: headers(sessionId),
        body: JSON.stringify({ username, password }),
      }
    );
    return res.json();
  },

  // Step 4 — register with Orbund
  async register(
    sessionId: string,
    payload: {
      username: string;
      password: string;
      firstName: string;
      lastName: string;
      email: string;
      cellPhone: string;
    }
  ) {
    const res = await fetch(
      `${BASE_URL}/cart/registration/multiple/contact/register`,
      {
        method: 'POST',
        headers: headers(sessionId),
        body: JSON.stringify(payload),
      }
    );
    return res.json();
  },

  // Step 5 — link cart to Orbund contact
  async saveGroupEnrollment(sessionId: string) {
    const res = await fetch(
      `${BASE_URL}/cart/registration/multiple/contact/save-group-enrollment`,
      {
        method: 'POST',
        headers: headers(sessionId),
        body: JSON.stringify({ levelId: -1, programId: -1, programLevelId: -1 }),
      }
    );
    return res.json();
  },

  // Step 5 — get payment plans / check if free trial
  async collectPayment(sessionId: string) {
    const res = await fetch(
      `${BASE_URL}/cart/payment/multiple/collect-payment-info?regType=2`,
      { headers: headers(sessionId) }
    );
    return res.json();
  },

  // Step 5 — recalculate installments when user picks a plan
  async selectPaymentPlan(
    sessionId: string,
    payload: { classId: number; paymentPlanId: number; studentId: number }
  ) {
    const res = await fetch(
      `${BASE_URL}/cart/payment/multiple/class-invoice-installments`,
      {
        method: 'POST',
        headers: headers(sessionId),
        body: JSON.stringify(payload),
      }
    );
    return res.json();
  },

  // Step 6 — get billing form fields
  async getBillingInfo(sessionId: string) {
    const res = await fetch(
      `${BASE_URL}/cart/payment/multiple/billing-info`,
      { headers: headers(sessionId) }
    );
    return res.json();
  },

  // Step 6 — get states for a country
  async getStates(sessionId: string, countryCode: string) {
    const res = await fetch(
      `${BASE_URL}/public/states?countryCode=${countryCode}`,
      { headers: headers(sessionId) }
    );
    return res.json();
  },

  // Step 6 — process payment
  async processPayment(sessionId: string, payload: Record<string, string>) {
    const res = await fetch(
      `${BASE_URL}/cart/payment/multiple/process-payment`,
      {
        method: 'POST',
        headers: headers(sessionId),
        body: JSON.stringify(payload),
      }
    );
    return res.json();
  },

  // Step 7 — get confirmation data
  async getThankYou(sessionId: string) {
    const res = await fetch(`${BASE_URL}/cart/multiple/thankyou`, {
      headers: headers(sessionId),
    });
    return res.json();
  },
};

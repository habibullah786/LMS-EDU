const PROXY = '/api/orbund';

async function oGet(path: string, sessionId?: string, params?: Record<string, string>) {
  const url = new URL(`${PROXY}${path}`, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = {};
  if (sessionId) headers['x-session-id'] = sessionId;
  const res = await fetch(url.toString(), { headers });
  return res.json();
}

async function oPost(path: string, sessionId: string, body: unknown) {
  const res = await fetch(`${PROXY}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify(body),
  });
  return res.json();
}

export const orbundProxy = {
  getSessionId: () =>
    oGet('/public/session-id'),

  getSemesters: (sid: string) =>
    oGet('/cart/filter/semester', sid),

  getClasses: (
    sid: string,
    p: { campusType: string; levelId: string; programId: string; semesterId: string }
  ) =>
    oGet('/cart/multiple/program-list-with-courses', sid, {
      ...p,
      programLevelId: '-1',
    }),

  displayCart: (
    sid: string,
    payload: { displayCartStudents: unknown[]; couponCode: string }
  ) =>
    oPost('/cart/multiple/display-cart', sid, payload),

  login: (sid: string, username: string, password: string) =>
    oPost('/cart/registration/multiple/contact/login', sid, { username, password }),

  register: (
    sid: string,
    payload: {
      username: string;
      password: string;
      firstName: string;
      lastName: string;
      email: string;
      cellPhone: string;
    }
  ) =>
    oPost('/cart/registration/multiple/contact/register', sid, payload),

  saveGroupEnrollment: (sid: string) =>
    oPost('/cart/registration/multiple/contact/save-group-enrollment', sid, {
      levelId: -1,
      programId: -1,
      programLevelId: -1,
    }),

  collectPayment: (sid: string) =>
    oGet('/cart/payment/multiple/collect-payment-info', sid, { regType: '2' }),

  selectPaymentPlan: (
    sid: string,
    payload: { classId: number; paymentPlanId: number; studentId: number }
  ) =>
    oPost('/cart/payment/multiple/class-invoice-installments', sid, payload),

  getBillingInfo: (sid: string) =>
    oGet('/cart/payment/multiple/billing-info', sid),

  getStates: (sid: string, countryCode: string) =>
    oGet('/public/states', sid, { countryCode }),

  processPayment: (sid: string, payload: Record<string, string>) =>
    oPost('/cart/payment/multiple/process-payment', sid, payload),

  getThankYou: (sid: string) =>
    oGet('/cart/multiple/thankyou', sid),
};

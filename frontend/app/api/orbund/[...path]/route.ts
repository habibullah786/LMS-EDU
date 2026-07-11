import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://exceed.orbundsis.com/api';
const CLIENT_ID = 'exceed';
const SECRET_KEY = process.env.ORBUND_SECRET_KEY ?? 'e0b6d2f0-f73a-4af2-bd3a-5b88872a3c5e';

function orbundHeaders(sessionId?: string | null): Record<string, string> {
  return {
    clientId: CLIENT_ID,
    secretKey: SECRET_KEY,
    'Content-Type': 'application/json',
    ...(sessionId ? { sessionId } : {}),
  };
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const orbundPath = '/' + path.join('/');

  const sessionId =
    req.headers.get('x-session-id') ||
    req.nextUrl.searchParams.get('sessionId');

  const url = new URL(`${BASE}${orbundPath}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    if (key !== 'sessionId') url.searchParams.set(key, value);
  });

  const fetchOpts: RequestInit = {
    method: req.method,
    headers: orbundHeaders(sessionId),
  };

  if (req.method === 'POST') {
    fetchOpts.body = await req.text();
  }

  try {
    const res = await fetch(url.toString(), fetchOpts);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Orbund request failed' }, { status: 500 });
  }
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };

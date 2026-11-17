import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  let ip = 'localhost';
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Pick first non-internal IPv4
      if (net.family === 'IPv4' && !net.internal) {
        ip = net.address;
        break;
      }
    }
    if (ip !== 'localhost') break;
  }

  const port = process.env.PORT || '3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${ip}:${port}`;

  return NextResponse.json({ ip, baseUrl });
}

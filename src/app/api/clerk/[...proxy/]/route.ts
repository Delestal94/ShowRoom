import { handleClerkWebhook } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request) {
  return NextResponse.json({ ok: true })
}

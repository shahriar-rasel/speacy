import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };

  const expected = process.env.TEACHER_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "Missing TEACHER_PASSWORD" }, { status: 500 });
  }

  if (!password || password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

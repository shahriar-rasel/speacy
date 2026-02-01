import { NextResponse } from "next/server";
import { appendRealtimeEvent } from "@/lib/realtimeLog";

type LogRequest = {
  sessionId?: string;
  direction?: "client" | "server";
  event?: unknown;
  ts?: number;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as LogRequest;

  if (!payload.sessionId || !payload.direction || !payload.event) {
    return NextResponse.json(
      { error: "Missing sessionId, direction, or event" },
      { status: 400 }
    );
  }

  await appendRealtimeEvent({
    sessionId: payload.sessionId,
    direction: payload.direction,
    event: payload.event,
    ts: payload.ts ?? Date.now(),
  });

  return NextResponse.json({ ok: true });
}

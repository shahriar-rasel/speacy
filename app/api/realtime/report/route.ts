import { NextResponse } from "next/server";
import { generateReport } from "@/lib/realtimeReport";

type AssessmentSummary = {
  mastery_level: "novice" | "developing" | "competent" | "proficient";
  evidence: string[];
  misconceptions: string[];
  recommended_next_steps: string[];
  confidence: number;
};

type ReportRequest = {
  sessionId?: string;
  assessment?: AssessmentSummary | null;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as ReportRequest;

  if (!payload.sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  try {
    const report = await generateReport(payload.sessionId, payload.assessment ?? null);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

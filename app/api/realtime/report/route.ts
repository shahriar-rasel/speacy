import { NextResponse } from "next/server";
import { generateReport } from "@/lib/realtimeReport";
import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const student = user
      ? {
          id: user.id,
          email: user.email,
          first_name: (user.user_metadata as { first_name?: string })?.first_name ?? "",
          last_name: (user.user_metadata as { last_name?: string })?.last_name ?? "",
        }
      : null;

    const report = await generateReport(
      payload.sessionId,
      payload.assessment ?? null,
      student
    );
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

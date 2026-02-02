import { NextResponse } from "next/server";
import { listReportSummaries, readReport } from "@/lib/teacherReports";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  try {
    if (sessionId) {
      const report = await readReport(sessionId);
      return NextResponse.json({ ok: true, report });
    }

    const reports = await listReportSummaries();
    return NextResponse.json({ ok: true, reports });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

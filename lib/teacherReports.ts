import { promises as fs } from "fs";
import path from "path";

type ReportSummary = {
  sessionId: string;
  generatedAt: string;
  mastery_level: string;
  confidence: number;
};

const reportsDir = path.join(process.cwd(), "data", "reports");

const sanitizeSessionId = (input: string) =>
  input.replace(/[^a-zA-Z0-9_-]/g, "");

export async function listReportSummaries(): Promise<ReportSummary[]> {
  try {
    const files = await fs.readdir(reportsDir);
    const summaries: ReportSummary[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(reportsDir, file), "utf8");
      const payload = JSON.parse(raw) as any;
      if (!payload?.sessionId) continue;
      summaries.push({
        sessionId: payload.sessionId,
        generatedAt: payload.generatedAt ?? "",
        mastery_level: payload.report?.mastery_level ?? payload.assessment?.mastery_level ?? "",
        confidence: payload.report?.confidence ?? payload.assessment?.confidence ?? 0,
      });
    }

    summaries.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    return summaries;
  } catch {
    return [];
  }
}

export async function readReport(sessionId: string) {
  const safeId = sanitizeSessionId(sessionId);
  if (!safeId) {
    throw new Error("Invalid sessionId");
  }

  const reportPath = path.join(reportsDir, `${safeId}.json`);
  const raw = await fs.readFile(reportPath, "utf8");
  return JSON.parse(raw) as any;
}

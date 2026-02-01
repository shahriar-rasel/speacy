import { promises as fs } from "fs";
import path from "path";

type RealtimeLogEntry = {
  sessionId: string;
  direction: "client" | "server";
  event: unknown;
  ts: number;
};

const dataDir = path.join(process.cwd(), "data", "realtime-events");

const sanitizeSessionId = (input: string) =>
  input.replace(/[^a-zA-Z0-9_-]/g, "");

export async function appendRealtimeEvent(entry: RealtimeLogEntry) {
  const safeId = sanitizeSessionId(entry.sessionId);
  if (!safeId) {
    throw new Error("Invalid sessionId");
  }

  await fs.mkdir(dataDir, { recursive: true });
  const filename = path.join(dataDir, `${safeId}.jsonl`);
  const line = JSON.stringify({
    ts: entry.ts,
    direction: entry.direction,
    event: entry.event,
  });

  await fs.appendFile(filename, `${line}\n`, "utf8");
}

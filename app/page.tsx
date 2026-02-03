"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RealtimeEvent = {
  type?: string;
  transcript?: string;
  delta?: string;
  text?: string;
  name?: string;
  arguments?: string;
  item?: {
    type?: string;
    name?: string;
    arguments?: string;
  };
  response?: {
    output?: Array<{
      type?: string;
      name?: string;
      arguments?: string;
    }>;
  };
  part?: {
    type?: string;
    transcript?: string;
    text?: string;
  };
  [key: string]: unknown;
};

type EventDirection = "client" | "server";

type SessionState = "idle" | "connecting" | "active" | "stopped" | "error";

const getTextDelta = (event: RealtimeEvent) => {
  if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
    return event.delta;
  }
  if (event.type === "response.output_text.done" && typeof event.text === "string") {
    return event.text;
  }
  if (event.type === "response.output_audio_transcript.delta" && typeof event.delta === "string") {
    return event.delta;
  }
  if (
    event.type === "response.output_audio_transcript.done" &&
    typeof event.transcript === "string"
  ) {
    return event.transcript;
  }
  if (
    event.type === "response.content_part.done" &&
    event.part?.type === "audio" &&
    typeof event.part.transcript === "string"
  ) {
    return event.part.transcript;
  }
  if (
    event.type === "response.content_part.done" &&
    event.part?.type === "text" &&
    typeof event.part.text === "string"
  ) {
    return event.part.text;
  }
  return null;
};

const extractCodeBlock = (text: string) => {
  const match = text.match(/```(?:python)?\n([\s\S]*?)```/);
  if (!match) return null;
  return match[1].trim();
};

const DEFAULT_CODE_SNIPPET =
  "# Awaiting the next snippet...\n\nnumbers = [1, 2, 3]\nprint(numbers[0])";

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<SessionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [connectionState, setConnectionState] = useState("new");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assistantText, setAssistantText] = useState("");
  const [assistantLines, setAssistantLines] = useState<string[]>([]);
  const [codeSnippet, setCodeSnippet] = useState<string>(DEFAULT_CODE_SNIPPET);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    "idle" | "generating" | "ready" | "error"
  >("idle");
  const sessionIdRef = useRef<string | null>(null);
  const reportTriggeredRef = useRef(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const initialId = crypto.randomUUID();
    sessionIdRef.current = initialId;
    setSessionId(initialId);
  }, []);

  const logEvent = async (direction: EventDirection, event: RealtimeEvent) => {
    const activeSessionId = sessionIdRef.current;
    if (!activeSessionId) return;
    setEventCount((count) => count + 1);

    try {
      await fetch("/api/realtime/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          direction,
          event,
          ts: Date.now(),
        }),
      });
    } catch {
      // Logging should never block the session.
    }
  };

  const sendClientEvent = (event: RealtimeEvent) => {
    const channel = dcRef.current;
    if (!channel || channel.readyState !== "open") return false;
    channel.send(JSON.stringify(event));
    void logEvent("client", event);
    return true;
  };

  const sendCodeUpdate = () => {
    if (!codeSnippet) return;
    const message = `Updated code snippet:\n\n\`\`\`python\n${codeSnippet}\n\`\`\`\n\nAsk the student to edit the code by adding or changing something related to lists and tuples, then explain the change.`;
    const created = sendClientEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: message }],
      },
    });
    if (created) {
      sendClientEvent({ type: "response.create" });
    }
  };

  const triggerReport = async (assessment: Record<string, unknown>) => {
    const activeSessionId = sessionIdRef.current;
    if (!activeSessionId || reportTriggeredRef.current) return;
    reportTriggeredRef.current = true;
    setReportStatus("generating");

    try {
      await fetch("/api/realtime/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId, assessment }),
      });
      setReportStatus("ready");
    } catch {
      setReportStatus("error");
    } finally {
      stopSession("stopped");
    }
  };

  const parseAssessment = (event: RealtimeEvent) => {
    if (event.type === "response.function_call_arguments.done") {
      if (event.name === "assessment_complete" && typeof event.arguments === "string") {
        return event.arguments;
      }
    }

    if (event.type === "response.output_item.done") {
      if (event.item?.type === "function_call" && event.item.name === "assessment_complete") {
        return event.item.arguments;
      }
    }

    if (event.type === "response.done") {
      const call = event.response?.output?.find(
        (item) => item.type === "function_call" && item.name === "assessment_complete"
      );
      if (call?.arguments) return call.arguments;
    }

    return null;
  };

  const handleServerEvent = (event: RealtimeEvent) => {
    const textDelta = getTextDelta(event);
    if (textDelta) {
      setAssistantText((prev) => {
        if (
          event.type === "response.output_text.done" ||
          event.type === "response.output_audio_transcript.done" ||
          event.type === "response.content_part.done"
        ) {
          return textDelta;
        }
        return `${prev}${textDelta}`;
      });
    }

    if (event.type === "response.created") {
      setAssistantText("");
      setAiSpeaking(true);
    }

    if (event.type === "response.output_audio.delta") {
      setAiSpeaking(true);
    }

    if (event.type === "response.output_audio.done" || event.type === "response.done") {
      setAiSpeaking(false);
    }

    if (
      (event.type === "response.output_text.done" ||
        event.type === "response.output_audio_transcript.done" ||
        event.type === "response.content_part.done") &&
      textDelta
    ) {
      setAssistantLines((prev) => {
        const last = prev[prev.length - 1];
        if (last === textDelta) return prev;
        return [...prev, textDelta];
      });

      const extracted = extractCodeBlock(textDelta);
      if (extracted) {
        setCodeSnippet(extracted);
      }
    }

    const assessmentArgs = parseAssessment(event);
    if (assessmentArgs) {
      try {
        const parsed = JSON.parse(assessmentArgs) as Record<string, unknown>;
        void triggerReport(parsed);
      } catch {
        // Ignore malformed tool call args.
      }
    }
  };

  const startSession = async () => {
    if (status === "connecting" || status === "active") return;
    const newSessionId = crypto.randomUUID();
    sessionIdRef.current = newSessionId;
    setSessionId(newSessionId);
    setStatus("connecting");
    setError(null);
    setEventCount(0);
    setAssistantText("");
    setAssistantLines([]);
    setCodeSnippet(DEFAULT_CODE_SNIPPET);
    setAiSpeaking(false);
    setReportStatus("idle");
    reportTriggeredRef.current = false;

    try {
      const tokenResponse = await fetch("/api/realtime/token", { method: "POST" });
      if (!tokenResponse.ok) {
        throw new Error("Failed to mint client secret.");
      }
      const tokenPayload = await tokenResponse.json();
      const clientSecret = tokenPayload?.value;
      if (!clientSecret) {
        throw new Error("Missing client secret in response.");
      }

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (audioRef.current && stream) {
          audioRef.current.srcObject = stream;
        }
      };

      const channel = pc.createDataChannel("oai-events");
      dcRef.current = channel;

      channel.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as RealtimeEvent;
          handleServerEvent(payload);
          void logEvent("server", payload);
        } catch {
          // Ignore malformed events.
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      micStreamRef.current = stream;
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        throw new Error("Failed to negotiate WebRTC session.");
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setStatus("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      stopSession("error");
    }
  };

  const stopSession = (nextStatus: SessionState = "stopped") => {
    dcRef.current?.close();
    dcRef.current = null;

    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;

    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    setAiSpeaking(false);
    setStatus(nextStatus);
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
    } catch {
      router.push("/auth/login");
    }
  };

  const assistantPlaceholder =
    status === "active" ? "Listening for your response..." : "Start a session to begin.";
  const lastLine = assistantLines[assistantLines.length - 1];
  const assistantScript =
    assistantText && assistantText !== lastLine
      ? [...assistantLines, assistantText]
      : assistantLines;

  useEffect(() => {
    const container = transcriptRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [assistantScript.length]);

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">Speacy</div>
        <div className="pill-row">
          <span className={`pill pill-${status}`}>{status}</span>
          <span className="pill">{connectionState}</span>
          <span className="pill mono">events {eventCount}</span>
          <span className="pill mono">report {reportStatus}</span>
          <button className="btn ghost" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-left">
          <div className="hero-copy">
            <p className="eyebrow">Realtime formative professor</p>
            <h1>Adaptive CS tutor that thinks out loud.</h1>
            <p className="lead">
              Socratic questioning with live voice. Hints, reframes, and new questions when
              students get stuck.
            </p>

            <div className="controls">
              <button
                className="btn primary"
                onClick={startSession}
                disabled={!sessionId || status === "connecting" || status === "active"}
              >
                Start session
              </button>
              <button
                className="btn ghost"
                onClick={() => stopSession("stopped")}
                disabled={status !== "active" && status !== "connecting"}
              >
                Stop
              </button>
              <span className="pill mono">session {sessionId ?? "-"}</span>
            </div>

            {error ? <div className="error">{error}</div> : null}
          </div>

          <div className="panels">
            <div className="card transcript-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">Professor transcript</div>
                  <div className="panel-subtitle">Live prompts and follow-ups</div>
                </div>
                <span className={`pill ${aiSpeaking ? "pill-active" : "pill-idle"}`}>
                  {aiSpeaking ? "speaking" : "listening"}
                </span>
              </div>
              {assistantScript.length === 0 ? (
                <div className="ai-message muted">{assistantPlaceholder}</div>
              ) : (
                <div className="ai-script" ref={transcriptRef}>
                  {assistantScript.map((line, index) => (
                    <div
                      key={`${line}-${index}`}
                      className={`ai-message ${index === assistantScript.length - 1 ? "" : "muted"}`}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card code-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">Code under discussion</div>
                  <div className="panel-subtitle">AI-provided snippet to explain</div>
                </div>
                <div className="panel-actions">
                  <span className="pill mono">python</span>
                  <button className="btn ghost" onClick={sendCodeUpdate}>
                    Send update
                  </button>
                </div>
              </div>
              <textarea
                className="code-editor"
                spellCheck={false}
                value={codeSnippet}
                onChange={(event) => setCodeSnippet(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className={`portrait ${aiSpeaking ? "portrait-speaking" : ""}`}>
            <img src="/cordova.png" alt="Professor Cordova" />
          </div>
        </div>
      </section>

      <audio ref={audioRef} autoPlay />
    </main>
  );
}

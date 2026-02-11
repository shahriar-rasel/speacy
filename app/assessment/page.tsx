
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Transcript } from "@/components/Transcript";
import { CodePanel } from "@/components/CodePanel";
import { MOCK_TRANSCRIPT, MOCK_CODE_SQL, MOCK_CODE_PYTHON } from "@/lib/data";
import { Mic, Square, Settings, User } from "lucide-react";

export default function AssessmentPage() {
    const router = useRouter();
    const [activeCode, setActiveCode] = useState<string>(MOCK_CODE_SQL);
    const [activeLanguage, setActiveLanguage] = useState<string>("sql");
    const [assessmentId, setAssessmentId] = useState<string | null>(null);
    const [sessionStatus, setSessionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");

    const [messages, setMessages] = useState(MOCK_TRANSCRIPT);
    const messagesRef = useRef(messages);
    const assessmentIdRef = useRef<string | null>(null);

    useEffect(() => {
        assessmentIdRef.current = assessmentId;
    }, [assessmentId]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);

    // Auto-scroll to bottom of transcript
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const startSession = async () => {
        try {
            setSessionStatus("connecting");
            setMessages([]); // Clear previous transcript

            // 0. Create Assessment in DB
            const assessmentRes = await fetch("/api/assessment", {
                method: "POST",
                body: JSON.stringify({ topic: "Lists and Tuples" })
            });
            const assessmentData = await assessmentRes.json();
            if (assessmentData.assessmentId) {
                setAssessmentId(assessmentData.assessmentId);
            } else {
                console.error("Failed to create assessment:", assessmentData.error);
                alert("Failed to start assessment. Please try again.");
                setSessionStatus("disconnected");
                return;
            }

            // 1. Get ephemeral token from our server
            const tokenResponse = await fetch("/api/session", { method: "POST" });
            const data = await tokenResponse.json();
            const EPHEMERAL_KEY = data.client_secret.value;

            // 2. Create PeerConnection
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            // Set up simple audio playback
            const audioEl = document.createElement("audio");
            audioEl.autoplay = true;
            audioRef.current = audioEl;

            pc.ontrack = (e) => {
                audioEl.srcObject = e.streams[0];
            };

            // Add local microphone
            const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
            pc.addTrack(ms.getTracks()[0]);

            // 3. Create Data Channel for events
            const dc = pc.createDataChannel("oai-events");
            dcRef.current = dc;

            dc.addEventListener("message", (e) => {
                try {
                    const event = JSON.parse(e.data);

                    if (event.type === 'response.output_item.done') {
                        const item = event.item;
                        if (item.type === 'function_call' && item.name === 'end_assessment') {
                            // Wait a moment for audio to finish (approximate)
                            setTimeout(() => {
                                endSession();
                            }, 2000);
                        }
                    }

                    if (event.type === 'response.audio_transcript.delta') {
                        setMessages(prev => {
                            const lastMsg = prev[prev.length - 1];
                            if (lastMsg && lastMsg.role === 'assistant') {
                                return [
                                    ...prev.slice(0, -1),
                                    { ...lastMsg, content: lastMsg.content + event.delta }
                                ];
                            } else {
                                return [...prev, { role: 'assistant', content: event.delta }];
                            }
                        });
                    }

                    if (event.type === 'conversation.item.input_audio_transcription.completed') {
                        setMessages(prev => [
                            ...prev,
                            { role: 'user', content: event.transcript }
                        ]);
                    }
                } catch (err) {
                    console.error("Error parsing event", err);
                }
            });

            // 4. Offer / Answer exchange
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const baseUrl = "https://api.openai.com/v1/realtime";
            const model = "gpt-4o-realtime-preview-2024-12-17";

            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${EPHEMERAL_KEY}`,
                    "Content-Type": "application/sdp",
                },
            });

            const answerSdp = await sdpResponse.text();
            const answer = { type: "answer" as RTCSdpType, sdp: answerSdp };
            await pc.setRemoteDescription(answer);

            setSessionStatus("connected");

            // Trigger AI to start speaking (Greeting)
            if (dc.readyState === "open") {
                dc.send(JSON.stringify({ type: "response.create", response: { modalities: ["text", "audio"] } }));
            } else {
                dc.onopen = () => {
                    dc.send(JSON.stringify({ type: "response.create", response: { modalities: ["text", "audio"] } }));
                };
            }

        } catch (err) {
            console.error("Failed to start session:", err);
            setSessionStatus("disconnected");
        }
    };

    const endSession = async () => {
        pcRef.current?.close();
        pcRef.current = null;
        setSessionStatus("disconnected");

        const currentAssessmentId = assessmentIdRef.current;

        // Trigger Grading
        if (currentAssessmentId) {
            try {
                const response = await fetch("/api/grade", {
                    method: "POST",
                    body: JSON.stringify({
                        assessmentId: currentAssessmentId,
                        messages: messagesRef.current
                    })
                });

                if (response.ok) {
                    router.push(`/results/${currentAssessmentId}`);
                } else {
                    console.error("Failed to grade assessment");
                    alert("Failed to grade assessment. Please check console.");
                }
            } catch (e) {
                console.error("Error submitting grade:", e);
                alert("Error submitting grade. Please check console.");
            }
        } else {
            console.error("No assessment ID found to grade");
        }
    }


    const toggleSession = () => {
        if (sessionStatus === "connected" || sessionStatus === "connecting") {
            endSession();
        } else {
            startSession();
        }
    };

    // Demo toggle for code context
    const toggleCode = () => {
        if (activeLanguage === "sql") {
            setActiveCode(MOCK_CODE_PYTHON);
            setActiveLanguage("python");
        } else {
            setActiveCode(MOCK_CODE_SQL);
            setActiveLanguage("sql");
        }
    };

    return (
        <div className="flex h-screen bg-black text-zinc-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="hidden md:flex w-16 border-r border-zinc-800 flex-col items-center py-6 gap-6 bg-zinc-950 sticky top-0 h-screen">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/20">S</div>
                <nav className="flex flex-col gap-4 mt-auto">
                    <button className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors"><Settings className="w-5 h-5" /></button>
                    <button className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors"><User className="w-5 h-5" /></button>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full bg-zinc-900">
                {/* Header */}
                <header className="h-16 border-b bg-zinc-950 border-zinc-800 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
                    <div>
                        <h1 className="text-lg font-semibold text-zinc-100">Formative Assessment</h1>
                        <p className="text-xs text-zinc-400 hidden sm:block">Topic: Database Optimization • Voice Mode</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {sessionStatus === 'connected' && (
                            <span className="flex px-3 py-1 rounded-full bg-red-900/30 text-red-400 text-xs font-medium border border-red-800 items-center gap-2 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Recording
                            </span>
                        )}
                        <button
                            onClick={toggleCode}
                            className="px-3 py-1.5 text-sm border border-zinc-700 rounded-md hover:bg-zinc-800 text-zinc-300 transition-colors font-medium"
                        >
                            {activeLanguage === 'sql' ? 'View Python' : 'View SQL'}
                        </button>
                    </div>
                </header>

                {/* Split View */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

                    {/* Left Panel: Conversation / Transcript */}
                    <div className="flex-1 md:w-1/2 flex flex-col border-r border-zinc-800 bg-zinc-950 relative z-0">
                        <div className="flex-1 overflow-y-auto scroll-smooth p-4 pb-32">
                            <Transcript messages={messages} />
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Voice Controls (Fixed Bottom) */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 p-2 rounded-full z-20">
                            <button
                                onClick={toggleSession}
                                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform hover:scale-105 ${sessionStatus === 'connected'
                                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-red-600/30'
                                    : sessionStatus === 'connecting'
                                        ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                                    }`}
                            >
                                {sessionStatus === 'connected' ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-8 h-8" />}
                            </button>
                            {sessionStatus === 'disconnected' && (
                                <div className="absolute top-full mt-2 w-max text-xs text-zinc-400 font-medium bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-zinc-800">
                                    Click to start oral exam
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Code Visualization (Editable) */}
                    <div className="hidden md:flex md:w-1/2 bg-[#1e1e1e] border-l border-zinc-800 flex-col h-full overflow-hidden">
                        <CodePanel
                            code={activeCode}
                            language={activeLanguage}
                            isEditable={true}
                            onChange={(newCode) => setActiveCode(newCode)}
                            className="h-full rounded-none border-0"
                        />
                    </div>

                    {/* Mobile Code View */}
                    <div className="md:hidden h-64 bg-[#1e1e1e] border-t border-zinc-800 flex flex-col shrink-0">
                        <CodePanel
                            code={activeCode}
                            language={activeLanguage}
                            isEditable={true}
                            onChange={(newCode) => setActiveCode(newCode)}
                            className="h-full rounded-none border-0"
                        />
                    </div>

                </div>
            </main>
        </div>
    );
}

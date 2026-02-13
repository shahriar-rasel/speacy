
"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Transcript } from "@/components/Transcript";
import { CodePanel } from "@/components/CodePanel";
import { MOCK_TRANSCRIPT, MOCK_CODE_SQL, MOCK_CODE_PYTHON } from "@/lib/data";
import { Mic, Square, Settings, User, ArrowLeft, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { buildExaminerPrompt } from "@/lib/prompts";

import dynamic from 'next/dynamic';

const HumeVoiceWrapper = dynamic(() => import("@/components/HumeVoiceWrapper"), { ssr: false });

function AssessmentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const assignmentIdParam = searchParams.get('assignmentId');

    const [mode, setMode] = useState<'openai' | 'hume'>('openai'); // Default to OpenAI

    const [activeCode, setActiveCode] = useState<string>(MOCK_CODE_SQL);
    const [activeLanguage, setActiveLanguage] = useState<string>("sql");
    const [assessmentId, setAssessmentId] = useState<string | null>(null);
    const [sessionStatus, setSessionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
    const [assignmentData, setAssignmentData] = useState<any>(null);

    const [messages, setMessages] = useState<any[]>(MOCK_TRANSCRIPT);
    const messagesRef = useRef(messages);
    const assessmentIdRef = useRef<string | null>(null);

    useEffect(() => {
        assessmentIdRef.current = assessmentId;
    }, [assessmentId]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Fetch Assignment Data
    useEffect(() => {
        const fetchAssignment = async () => {
            if (assignmentIdParam) {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('assignments')
                    .select('*')
                    .eq('id', assignmentIdParam)
                    .single();

                if (data) {
                    setAssignmentData(data);
                }
            }
        };
        fetchAssignment();
    }, [assignmentIdParam]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const lastAiEndTimeRef = useRef<number>(Date.now());

    // Auto-scroll to bottom of transcript
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Clean up connections on unmount or mode switch
    useEffect(() => {
        return () => {
            if (pcRef.current) pcRef.current.close();
            if (dcRef.current) dcRef.current.close();
        }
    }, [mode]);

    const startSession = async () => {
        try {
            setSessionStatus("connecting");
            setMessages([]); // Clear previous transcript

            const topic = assignmentData?.topic || "Lists and Tuples";

            // 0. Create Assessment in DB
            const assessmentRes = await fetch("/api/assessment", {
                method: "POST",
                body: JSON.stringify({
                    topic,
                    assignmentId: assignmentIdParam
                })
            });
            const assessmentResData = await assessmentRes.json();
            if (assessmentResData.assessmentId) {
                setAssessmentId(assessmentResData.assessmentId);
            } else {
                console.error("Failed to create assessment:", assessmentResData.error);
                alert("Failed to start assessment. Please try again.");
                setSessionStatus("disconnected");
                return;
            }

            // Construct Instructions from shared prompt
            const instructions = buildExaminerPrompt({
                topic,
                description: assignmentData?.description,
                questions: assignmentData?.questions?.map((q: any) => q.prompt),
                learningGoals: assignmentData?.learning_goals,
            });

            // 1. Get ephemeral token from our server
            const tokenResponse = await fetch("/api/session", {
                method: "POST",
                body: JSON.stringify({ instructions })
            });
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
                        // Mark when AI finished speaking
                        if (item.type === 'message') {
                            lastAiEndTimeRef.current = Date.now();
                        }
                    }

                    if (event.type === 'response.audio_transcript.delta') {
                        setMessages(prev => {
                            const lastMsg = prev[prev.length - 1];
                            const now = Date.now();
                            if (lastMsg && lastMsg.role === 'assistant') {
                                return [
                                    ...prev.slice(0, -1),
                                    {
                                        ...lastMsg,
                                        content: lastMsg.content + event.delta,
                                        metadata: {
                                            ...lastMsg.metadata,
                                            endTime: now // continuously update end time
                                        }
                                    }
                                ];
                            } else {
                                return [...prev, {
                                    role: 'assistant',
                                    content: event.delta,
                                    metadata: {
                                        startTime: now,
                                        endTime: now
                                    }
                                }];
                            }
                        });
                    }

                    if (event.type === 'conversation.item.input_audio_transcription.completed') {
                        const now = Date.now();
                        const latency = now - lastAiEndTimeRef.current;

                        setMessages(prev => [
                            ...prev,
                            {
                                role: 'user',
                                content: event.transcript,
                                metadata: {
                                    startTime: now, // approximate
                                    endTime: now,
                                    latency: latency > 0 ? latency : 0
                                }
                            }
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

            // Trigger AI to start speaking (Greeting) - with delay
            const triggerGreeting = () => {
                // Wait 2 seconds before speaking to let user settle in
                setTimeout(() => {
                    dc.send(JSON.stringify({ type: "response.create", response: { modalities: ["text", "audio"] } }));
                }, 2000);
            };

            if (dc.readyState === "open") {
                triggerGreeting();
            } else {
                dc.onopen = () => {
                    triggerGreeting();
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
            if (!messagesRef.current || messagesRef.current.length === 0) {
                alert("Error: Transcript is empty. Please contact support.");
                return;
            }

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
                    const errData = await response.json();
                    alert(`Failed to grade: ${errData.error || "Unknown error"}`);
                }
            } catch (e) {
                console.error("Error submitting grade:", e);
                alert("Error submitting grade. Check console.");
            }
        } else {
            console.error("No assessment ID found to grade");
        }
    };


    const toggleSession = () => {
        if (mode === 'hume') return; // Handled by wrapper

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
        <div className="flex h-screen bg-background overflow-hidden font-sans">
            {/* Background Mesh Gradient */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_50%,_rgba(139,92,246,0.1)_0%,_transparent_50%)]" />

            {/* Sidebar */}
            <aside className="hidden md:flex w-20 border-r border-white/5 flex-col items-center py-6 gap-8 bg-black/40 backdrop-blur-md z-20">
                <button onClick={() => router.push('/dashboard')} className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold hover:bg-primary/30 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <nav className="flex flex-col gap-6 mt-auto">
                    <button className="p-3 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white transition-all hover:scale-105"><Settings size={22} /></button>
                    <button className="p-3 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white transition-all hover:scale-105"><User size={22} /></button>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full bg-transparent z-10 relative">
                {/* Modern Header */}
                <header className="h-16 px-6 flex items-center justify-between shrink-0 border-b border-white/5 bg-black/20 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-1 bg-primary rounded-full" />
                        <div>
                            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Database Optimization</h1>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live Assessment
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Progress Pill */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-mono text-zinc-400">
                            <Zap size={12} className="text-yellow-500" />
                            <span>XP: 100</span>
                        </div>

                        <button
                            onClick={toggleCode}
                            className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-white/10 rounded-lg hover:bg-white/5 text-zinc-400 transition-all hover:text-white hover:border-white/20"
                        >
                            {activeLanguage === 'sql' ? 'Switch to Python' : 'Switch to SQL'}
                        </button>
                    </div>
                </header>

                {/* Glassy Split View */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">

                    {/* Left Panel: Conversation */}
                    <div className="flex-1 md:w-1/2 flex flex-col rounded-2xl glass-panel relative overflow-hidden">
                        <div className="flex-1 overflow-y-auto scroll-smooth p-6 pb-32 custom-scrollbar">
                            <div className="flex justify-center mb-4">
                                <div className="bg-black/40 p-1 rounded-lg flex items-center gap-1 border border-white/10">
                                    <button
                                        onClick={() => {
                                            if (sessionStatus === 'disconnected') setMode('openai');
                                        }}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'openai' ? 'bg-white/10 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        Standard (OpenAI)
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (sessionStatus === 'disconnected') setMode('hume');
                                        }}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'hume' ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        Empathic (Hume)
                                    </button>
                                </div>
                            </div>

                            <Transcript messages={messages} />
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Floating Voice Control Bar */}
                        {mode === 'openai' ? (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2 pr-6 pl-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl z-30 transition-all duration-500 hover:scale-105 hover:border-primary/30">

                                <button
                                    onClick={toggleSession}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${sessionStatus === 'connected'
                                        ? 'bg-red-500 text-white animate-orb-breath shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                                        : sessionStatus === 'connecting'
                                            ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                                            : 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]'
                                        }`}
                                >
                                    {sessionStatus === 'connected' ? <Square size={20} fill="currentColor" /> : <Mic size={24} />}
                                </button>

                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold ${sessionStatus === 'connected' ? 'text-white' : 'text-zinc-400'}`}>
                                        {sessionStatus === 'connected' ? 'Listening...' : sessionStatus === 'connecting' ? 'Connecting...' : 'Start Exam'}
                                    </span>
                                    <span className="text-[10px] text-zinc-600 font-mono uppercase">
                                        {sessionStatus === 'connected' ? '00:42 / 05:00' : 'Ready to start'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <HumeVoiceWrapper
                                onMessage={(msg) => setMessages(prev => [...prev, msg])}
                                onStatusChange={(status) => setSessionStatus(status as any)}
                                instructions={buildExaminerPrompt({
                                    topic: assignmentData?.topic || "Lists and Tuples",
                                    description: assignmentData?.description,
                                    questions: assignmentData?.questions?.map((q: any) => q.prompt),
                                    learningGoals: assignmentData?.learning_goals,
                                })}
                                onAssessmentComplete={endSession}
                                onStart={async () => {
                                    const topic = assignmentData?.topic || "Lists and Tuples";
                                    const assessmentRes = await fetch("/api/assessment", {
                                        method: "POST",
                                        body: JSON.stringify({
                                            topic,
                                            assignmentId: assignmentIdParam
                                        })
                                    });
                                    const assessmentResData = await assessmentRes.json();
                                    if (assessmentResData.assessmentId) {
                                        setAssessmentId(assessmentResData.assessmentId);
                                    } else {
                                        console.error("Failed to create assessment:", assessmentResData.error);
                                        alert("Failed to start assessment. Please try again.");
                                        throw new Error("Failed to create assessment");
                                    }
                                }}
                            />
                        )}
                    </div>

                    {/* Right Panel: Code Visualization */}
                    <div className="hidden md:flex md:w-1/2 flex-col h-full overflow-hidden rounded-2xl shadow-2xl">
                        <CodePanel
                            code={activeCode}
                            language={activeLanguage}
                            isEditable={true}
                            onChange={(newCode) => setActiveCode(newCode)}
                            className="h-full border border-white/10"
                        />
                    </div>

                    {/* Mobile Code View */}
                    <div className="md:hidden h-64 flex flex-col shrink-0 rounded-2xl overflow-hidden glass-panel">
                        <CodePanel
                            code={activeCode}
                            language={activeLanguage}
                            isEditable={true}
                            onChange={(newCode) => setActiveCode(newCode)}
                            className="h-full border-0"
                        />
                    </div>

                </div>
            </main>
        </div>
    );
}

export default function AssessmentPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-background text-zinc-400">
                Loading assessment...
            </div>
        }>
            <AssessmentContent />
        </Suspense>
    );
}

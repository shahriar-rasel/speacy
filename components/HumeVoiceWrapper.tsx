
"use client";

import { VoiceProvider, useVoice, VoiceReadyState } from "@humeai/voice-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Square, AlertTriangle } from "lucide-react";

// Access token fetcher
const fetchAccessToken = async () => {
    const response = await fetch("/api/hume/auth");
    const data = await response.json();
    return { accessToken: data.accessToken, configId: data.configId };
};

interface HumeVoiceWrapperProps {
    onMessage: (message: any) => void;
    onStatusChange: (status: string) => void;
    configId?: string;
    instructions?: string;
    onAssessmentComplete?: () => void;
    onStart?: () => Promise<void>;
}

interface HumeVoiceInnerProps extends HumeVoiceWrapperProps {
    accessToken: string;
    configId: string;
}

function HumeVoiceInner({ onMessage, onStatusChange, accessToken, configId, instructions, onAssessmentComplete, onStart }: HumeVoiceInnerProps) {
    // @ts-ignore - Ignore potential signature mismatch for connect/disconnect
    const { connect, disconnect, readyState, messages, sendToolMessage, status, error } = useVoice();
    const [isConnected, setIsConnected] = useState(false);
    const [unexpectedDisconnect, setUnexpectedDisconnect] = useState(false);
    const wasConnectedRef = useRef(false);

    // Sync connection state with parent + detect unexpected disconnects
    useEffect(() => {
        let status = 'disconnected';
        if (readyState === VoiceReadyState.OPEN) {
            status = 'connected';
            wasConnectedRef.current = true;
            setUnexpectedDisconnect(false);
        } else if (readyState === VoiceReadyState.CONNECTING) {
            status = 'connecting';
        } else if (wasConnectedRef.current && !isEndingRef.current) {
            // Connection dropped unexpectedly (not via end_assessment or manual end)
            console.warn('Hume session disconnected unexpectedly');
            setUnexpectedDisconnect(true);
            wasConnectedRef.current = false;

            // Auto-submit for grading so the transcript isn't lost
            if (onAssessmentComplete) {
                setTimeout(() => {
                    onAssessmentComplete();
                }, 1000);
            }
        }

        onStatusChange(status);
        setIsConnected(readyState === VoiceReadyState.OPEN);
    }, [readyState, onStatusChange, onAssessmentComplete]);

    // Send new messages to parent
    const lastMessageCountRef = useRef(0);
    const lastAssistantEndTimeRef = useRef(0);
    useEffect(() => {
        if (messages.length > lastMessageCountRef.current) {
            // Get new messages
            const newMessages = messages.slice(lastMessageCountRef.current);
            newMessages.forEach((msg: any) => {
                // Type guard/check for message content
                if (msg.type === 'user_message' || msg.type === 'assistant_message') {
                    const role = msg.type === 'user_message' ? 'user' : 'assistant';
                    const content = msg.message?.content || "";
                    const now = Date.now();

                    // Build metadata with timestamps
                    let metadata: any = {
                        startTime: msg.receivedAt ? new Date(msg.receivedAt).getTime() : now,
                        endTime: now,
                    };

                    if (msg.type === 'user_message') {
                        // Compute latency: time since last assistant message ended
                        if (lastAssistantEndTimeRef.current > 0) {
                            metadata.latency = now - lastAssistantEndTimeRef.current;
                        }
                        // Capture prosody if available
                        if (msg.models?.prosody?.scores) {
                            metadata.prosody = msg.models.prosody.scores;
                        }
                    } else {
                        // Track when assistant finishes speaking
                        lastAssistantEndTimeRef.current = now;
                    }

                    if (content) {
                        onMessage({
                            role,
                            content,
                            metadata
                        });
                    }
                }
            });
            lastMessageCountRef.current = messages.length;

            // Failsafe: Check if AI said "exam is complete" but didn't call tool
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.type === 'assistant_message' && !isEndingRef.current) {
                const content = lastMsg.message?.content?.toLowerCase() || "";
                if (content.includes("exam is complete") || content.includes("assessment is complete")) {
                    handleManualEnd();
                }
            }
        }
    }, [messages, onMessage]);

    const isEndingRef = useRef(false);

    const handleManualEnd = async () => {
        if (isEndingRef.current) return;
        isEndingRef.current = true;

        await new Promise(resolve => setTimeout(resolve, 2000));

        if (onAssessmentComplete) {
            try {
                await onAssessmentComplete();
            } catch (e) {
                // Fail silently
            }
        }
        disconnect();
    };

    const toggleSession = async () => {
        if (isConnected) {
            disconnect();
        } else {
            isEndingRef.current = false;

            if (onStart) {
                try {
                    await onStart();
                } catch (e) {
                    return;
                }
            }

            const sessionSettings: any = {};

            if (instructions) {
                sessionSettings.systemPrompt = instructions;
            }

            // Define tools
            sessionSettings.tools = [
                {
                    type: "function",
                    name: "end_assessment",
                    parameters: "{}",
                    description: "Call this function when the exam is complete or the student asks to stop."
                }
            ];

            // @ts-ignore
            connect({
                configId,
                // @ts-ignore
                auth: { type: "accessToken", value: accessToken } as any,
                sessionSettings: sessionSettings as any
            })
                .then(() => { })
                .catch(e => { console.error(e) });
        }
    };

    return (
        <>
            {/* Unexpected disconnect banner */}
            {unexpectedDisconnect && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 backdrop-blur-xl shadow-lg animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-yellow-300">Connection lost</p>
                        <p className="text-xs text-yellow-400/70">The session ended unexpectedly. Your transcript is being submitted for grading.</p>
                    </div>
                </div>
            )}

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2 pr-6 pl-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl z-30 transition-all duration-500 hover:scale-105 hover:border-purple-500/30">
                <button
                    onClick={toggleSession}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${isConnected
                        ? 'bg-red-500 text-white animate-orb-breath shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                        : readyState === VoiceReadyState.CONNECTING
                            ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                            : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)]'
                        }`}
                >
                    {isConnected ? <Square size={20} fill="currentColor" /> : <Mic size={24} />}
                </button>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">
                        {isConnected ? "Listening..." : readyState === VoiceReadyState.CONNECTING ? "Connecting..." : "Start Exam (Hume)"}
                    </span>
                    <span className="text-xs text-zinc-400">
                        {isConnected ? "Speak clearly" : "Tap to begin"}
                    </span>
                </div>
            </div>
        </>
    );
}

export default function HumeVoiceWrapper(props: HumeVoiceWrapperProps) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [fetchedConfigId, setFetchedConfigId] = useState<string | null>(null);
    const configId = fetchedConfigId || process.env.NEXT_PUBLIC_HUME_CONFIG_ID || props.configId;

    useEffect(() => {
        fetchAccessToken().then((data) => {
            setAccessToken(data.accessToken);
            if (data.configId) setFetchedConfigId(data.configId);
        }).catch(console.error);
    }, []);

    if (!accessToken || !configId) {
        // Can render a loading state or nothing
        return null;
    }

    const handleToolCall = async (toolCall: any, send: any) => {
        if (toolCall.name === 'end_assessment') {
            // Wait a moment for final messages to sync logic to run in the inner component
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (props.onAssessmentComplete) {
                try {
                    props.onAssessmentComplete();
                } catch (e) {
                    // Fail silently
                }
            }
            return send.success("Assessment ended.");
        }
    };

    return (
        <VoiceProvider
            onToolCall={handleToolCall}
            clearMessagesOnDisconnect={false}
            onError={(error) => {
                console.error('Hume VoiceProvider error:', error.type, error.reason, error.message, error.error);
            }}
            onClose={(event) => {
                console.warn('Hume VoiceProvider connection closed. Code:', event?.code, 'Reason:', event?.reason);
            }}
        >
            <HumeVoiceInner {...props} accessToken={accessToken} configId={configId} />
        </VoiceProvider>
    );
}

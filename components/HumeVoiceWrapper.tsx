
"use client";

import { VoiceProvider, useVoice, VoiceReadyState } from "@humeai/voice-react";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

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
    const { connect, disconnect, readyState, messages, sendToolMessage } = useVoice();
    const [isConnected, setIsConnected] = useState(false);

    // Sync connection state with parent
    useEffect(() => {
        let status = 'disconnected';
        if (readyState === VoiceReadyState.OPEN) status = 'connected';
        else if (readyState === VoiceReadyState.CONNECTING) status = 'connecting';

        onStatusChange(status);
        setIsConnected(readyState === VoiceReadyState.OPEN);
    }, [readyState, onStatusChange]);

    // Send new messages to parent
    const lastMessageCountRef = useRef(0);
    useEffect(() => {
        if (messages.length > lastMessageCountRef.current) {
            // Get new messages
            const newMessages = messages.slice(lastMessageCountRef.current);
            newMessages.forEach((msg: any) => {
                // Type guard/check for message content
                if (msg.type === 'user_message' || msg.type === 'assistant_message') {
                    const role = msg.type === 'user_message' ? 'user' : 'assistant';
                    const content = msg.message?.content || "";

                    // Capture prosody if available (in user_message)
                    let metadata = {};
                    if (msg.type === 'user_message' && msg.models?.prosody?.scores) {
                        metadata = {
                            prosody: msg.models.prosody.scores
                        };
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
        >
            <HumeVoiceInner {...props} accessToken={accessToken} configId={configId} />
        </VoiceProvider>
    );
}

"use client";

import { useState } from "react";
import { RotateCcw, Loader2, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ReevaluateButtonProps {
    assessmentId: string;
}

export default function ReevaluateButton({ assessmentId }: ReevaluateButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleReevaluate = async () => {
        if (loading || done) return;
        setLoading(true);

        try {
            const res = await fetch("/api/reevaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assessmentId }),
            });

            if (res.ok) {
                setDone(true);
                router.refresh();
                // Reset done state after a moment
                setTimeout(() => setDone(false), 3000);
            } else {
                const data = await res.json();
                alert("Reevaluation failed: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Reevaluation error:", error);
            alert("An error occurred during reevaluation.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleReevaluate}
            disabled={loading}
            className={`
                px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all
                ${done
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20 hover:border-yellow-500/40"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
            `}
        >
            {loading ? (
                <>
                    <Loader2 size={12} className="animate-spin" />
                    Grading…
                </>
            ) : done ? (
                <>
                    <CheckCircle size={12} />
                    Updated
                </>
            ) : (
                <>
                    <RotateCcw size={12} />
                    Reevaluate
                </>
            )}
        </button>
    );
}


import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, AlertCircle, TrendingUp, ArrowRight, RotateCcw, Home } from "lucide-react";
import clsx from "clsx";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: assessment } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", id)
        .single();

    if (!assessment) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">404</h1>
                    <p className="text-zinc-400">Assessment not found</p>
                    <Link href="/dashboard" className="mt-6 inline-block text-primary hover:underline">Return Home</Link>
                </div>
            </div>
        );
    }

    let feedbackData = null;
    try {
        feedbackData = JSON.parse(assessment.feedback);
    } catch (e) {
        console.error("Error parsing feedback JSON", e);
    }

    const score = assessment.total_score || 0;
    let gradeColor = "text-zinc-400";
    let gradeText = "Pending";

    if (score >= 90) { gradeColor = "text-emerald-400"; gradeText = "Excellent"; }
    else if (score >= 80) { gradeColor = "text-blue-400"; gradeText = "Great Job"; }
    else if (score >= 70) { gradeColor = "text-yellow-400"; gradeText = "Good"; }
    else { gradeColor = "text-red-400"; gradeText = "Needs Practice"; }

    return (
        <div className="flex min-h-screen flex-col items-center bg-black text-white relative overflow-hidden font-sans p-6">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] z-0" />
            </div>

            <main className="w-full max-w-4xl relative z-10 flex flex-col gap-8 py-10">
                {/* Header / Score Section */}
                <div className="text-center space-y-2">
                    <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">Assessment Complete</p>
                    <h1 className="text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                        {assessment.topic}
                    </h1>
                </div>

                <div className="flex justify-center my-8">
                    <div className="relative w-64 h-64 flex items-center justify-center">
                        {/* Outer Glow */}
                        <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 ${score >= 80 ? 'bg-blue-500' : 'bg-yellow-500'}`} />

                        {/* Circular Progress (CSS only for simplicity) */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                            <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent"
                                className={clsx(gradeColor, "drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]")}
                                strokeDasharray={2 * Math.PI * 120}
                                strokeDashoffset={2 * Math.PI * 120 * (1 - score / 100)}
                                strokeLinecap="round"
                            />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={clsx("text-6xl font-black tracking-tighter", gradeColor)}>{score}</span>
                            <span className="text-zinc-400 text-sm font-medium uppercase tracking-wider mt-1">{gradeText}</span>
                        </div>
                    </div>
                </div>

                {feedbackData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* General Feedback */}
                        <div className="md:col-span-2 glass-panel rounded-2xl p-8 border border-white/10">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <TrendingUp className="text-primary" />
                                AI Evaluation
                            </h3>
                            <p className="text-zinc-300 leading-relaxed text-lg">
                                {feedbackData.feedback || "No general feedback available."}
                            </p>
                        </div>

                        {/* Strengths */}
                        <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-gradient-to-br from-green-900/10 to-transparent">
                            <h4 className="flex items-center text-green-400 font-bold mb-4 gap-2">
                                <CheckCircle size={20} /> Strengths
                            </h4>
                            <ul className="space-y-3">
                                {feedbackData.strengths?.map((item: string, i: number) => (
                                    <li key={i} className="flex gap-3 text-zinc-300 text-sm leading-relaxed">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Weaknesses */}
                        <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-gradient-to-br from-red-900/10 to-transparent">
                            <h4 className="flex items-center text-red-400 font-bold mb-4 gap-2">
                                <AlertCircle size={20} /> Areas for Improvement
                            </h4>
                            <ul className="space-y-3">
                                {feedbackData.weaknesses?.map((item: string, i: number) => (
                                    <li key={i} className="flex gap-3 text-zinc-300 text-sm leading-relaxed">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Nuances */}
                        {feedbackData.nuances && feedbackData.nuances.length > 0 && (
                            <div className="md:col-span-2 glass-panel rounded-2xl p-6 border border-white/5">
                                <h4 className="flex items-center text-purple-400 font-bold mb-4 gap-2">
                                    <AlertCircle size={20} /> Nuances & Details
                                </h4>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {feedbackData.nuances.map((item: string, i: number) => (
                                        <li key={i} className="flex gap-3 text-zinc-400 text-sm leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 pb-12">
                    <Link
                        href="/dashboard"
                        className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Home size={18} className="group-hover:text-primary transition-colors" />
                        <span>Dashboard</span>
                    </Link>
                    <Link
                        href="/assessment"
                        className="px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 hover:scale-105"
                    >
                        <RotateCcw size={18} />
                        <span>Try Another Topic</span>
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </main>
        </div>
    );
}


import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Mic, Code, TrendingUp, History, Award, Calendar, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Check role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role === 'professor') {
        return redirect("/dashboard/professor");
    }

    // Fetch assessments for this user
    const { data: assessments } = await supabase
        .from("assessments")
        .select("*")
        .eq("student_name", user.email)
        .order("created_at", { ascending: false });

    // Fetch available assignments
    const { data: availableAssignments } = await supabase
        .from("assignments")
        .select("*")
        .order("created_at", { ascending: false });

    // Calculate Stats
    const totalAssessments = assessments?.length || 0;
    const completedAssessments = assessments?.filter(a => a.status === 'graded' || a.status === 'completed') || [];
    const averageScore = completedAssessments.length > 0
        ? Math.round(completedAssessments.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / completedAssessments.length)
        : 0;

    // Get latest topic or default
    const latestTopic = assessments && assessments.length > 0 ? assessments[0].topic : "None yet";

    return (
        <div className="flex min-h-screen flex-col p-6 bg-black text-zinc-100 relative overflow-hidden font-sans">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px] animate-float" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[100px] animate-float" style={{ animationDelay: "2s" }} />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] z-0" />
            </div>

            <main className="flex-1 w-full max-w-6xl mx-auto z-10 flex flex-col gap-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-8 relative z-50">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400 tracking-tight mb-2">
                            Dashboard
                        </h1>
                        <p className="text-zinc-400 font-light">
                            Welcome back, <span className="text-zinc-100 font-medium">{user.email}</span>. You're making progress!
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2 text-sm font-mono text-zinc-300">
                            <Zap size={14} className="text-yellow-500 fill-yellow-500" />
                            <span>Level 1</span>
                        </div>
                        <LogoutButton className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20" />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp size={80} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-1">Avg Score</p>
                            <h3 className="text-4xl font-bold text-white">{averageScore}%</h3>
                            <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                                <TrendingUp size={12} />
                                <span>Based on {completedAssessments.length} exams</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <History size={80} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-1">Total Exams</p>
                            <h3 className="text-4xl font-bold text-white">{totalAssessments}</h3>
                            <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1">
                                <span>Latest: {latestTopic}</span>
                            </div>
                        </div>
                    </div>

                    <Link href="/assessment" className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-600/20 border border-primary/20 backdrop-blur-sm relative overflow-hidden group hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-center items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 mb-3 group-hover:scale-110 transition-transform">
                            <Mic size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">Start New Exam</h3>
                        <p className="text-sm text-zinc-400 mt-1">Test your knowledge now</p>
                    </Link>
                </div>

                {/* Main Content Split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Recent History & Assignments */}
                    <div className="lg:col-span-2 flex flex-col gap-8">

                        {/* NEW: Available Assignments */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Award size={20} className="text-purple-400" />
                                    Available Assignments
                                </h2>
                            </div>
                            <div className="rounded-2xl border border-white/5 bg-zinc-900/30 overflow-hidden backdrop-blur-sm">
                                {availableAssignments && availableAssignments.length > 0 ? (
                                    <div className="divide-y divide-white/5">
                                        {availableAssignments.map((assignment) => (
                                            <div key={assignment.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                                <div>
                                                    <h4 className="font-bold text-white text-lg group-hover:text-purple-300 transition-colors">{assignment.title}</h4>
                                                    <p className="text-sm text-zinc-400">{assignment.topic} • {assignment.difficulty_level}</p>
                                                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{assignment.description}</p>
                                                </div>
                                                <Link
                                                    href={`/assessment?assignmentId=${assignment.id}`}
                                                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-purple-600 text-sm font-bold text-white transition-all flex items-center gap-2"
                                                >
                                                    Start <ArrowRight size={14} />
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-zinc-500">
                                        <p>No assignments available at the moment.</p>
                                        <p className="text-xs mt-2">Check back later or start a random practice exam.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <History size={20} className="text-primary" />
                                    Recent History
                                </h2>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-zinc-900/30 overflow-hidden backdrop-blur-sm">
                                {assessments && assessments.length > 0 ? (
                                    <div className="divide-y divide-white/5">
                                        {assessments.map((assessment) => (
                                            <Link
                                                href={`/results/${assessment.id}`}
                                                key={assessment.id}
                                                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm
                                                        ${assessment.status === 'graded'
                                                            ? (assessment.total_score >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400')
                                                            : 'bg-zinc-700/50 text-zinc-400'
                                                        }`}
                                                    >
                                                        {assessment.total_score || '-'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-zinc-200 group-hover:text-white transition-colors">
                                                            {assessment.topic}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                            <Calendar size={12} />
                                                            <span>{new Date(assessment.created_at).toLocaleDateString()}</span>
                                                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                            <span className="capitalize">{assessment.status}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ArrowRight size={16} className="text-zinc-600 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-zinc-500">
                                        <p>No assessments yet. Start one above!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Suggested Actions (Placeholder) */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Award size={20} className="text-yellow-500" />
                            Achievements
                        </h2>

                        <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-4 flex flex-col gap-3">
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-bold text-xs">
                                    1st
                                </div>
                                <div className="flex-1">
                                    <h5 className="text-sm font-bold text-zinc-200">First Steps</h5>
                                    <p className="text-xs text-zinc-500">Complete your first exam</p>
                                </div>
                                {completedAssessments.length > 0 ? (
                                    <span className="text-green-500 text-xs font-bold">Done</span>
                                ) : (
                                    <span className="text-zinc-600 text-xs">Locked</span>
                                )}
                            </div>

                            <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5 opacity-50">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-xs">
                                    <Code size={14} />
                                </div>
                                <div className="flex-1">
                                    <h5 className="text-sm font-bold text-zinc-200">Code Master</h5>
                                    <p className="text-xs text-zinc-500">Score 90% on SQL</p>
                                </div>
                                <span className="text-zinc-600 text-xs">Locked</span>
                            </div>
                        </div>

                        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/20">
                            <h4 className="font-bold text-purple-200 mb-1">Pro Tip</h4>
                            <p className="text-sm text-purple-300/80 leading-relaxed">
                                Speaking clearly and using technical terminology increases your score significantly. Try to elaborate on "Why" not just "How".
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}


import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, TrendingUp, FileText, Users } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import ReevaluateButton from "@/components/ReevaluateButton";

export default async function StudentDetailPage({ params }: { params: Promise<{ email: string }> }) {
    const { email: encodedEmail } = await params;
    const studentEmail = decodeURIComponent(encodedEmail);

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Role check
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'professor') {
        return redirect("/dashboard");
    }

    // Fetch all assessments for this student
    const { data: assessments } = await supabase
        .from("assessments")
        .select("*")
        .eq("student_name", studentEmail)
        .order("created_at", { ascending: false });

    const totalExams = assessments?.length || 0;
    const gradedExams = assessments?.filter(a => a.status === 'graded' || a.status === 'completed') || [];
    const avgScore = gradedExams.length > 0
        ? Math.round(gradedExams.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / gradedExams.length)
        : 0;

    return (
        <div className="flex min-h-screen flex-col p-6 bg-black text-zinc-100 font-sans relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[100px]" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] z-0" />
            </div>

            <main className="flex-1 w-full max-w-6xl mx-auto z-10 flex flex-col gap-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between py-8 relative z-50">
                    <div>
                        <Link
                            href="/dashboard/professor"
                            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-4"
                        >
                            <ArrowLeft size={16} />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-indigo-200 tracking-tight mb-1">
                            Student Profile
                        </h1>
                        <p className="text-zinc-400 flex items-center gap-2">
                            <Users size={16} />
                            <span className="text-zinc-100 font-medium">{studentEmail}</span>
                        </p>
                    </div>
                    <LogoutButton className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Total Exams</p>
                        <h3 className="text-3xl font-bold text-white">{totalExams}</h3>
                    </div>

                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Graded</p>
                        <h3 className="text-3xl font-bold text-white">{gradedExams.length}</h3>
                    </div>

                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp size={14} className="text-blue-400" />
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Average Score</p>
                        </div>
                        <h3 className="text-3xl font-bold text-white">{avgScore}%</h3>
                        <div className="mt-2 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${avgScore}%` }} />
                        </div>
                    </div>
                </div>

                {/* Exams Table */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText size={20} className="text-purple-400" />
                        Exam History
                    </h2>

                    <div className="rounded-2xl border border-white/5 bg-zinc-900/30 overflow-hidden backdrop-blur-sm">
                        {assessments && assessments.length > 0 ? (
                            <>
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/5 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                    <div className="col-span-4">Topic</div>
                                    <div className="col-span-2 text-center">Score</div>
                                    <div className="col-span-2 text-center">Status</div>
                                    <div className="col-span-2">Date</div>
                                    <div className="col-span-2 text-center">Actions</div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y divide-white/5">
                                    {assessments.map((assessment) => (
                                        <div key={assessment.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-white/5 transition-colors group">
                                            {/* Topic */}
                                            <div className="col-span-4">
                                                <Link
                                                    href={`/results/${assessment.id}`}
                                                    className="font-semibold text-zinc-200 group-hover:text-white transition-colors hover:text-purple-300"
                                                >
                                                    {assessment.topic}
                                                </Link>
                                            </div>

                                            {/* Score */}
                                            <div className="col-span-2 flex justify-center">
                                                <span className={`
                                                    inline-flex items-center justify-center w-12 h-8 rounded-lg font-bold text-sm
                                                    ${assessment.status === 'graded'
                                                        ? (assessment.total_score >= 80
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : assessment.total_score >= 60
                                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                                : 'bg-red-500/20 text-red-400')
                                                        : 'bg-zinc-700/50 text-zinc-400'
                                                    }
                                                `}>
                                                    {assessment.total_score ?? '-'}
                                                </span>
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-2 flex justify-center">
                                                <span className={`
                                                    px-2.5 py-1 rounded-full text-xs font-medium capitalize
                                                    ${assessment.status === 'graded'
                                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                        : assessment.status === 'completed'
                                                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                            : 'bg-zinc-700/30 text-zinc-400 border border-zinc-700/30'
                                                    }
                                                `}>
                                                    {assessment.status}
                                                </span>
                                            </div>

                                            {/* Date */}
                                            <div className="col-span-2 flex items-center gap-1.5 text-sm text-zinc-400">
                                                <Calendar size={12} />
                                                {new Date(assessment.created_at).toLocaleDateString()}
                                            </div>

                                            {/* Actions */}
                                            <div className="col-span-2 flex justify-center">
                                                <ReevaluateButton assessmentId={assessment.id} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="p-12 text-center text-zinc-500">
                                <p>This student has no assessments yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

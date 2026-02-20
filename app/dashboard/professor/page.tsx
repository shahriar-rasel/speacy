
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Users, BookOpen, Plus, TrendingUp, Calendar, Zap, FileText, UserCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import ExamCreationForm from "./ExamCreationForm";

export default async function ProfessorDashboard() {
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

    // Fetch Created Assignments
    const { data: assignments } = await supabase
        .from("assignments")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

    // Fetch Class Stats (Mock implementation for now, or real if we query all assessments)
    // For now, let's fetch ALL assessments in the system to simulate "Class" view
    const { data: allAssessments } = await supabase
        .from("assessments")
        .select("total_score, status, topic, student_name")
        .order("created_at", { ascending: false });

    const totalStudents = new Set(allAssessments?.map((a: any) => a.student_name)).size || 0;
    const totalExamsTaken = allAssessments?.length || 0;
    const completedExams = allAssessments?.filter((a: any) => a.status === 'graded' || a.status === 'completed') || [];
    const avgScore = completedExams.length > 0
        ? Math.round(completedExams.reduce((acc: number, curr: any) => acc + (curr.total_score || 0), 0) / completedExams.length)
        : 0;

    // Build student list with aggregated stats
    const studentMap = new Map<string, { examCount: number; totalScore: number; gradedCount: number }>();
    allAssessments?.forEach((a: any) => {
        if (!a.student_name) return;
        const existing = studentMap.get(a.student_name) || { examCount: 0, totalScore: 0, gradedCount: 0 };
        existing.examCount++;
        if (a.status === 'graded' || a.status === 'completed') {
            existing.totalScore += a.total_score || 0;
            existing.gradedCount++;
        }
        studentMap.set(a.student_name, existing);
    });
    const students = Array.from(studentMap.entries()).map(([email, stats]) => ({
        email,
        examCount: stats.examCount,
        avgScore: stats.gradedCount > 0 ? Math.round(stats.totalScore / stats.gradedCount) : 0,
    }));

    return (
        <div className="flex min-h-screen flex-col p-6 bg-black text-zinc-100 font-sans relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[100px]" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] z-0" />
            </div>

            <main className="flex-1 w-full max-w-7xl mx-auto z-10 flex flex-col gap-8">
                {/* Header */}
                <div className="flex items-end justify-between py-8 relative z-50">
                    <div>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-indigo-200 tracking-tight mb-2">
                            Professor Dashboard
                        </h1>
                        <p className="text-zinc-400">
                            Manage your class, create exams, and track student performance.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium flex items-center gap-2">
                            <Users size={16} />
                            <span>{totalStudents} Active Students</span>
                        </div>
                        <LogoutButton className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20" />
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Class Average</p>
                                <h3 className="text-3xl font-bold text-white">{avgScore}%</h3>
                            </div>
                        </div>
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${avgScore}%` }} />
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                                <FileText size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Exams</p>
                                <h3 className="text-3xl font-bold text-white">{totalExamsTaken}</h3>
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500">
                            across {allAssessments?.length || 0} assignments
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-green-500/20 text-green-400">
                                <Zap size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Top Topic</p>
                                <h3 className="text-xl font-bold text-white truncate max-w-[150px]">
                                    {allAssessments && allAssessments.length > 0 ? allAssessments[0].topic : 'N/A'}
                                </h3>
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500">Most attempted subject</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Assignments List */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <BookOpen size={20} className="text-purple-400" />
                                Assignments
                            </h2>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-zinc-900/30 overflow-hidden">
                            {assignments && assignments.length > 0 ? (
                                <div className="divide-y divide-white/5">
                                    {assignments.map((assignment) => (
                                        <div key={assignment.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{assignment.title}</h4>
                                                <p className="text-sm text-zinc-400">{assignment.topic} • {assignment.difficulty_level}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className="block text-xs text-zinc-500">Created</span>
                                                    <span className="text-sm text-zinc-300">{new Date(assignment.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-zinc-500">
                                    <p>No assignments created yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Students Section */}
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <UserCircle size={20} className="text-blue-400" />
                                    Students
                                </h2>
                                <span className="text-xs text-zinc-500 font-mono">{students.length} total</span>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-zinc-900/30 overflow-hidden">
                                {students.length > 0 ? (
                                    <div className="divide-y divide-white/5">
                                        {students.map((student) => (
                                            <Link
                                                key={student.email}
                                                href={`/dashboard/professor/students/${encodeURIComponent(student.email)}`}
                                                className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-white/10 flex items-center justify-center text-white font-bold text-sm">
                                                        {student.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white group-hover:text-purple-300 transition-colors">{student.email}</h4>
                                                        <p className="text-xs text-zinc-500">{student.examCount} exam{student.examCount !== 1 ? 's' : ''} taken</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <span className="block text-xs text-zinc-500">Avg Score</span>
                                                        <span className={`text-lg font-bold ${student.avgScore >= 80 ? 'text-green-400' :
                                                                student.avgScore >= 60 ? 'text-yellow-400' :
                                                                    student.avgScore > 0 ? 'text-red-400' : 'text-zinc-500'
                                                            }`}>
                                                            {student.avgScore > 0 ? `${student.avgScore}%` : '-'}
                                                        </span>
                                                    </div>
                                                    <ArrowRight size={16} className="text-zinc-600 group-hover:text-purple-400 transition-colors" />
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-zinc-500">
                                        <p>No students have taken exams yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Create Assignment Form */}
                    <div className="flex flex-col gap-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Plus size={20} className="text-green-400" />
                            Create New Exam
                        </h2>

                        <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 shadow-xl">
                            <ExamCreationForm />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

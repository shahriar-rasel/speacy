import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: assessment } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", id)
        .single();

    if (!assessment) {
        return <div>Assessment not found</div>;
    }

    let feedbackData = null;
    try {
        feedbackData = JSON.parse(assessment.feedback);
    } catch (e) {
        console.error("Error parsing feedback JSON", e);
    }

    return (
        <div className="flex min-h-screen flex-col items-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-3xl space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">Assessment Results</h2>
                    <p className="mt-2 text-lg text-gray-600">Topic: {assessment.topic}</p>
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-600 uppercase tracking-wider">Total Score</span>
                    <span className="text-6xl font-bold text-blue-900 mt-2">{assessment.total_score}%</span>
                </div>

                {feedbackData && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">General Feedback</h3>
                            <p className="mt-2 text-gray-600">{feedbackData.feedback || "No general feedback available."}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="flex items-center text-green-700 font-semibold mb-3">
                                    <CheckCircle className="mr-2 h-5 w-5" /> Strengths
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                    {feedbackData.strengths?.map((item: string, i: number) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="flex items-center text-red-700 font-semibold mb-3">
                                    <AlertCircle className="mr-2 h-5 w-5" /> Areas for Improvement
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                    {feedbackData.weaknesses?.map((item: string, i: number) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {feedbackData.nuances && feedbackData.nuances.length > 0 && (
                            <div>
                                <h4 className="flex items-center text-purple-700 font-semibold mb-3">
                                    <AlertCircle className="mr-2 h-5 w-5" /> Nuances & Details
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                    {feedbackData.nuances.map((item: string, i: number) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="pt-6 border-t flex justify-center">
                    <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-500 font-medium">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}

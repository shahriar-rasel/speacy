import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildGraderPrompt } from "@/lib/prompts";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify professor role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'professor') {
        return NextResponse.json({ error: "Forbidden: Professors only" }, { status: 403 });
    }

    const { assessmentId } = await req.json();

    if (!assessmentId) {
        return NextResponse.json({ error: "assessmentId is required" }, { status: 400 });
    }

    try {
        // Fetch existing messages for this assessment
        const { data: messages, error: msgError } = await supabase
            .from("messages")
            .select("role, content, metadata")
            .eq("assessment_id", assessmentId)
            .order("created_at", { ascending: true });

        if (msgError) {
            console.error("Error fetching messages:", msgError);
            return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
        }

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: "No messages found for this assessment" }, { status: 404 });
        }

        // Call OpenAI to re-grade
        const completion = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "system",
                    content: buildGraderPrompt(),
                },
                {
                    role: "user",
                    content: JSON.stringify(messages)
                }
            ],
            response_format: { type: "json_object" }
        });

        const gradeData = JSON.parse(completion.choices[0].message.content || "{}");

        // Update assessment with new grade
        const { error } = await supabase
            .from("assessments")
            .update({
                total_score: gradeData.score,
                feedback: JSON.stringify(gradeData),
                status: 'graded'
            })
            .eq("id", assessmentId);

        if (error) {
            console.error("Error updating assessment:", error);
            return NextResponse.json({ error: "Failed to save grade: " + error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, grade: gradeData });

    } catch (error) {
        console.error("Reevaluation error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

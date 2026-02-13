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

    const { assessmentId, messages } = await req.json();

    try {
        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: "No messages found" }, { status: 400 });
        }

        // Save messages to DB
        const messagesToInsert = messages.map((msg: any) => ({
            assessment_id: assessmentId,
            role: msg.role,
            content: msg.content,
            metadata: msg.metadata // Save timestamps and latency
        }));

        const { error: msgError } = await supabase.from("messages").insert(messagesToInsert);

        if (msgError) {
            console.error("Error saving messages:", msgError);
            // Verify if we should abort or continue grading. 
            // For now, let's log and continue, but it's critical.
        }

        // Call OpenAI to grade
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
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

        // Update Assessment in DB
        const { error } = await supabase
            .from("assessments")
            .update({
                total_score: gradeData.score,
                feedback: JSON.stringify(gradeData), // Storing full JSON in feedback text column for now, or could split fields
                status: 'graded'
            })
            .eq("id", assessmentId);

        if (error) {
            console.error("Error updating assessment:", error);
            return NextResponse.json({ error: "Failed to save grade: " + error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, grade: gradeData });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

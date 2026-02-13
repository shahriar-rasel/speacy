import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildExaminerPrompt } from "@/lib/prompts";

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

    const { message, topic, assessmentId } = await req.json();

    if (!assessmentId) {
        return NextResponse.json({ error: "Assessment ID required" }, { status: 400 });
    }

    try {
        // 1. Save user message
        const { error: userMsgError } = await supabase.from("messages").insert({
            assessment_id: assessmentId,
            role: "user",
            content: message,
        });

        if (userMsgError) {
            console.error("Error saving user message:", userMsgError);
            return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
        }

        // Fetch history for context
        const { data: historyData } = await supabase
            .from("messages")
            .select("role, content")
            .eq("assessment_id", assessmentId)
            .order("created_at", { ascending: true });

        const history = historyData?.map(msg => ({ role: msg.role as "user" | "assistant" | "system", content: msg.content })) || [];

        // 2. Call OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: buildExaminerPrompt({ topic }),
                },
                ...history,
            ],
        });

        const responseContent = completion.choices[0].message.content || "I didn't catch that. Could you repeat?";

        // 3. Save assistant message
        const { error: aiMsgError } = await supabase.from("messages").insert({
            assessment_id: assessmentId,
            role: "assistant",
            content: responseContent,
        });

        if (aiMsgError) {
            console.error("Error saving AI message:", aiMsgError);
        }

        return NextResponse.json({ message: responseContent });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

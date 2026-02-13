import { NextResponse } from "next/server";
import { buildExaminerPrompt } from "@/lib/prompts";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { instructions } = body;

        const systemInstructions = instructions || buildExaminerPrompt({ topic: "General Knowledge" });

        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview-2024-12-17",
                voice: "alloy",
                instructions: systemInstructions,
                tools: [
                    {
                        type: "function",
                        name: "end_assessment",
                        description: "Ends the oral exam assessment after 5 questions.",
                        parameters: {
                            type: "object",
                            properties: {},
                        },
                    },
                ],
                tool_choice: "auto",
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI Session Error:", errorText);
            return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error creating session:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

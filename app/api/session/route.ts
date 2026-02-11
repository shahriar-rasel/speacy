import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { instructions } = body;

        const systemInstructions = instructions || `You are a friendly but rigorous oral examiner. Your goal is to assess the student's understanding of the topic: General Knowledge.
                1. Start by greeting the student and asking the first question.
                2. Ask exactly 5 questions in total.
                3. After the user answers the 5th question, say "Thank you, the exam is complete" and IMMEDIATELY call the "end_assessment" tool.
                4. Keep your questions concise.
                5. Do not lecture the student.`;

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

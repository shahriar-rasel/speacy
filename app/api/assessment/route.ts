import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic } = await req.json();

    try {
        const { data, error } = await supabase
            .from("assessments")
            .insert({
                topic,
                student_name: user.email, // Using email as name for now
                status: "pending",
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating assessment:", error);
            return NextResponse.json({ error: "Failed to create assessment" }, { status: 500 });
        }

        // Initial greeting message (optional, but good for history)
        // We don't save it yet, handled by client or first chat call

        return NextResponse.json({ assessmentId: data.id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

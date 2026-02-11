
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const supabase = await createClient();

    // Check Authentication
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'professor') {
        return NextResponse.json({ error: "Forbidden: Professors only" }, { status: 403 });
    }

    const { title, topic, description, difficulty_level, questions, learning_goals } = await req.json();

    try {
        const { data, error } = await supabase
            .from("assignments")
            .insert({
                created_by: user.id,
                title,
                topic,
                description,
                difficulty_level,
                questions,
                learning_goals
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating assignment:", error);
            return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
        }

        return NextResponse.json({ assignmentId: data.id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const supabase = await createClient();
    // Check Authentication
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: assignments, error } = await supabase
        .from("assignments")
        .select(`
            *,
            professor:profiles(email)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching assignments:", error);
        return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    }

    return NextResponse.json({ assignments });
}

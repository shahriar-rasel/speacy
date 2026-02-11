
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-2 bg-black text-white">
            <main className="flex w-full flex-1 flex-col items-center justify-center px-20 text-center">
                <h1 className="text-6xl font-bold text-white">
                    Welcome to <a className="text-blue-500 hover:text-blue-400 transition-colors" href="#">Speacy!</a>
                </h1>

                <p className="mt-3 text-2xl text-zinc-400">
                    You are logged in as <span className="text-zinc-200">{user.email}</span>
                </p>

                <div className="mt-6 flex max-w-4xl flex-wrap items-center justify-around sm:w-full">
                    <a
                        href="/assessment"
                        className="mt-6 w-96 rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-left hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all group"
                    >
                        <h3 className="text-2xl font-bold group-hover:text-blue-400">Start Assessment &rarr;</h3>
                        <p className="mt-4 text-xl text-zinc-400">
                            Begin a new oral exam on a random topic.
                        </p>
                    </a>
                </div>
            </main>
        </div>
    );
}

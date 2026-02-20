"use client";

import { createClient } from "@/utils/supabase/client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogoutButton({ className }: { className?: string }) {
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login"); // Redirect to login after sign out
        router.refresh(); // Refresh to ensure auth state is cleared from server components
    };

    return (
        <button
            onClick={handleLogout}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg z-[100] relative border border-white/20 ${className}`}
        >
            <LogOut size={16} />
            <span>Sign out</span>
        </button>
    );
}

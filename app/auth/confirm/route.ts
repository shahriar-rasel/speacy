import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url));
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "signup" | "recovery" | "invite" | "email_change",
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, url));
    }
  }

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    return NextResponse.redirect(new URL(next, url));
  }

  return NextResponse.redirect(new URL("/auth/error", url));
}

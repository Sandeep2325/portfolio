import { NextResponse } from "next/server";
import { createServerSupabaseClient, getContactTableName, isSupabaseConfigured } from "@/lib/supabase";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Contact service is not configured. Add the required environment values first." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    company?: string;
    message?: string;
  };

  const name = body.name?.trim() || "";
  const email = body.email?.trim() || "";
  const company = body.company?.trim() || "";
  const message = body.message?.trim() || "";

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from(getContactTableName()).insert({
      name,
      email,
      company: company || null,
      message,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}

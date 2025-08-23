import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  const body = await request.json();

  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const { email, password } = validation.data;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      { error: "Invalid login credentials" },
      { status: 401 },
    );
  }

  return NextResponse.json({ message: "Login successful" }, { status: 200 });
}

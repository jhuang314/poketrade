import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores.",
    ),
  friendId: z
    .string()
    .regex(/^\d{4}-\d{4}-\d{4}-\d{4}$/, "Invalid Friend ID format."),
});

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  const body = await request.json();

  const validation = signupSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.flatten() },
      { status: 400 },
    );
  }

  const { email, password, username, friendId } = validation.data;

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    // Pass metadata to be used by the trigger
    options: {
      data: {
        username: username,
        friend_id: friendId,
      },
    },
  });

  if (signUpError) {
    // If the error is due to a unique constraint in your profiles table,
    // Supabase will now return a more specific error message.
    return NextResponse.json({ error: signUpError.message }, { status: 400 });
  }

  return NextResponse.json(
    { message: "Signup successful, please check your email to verify." },
    { status: 201 },
  );
}

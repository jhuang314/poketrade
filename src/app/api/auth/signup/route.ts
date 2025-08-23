import { createSupabaseAdminClient } from "../../../../utils/supabase/admin";
import { NextResponse } from "next/server";

/**
 * A basic sanitizer to prevent XSS. It replaces < and > with HTML entities.
 * While Supabase's PostgREST API uses parameterized queries to prevent SQL injection,
 * sanitizing user input before storage is a good practice to mitigate stored XSS
 * if the data is ever rendered without proper escaping.
 */
const sanitize = (input: string): string => {
  return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { email, password, username, friendId } = await request.json();

    // 1. Validate inputs
    if (!email || !password || !username || !friendId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const friendIdRegex = /^\d{4}-\d{4}-\d{4}-\d{4}$/;
    if (!friendIdRegex.test(friendId)) {
      return NextResponse.json(
        {
          error: "Invalid Friend ID format. Please use XXXX-XXXX-XXXX-XXXX.",
        },
        { status: 400 },
      );
    }

    // 2. Sanitize inputs to prevent stored XSS
    const sanitizedUsername = sanitize(username);
    const sanitizedFriendId = sanitize(friendId);

    // 3. Create the user in Supabase Auth.
    // We are not using the admin client here because signUp is a public function
    // that handles email confirmations, etc.
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.signUp({
        email,
        password,
      });

    if (authError) {
      console.error("Supabase auth error:", authError.message);
      if (authError.message.includes("User already registered")) {
        return NextResponse.json(
          { error: "A user with this email already exists." },
          { status: 409 }, // Conflict
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      console.error("Signup successful but no user data returned.");
      return NextResponse.json(
        { error: "An unexpected error occurred during signup." },
        { status: 500 },
      );
    }

    // 4. Insert the public profile for the new user.
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        username: sanitizedUsername,
        friend_id: sanitizedFriendId,
      });

    if (profileError) {
      console.error("Supabase profile insertion error:", profileError.message);

      // This is a critical failure. The auth user was created but their profile was not.
      // To prevent an orphaned auth user, we must attempt to delete the user we just created.
      // This is why we use the admin client, as it has permission to delete users.
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.log(`Cleaned up orphaned auth user: ${authData.user.id}`);

      // Check for a unique constraint violation
      if (profileError.code === "23505") {
        return NextResponse.json(
          { error: "Username or Friend ID is already taken." },
          { status: 409 }, // Conflict
        );
      }

      return NextResponse.json(
        { error: "Failed to create user profile." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message:
          "Signup successful! Please check your email to verify your account.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unhandled error in signup route:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 },
    );
  }
}

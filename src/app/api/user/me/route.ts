// src/app/api/user/me/route.ts
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const [profileRes, wishlistRes, tradeListRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, friend_id")
        .eq("id", userId)
        .single(),
      supabase
        .from("user_wishlist")
        .select("card_identifier")
        .eq("user_id", userId),
      supabase
        .from("user_trade_list")
        .select("card_identifier")
        .eq("user_id", userId),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (wishlistRes.error) throw wishlistRes.error;
    if (tradeListRes.error) throw tradeListRes.error;

    const userData = {
      profile: profileRes.data,
      wishlist: wishlistRes.data.map((item) => item.card_identifier),
      tradeList: tradeListRes.data.map((item) => item.card_identifier),
    };

    return NextResponse.json(userData);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

// src/app/api/user/tradelist/batch-update/route.ts
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const batchUpdateSchema = z.object({
  toAdd: z.array(z.string()).max(500),
  toRemove: z.array(z.string()).max(500),
});

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = batchUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.flatten() },
      { status: 400 },
    );
  }

  const { toAdd, toRemove } = validation.data;
  const userId = session.user.id;

  try {
    const operations = [];

    if (toAdd.length > 0) {
      const recordsToAdd = toAdd.map((card_identifier) => ({
        user_id: userId,
        card_identifier,
      }));
      operations.push(supabase.from("user_trade_list").insert(recordsToAdd));
    }
    if (toRemove.length > 0) {
      operations.push(
        supabase
          .from("user_trade_list")
          .delete()
          .eq("user_id", userId)
          .in("card_identifier", toRemove),
      );
    }

    const results = await Promise.all(operations);
    const errors = results.map((res) => res.error).filter((e) => !!e);
    if (errors.length > 0) {
      throw new Error(errors.map((e) => e.message).join(", "));
    }

    return NextResponse.json({
      message: "Tradelist updated successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

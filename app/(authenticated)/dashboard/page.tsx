import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const username = user.user_metadata.username;
  const friendId = user.user_metadata.friend_id;

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          Welcome to PokéTrade! This is your dashboard.
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Your Details</h2>
        <div className="text-md">
          <span className="font-semibold">Username:</span> {username}
        </div>
        <div className="text-md">
          <span className="font-semibold">Friend ID:</span> {friendId}
        </div>
      </div>
    </div>
  );
}

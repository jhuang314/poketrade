// poketrade/app/matches/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Copy } from "lucide-react";

interface Match {
  id: string;
  username: string;
  friend_id: string;
}

export default function MatchesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndMatches = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser(user);

      const { data, error } = await supabase.rpc("find_trade_matches");

      if (error) {
        console.error("Error fetching matches:", error);
        toast.error("Could not find trade matches.");
      } else {
        setMatches(data || []);
      }

      setLoading(false);
    };

    fetchUserAndMatches();
  }, [supabase, router]);

  const handleCopyToClipboard = (friendId: string) => {
    navigator.clipboard.writeText(friendId);
    toast.success("Friend ID copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center py-10">
        <p>Searching for matches...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-2">Trade Matches</h1>
      <p className="text-muted-foreground mb-8">
        These are users who have something you want, and you have something they
        want.
      </p>

      {matches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <Card key={match.id}>
              <CardHeader>
                <CardTitle>{match.username}</CardTitle>
                <CardDescription>Potential trade partner</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
                    {match.friend_id}
                  </p>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyToClipboard(match.friend_id)}
                    title="Copy Friend ID"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-dashed border-2 rounded-lg">
          <h2 className="text-xl font-semibold">No Matches Found</h2>
          <p className="text-muted-foreground mt-2">
            Try adding more cards to your Wishlist and Trade List to find a
            match.
          </p>
          <Button asChild className="mt-4">
            <a href="/cards">Update My Lists</a>
          </Button>
        </div>
      )}
    </div>
  );
}

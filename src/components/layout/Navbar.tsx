"use client";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <Link href="/" className="text-xl font-bold">
        PokéMatch
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/cards">My Cards</Link>
            <Link href="/matches">Matches</Link>
            <span>Hi, {profile?.username || user.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
            >
              Logout
            </button>
          </>
        ) : (
          <Link href="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}

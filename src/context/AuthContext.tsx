"use client";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthContextType, Profile } from "@/lib/types";
import { User } from "@supabase/supabase-js";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("session", session, "_event", _event);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = { user, profile, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

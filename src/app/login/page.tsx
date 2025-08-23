"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import Spinner from "@/components/ui/Spinner";

export default function LoginPage() {
  const [showLogin, setShowLogin] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/cards");
    }
  }, [user, router]);

  if (user) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      {showLogin ? <LoginForm /> : <SignupForm />}
      <button
        onClick={() => setShowLogin(!showLogin)}
        className="w-full mt-4 text-center text-blue-500 hover:underline"
      >
        {showLogin
          ? "Need an account? Sign Up"
          : "Already have an account? Login"}
      </button>
    </div>
  );
}

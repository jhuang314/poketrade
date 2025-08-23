"use client";
import { useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";

export default function LoginPage() {
  const [showLogin, setShowLogin] = useState(true);

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

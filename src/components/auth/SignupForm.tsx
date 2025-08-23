"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function SignupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [friendId, setFriendId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match!");
      return;
    }
    setIsLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        password,
        confirmPassword,
        friendId,
      }),
    });

    if (res.ok) {
      toast.success("Signup successful!");
      router.push("/dashboard");
      router.refresh();
    } else {
      const { error } = await res.json();
      if (
        typeof error === "object" &&
        error !== null &&
        (error.formErrors || error.fieldErrors)
      ) {
        const messages = [
          ...(error.formErrors || []),
          ...Object.values(error.fieldErrors || {}).flat(),
        ];
        toast.error(
          messages.join("\n") || "Signup failed. Please check your input.",
        );
      } else {
        toast.error(error || "An unknown error occurred.");
      }
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold text-center">Sign Up</h2>
      <div>
        <label htmlFor="username">Username</label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="friendId">Friend ID</label>
        <Input
          id="friendId"
          type="text"
          value={friendId}
          onChange={(e) => setFriendId(e.target.value)}
          placeholder="0000-0000-0000-0000"
          pattern="\d{4}-\d{4}-\d{4}-\d{4}"
          title="Friend ID must be in the format XXXX-XXXX-XXXX-XXXX"
          required
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Signing up..." : "Sign Up"}
      </Button>
    </form>
  );
}

import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pokeball } from "@/components/pokeball";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>PokéTrade</Link>
            </div>
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-12 max-w-5xl p-5 items-center justify-center text-center">
          <Pokeball className="w-24 h-24" />
          <div className="space-y-4">
            <h1 className="text-5xl font-bold">Welcome to PokéTrade</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The easiest way to manage your Pokémon TCG Pocket collection,
              create wishlists, and find the perfect trading partners.
            </p>
          </div>
          <div className="flex justify-center">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs py-8">
          <div className="flex w-full max-w-5xl items-center justify-between px-5">
            <p>Built for Pokémon TCG Pocket fans.</p>
            <ThemeSwitcher />
          </div>
        </footer>
      </div>
    </main>
  );
}

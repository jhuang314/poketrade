// poketrade/app/(authenticated)/layout.tsx
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex h-16 w-full items-center justify-center border-b border-b-foreground/10">
        <div className="w-full max-w-5xl flex items-center justify-between p-3 px-5 text-sm">
          <div className="flex items-center gap-5 font-semibold">
            <Link href="/">PokéTrade</Link>
            <Link
              href="/dashboard"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/cards"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              My Collection
            </Link>
            <Link
              href="/matches"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Matches
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </div>
      </header>
      <main className="flex flex-1 w-full flex-col items-center py-16">
        <div className="w-full max-w-5xl px-5">{children}</div>
      </main>
      <footer className="flex w-full items-center justify-center border-t py-8 text-center text-xs">
        <div className="flex w-full max-w-5xl items-center justify-between px-5">
          <p>Built for Pokémon TCG Pocket fans.</p>
          <ThemeSwitcher />
        </div>
      </footer>
    </div>
  );
}

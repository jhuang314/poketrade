### **Definitive File Structure (Revised for Supabase Template)**

This structure incorporates the files provided by the template and our application-specific files.

```
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── matches/route.ts
│   │   │   └── user/
│   │   │       ├── me/route.ts
│   │   │       ├── tradelist/batch-update/route.ts
│   │   │       └── wishlist/batch-update/route.ts
│   │   ├── auth/
│   │   │   ├── callback/route.ts       # Provided by template
│   │   │   └── actions.ts              # We will modify this
│   │   ├── cards/
│   │   │   ├── CardsClientPage.tsx     # Client-side logic container
│   │   │   └── page.tsx                # Server Component for auth check
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx                # We will modify this
│   │   ├── matches/
│   │   │   ├── MatchesClientPage.tsx   # Client-side logic container
│   │   │   └── page.tsx                # Server Component for auth check
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── auth/
│   │   │   └── LogoutButton.tsx
│   │   ├── cards/
│   │   │   ├── Card.tsx
│   │   │   └── SaveChangesBar.tsx
│   │   ├── layout/
│   │   │   └── Navbar.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Spinner.tsx
│   ├── hooks/
│   │   └── usePokemonData.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Provided by template
│   │   │   └── server.ts               # Provided by template
│   │   └── types.ts
│   └── middleware.ts                   # Provided by template, we will modify
└── .env.local                          # For Supabase credentials
```

---

### **Implementation Task Breakdown**

### Phase 1: Project Setup & Modern Auth

**Task 1.1: Initialize Project with Supabase Template & Install Dependencies**

- **Goal:** Create the project with pre-configured Supabase auth and add our specific packages.
- **Steps:**
  1.  Run the Supabase template initializer:
      ```bash
      npx create-next-app@latest pocket-matchmaker -e with-supabase
      ```
  2.  Navigate into the project: `cd pocket-matchmaker`.
  3.  Install our additional required libraries:
      ```bash
      npm install zod clsx swr react-hot-toast @vercel/kv
      ```
  4.  The template already includes `@supabase/ssr`, `@supabase/supabase-js`, and Tailwind CSS.

**Task 1.2: Set Up Supabase Project & Database Schema**

- **Goal:** Create the backend database, tables, and security rules.
- **Steps:**
  1.  Create a new project on [supabase.com](https://supabase.com).
  2.  Navigate to the "SQL Editor" and execute the following SQL to create tables, enable RLS, and set up the new user trigger.

      ```sql
      -- Create Tables
      CREATE TABLE public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        username TEXT UNIQUE NOT NULL,
        friend_id VARCHAR(19) UNIQUE NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE public.user_wishlist (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        card_identifier VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, card_identifier)
      );

      CREATE TABLE public.user_trade_list (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        card_identifier VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, card_identifier)
      );

      -- Enable RLS for all tables
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_wishlist ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_trade_list ENABLE ROW LEVEL SECURITY;

      -- Policies for 'profiles'
      CREATE POLICY "Allow authenticated users to read public profile data" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
      CREATE POLICY "Allow individual update access" ON public.profiles FOR UPDATE USING (auth.uid() = id);
      CREATE POLICY "Allow authenticated users to insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

      -- Policies for 'user_wishlist'
      CREATE POLICY "Allow individual write access to own wishlist" ON public.user_wishlist FOR ALL USING (auth.uid() = user_id);
      CREATE POLICY "Allow authenticated users to read wishlists" ON public.user_wishlist FOR SELECT USING (auth.role() = 'authenticated');

      -- Policies for 'user_trade_list'
      CREATE POLICY "Allow individual write access to own tradelist" ON public.user_trade_list FOR ALL USING (auth.uid() = user_id);
      CREATE POLICY "Allow authenticated users to read tradelists" ON public.user_trade_list FOR SELECT USING (auth.role() = 'authenticated');

      -- Function to create a profile for a new user
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.profiles (id, username, friend_id)
        VALUES (
          new.id,
          new.raw_user_meta_data->>'username',
          new.raw_user_meta_data->>'friend_id'
        );
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Trigger to run the function after a new user is created
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
      ```

**Task 1.3: Configure Environment Variables**

- **Goal:** Connect the Next.js app to Supabase.
- **Steps:**
  1.  Rename `.env.local.example` to `.env.local`.
  2.  Add your Supabase Project URL and Anon Key.
      ```.env.local
      NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
      NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
      ```
  3.  Verify that the template has created `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`. These are ready to use.

**Task 1.4: Define Centralized TypeScript Types**

- **Goal:** Create a single source of truth for all data shapes.
- **Steps:**
  1.  Create `src/lib/types.ts` and add the following definitions.

  ```typescript
  // src/lib/types.ts
  // From GitHub JSON sources
  export interface RawCard {
    set: string;
    number: number;
    rarity: string;
    rarityCode: string;
    imageName: string;
    label: {
      slug: string;
      eng: string;
    };
    packs: string[];
  }

  export interface SetData {
    code: string;
    releaseDate: string;
    count?: number;
    label: {
      en: string;
    };
    packs: string[];
  }

  export interface RarityData {
    [key: string]: string;
  }

  // Enriched card data for our app
  export interface Card {
    id: string; // Composite key, e.g., "A1-1"
    set: string;
    number: number;
    rarityCode: string;
    imageName: string;
    name: string;
    rarityFullName: string;
    setName: string;
  }

  // User profile data
  export interface Profile {
    id: string;
    username: string;
    friend_id: string;
  }

  // Data returned from /api/user/me
  export interface UserData {
    profile: Profile;
    wishlist: string[];
    tradeList: string[];
  }
  ```

**Task 1.5: Adapt Auth Logic with Server Actions**

- **Goal:** Modify the template's Server Actions to handle custom `username` and `friendId` fields during signup.
- **Steps:**
  1.  Open `src/app/auth/actions.ts`.
  2.  Replace the contents with the following code to add our validation and custom fields.

      ```typescript
      // src/app/auth/actions.ts
      "use server";

      import { createClient } from "@/lib/supabase/server";
      import { headers } from "next/headers";
      import { redirect } from "next/navigation";
      import { z } from "zod";

      const signupSchema = z.object({
        email: z.string().email(),
        password: z
          .string()
          .min(8, "Password must be at least 8 characters long."),
        username: z
          .string()
          .min(3)
          .max(20)
          .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username can only contain letters, numbers, and underscores.",
          ),
        friendId: z
          .string()
          .regex(/^\d{4}-\d{4}-\d{4}-\d{4}$/, "Invalid Friend ID format."),
      });

      export async function login(formData: FormData) {
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const supabase = createClient();

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return redirect("/login?message=Could not authenticate user");
        }

        return redirect("/dashboard");
      }

      export async function signup(formData: FormData) {
        const origin = headers().get("origin");

        const rawFormData = {
          email: formData.get("email") as string,
          password: formData.get("password") as string,
          username: formData.get("username") as string,
          friendId: formData.get("friendId") as string,
        };

        const validation = signupSchema.safeParse(rawFormData);
        if (!validation.success) {
          const errorMessage = validation.error.errors
            .map((e) => e.message)
            .join(", ");
          return redirect(
            `/login?type=signup&message=${encodeURIComponent(errorMessage)}`,
          );
        }

        const { email, password, username, friendId } = validation.data;
        const supabase = createClient();

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
            data: {
              username: username,
              friend_id: friendId,
            },
          },
        });

        if (error) {
          if (
            error.message.includes("unique constraint") ||
            error.message.includes("already exists")
          ) {
            return redirect(
              "/login?type=signup&message=An account with this email, username, or Friend ID already exists.",
            );
          }
          return redirect(
            `/login?type=signup&message=${encodeURIComponent(error.message)}`,
          );
        }

        return redirect(
          "/login?message=Check email to continue sign in process",
        );
      }
      ```

**Task 1.6: Modify Login Page UI**

- **Goal:** Update the UI to include fields for `username` and `friendId` and a toggle between login/signup forms.
- **Steps:**
  1.  Create reusable UI components `src/components/ui/Input.tsx` and `Button.tsx`.
      ```typescript
      // src/components/ui/Input.tsx
      import React from 'react';
      export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
        return <input className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-inherit ${className}`} ref={ref} {...props} />;
      });
      Input.displayName = "Input";
      ```
      ```typescript
      // src/components/ui/Button.tsx
      import React from 'react';
      export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, children, ...props }, ref) => {
        return <button className={`w-full px-4 py-2 font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-gray-400 ${className}`} ref={ref} {...props}>{children}</button>;
      });
      Button.displayName = "Button";
      ```
  2.  Open `src/app/login/page.tsx` and replace its contents.

      ```typescript
      // src/app/login/page.tsx
      import Link from 'next/link'
      import { login, signup } from './actions'
      import { Input } from '@/components/ui/Input'
      import { Button } from '@/components/ui/Button'

      export default function LoginPage({
        searchParams,
      }: {
        searchParams: { message: string; type: string }
      }) {
        const isSignup = searchParams.type === 'signup'

        return (
          <div className="flex-1 flex flex-col w-full max-w-sm justify-center gap-2 mx-auto mt-10 p-4">
            {isSignup ? (
              <form className="animate-in flex-1 flex flex-col w-full justify-center gap-4 text-foreground">
                <h2 className="text-2xl font-bold text-center">Sign Up</h2>
                <div>
                  <label className="text-md" htmlFor="email">Email</label>
                  <Input name="email" placeholder="you@example.com" required />
                </div>
                <div>
                  <label className="text-md" htmlFor="password">Password</label>
                  <Input type="password" name="password" placeholder="••••••••" required />
                </div>
                <div>
                  <label className="text-md" htmlFor="username">Username</label>
                  <Input name="username" placeholder="pokefan123" required />
                </div>
                <div>
                  <label className="text-md" htmlFor="friendId">Friend ID</label>
                  <Input name="friendId" placeholder="1234-1234-1234-1234" required />
                </div>
                <Button formAction={signup}>Sign Up</Button>
                <Link href="/login" className="w-full mt-2 text-center text-sm text-blue-500 hover:underline">
                  Already have an account? Sign In
                </Link>
              </form>
            ) : (
              <form className="animate-in flex-1 flex flex-col w-full justify-center gap-4 text-foreground">
                <h2 className="text-2xl font-bold text-center">Login</h2>
                <div>
                  <label className="text-md" htmlFor="email">Email</label>
                  <Input name="email" placeholder="you@example.com" required />
                </div>
                <div>
                  <label className="text-md" htmlFor="password">Password</label>
                  <Input type="password" name="password" placeholder="••••••••" required />
                </div>
                <Button formAction={login}>Sign In</Button>
                <Link href="/login?type=signup" className="w-full mt-2 text-center text-sm text-blue-500 hover:underline">
                  Don't have an account? Sign Up
                </Link>
              </form>
            )}

            {searchParams?.message && (
              <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center rounded-md">
                {searchParams.message}
              </p>
            )}
          </div>
        )
      }
      ```

**Task 1.7: Create Global Layout and Navbar**

- **Goal:** Provide consistent navigation across the application.
- **Steps:**
  1.  Create `src/components/auth/LogoutButton.tsx`.

      ```typescript
      // src/components/auth/LogoutButton.tsx
      import { createClient } from '@/lib/supabase/server'
      import { redirect } from 'next/navigation'

      export default function LogoutButton() {
        const signOut = async () => {
          'use server'
          const supabase = createClient()
          await supabase.auth.signOut()
          return redirect('/login')
        }

        return (
          <form action={signOut}>
            <button className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded">
              Logout
            </button>
          </form>
        )
      }
      ```

  2.  Create `src/components/layout/Navbar.tsx`. This is an `async` Server Component.

      ```typescript
      // src/components/layout/Navbar.tsx
      import Link from 'next/link';
      import { createClient } from '@/lib/supabase/server';
      import LogoutButton from '../auth/LogoutButton';

      export default async function Navbar() {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let profile = null;
        if (user) {
          const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single();
          profile = data;
        }

        return (
          <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">PokéMatch</Link>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/dashboard" className="hover:text-gray-300">Dashboard</Link>
                  <Link href="/cards" className="hover:text-gray-300">My Cards</Link>
                  <Link href="/matches" className="hover:text-gray-300">Matches</Link>
                  <span className="hidden sm:inline">Hi, {profile?.username || user.email}</span>
                  <LogoutButton />
                </>
              ) : (
                <Link href="/login" className="hover:text-gray-300">Login</Link>
              )}
            </div>
          </nav>
        );
      }
      ```

  3.  Update `src/app/layout.tsx`.

      ```typescript
      // src/app/layout.tsx
      import { GeistSans } from 'geist/font/sans'
      import './globals.css'
      import Navbar from '@/components/layout/Navbar'
      import { Toaster } from 'react-hot-toast'

      const defaultUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

      export const metadata = {
        metadataBase: new URL(defaultUrl),
        title: 'Pokémon TCG Pocket Matchmaker',
        description: 'Find trades for Pokémon TCG Pocket',
      }

      export default function RootLayout({
        children,
      }: {
        children: React.ReactNode
      }) {
        return (
          <html lang="en" className={GeistSans.className}>
            <body className="bg-background text-foreground">
                <Navbar />
                <main className="min-h-screen flex flex-col items-center">
                  <div className="w-full p-4">
                     {children}
                  </div>
                </main>
                <Toaster position="bottom-center" />
            </body>
          </html>
        )
      }
      ```

---

### Phase 2: Displaying Pokémon Card Data

All tasks in this phase are unchanged from the original plan as they are not dependent on the authentication system.

**Task 2.1: Create Client-Side Pokémon Data Fetching Hook**

- **Goal:** Build a reusable hook that fetches card, set, and rarity data from GitHub, enriches it, and caches it in `localStorage`.
- **Steps:**
  1.  Create the file `src/hooks/usePokemonData.ts`.
  2.  Populate it with the following code.

      ```typescript
      // src/hooks/usePokemonData.ts
      "use client";
      import { useState, useEffect } from "react";
      import { Card, RawCard, SetData, RarityData } from "@/lib/types";
      import toast from "react-hot-toast";

      const CACHE_KEY = "pokemon_data_cache";
      const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

      const GITHUB_URLS = {
        cards:
          "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/cards.json",
        sets: "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/sets.json",
        rarities:
          "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/rarity.json",
      };

      interface CacheData {
        timestamp: number;
        data: Card[];
      }

      export function usePokemonData() {
        const [data, setData] = useState<Card[] | null>(null);
        const [isLoading, setIsLoading] = useState<boolean>(true);
        const [error, setError] = useState<Error | null>(null);

        useEffect(() => {
          const fetchData = async () => {
            setIsLoading(true);
            try {
              const cachedItem = localStorage.getItem(CACHE_KEY);
              if (cachedItem) {
                const cache: CacheData = JSON.parse(cachedItem);
                if (Date.now() - cache.timestamp < CACHE_DURATION) {
                  setData(cache.data);
                  setIsLoading(false);
                  return;
                }
              }

              const [cardsRes, setsRes, raritiesRes] = await Promise.all([
                fetch(GITHUB_URLS.cards),
                fetch(GITHUB_URLS.sets),
                fetch(GITHUB_URLS.rarities),
              ]);

              if (!cardsRes.ok || !setsRes.ok || !raritiesRes.ok) {
                throw new Error("Failed to fetch Pokémon data from GitHub.");
              }

              const rawCards: RawCard[] = await cardsRes.json();
              const sets: SetData[] = await setsRes.json();
              const rarities: RarityData = await raritiesRes.json();

              const setsMap = new Map(sets.map((s) => [s.code, s.label.en]));
              const raritiesMap = new Map(Object.entries(rarities));

              const enrichedData: Card[] = rawCards.map((card) => ({
                id: `${card.set}-${card.number}`,
                set: card.set,
                number: card.number,
                rarityCode: card.rarityCode,
                imageName: card.imageName,
                name: card.label.eng,
                rarityFullName: raritiesMap.get(card.rarityCode) || card.rarity,
                setName: setsMap.get(card.set) || card.set,
              }));

              setData(enrichedData);
              const newCache: CacheData = {
                timestamp: Date.now(),
                data: enrichedData,
              };
              localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
            } catch (err) {
              setError(
                err instanceof Error
                  ? err
                  : new Error("An unknown error occurred"),
              );
              toast.error("Could not load Pokémon card data.");
            } finally {
              setIsLoading(false);
            }
          };

          fetchData();
        }, []);

        return { data, isLoading, error };
      }
      ```

**Task 2.2: Create the Reusable Card Component & Configure Image Domain**

- **Goal:** Build the visual representation of a single Pokémon card and allow Next.js to optimize images from the external source.
- **Steps:**
  1.  Modify `next.config.mjs` to whitelist the image hostname.

      ```javascript
      // next.config.mjs
      /** @type {import('next').NextConfig} */
      const nextConfig = {
        images: {
          remotePatterns: [
            {
              protocol: "https",
              hostname: "raw.githubusercontent.com",
              port: "",
              pathname:
                "/flibustier/pokemon-tcg-exchange/refs/heads/main/public/images/cards/**",
            },
          ],
        },
      };

      export default nextConfig;
      ```

  2.  Create the component file `src/components/cards/Card.tsx`.
  3.  Populate it with the following code.

      ```typescript
      // src/components/cards/Card.tsx
      "use client";
      import { Card as CardType } from '@/lib/types';
      import Image from 'next/image';
      import clsx from 'clsx';

      interface CardProps {
        cardData: CardType;
        isSelected: boolean;
        isDisabled: boolean;
        onToggle: (cardId: string) => void;
      }

      export default function Card({ cardData, isSelected, isDisabled, onToggle }: CardProps) {
        const imageUrl = `https://raw.githubusercontent.com/flibustier/pokemon-tcg-exchange/refs/heads/main/public/images/cards/${cardData.imageName}`;

        const handleClick = () => {
          if (!isDisabled) {
            onToggle(cardData.id);
          }
        };

        return (
          <div
            onClick={handleClick}
            className={clsx(
              "border-2 rounded-lg overflow-hidden transition-all duration-200 aspect-[245/342] relative",
              {
                "border-blue-500 shadow-lg scale-105": isSelected,
                "border-transparent": !isSelected,
                "opacity-50 cursor-not-allowed": isDisabled,
                "cursor-pointer hover:border-blue-400": !isDisabled,
              }
            )}
          >
            <Image
              src={imageUrl}
              alt={cardData.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 12.5vw"
              priority={false}
              className={clsx(
                "object-cover transition-filter duration-200",
                 { "grayscale": !isSelected && !isDisabled }
              )}
            />
          </div>
        );
      }
      ```

**Task 2.3: Build the Card Management Page UI**

- **Goal**: Create the user interface for managing cards, separating server-side auth logic from client-side interactive logic.
- **Steps**:
  1. Create `src/components/ui/Spinner.tsx`.

     ```typescript
     // src/components/ui/Spinner.tsx
     import clsx from 'clsx';

     interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }

     export default function Spinner({ size = 'md', className }: SpinnerProps) {
       const sizeClasses = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-4', lg: 'w-12 h-12 border-4' };
       return (
         <div role="status" className={clsx('animate-spin rounded-full border-solid border-gray-200 border-t-blue-500', sizeClasses[size], className)}>
           <span className="sr-only">Loading...</span>
         </div>
       );
     }
     ```

  2. Create the server page `src/app/cards/page.tsx` for the auth check.

     ```typescript
     // src/app/cards/page.tsx
     import { createClient } from '@/lib/supabase/server'
     import { redirect } from 'next/navigation'
     import CardsClientPage from './CardsClientPage'

     export default async function CardsPage() {
       const supabase = createClient()

       const { data, error } = await supabase.auth.getUser()
       if (error || !data?.user) {
         redirect('/login')
       }

       return <CardsClientPage />
     }
     ```

  3. Create the client page `src/app/cards/CardsClientPage.tsx` for all interactive UI.

     ```typescript
     // src/app/cards/CardsClientPage.tsx
      "use client";
      import { useState, useMemo } from 'react';
      import { usePokemonData } from '@/hooks/usePokemonData';
      import CardComponent from '@/components/cards/Card';
      import Spinner from '@/components/ui/Spinner';
      import { Card } from '@/lib/types';
      // SWR and save logic will be added in Phase 3

      type ActiveTab = 'wishlist' | 'tradeList';
      const ALLOWED_TRADE_RARITIES = new Set(['C', 'U', 'R', 'RR', 'AR']);

      export default function CardsClientPage() {
        const { data: allCards, isLoading: cardsLoading, error } = usePokemonData();

        const [activeTab, setActiveTab] = useState<ActiveTab>('wishlist');
        const [searchQuery, setSearchQuery] = useState('');
        const [rarityFilter, setRarityFilter] = useState('');

        // Placeholder for user selections - will be populated in Phase 3
        const [wishlistSelection, setWishlistSelection] = useState<Set<string>>(new Set());
        const [tradeListSelection, setTradeListSelection] = useState<Set<string>>(new Set());

        const filteredCards = useMemo(() => {
          if (!allCards) return [];
          return allCards.filter(card => {
            const nameMatch = card.name.toLowerCase().includes(searchQuery.toLowerCase());
            const rarityMatch = rarityFilter ? card.rarityCode === rarityFilter : true;
            return nameMatch && rarityMatch;
          });
        }, [allCards, searchQuery, rarityFilter]);

        const cardsMap = useMemo(() => {
            if (!allCards) return new Map<string, Card>();
            return new Map(allCards.map(c => [c.id, c]));
        }, [allCards]);

        const handleToggleCard = (cardId: string) => {
          const isTradeTab = activeTab === 'tradeList';
          const currentSet = isTradeTab ? tradeListSelection : wishlistSelection;
          const setter = isTradeTab ? setTradeListSelection : setWishlistSelection;

          const newSet = new Set(currentSet);
          if (newSet.has(cardId)) {
            newSet.delete(cardId);
          } else {
            newSet.add(cardId);
          }
          setter(newSet);
        };

        if (cardsLoading) {
          return <div className="flex justify-center items-center h-64"><Spinner /></div>;
        }
        if (error) {
          return <p className="text-center text-red-500">Error loading card data.</p>;
        }

        const selectionSet = activeTab === 'wishlist' ? wishlistSelection : tradeListSelection;
        const rarities = useMemo(() => allCards ? [...new Set(allCards.map(c => ({ code: c.rarityCode, name: c.rarityFullName })))]
            .sort((a, b) => a.name.localeCompare(b.name)) : [], [allCards]);

        return (
          <div className="w-full">
            <div className="flex gap-2 mb-4 border-b">
              <button onClick={() => setActiveTab('wishlist')} className={`px-4 py-2 font-semibold ${activeTab === 'wishlist' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>My Wishlist</button>
              <button onClick={() => setActiveTab('tradeList')} className={`px-4 py-2 font-semibold ${activeTab === 'tradeList' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>My Trade List</button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <input type="text" placeholder="Search by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="p-2 border rounded w-full bg-inherit" />
              <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} className="p-2 border rounded bg-inherit">
                <option value="">All Rarities</option>
                {rarities.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {filteredCards.map(card => (
                <CardComponent
                  key={card.id}
                  cardData={card}
                  isSelected={selectionSet.has(card.id)}
                  isDisabled={activeTab === 'tradeList' && !ALLOWED_TRADE_RARITIES.has(card.rarityCode)}
                  onToggle={handleToggleCard}
                />
              ))}
            </div>
          </div>
        );
      }
     ```

---

### Phase 3: User List Management

All tasks in this phase are unchanged from the original plan.

**Task 3.1: Create API Endpoint to Fetch User Data**

- **Goal:** Provide a secure endpoint that returns the logged-in user's profile and their card list identifiers.
- **Steps:**
  1.  Create `src/app/api/user/me/route.ts`.
  2.  Populate it with the following code.

      ```typescript
      // src/app/api/user/me/route.ts
      import { createClient } from "@/lib/supabase/server";
      import { NextResponse } from "next/server";

      export async function GET(request: Request) {
        const supabase = createClient();

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        try {
          const [profileRes, wishlistRes, tradeListRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("id, username, friend_id")
              .eq("id", userId)
              .single(),
            supabase
              .from("user_wishlist")
              .select("card_identifier")
              .eq("user_id", userId),
            supabase
              .from("user_trade_list")
              .select("card_identifier")
              .eq("user_id", userId),
          ]);

          if (profileRes.error) throw profileRes.error;
          if (wishlistRes.error) throw wishlistRes.error;
          if (tradeListRes.error) throw tradeListRes.error;

          const userData = {
            profile: profileRes.data,
            wishlist: wishlistRes.data.map((item) => item.card_identifier),
            tradeList: tradeListRes.data.map((item) => item.card_identifier),
          };

          return NextResponse.json(userData);
        } catch (error: any) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
      ```

**Task 3.2: Implement Batch Update API Endpoints**

- **Goal:** Create secure, efficient endpoints to add and remove multiple cards from a user's lists in a single request.
- **Steps:**
  1.  Create `src/app/api/user/wishlist/batch-update/route.ts`.
  2.  Populate it with the following code.

      ```typescript
      // src/app/api/user/wishlist/batch-update/route.ts
      import { createClient } from "@/lib/supabase/server";
      import { NextResponse } from "next/server";
      import { z } from "zod";

      const batchUpdateSchema = z.object({
        toAdd: z.array(z.string()).max(500),
        toRemove: z.array(z.string()).max(500),
      });

      export async function POST(request: Request) {
        const supabase = createClient();
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
            operations.push(
              supabase.from("user_wishlist").insert(recordsToAdd),
            );
          }
          if (toRemove.length > 0) {
            operations.push(
              supabase
                .from("user_wishlist")
                .delete()
                .eq("user_id", userId)
                .in("card_identifier", toRemove),
            );
          }

          const results = await Promise.all(operations);
          const errors = results.map((res) => res.error).filter(Boolean);
          if (errors.length > 0) {
            throw new Error(errors.map((e) => e.message).join(", "));
          }

          return NextResponse.json({
            message: "Wishlist updated successfully.",
          });
        } catch (error: any) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
      ```

  3.  Create `src/app/api/user/tradelist/batch-update/route.ts`. Copy the code from the wishlist route and change every instance of `user_wishlist` to `user_trade_list`.

**Task 3.3: Integrate User Data and Interaction on the Cards Page**

- **Goal:** Connect the frontend to the backend APIs, enabling users to see and modify their saved lists.
- **Steps:**
  1.  Create `src/components/cards/SaveChangesBar.tsx`.

      ```typescript
      // src/components/cards/SaveChangesBar.tsx
      interface SaveChangesBarProps { onSave: () => void; onDiscard: () => void; isSaving: boolean; }

      export default function SaveChangesBar({ onSave, onDiscard, isSaving }: SaveChangesBarProps) {
         return (
             <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 shadow-lg flex justify-center items-center gap-4 z-50">
                 <p>You have unsaved changes.</p>
                 <button onClick={onSave} disabled={isSaving} className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded font-bold disabled:bg-gray-400">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                 </button>
                 <button onClick={onDiscard} disabled={isSaving} className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded disabled:opacity-50">Discard</button>
             </div>
         );
      }
      ```

  2.  Open `src/app/cards/CardsClientPage.tsx` and add the SWR hook, state management for changes, and save/discard logic.

      ```typescript
      // src/app/cards/CardsClientPage.tsx (Updated)
      "use client";
      import { useState, useMemo, useEffect } from 'react';
      import { usePokemonData } from '@/hooks/usePokemonData';
      import CardComponent from '@/components/cards/Card';
      import Spinner from '@/components/ui/Spinner';
      import { Card, UserData } from '@/lib/types';
      import useSWR from 'swr';
      import toast from 'react-hot-toast';
      import SaveChangesBar from '@/components/cards/SaveChangesBar';

      type ActiveTab = 'wishlist' | 'tradeList';
      const ALLOWED_TRADE_RARITIES = new Set(['C', 'U', 'R', 'RR', 'AR']);
      const fetcher = (url: string) => fetch(url).then(res => res.json());

      export default function CardsClientPage() {
        const { data: allCards, isLoading: cardsLoading, error: cardsError } = usePokemonData();
        const { data: userData, error: userError, isLoading: userDataLoading, mutate } = useSWR<UserData>('/api/user/me', fetcher);

        const [activeTab, setActiveTab] = useState<ActiveTab>('wishlist');
        const [searchQuery, setSearchQuery] = useState('');
        const [rarityFilter, setRarityFilter] = useState('');
        const [isSaving, setIsSaving] = useState(false);

        const [initialWishlist, setInitialWishlist] = useState<Set<string>>(new Set());
        const [initialTradeList, setInitialTradeList] = useState<Set<string>>(new Set());
        const [wishlistSelection, setWishlistSelection] = useState<Set<string>>(new Set());
        const [tradeListSelection, setTradeListSelection] = useState<Set<string>>(new Set());

        useEffect(() => {
          if (userData) {
            const wSet = new Set(userData.wishlist);
            const tSet = new Set(userData.tradeList);
            setInitialWishlist(wSet);
            setWishlistSelection(new Set(wSet));
            setInitialTradeList(tSet);
            setTradeListSelection(new Set(tSet));
          }
        }, [userData]);

        // ... (filteredCards, cardsMap, useMemo hooks from previous task) ...

        const handleToggleCard = (cardId: string) => {
          const card = cardsMap.get(cardId);
          if (!card) return;

          const isTradeTab = activeTab === 'tradeList';
          const currentSet = isTradeTab ? tradeListSelection : wishlistSelection;
          const setter = isTradeTab ? setTradeListSelection : setWishlistSelection;

          if (isTradeTab && !ALLOWED_TRADE_RARITIES.has(card.rarityCode)) {
            toast.error("This card's rarity cannot be traded.");
            return;
          }

          const newSet = new Set(currentSet);
          if (newSet.has(cardId)) {
            newSet.delete(cardId);
          } else {
            newSet.add(cardId);
          }
          setter(newSet);
        };

        const hasChanges = useMemo(() => {
            const wishlistChanged = initialWishlist.size !== wishlistSelection.size || [...initialWishlist].some(id => !wishlistSelection.has(id)) || [...wishlistSelection].some(id => !initialWishlist.has(id));
            const tradeListChanged = initialTradeList.size !== tradeListSelection.size || [...initialTradeList].some(id => !tradeListSelection.has(id)) || [...tradeListSelection].some(id => !initialTradeList.has(id));
            return wishlistChanged || tradeListChanged;
        }, [initialWishlist, wishlistSelection, initialTradeList, tradeListSelection]);

        const handleSaveChanges = async () => {
          setIsSaving(true);
          const wishlistToAdd = [...wishlistSelection].filter(id => !initialWishlist.has(id));
          const wishlistToRemove = [...initialWishlist].filter(id => !wishlistSelection.has(id));
          const tradeListToAdd = [...tradeListSelection].filter(id => !initialTradeList.has(id));
          const tradeListToRemove = [...initialTradeList].filter(id => !initialTradeList.has(id));

          const promise = Promise.all([
            fetch('/api/user/wishlist/batch-update', { method: 'POST', body: JSON.stringify({ toAdd: wishlistToAdd, toRemove: wishlistToRemove }), headers: {'Content-Type': 'application/json'} }),
            fetch('/api/user/tradelist/batch-update', { method: 'POST', body: JSON.stringify({ toAdd: tradeListToAdd, toRemove: tradeListToRemove }), headers: {'Content-Type': 'application/json'} })
          ]).then(async ([wishlistRes, tradeListRes]) => {
              if (!wishlistRes.ok || !tradeListRes.ok) throw new Error("Failed to save changes.");
              await mutate(); // Re-fetch user data from SWR cache
          });

          toast.promise(promise, {
            loading: 'Saving changes...',
            success: 'Lists updated successfully!',
            error: 'Could not save changes.',
          });

          await promise.finally(() => setIsSaving(false));
        };

        const handleDiscardChanges = () => {
            setWishlistSelection(new Set(initialWishlist));
            setTradeListSelection(new Set(initialTradeList));
        };

        if (cardsLoading || userDataLoading) {
          return <div className="flex justify-center items-center h-64"><Spinner /></div>;
        }
        if (cardsError || userError) {
          return <p className="text-center text-red-500">Error loading data.</p>;
        }

        // ... (return statement with JSX from previous task) ...
        return (
          <div className="w-full pb-20"> {/* Padding bottom for SaveChangesBar */}
             {/* ... Tab Navigation and Filter Controls ... */}
             {/* ... Card Grid ... */}
             {hasChanges && <SaveChangesBar onSave={handleSaveChanges} onDiscard={handleDiscardChanges} isSaving={isSaving} />}
          </div>
        );
      }
      ```

---

### Phase 4: Matchmaking

All tasks in this phase are unchanged from the original plan.

**Task 4.1: Implement the Core Matchmaking API Endpoint**

- **Goal:** Create the API route that finds potential 1-for-1 trades between the current user and all other users, respecting the "same rarity" rule.
- **Steps:**
  1.  Create the file `src/app/api/matches/route.ts`.
  2.  Populate it with the following code.

      ```typescript
      // src/app/api/matches/route.ts
      import { createClient } from "@/lib/supabase/server";
      import { NextResponse } from "next/server";
      import { Card } from "@/lib/types";

      let cardDataCache: { id: string; rarityCode: string }[] | null = null;
      let cacheTimestamp = 0;
      const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours
      const ALLOWED_TRADE_RARITIES = new Set(["C", "U", "R", "RR", "AR"]);

      async function getCardData(): Promise<Map<string, string>> {
        if (!cardDataCache || Date.now() - cacheTimestamp > CACHE_DURATION_MS) {
          const res = await fetch(
            "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/cards.json",
            { next: { revalidate: 3600 } },
          );
          if (!res.ok)
            throw new Error("Failed to fetch card data for matchmaking");
          const rawCards: any[] = await res.json();
          cardDataCache = rawCards.map((c) => ({
            id: `${c.set}-${c.number}`,
            rarityCode: c.rarityCode,
          }));
          cacheTimestamp = Date.now();
        }
        return new Map(cardDataCache!.map((c) => [c.id, c.rarityCode]));
      }

      export async function GET() {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const currentUserId = session.user.id;

        try {
          const [myListsRes, cardRarityMap] = await Promise.all([
            supabase
              .from("profiles")
              .select(
                `user_wishlist(card_identifier), user_trade_list(card_identifier)`,
              )
              .eq("id", currentUserId)
              .single(),
            getCardData(),
          ]);

          if (myListsRes.error) throw myListsRes.error;

          const myWishlistIds = new Set(
            myListsRes.data.user_wishlist.map((c: any) => c.card_identifier),
          );
          const myTradelistIds = new Set(
            myListsRes.data.user_trade_list
              .map((c: any) => c.card_identifier)
              .filter((id: string) =>
                ALLOWED_TRADE_RARITIES.has(cardRarityMap.get(id)!),
              ),
          );

          const { data: potentialPartners, error: partnersError } =
            await supabase
              .from("profiles")
              .select(
                `id, username, friend_id, user_wishlist(card_identifier), user_trade_list(card_identifier)`,
              )
              .neq("id", currentUserId);
          if (partnersError) throw partnersError;

          const matches: any[] = [];

          for (const partner of potentialPartners) {
            const partnerWants = new Set(
              partner.user_wishlist.map((c: any) => c.card_identifier),
            );
            const partnerHas = new Set(
              partner.user_trade_list
                .map((c: any) => c.card_identifier)
                .filter((id: string) =>
                  ALLOWED_TRADE_RARITIES.has(cardRarityMap.get(id)!),
                ),
            );

            const iHavePartnerWants = [...myTradelistIds].filter((id) =>
              partnerWants.has(id),
            );
            const partnerHasIWant = [...partnerHas].filter((id) =>
              myWishlistIds.has(id),
            );

            for (const myCardId of iHavePartnerWants) {
              for (const partnerCardId of partnerHasIWant) {
                const myCardRarity = cardRarityMap.get(myCardId as string);
                const partnerCardRarity = cardRarityMap.get(
                  partnerCardId as string,
                );

                if (
                  myCardRarity &&
                  partnerCardRarity &&
                  myCardRarity === partnerCardRarity
                ) {
                  matches.push({
                    partner: {
                      id: partner.id,
                      username: partner.username,
                      friend_id: partner.friend_id,
                    },
                    myOffer: myCardId,
                    partnerOffer: partnerCardId,
                  });
                }
              }
            }
          }

          return NextResponse.json(matches);
        } catch (error: any) {
          console.error("Matchmaking error:", error);
          return NextResponse.json(
            { error: "An error occurred while finding matches." },
            { status: 500 },
          );
        }
      }
      ```

**Task 4.2: Create and Populate the Matches Page**

- **Goal:** Display the matches found by the API in a clear, actionable UI.
- **Steps:**
  1.  Create `src/app/matches/page.tsx`.

      ```typescript
      // src/app/matches/page.tsx
      import { createClient } from '@/lib/supabase/server'
      import { redirect } from 'next/navigation'
      import MatchesClientPage from './MatchesClientPage'

      export default async function MatchesPage() {
        const supabase = createClient()
        const { data, error } = await supabase.auth.getUser()
        if (error || !data?.user) {
          redirect('/login')
        }
        return <MatchesClientPage />
      }
      ```

  2.  Create `src/app/matches/MatchesClientPage.tsx`.

      ```typescript
      // src/app/matches/MatchesClientPage.tsx
      "use client";
      import useSWR from 'swr';
      import { usePokemonData } from '@/hooks/usePokemonData';
      import Spinner from '@/components/ui/Spinner';
      import CardComponent from '@/components/cards/Card';
      import { Card as CardType } from '@/lib/types';
      import toast from 'react-hot-toast';

      const fetcher = (url: string) => fetch(url).then(res => res.json());

      interface Match {
        partner: { id: string; username: string; friend_id: string; };
        myOffer: string;
        partnerOffer: string;
      }

      export default function MatchesClientPage() {
        const { data: allCards, isLoading: cardsLoading } = usePokemonData();
        const { data: matches, error, isLoading: matchesLoading } = useSWR<Match[]>('/api/matches', fetcher, { revalidateOnFocus: false });

        const cardsMap = useMemo(() => {
            if (!allCards) return new Map<string, CardType>();
            return new Map(allCards.map(c => [c.id, c]));
        }, [allCards]);

        const handleCopyFriendId = (friendId: string) => {
          navigator.clipboard.writeText(friendId);
          toast.success("Friend ID copied to clipboard!");
        };

        const renderContent = () => {
          if (cardsLoading || matchesLoading) {
            return <div className="flex justify-center items-center h-64"><Spinner /></div>;
          }
          if (error) {
            return <p className="text-center text-red-500">Could not load matches. Please try again later.</p>;
          }
          if (!matches || matches.length === 0) {
            return <p className="text-center text-gray-500">No 1-for-1 trades found. Try adding more cards to your Wishlist and Trade List!</p>;
          }

          return (
            <div className="space-y-6">
              {matches.map((match, index) => {
                const myCard = cardsMap.get(match.myOffer);
                const partnerCard = cardsMap.get(match.partnerOffer);
                if (!myCard || !partnerCard) return null;

                return (
                  <div key={`${match.partner.id}-${match.myOffer}-${match.partnerOffer}-${index}`} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 border dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{match.partner.username}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Friend ID: {match.partner.friend_id}</p>
                      </div>
                      <button onClick={() => handleCopyFriendId(match.partner.friend_id)} className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">Copy ID</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center">
                      <div>
                        <h4 className="font-bold mb-2">You Give</h4>
                        <div className="max-w-[150px] mx-auto">
                           <CardComponent cardData={myCard} isSelected={true} isDisabled={true} onToggle={() => {}} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">↔️</div>
                      <div>
                        <h4 className="font-bold mb-2">You Get</h4>
                         <div className="max-w-[150px] mx-auto">
                           <CardComponent cardData={partnerCard} isSelected={true} isDisabled={true} onToggle={() => {}} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        };

        return (
          <div className="w-full max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Potential Trades</h1>
            {renderContent()}
          </div>
        );
      }
      ```

---

### Phase 5: Finalization & Deployment

**Task 5.1: Implement API Rate Limiting**

- **Goal:** Protect all API routes from abuse by merging rate-limiting logic into the Supabase middleware.
- **Steps:**
  1.  Create a KV Database in your Vercel project dashboard and link it.
  2.  Open `src/middleware.ts` and modify it to include the rate-limiting logic.

      ```typescript
      // src/middleware.ts
      import { type NextRequest, NextResponse } from "next/server";
      import { updateSession } from "@/lib/supabase/middleware";
      import { kv } from "@vercel/kv";

      const TIME_WINDOW_S = 60; // 1 minute window
      const MAX_REQUESTS = 30; // Max 30 requests per minute per IP

      export async function middleware(request: NextRequest) {
        // Rate limiting logic for API routes
        if (request.nextUrl.pathname.startsWith("/api/")) {
          const ip = request.ip ?? "127.0.0.1";
          const key = `rate-limit:${ip}`;

          const currentRequests = await kv.get<number>(key);

          if (currentRequests && currentRequests > MAX_REQUESTS) {
            return new NextResponse(
              JSON.stringify({ error: "Too many requests" }),
              { status: 429, headers: { "Content-Type": "application/json" } },
            );
          }

          const pipe = kv.pipeline();
          pipe.incr(key);
          if (!currentRequests) {
            pipe.expire(key, TIME_WINDOW_S);
          }
          await pipe.exec();
        }

        // Supabase session management
        return await updateSession(request);
      }

      export const config = {
        matcher: [
          /*
           * Match all request paths except for the ones starting with:
           * - _next/static (static files)
           * - _next/image (image optimization files)
           * - favicon.ico (favicon file)
           * Feel free to modify this pattern to include more paths.
           */
          "/((?!_next/static|_next/image|favicon.ico).*)",
        ],
      };
      ```

**Task 5.2: Create Dashboard Page**

- **Goal:** Provide a simple landing page for authenticated users.
- **Steps:**
  1.  Create `src/app/dashboard/page.tsx`.
  2.  Populate it with a welcome message and links.

      ```typescript
      // src/app/dashboard/page.tsx
      import { createClient } from '@/lib/supabase/server'
      import { redirect } from 'next/navigation'
      import Link from 'next/link'

      export default async function DashboardPage() {
        const supabase = createClient()

        const { data, error } = await supabase.auth.getUser()
        if (error || !data?.user) {
          redirect('/login')
        }

        const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.user.id).single();

        return (
          <div className="w-full max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">Welcome, {profile?.username || data.user.email}!</h1>
            <p className="mb-6">Manage your collection and find new trades.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/cards" className="block p-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                <h2 className="text-2xl font-bold">Manage My Cards</h2>
                <p>Update your Wishlist and Trade List.</p>
              </Link>
              <Link href="/matches" className="block p-6 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <h2 className="text-2xl font-bold">Find Trades</h2>
                <p>See all potential 1-for-1 trades.</p>
              </Link>
            </div>
          </div>
        )
      }
      ```

**Task 5.3: Prepare for and Deploy to Vercel**

- **Goal:** Deploy the completed application to the web.
- **Steps:**
  1.  **Code Review:** Read through your entire codebase, checking for consistency and removing temporary `console.log` statements.
  2.  **GitHub:** Push your final code to a new GitHub repository.
  3.  **Vercel Project:** On vercel.com, create a "New Project" and import your GitHub repository.
  4.  **Configure Environment Variables:** In the Vercel project settings under "Environment Variables", add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the values from your `.env.local` file. Do NOT commit your `.env.local` file.
  5.  **Link Vercel KV:** In the Vercel project settings under "Storage", ensure your KV database is linked.
  6.  **Deploy:** Trigger a deployment. Vercel will build and deploy your application.
  7.  **Final Testing:** Thoroughly test the live application. Create accounts, add cards, and verify that matchmaking works as expected.

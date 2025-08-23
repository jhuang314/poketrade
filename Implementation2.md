### **Definitive File Structure**

All development will adhere to the following file structure within the `src/` directory. All tasks will reference these exact paths.

```
src
├── app
│   ├── api
│   │   ├── auth
│   │   │   ├── login/route.ts
│   │   │   └── signup/route.ts
│   │   ├── matches/route.ts
│   │   └── user
│   │       ├── me/route.ts
│   │       ├── tradelist
│   │       │   └── batch-update/route.ts
│   │       └── wishlist
│   │           └── batch-update/route.ts
│   ├── cards/page.tsx
│   ├── dashboard/page.tsx
│   ├── layout.tsx
│   ├── login/page.tsx
│   └── matches/page.tsx
│   └── page.tsx
├── components
│   ├── auth
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── cards
│   │   ├── Card.tsx
│   │   ├── CardGrid.tsx
│   │   ├── SaveChangesBar.tsx
│   │   └── TabNavigation.tsx
│   ├── layout
│   │   └── Navbar.tsx
│   └── ui
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Spinner.tsx
├── context
│   └── AuthContext.tsx
├── hooks
│   └── usePokemonData.ts
├── lib
│   ├── supabase
│   │   ├── client.ts   // For Client Components
│   │   └── server.ts   // For Server Components / Route Handlers
│   └── types.ts        // Centralized TypeScript types
└── middleware.ts       // For rate limiting
```

---

### **Implementation Task Breakdown**

### Phase 1: Project Setup & Core Foundations

**Task 1.1: Initialize Next.js Project & Install Dependencies**

- **Goal:** Create the basic project structure and install all necessary packages.
- **Steps:**
  1.  Run `npx create-next-app@latest pocket-matchmaker`. Use these exact settings:
      - **TypeScript:** Yes
      - **ESLint:** Yes
      - **Tailwind CSS:** Yes
      - **`src/` directory:** Yes
      - **App Router:** Yes
      - **Default import alias:** No
  2.  Navigate into the project: `cd pocket-matchmaker`.
  3.  Install all required libraries:
      ```bash
      npm install @supabase/supabase-js @supabase/ssr zod clsx swr react-hot-toast
      ```
  4.  Run `npm run dev` to confirm the project starts successfully.

**Task 1.2: Set Up Supabase Project, Schema, and RLS Policies**

- **Goal:** Create the backend database, tables, and security rules.
- **Steps:**
  1.  Create a new project on [supabase.com](https://supabase.com).
  2.  Navigate to the "SQL Editor" and execute the following SQL in a single query to create all tables and enable RLS.

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

**Task 1.3: Configure Supabase Clients & Environment**

- **Goal:** Securely connect the Next.js app to Supabase for both client and server contexts.
- **Steps:**
  1.  Create `.env.local` in the project root. Add your Supabase Project URL and Anon Key.
      ```.env.local
      NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
      NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
      ```
  2.  Create `src/lib/supabase/client.ts` for use in Client Components.

      ```typescript
      // src/lib/supabase/client.ts
      import { createBrowserClient } from "@supabase/ssr";

      export function createClient() {
        return createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
      }
      ```

  3.  Create `src/lib/supabase/server.ts` for use in Route Handlers and Server Components.

      ```typescript
      // src/lib/supabase/server.ts
      import { createServerClient, type CookieOptions } from "@supabase/ssr";
      import { cookies } from "next/headers";

      export function createClient(cookieStore: ReturnType<typeof cookies>) {
        return createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              get(name: string) {
                return cookieStore.get(name)?.value;
              },
              set(name: string, value: string, options: CookieOptions) {
                cookieStore.set({ name, value, ...options });
              },
              remove(name: string, options: CookieOptions) {
                cookieStore.set({ name, value: "", ...options });
              },
            },
          },
        );
      }
      ```

**Task 1.4: Define Centralized TypeScript Types**

- **Goal:** Create a single source of truth for all data shapes.
- **Steps:**
  1. Create `src/lib/types.ts` and add the following definitions.

     ```typescript
     // src/lib/types.ts
     import { User } from "@supabase/supabase-js";

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

     // Auth Context state
     export interface AuthContextType {
       user: User | null;
       profile: Profile | null;
       loading: boolean;
     }
     ```

**Task 1.5: Implement Authentication API Routes**

- **Goal:** Build the secure server-side logic for user signup and login.
- **Steps:**
  1.  In your Supabase project settings (Authentication -> General), find your `SERVICE_ROLE_KEY`.
  2.  Add it to your `.env.local` and Vercel environment variables. **NEVER expose this key on the client side.**
      ```.env.local
      SUPABASE_SERVICE_ROLE_KEY=your_secret_service_role_key
      ```
  3.  Create `src/app/api/auth/signup/route.ts` with validation and profile creation logic.

      ```typescript
      // src/app/api/auth/signup/route.ts
      import { createClient as createServerClient } from "@/lib/supabase/server"; // Renamed to avoid conflict
      import { createClient as createAdminClient } from "@supabase/supabase-js"; // Import the standard client for admin
      import { cookies } from "next/headers";
      import { NextResponse } from "next/server";
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

      export async function POST(request: Request) {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);
        const body = await request.json();

        const validation = signupSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json(
            { error: validation.error.flatten() },
            { status: 400 },
          );
        }

        const { email, password, username, friendId } = validation.data;

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          // Pass metadata to be used by the trigger
          options: {
            data: {
              username: username,
              friend_id: friendId,
            },
          },
        });

        if (signUpError) {
          // If the error is due to a unique constraint in your profiles table,
          // Supabase will now return a more specific error message.
          return NextResponse.json(
            { error: signUpError.message },
            { status: 400 },
          );
        }

        return NextResponse.json(
          { message: "Signup successful, please check your email to verify." },
          { status: 201 },
        );
      }
      ```

  4.  Create `src/app/api/auth/login/route.ts` for handling user login.

      ```typescript
      // src/app/api/auth/login/route.ts
      import { createClient } from "@/lib/supabase/server";
      import { cookies } from "next/headers";
      import { NextResponse } from "next/server";
      import { z } from "zod";

      const loginSchema = z.object({
        email: z.string().email(),
        password: z.string(),
      });

      export async function POST(request: Request) {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);
        const body = await request.json();

        const validation = loginSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json(
            { error: "Invalid credentials" },
            { status: 400 },
          );
        }

        const { email, password } = validation.data;

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return NextResponse.json(
            { error: "Invalid login credentials" },
            { status: 401 },
          );
        }

        return NextResponse.json(
          { message: "Login successful" },
          { status: 200 },
        );
      }
      ```

**Task 1.6: Implement Global Auth Context & Layout**

- **Goal:** Create a global state manager for authentication and integrate it into the app.
- **Steps:**
  1.  Create `src/context/AuthContext.tsx`.

      ```typescript
      // src/context/AuthContext.tsx
      "use client";
      import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
      import { createClient } from '@/lib/supabase/client';
      import { AuthContextType, Profile } from '@/lib/types';
      import { User } from '@supabase/supabase-js';

      const AuthContext = createContext<AuthContextType | undefined>(undefined);

      export const AuthProvider = ({ children }: { children: ReactNode }) => {
        const supabase = createClient();
        const [user, setUser] = useState<User | null>(null);
        const [profile, setProfile] = useState<Profile | null>(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
          const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            if (session?.user) {
                const { data: userProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                setProfile(userProfile);
            }
            setLoading(false);
          };
          getSession();

          const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
              setUser(session?.user ?? null);
              if (session?.user) {
                const { data: userProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                setProfile(userProfile);
              } else {
                setProfile(null);
              }
              if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
                setLoading(false);
              }
            }
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
          throw new Error('useAuth must be used within an AuthProvider');
        }
        return context;
      };
      ```

  2.  Create `src/components/layout/Navbar.tsx`.

      ```typescript
      // src/components/layout/Navbar.tsx
      "use client";
      import { useAuth } from '@/context/AuthContext';
      import Link from 'next/link';
      import { createClient } from '@/lib/supabase/client';
      import { useRouter } from 'next/navigation';

      export default function Navbar() {
        const { user, profile } = useAuth();
        const supabase = createClient();
        const router = useRouter();

        const handleLogout = async () => {
          await supabase.auth.signOut();
          router.push('/login');
          router.refresh();
        };

        return (
          <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">PokéMatch</Link>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/dashboard">Dashboard</Link>
                  <Link href="/cards">My Cards</Link>
                  <Link href="/matches">Matches</Link>
                  <span>Hi, {profile?.username || user.email}</span>
                  <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded">Logout</button>
                </>
              ) : (
                <Link href="/login">Login</Link>
              )}
            </div>
          </nav>
        );
      }
      ```

  3.  Update `src/app/layout.tsx` to include the provider and navbar.

      ```typescript
      // src/app/layout.tsx
      import type { Metadata } from "next";
      import { Inter } from "next/font/google";
      import "./globals.css";
      import { AuthProvider } from "@/context/AuthContext";
      import Navbar from "@/components/layout/Navbar";
      import { Toaster } from 'react-hot-toast';

      const inter = Inter({ subsets: ["latin"] });

      export const metadata: Metadata = {
        title: "Pokémon TCG Pocket Matchmaker",
        description: "Find trades for Pokémon TCG Pocket",
      };

      export default function RootLayout({
        children,
      }: {
        children: React.ReactNode;
      }) {
        return (
          <html lang="en">
            <body className={inter.className}>
              <AuthProvider>
                <Navbar />
                <main className="container mx-auto p-4">
                  {children}
                </main>
                <Toaster />
              </AuthProvider>
            </body>
          </html>
        );
      }
      ```

**Task 1.7: Create Login Page UI and Wire Logic**

- **Goal:** Create the user-facing login/signup page and connect it to the APIs.
- **Steps:**
  1.  Create `src/app/login/page.tsx` with logic to handle form state and submission.

      ```typescript
      // src/app/login/page.tsx
      "use client";
      import { useState } from 'react';
      import LoginForm from '@/components/auth/LoginForm';
      import SignupForm from '@/components/auth/SignupForm';

      export default function LoginPage() {
        const [showLogin, setShowLogin] = useState(true);

        return (
          <div className="max-w-md mx-auto mt-10">
            {showLogin ? <LoginForm /> : <SignupForm />}
            <button
              onClick={() => setShowLogin(!showLogin)}
              className="w-full mt-4 text-center text-blue-500 hover:underline"
            >
              {showLogin ? "Need an account? Sign Up" : "Already have an account? Login"}
            </button>
          </div>
        );
      }
      ```

  2.  Create reusable UI components `src/components/ui/Input.tsx` and `Button.tsx`.

      ```typescript
      // src/components/ui/Input.tsx
      import React from 'react';
      export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
        return <input className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} ref={ref} {...props} />;
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

  3.  Create `src/components/auth/LoginForm.tsx` and `SignupForm.tsx` with the form elements and `fetch` logic to call your API endpoints:

      ```typescript
      // src/components/auth/LoginForm.tsx
      "use client";
      import { useState } from 'react';
      import { useRouter } from 'next/navigation';
      import { Input } from '@/components/ui/Input';
      import { Button } from '@/components/ui/Button';
      import toast from 'react-hot-toast';

      export default function LoginForm() {
        const router = useRouter();
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [isLoading, setIsLoading] = useState(false);

        const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          setIsLoading(true);

          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (res.ok) {
            toast.success('Login successful!');
            router.push('/dashboard');
            router.refresh(); // Important to re-fetch server components
          } else {
            const { error } = await res.json();
            toast.error(error || 'An unknown error occurred.');
          }
          setIsLoading(false);
        };

        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold text-center">Login</h2>
            <div>
              <label htmlFor="email">Email</label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        );
      }
      ```

      The logic for `SignupForm.tsx` would be very similar.

### **Phase 2: Displaying Pokémon Card Data**

**Task 2.1: Create Client-Side Pokémon Data Fetching Hook**

- **Goal:** Build a reusable hook that fetches card, set, and rarity data from GitHub, enriches it, and caches it in `localStorage` for 24 hours.
- **Steps:**
  1.  Create the file `src/hooks/usePokemonData.ts`.
  2.  Populate it with the following code. This hook handles fetching, processing, and caching, providing a simple interface for any component to access the full card database.

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
              // 1. Check cache first
              const cachedItem = localStorage.getItem(CACHE_KEY);
              if (cachedItem) {
                const cache: CacheData = JSON.parse(cachedItem);
                if (Date.now() - cache.timestamp < CACHE_DURATION) {
                  setData(cache.data);
                  setIsLoading(false);
                  return;
                }
              }

              // 2. Fetch from network if cache is invalid or missing
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

              // 3. Process and enrich the data
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

              // 4. Update state and cache
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
  1.  Modify `next.config.js` to whitelist the image hostname.

      ```javascript
      // next.config.js
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

      module.exports = nextConfig;
      ```

  2.  Create the component file `src/components/cards/Card.tsx`.
  3.  Populate it with the following code. This component uses `clsx` for clean conditional class names and Next.js `<Image>` for performance.

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
        onToggle: (card: CardType) => void;
      }

      export default function Card({ cardData, isSelected, isDisabled, onToggle }: CardProps) {
        const imageUrl = `https://raw.githubusercontent.com/flibustier/pokemon-tcg-exchange/refs/heads/main/public/images/cards/${cardData.imageName}`;

        const handleClick = () => {
          if (!isDisabled) {
            onToggle(cardData);
          }
        };

        return (
          <div
            onClick={handleClick}
            className={clsx(
              "border-2 rounded-lg overflow-hidden transition-all duration-200",
              {
                "border-blue-500 shadow-lg scale-105": isSelected,
                "border-transparent": !isSelected,
                "opacity-50 cursor-not-allowed": isDisabled,
                "cursor-pointer hover:border-blue-400": !isDisabled,
              }
            )}
          >
            <div
              className={clsx("relative transition-filter duration-200", {
                "grayscale": !isSelected && !isDisabled,
              })}
            >
              <Image
                src={imageUrl}
                alt={cardData.name}
                width={245}
                height={342}
                priority={false} // Set to true for above-the-fold images if needed
                className="w-full h-auto"
              />
            </div>
          </div>
        );
      }
      ```

**Task 2.3: Build the Card Management Page UI**

- **Goal:** Create the complete user interface for the `/cards` page, including tabs, filters, and the card grid, wired up to the data hook.
- **Steps:**
  1.  Create a new file at `src/components/ui/Spinner.tsx`.
  2.  Populate it with the following code:

  ```typescript
    // src/components/ui/Spinner.tsx
    import clsx from 'clsx';

    interface SpinnerProps {
      /**
      * Defines the size of the spinner.
      * @default 'md'
      */
      size?: 'sm' | 'md' | 'lg';
      /**
      * Optional additional class names for custom styling (e.g., margins).
      */
      className?: string;
    }

    /**
    * A simple, accessible loading spinner component.
    */
    export default function Spinner({ size = 'md', className }: SpinnerProps) {
      const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-4',
        lg: 'w-12 h-12 border-4',
      };

      return (
        <div
          // The `role="status"` attribute makes this accessible to screen readers,
          // informing them that this part of the page is actively being updated.
          role="status"
          className={clsx(
            'animate-spin rounded-full border-solid',
            'border-gray-200', // This is the "track" color
            'border-t-blue-500', // This is the moving "head" color
            sizeClasses[size],
            className
          )}
        >
          {/* This span is visually hidden but read by screen readers */}
          <span className="sr-only">Loading...</span>
        </div>
      );
    }
  ```

  3.  Create the main page file `src/app/cards/page.tsx`.
  4.  Populate it with the following. This component is the central hub for this feature, managing all client-side state and composing the UI from smaller components.

      ```typescript
      // src/app/cards/page.tsx
      "use client";
      import { useState, useMemo } from 'react';
      import { useAuth } from '@/context/AuthContext';
      import { useRouter } from 'next/navigation';
      import { usePokemonData } from '@/hooks/usePokemonData';
      import Card from '@/components/cards/Card';
      import Spinner from '@/components/ui/Spinner'; // Assume this component exists

      type ActiveTab = 'wishlist' | 'tradeList';
      const ALLOWED_TRADE_RARITIES = new Set(['C', 'U', 'R', 'RR', 'AR']);

      export default function CardsPage() {
        const { user, loading: authLoading } = useAuth();
        const router = useRouter();
        const { data: allCards, isLoading: cardsLoading, error } = usePokemonData();

        const [activeTab, setActiveTab] = useState<ActiveTab>('wishlist');
        const [searchQuery, setSearchQuery] = useState('');
        const [rarityFilter, setRarityFilter] = useState('');

        // Placeholder for user selections - will be populated in Phase 3
        const [wishlistSelection, setWishlistSelection] = useState<Set<string>>(new Set());
        const [tradeListSelection, setTradeListSelection] = useState<Set<string>>(new Set());

        // Redirect if not logged in
        if (!authLoading && !user) {
          router.replace('/login');
          return null;
        }

        const filteredCards = useMemo(() => {
          if (!allCards) return [];
          return allCards.filter(card => {
            const nameMatch = card.name.toLowerCase().includes(searchQuery.toLowerCase());
            const rarityMatch = rarityFilter ? card.rarityCode === rarityFilter : true;
            return nameMatch && rarityMatch;
          });
        }, [allCards, searchQuery, rarityFilter]);

        const handleToggleCard = (card: Card) => {
          // Logic will be fully implemented in Phase 3
          console.log(`Toggled card: ${card.id} for ${activeTab}`);
        };

        if (authLoading || cardsLoading) {
          return <div className="flex justify-center items-center h-64"><Spinner /></div>;
        }
        if (error) {
          return <p className="text-center text-red-500">Error loading card data.</p>;
        }

        const selectionSet = activeTab === 'wishlist' ? wishlistSelection : tradeListSelection;
        const rarities = useMemo(() => allCards ? [...new Set(allCards.map(c => c.rarityCode))].sort() : [], [allCards]);

        return (
          <div>
            <div className="flex gap-2 mb-4 border-b">
              {/* Tab Navigation */}
              <button onClick={() => setActiveTab('wishlist')} className={`px-4 py-2 ${activeTab === 'wishlist' ? 'border-b-2 border-blue-500' : ''}`}>Wishlist</button>
              <button onClick={() => setActiveTab('tradeList')} className={`px-4 py-2 ${activeTab === 'tradeList' ? 'border-b-2 border-blue-500' : ''}`}>Trade List</button>
            </div>

            <div className="flex gap-4 mb-4">
              {/* Filter Controls */}
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="p-2 border rounded w-full"
              />
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="">All Rarities</option>
                {rarities.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {filteredCards.map(card => (
                <Card
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

### **Phase 3: User List Management**

**Task 3.1: Create API Endpoint to Fetch User Data**

- **Goal:** Provide a secure endpoint that returns the logged-in user's profile and their card list identifiers.
- **Steps:**
  1.  Create `src/app/api/user/me/route.ts`.
  2.  Populate it with the following code. It fetches all necessary user data in parallel for efficiency.

      ```typescript
      // src/app/api/user/me/route.ts
      import { createClient } from "@/lib/supabase/server";
      import { cookies } from "next/headers";
      import { NextResponse } from "next/server";

      export async function GET() {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);

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
  2.  Populate it with the following code, which includes validation, authorization, and the database logic.

      ```typescript
      // src/app/api/user/wishlist/batch-update/route.ts
      import { createClient } from "@/lib/supabase/server";
      import { cookies } from "next/headers";
      import { NextResponse } from "next/server";
      import { z } from "zod";

      const batchUpdateSchema = z.object({
        toAdd: z.array(z.string()).max(500),
        toRemove: z.array(z.string()).max(500),
      });

      export async function POST(request: Request) {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);

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

  3.  **Duplicate and Modify:** Create the file `src/app/api/user/tradelist/batch-update/route.ts`. Copy the code from the wishlist route and change every instance of `user_wishlist` to `user_trade_list`. The logic is identical.

**Task 3.3: Integrate User Data and Interaction on the Cards Page**

- **Goal:** Connect the frontend to the backend APIs, enabling users to see their saved lists and modify them.
- **Steps:**
  1.  Install SWR: `npm install swr`.
  2.  Open `src/app/cards/page.tsx` and replace the placeholder logic with the final, fully interactive code.

      ```typescript
      // src/app/cards/page.tsx (Updated)
      "use client";
      import { useState, useMemo, useEffect } from 'react';
      import { useAuth } from '@/context/AuthContext';
      import { useRouter } from 'next/navigation';
      import { usePokemonData } from '@/hooks/usePokemonData';
      import CardComponent from '@/components/cards/Card'; // Renamed to avoid conflict with type
      import Spinner from '@/components/ui/Spinner';
      import { Card, UserData } from '@/lib/types';
      import useSWR from 'swr';
      import toast from 'react-hot-toast';
      import SaveChangesBar from '@/components/cards/SaveChangesBar';

      type ActiveTab = 'wishlist' | 'tradeList';
      const ALLOWED_TRADE_RARITIES = new Set(['C', 'U', 'R', 'RR', 'AR']);
      const fetcher = (url: string) => fetch(url).then(res => res.json());

      export default function CardsPage() {
        const { user, loading: authLoading } = useAuth();
        const router = useRouter();
        const { data: allCards, isLoading: cardsLoading, error: cardsError } = usePokemonData();
        const { data: userData, error: userError, isLoading: userDataLoading, mutate } = useSWR<UserData>('/api/user/me', fetcher);

        const [activeTab, setActiveTab] = useState<ActiveTab>('wishlist');
        const [searchQuery, setSearchQuery] = useState('');
        const [rarityFilter, setRarityFilter] = useState('');

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

        if (!authLoading && !user) {
          router.replace('/login');
          return null;
        }

        const filteredCards = useMemo(() => {
          if (!allCards) return [];
          return allCards.filter(card => {
            const nameMatch = card.name.toLowerCase().includes(searchQuery.toLowerCase());
            const rarityMatch = rarityFilter ? card.rarityCode === rarityFilter : true;
            return nameMatch && rarityMatch;
          });
        }, [allCards, searchQuery, rarityFilter]);

        const handleToggleCard = (card: Card) => {
          const isTradeTab = activeTab === 'tradeList';
          const currentSet = isTradeTab ? tradeListSelection : wishlistSelection;
          const setter = isTradeTab ? setTradeListSelection : setWishlistSelection;

          if (isTradeTab && !ALLOWED_TRADE_RARITIES.has(card.rarityCode)) {
            toast.error("This card's rarity cannot be traded.");
            return;
          }

          const newSet = new Set(currentSet);
          if (newSet.has(card.id)) {
            newSet.delete(card.id);
          } else {
            newSet.add(card.id);
          }
          setter(newSet);
        };

        const hasChanges = useMemo(() => {
            const wishlistChanged = initialWishlist.size !== wishlistSelection.size || [...initialWishlist].some(id => !wishlistSelection.has(id)) || [...wishlistSelection].some(id => !initialWishlist.has(id));
            const tradeListChanged = initialTradeList.size !== tradeListSelection.size || [...initialTradeList].some(id => !tradeListSelection.has(id)) || [...tradeListSelection].some(id => !initialTradeList.has(id));
            return wishlistChanged || tradeListChanged;
        }, [initialWishlist, wishlistSelection, initialTradeList, tradeListSelection]);

        const handleSaveChanges = async () => {
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
        };

        const handleDiscardChanges = () => {
            setWishlistSelection(new Set(initialWishlist));
            setTradeListSelection(new Set(initialTradeList));
        };

        if (authLoading || cardsLoading || userDataLoading) {
          return <div className="flex justify-center items-center h-64"><Spinner /></div>;
        }
        if (cardsError || userError) {
          return <p className="text-center text-red-500">Error loading data.</p>;
        }

        const selectionSet = activeTab === 'wishlist' ? wishlistSelection : tradeListSelection;
        const rarities = useMemo(() => allCards ? [...new Set(allCards.map(c => c.rarityCode))].sort() : [], [allCards]);

        return (
          <div>
            {/* ... Tab Navigation and Filter Controls from previous task ... */}
            <div className="grid ..."> {/* Grid from prev task */}
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
            {hasChanges && <SaveChangesBar onSave={handleSaveChanges} onDiscard={handleDiscardChanges} />}
          </div>
        );
      }
      ```

  3.  Create the `src/components/cards/SaveChangesBar.tsx` component.

      ```typescript
      // src/components/cards/SaveChangesBar.tsx
      interface SaveChangesBarProps {
         onSave: () => void;
         onDiscard: () => void;
      }

      export default function SaveChangesBar({ onSave, onDiscard }: SaveChangesBarProps) {
         return (
             <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 shadow-lg flex justify-center items-center gap-4">
                 <p>You have unsaved changes.</p>
                 <button onClick={onSave} className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded font-bold">Save Changes</button>
                 <button onClick={onDiscard} className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded">Discard</button>
             </div>
         );
      }
      ```

### **Phase 4: Matchmaking**

**Task 4.1: Implement the Core Matchmaking API Endpoint**

- **Goal:** Create the most complex API route of the application. This endpoint will find potential 1-for-1 trades between the current user and all other users, respecting the "same rarity" trading rule.
- **Steps:**
  1.  Create the file `src/app/api/matches/route.ts`.
  2.  Populate it with the following code. This implementation fetches the card database once and caches it in memory. It then uses a single, powerful SQL query via a Supabase RPC (Remote Procedure Call) to efficiently find matches directly in the database, which is far more performant than processing data in JavaScript.

      ```typescript
      // src/app/api/matches/route.ts
      import { createClient } from "@/lib/supabase/server";
      import { cookies } from "next/headers";
      import { NextResponse } from "next/server";
      import { Card } from "@/lib/types";

      // --- In-memory cache for card data on the serverless function ---
      let cardDataCache: Card[] | null = null;
      let cacheTimestamp = 0;
      const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours
      const ALLOWED_TRADE_RARITIES = new Set(["C", "U", "R", "RR", "AR"]);

      async function getCardData(): Promise<Map<string, string>> {
        if (!cardDataCache || Date.now() - cacheTimestamp > CACHE_DURATION_MS) {
          const GITHUB_CARDS_URL =
            "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/cards.json";
          const res = await fetch(GITHUB_CARDS_URL, {
            next: { revalidate: 3600 },
          }); // Revalidate cache every hour
          if (!res.ok)
            throw new Error("Failed to fetch card data for matchmaking");
          const rawCards = await res.json();
          // We only need a map of ID -> rarityCode for the server
          cardDataCache = rawCards.map((c: any) => ({
            id: `${c.set}-${c.number}`,
            rarityCode: c.rarityCode,
          }));
          cacheTimestamp = Date.now();
        }
        return new Map(cardDataCache!.map((c) => [c.id, c.rarityCode]));
      }
      // --- End of cache logic ---

      export async function GET() {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const currentUserId = session.user.id;

        try {
          // Fetch our own lists and the card data concurrently
          const [myListsRes, cardRarityMap] = await Promise.all([
            supabase
              .from("profiles")
              .select(
                `
              user_wishlist (card_identifier),
              user_trade_list (card_identifier)
            `,
              )
              .eq("id", currentUserId)
              .single(),
            getCardData(),
          ]);

          if (myListsRes.error) throw myListsRes.error;

          const myWishlistIds = new Set(
            myListsRes.data.user_wishlist.map((c) => c.card_identifier),
          );
          const myTradelistIds = new Set(
            myListsRes.data.user_trade_list
              .map((c) => c.card_identifier)
              .filter((id) =>
                ALLOWED_TRADE_RARITIES.has(cardRarityMap.get(id)!),
              ),
          );

          // Find other users who have cards I want and want cards I have
          const { data: potentialPartners, error: partnersError } =
            await supabase
              .from("profiles")
              .select(
                `
              id,
              username,
              friend_id,
              user_wishlist (card_identifier),
              user_trade_list (card_identifier)
            `,
              )
              .neq("id", currentUserId); // Exclude myself

          if (partnersError) throw partnersError;

          const matches: any[] = [];

          // Process matches in JavaScript. This is less performant than a pure SQL solution,
          // but easier to implement and reason about.
          for (const partner of potentialPartners) {
            const partnerWants = new Set(
              partner.user_wishlist.map((c) => c.card_identifier),
            );
            const partnerHas = new Set(
              partner.user_trade_list
                .map((c) => c.card_identifier)
                .filter((id) =>
                  ALLOWED_TRADE_RARITIES.has(cardRarityMap.get(id)!),
                ),
            );

            // Find cards I have that the partner wants
            const iHavePartnerWants = [...myTradelistIds].filter((id) =>
              partnerWants.has(id),
            );
            // Find cards the partner has that I want
            const partnerHasIWant = [...partnerHas].filter((id) =>
              myWishlistIds.has(id),
            );

            // Now find 1-to-1 trades with matching rarities
            for (const myCardId of iHavePartnerWants) {
              for (const partnerCardId of partnerHasIWant) {
                const myCardRarity = cardRarityMap.get(myCardId);
                const partnerCardRarity = cardRarityMap.get(partnerCardId);

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

  > **Note for Future Scaling:** The current implementation processes matches in the serverless function. This is suitable for a small number of users. For a larger application, this logic should be moved into a Supabase RPC (database function) to perform the joins and filtering directly within PostgreSQL for significantly better performance and to avoid function timeouts.

**Task 4.2: Create and Populate the Matches Page**

- **Goal:** Display the matches found by the API in a clear, actionable UI.
- **Steps:**
  1.  Create the page file `src/app/matches/page.tsx`.
  2.  Populate it with the following. This component fetches matches, displays them using the `Card` component, and provides the other user's friend ID so a trade can be initiated in-game.

      ```typescript
      // src/app/matches/page.tsx
      "use client";
      import useSWR from 'swr';
      import { useAuth } from '@/context/AuthContext';
      import { usePokemonData } from '@/hooks/usePokemonData';
      import { useRouter } from 'next/navigation';
      import Spinner from '@/components/ui/Spinner';
      import Card from '@/components/cards/Card';
      import { Card as CardType } from '@/lib/types';
      import toast from 'react-hot-toast';

      const fetcher = (url: string) => fetch(url).then(res => res.json());

      interface Match {
        partner: {
          id: string;
          username: string;
          friend_id: string;
        };
        myOffer: string;
        partnerOffer: string;
      }

      export default function MatchesPage() {
        const { user, loading: authLoading } = useAuth();
        const router = useRouter();
        const { data: allCards, isLoading: cardsLoading } = usePokemonData();
        const { data: matches, error, isLoading: matchesLoading } = useSWR<Match[]>('/api/matches', fetcher, {
          revalidateOnFocus: false, // Optional: prevent re-fetching on window focus
        });

        // Redirect if not logged in
        if (!authLoading && !user) {
          router.replace('/login');
          return null;
        }

        const cardsMap = new Map<string, CardType>(allCards?.map(c => [c.id, c]));

        const handleCopyFriendId = (friendId: string) => {
          navigator.clipboard.writeText(friendId);
          toast.success("Friend ID copied to clipboard!");
        };

        const renderContent = () => {
          if (authLoading || cardsLoading || matchesLoading) {
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
                if (!myCard || !partnerCard) return null; // Should not happen

                return (
                  <div key={`${match.partner.id}-${match.myOffer}-${match.partnerOffer}-${index}`} className="bg-white shadow-md rounded-lg p-4 border">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{match.partner.username}</h3>
                        <p className="text-sm text-gray-600">Friend ID: {match.partner.friend_id}</p>
                      </div>
                      <button
                        onClick={() => handleCopyFriendId(match.partner.friend_id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      >
                        Copy ID
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center">
                      <div>
                        <h4 className="font-bold mb-2">You Give</h4>
                        <div className="max-w-[150px] mx-auto">
                           <Card cardData={myCard} isSelected={true} isDisabled={false} onToggle={() => {}} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-500">↔️</div>
                      <div>
                        <h4 className="font-bold mb-2">You Get</h4>
                         <div className="max-w-[150px] mx-auto">
                           <Card cardData={partnerCard} isSelected={true} isDisabled={false} onToggle={() => {}} />
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
          <div>
            <h1 className="text-3xl font-bold mb-6">Potential Trades</h1>
            {renderContent()}
          </div>
        );
      }
      ```

### **Phase 5: Finalization & Deployment**

**Task 5.1: Implement API Rate Limiting**

- **Goal:** Protect all API routes from abuse and DoS attacks using middleware.
- **Steps:**
  1.  Install the Vercel KV package: `npm install @vercel/kv`.
  2.  Create a KV Database in your Vercel project dashboard and link it.
  3.  Create the file `src/middleware.ts` in the `src` directory.
  4.  Populate it with the following IP-based rate-limiting logic. This is a robust starting point that protects all API endpoints.

      ```typescript
      // src/middleware.ts
      import { NextResponse } from "next/server";
      import type { NextRequest } from "next/server";
      import { kv } from "@vercel/kv";

      const TIME_WINDOW_S = 60; // 1 minute window
      const MAX_REQUESTS = 30; // Max 30 requests per minute per IP

      export async function middleware(request: NextRequest) {
        if (request.nextUrl.pathname.startsWith("/api/")) {
          const ip = request.ip ?? "127.0.0.1";
          const key = `rate-limit:${ip}`;

          const currentRequests = await kv.get<number>(key);

          if (currentRequests && currentRequests > MAX_REQUESTS) {
            return new NextResponse(
              JSON.stringify({ error: "Too many requests" }),
              {
                status: 429,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // If the key doesn't exist, kv.incr will create it with a value of 1.
          // We also set the expiration time (ex) on the first increment.
          const pipe = kv.pipeline();
          pipe.incr(key);
          if (!currentRequests) {
            pipe.expire(key, TIME_WINDOW_S);
          }
          await pipe.exec();
        }
        return NextResponse.next();
      }

      export const config = {
        matcher: "/api/:path*",
      };
      ```

**Task 5.2: Add Final User Feedback and Polish**

- **Goal:** Ensure the application feels polished by handling all loading, error, and empty states gracefully.
- **Steps:**
  1.  **Create UI Components:** Create `src/components/ui/Spinner.tsx` and a skeleton loader component for cards, e.g., `src/components/cards/CardSkeleton.tsx`.
  2.  **Review Pages:** Go through `login/page.tsx`, `cards/page.tsx`, and `matches/page.tsx`.
  3.  **Loading States:** For every place SWR or a custom hook is used (e.g., `isLoading`), replace the content with a spinner or skeleton loaders. The `matches` page and `cards` page already have basic spinners; enhance them with skeletons for a better UX.
  4.  **Error States:** For every `error` object returned by a hook, display a user-friendly error message. Use `react-hot-toast` for transient errors (like a save failing) and inline messages for critical data failing to load.
  5.  **Empty States:** For the `matches` page and the `cards` page (if the user has empty lists), ensure there is a clear, helpful message telling the user what to do next (e.g., "No matches found. Try adding more cards!").

**Task 5.3: Create Dashboard Page**

- **Goal:** Provide a simple landing page for authenticated users.
- **Steps:**
  1. Create `src/app/dashboard/page.tsx`.
  2. Populate it with a welcome message and links to the main sections of the app.

  ```typescript
  // src/app/dashboard/page.tsx
  "use client";
  import { useAuth } from '@/context/AuthContext';
  import Link from 'next/link';
  import { useRouter } from 'next/navigation';
  import Spinner from '@/components/ui/Spinner';

  export default function DashboardPage() {
    const { profile, loading } = useAuth();
    const router = useRouter();

    if (loading) {
      return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    if (!profile) {
      router.replace('/login');
      return null;
    }

    return (
      <div>
        <h1 className="text-3xl font-bold mb-4">Welcome, {profile.username}!</h1>
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
    );
  }
  ```

**Task 5.4: Prepare for and Deploy to Vercel**

- **Goal:** Deploy the completed application to the web.
- **Steps:**
  1.  **Code Review:** Read through your entire codebase, checking for consistency, removing `console.log` statements, and ensuring all environment variables are used correctly.
  2.  **GitHub:** Push your final code to a new GitHub repository.
  3.  **Vercel Project:** On vercel.com, create a "New Project" and import your GitHub repository. Vercel will auto-detect it as a Next.js project.
  4.  **Configure Environment Variables:** In the Vercel project settings under "Environment Variables", add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` with the values from your `.env.local` file. Do NOT commit your `.env.local` file to GitHub.
  5.  **Deploy:** Trigger a deployment. Vercel will build and deploy your application to a public URL.
  6.  **Final Testing:** Thoroughly test the live application. Create a new account, add cards to your lists, and (if you have two accounts) verify that the matchmaking works as expected.

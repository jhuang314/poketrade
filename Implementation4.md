### **Definitive File Structure (Adapted from Template)**

This plan will create and modify files to achieve the following final structure, based on the template you've initialized.

```
.
├── app/
│   ├── api/
│   │   ├── matches/route.ts
│   │   └── user/
│   │       ├── me/route.ts
│   │       ├── tradelist/batch-update/route.ts
│   │       └── wishlist/batch-update/route.ts
│   ├── auth/
│   │   ├── actions.ts                  # NEW: Centralized server actions
│   │   ├── confirm/route.ts            # (template)
│   │   ├── login/page.tsx              # (template, unchanged)
│   │   └── sign-up/page.tsx            # (template, unchanged)
│   ├── dashboard/page.tsx              # NEW: Main user landing page
│   ├── cards/
│   │   ├── CardsClientPage.tsx         # NEW: Client-side logic for cards
│   │   └── page.tsx                    # NEW: Server-side auth check
│   ├── matches/
│   │   ├── MatchesClientPage.tsx       # NEW: Client-side logic for matches
│   │   └── page.tsx                    # NEW: Server-side auth check
│   ├── layout.tsx                      # MODIFIED
│   └── page.tsx                        # MODIFIED: Main landing page
├── components/
│   ├── cards/
│   │   ├── Card.tsx                    # NEW
│   │   └── SaveChangesBar.tsx          # NEW
│   ├── navbar.tsx                      # NEW: Main site navigation
│   ├── sign-up-form.tsx                # MODIFIED: Add custom fields
│   └── ui/                             # (template, we will use these)
│       ├── button.tsx
│       ├── input.tsx
│       └── ...
├── hooks/
│   └── usePokemonData.ts               # NEW
├── lib/
│   ├── supabase/                       # (template)
│   │   ├── client.ts
│   │   ├── middleware.ts
│   │   └── server.ts
│   ├── types.ts                        # NEW
│   └── utils.ts                        # (template)
├── middleware.ts                       # MODIFIED: Add rate limiting
└── ...                                 # (other template files)
```

---

### **Implementation Task Breakdown**

### Phase 1: Project Setup & Auth Adaptation

**Task 1.1: Initialize Project & Install Dependencies**

- **Goal:** Use the Supabase template and install our application-specific packages.
- **Steps:**
  1.  Run the Supabase template initializer in your project directory:
      ```bash
      npx create-next-app@latest -e with-supabase .
      ```
  2.  Install our additional required libraries:
      ```bash
      npm install zod clsx swr react-hot-toast @vercel/kv
      ```
  3.  The template has already installed `@supabase/ssr`, `@supabase/supabase-js`, Tailwind CSS, and `shadcn/ui` components.

**Task 1.2: Set Up Supabase Project & Database Schema**

- **Goal:** Create the backend database, tables, and security rules. (This task is identical to the original plan).
- **Steps:**
  1.  Create a new project on [supabase.com](https://supabase.com).
  2.  Navigate to the "SQL Editor" and execute the following SQL in a single query.

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

**Task 1.4: Define Centralized TypeScript Types**

- **Goal:** Create a single source of truth for our application's data shapes.
- **Steps:**
  1.  Create `lib/types.ts` and add the following definitions.
     ```typescript
     // lib/types.ts
     export interface RawCard {
       set: string;
       number: number;
       rarity: string;
       rarityCode: string;
       imageName: string;
       label: { slug: string; eng: string; };
       packs: string[];
     }
     export interface SetData {
       code: string;
       releaseDate: string;
       count?: number;
       label: { en: string; };
       packs: string[];
     }
     export interface RarityData { [key: string]: string; }
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
     export interface Profile {
       id: string;
       username: string;
       friend_id: string;
     }
     export interface UserData {
       profile: Profile;
       wishlist: string[];
       tradeList: string[];
     }
     ```

**Task 1.5: Create Centralized Auth Server Actions**

- **Goal:** Create a single file to handle auth logic, which will be used by our form components.
- **Steps:**
  1.  Create a new file at `app/auth/actions.ts`.
  2.  Populate it with our custom `signup` logic and a standard `login` action.
      ```typescript
      // app/auth/actions.ts
      'use server'
      import { createClient } from '@/lib/supabase/server'
      import { headers } from 'next/headers'
      import { redirect } from 'next/navigation'
      import { z } from 'zod'

      const signupSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8, 'Password must be at least 8 characters long.'),
        username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
        friendId: z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{4}$/, 'Invalid Friend ID format.'),
      });

      export async function login(formData: FormData) {
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const supabase = createClient()

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          return redirect('/auth/login?message=Could not authenticate user')
        }
        return redirect('/dashboard')
      }

      export async function signUp(formData: FormData) {
        const origin = headers().get('origin')

        const rawFormData = {
          email: formData.get('email') as string,
          password: formData.get('password') as string,
          username: formData.get('username') as string,
          friendId: formData.get('friendId') as string,
        }

        const validation = signupSchema.safeParse(rawFormData);
        if (!validation.success) {
           const errorMessage = validation.error.errors.map(e => e.message).join(', ');
           return redirect(`/auth/sign-up?message=${encodeURIComponent(errorMessage)}`);
        }

        const { email, password, username, friendId } = validation.data;
        const supabase = createClient()

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/confirm`,
            data: {
              username: username,
              friend_id: friendId,
            },
          },
        })

        if (error) {
           if (error.message.includes('unique constraint') || error.message.includes('already exists')) {
              return redirect('/auth/sign-up?message=An account with this email, username, or Friend ID already exists.');
           }
           return redirect(`/auth/sign-up?message=${encodeURIComponent(error.message)}`);
        }
        return redirect('/auth/sign-up?message=Check email to continue sign in process');
      }
      ```

**Task 1.6: Modify the Sign-Up Form Component**

- **Goal:** Add `username` and `friendId` fields to the existing sign-up form.
- **Steps:**
  1.  Open `components/sign-up-form.tsx`.
  2.  Replace its contents to include the new fields and point to our new server action.
      ```typescript
      // components/sign-up-form.tsx
      'use client'
      import { Button } from '@/components/ui/button'
      import { Input } from '@/components/ui/input'
      import { Label } from '@/components/ui/label'
      import { signUp } from '@/app/auth/actions'
      import Link from 'next/link'
      import { useSearchParams } from 'next/navigation'

      export default function SignUpForm() {
        const searchParams = useSearchParams()
        const message = searchParams.get('message')

        return (
          <form className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" placeholder="pokefan123" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="friendId">Friend ID</Label>
              <Input id="friendId" name="friendId" placeholder="1234-1234-1234-1234" required />
            </div>
            <Button formAction={signUp} className="w-full">
              Create an account
            </Button>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="underline">
                Sign in
              </Link>
            </div>
            {message && (
              <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center rounded-md">
                {message}
              </p>
            )}
          </form>
        )
      }
      ```

**Task 1.7: Create Global Navbar and Update Layout**

- **Goal:** Implement a consistent navigation bar for the entire site.
- **Steps:**
  1.  Create `components/navbar.tsx`. This will be an `async` Server Component.
      ```typescript
      // components/navbar.tsx
      import Link from 'next/link'
      import { createClient } from '@/lib/supabase/server'
      import LogoutButton from './logout-button'

      export default async function Navbar() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        let profile = null;
        if (user) {
          const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single();
          profile = data;
        }

        return (
          <nav className="w-full border-b border-b-foreground/10 h-16">
            <div className="w-full max-w-4xl mx-auto flex justify-between items-center h-full text-sm p-4">
              <Link href="/" className="text-xl font-bold">PokéMatch</Link>
              <div className="flex items-center gap-4">
                {user ? (
                  <>
                    <Link href="/dashboard" className="hover:underline">Dashboard</Link>
                    <Link href="/cards" className="hover:underline">My Cards</Link>
                    <Link href="/matches" className="hover:underline">Matches</Link>
                    <span className="hidden sm:inline">Hi, {profile?.username || user.email}</span>
                    <LogoutButton />
                  </>
                ) : (
                  <Link href="/auth/login" className="py-2 px-4 rounded-md no-underline bg-btn-background hover:bg-btn-background-hover">
                    Login
                  </Link>
                )}
              </div>
            </div>
          </nav>
        )
      }
      ```
  2.  Update `app/layout.tsx` to use our new Navbar.
      ```typescript
      // app/layout.tsx
      import { GeistSans } from 'geist/font/sans'
      import './globals.css'
      import Navbar from '@/components/navbar'
      import { Toaster } from 'react-hot-toast'

      const defaultUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'

      export const metadata = {
        metadataBase: new URL(defaultUrl),
        title: 'Pokémon TCG Pocket Matchmaker',
        description: 'Find trades for your Pokémon TCG Pocket cards',
      }

      export default function RootLayout({ children }: { children: React.ReactNode }) {
        return (
          <html lang="en" className={GeistSans.className}>
            <body className="bg-background text-foreground">
              <Navbar />
              <main className="min-h-screen flex flex-col items-center">
                {children}
              </main>
              <Toaster position="bottom-center" />
            </body>
          </html>
        )
      }
      ```
  3.  Update the root `app/page.tsx` to be a simple, clean landing page.
      ```typescript
      // app/page.tsx
      import { createClient } from '@/lib/supabase/server'
      import Link from 'next/link'

      export default async function Index() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        return (
          <div className="flex-1 w-full flex flex-col gap-20 items-center">
            <div className="flex-1 flex flex-col gap-6 max-w-lg px-3 text-center mt-24">
              <h1 className="text-4xl font-bold">Welcome to PokéMatch</h1>
              <p className="text-lg text-foreground/80">
                The easiest way to find 1-for-1 trades for your Pokémon TCG Pocket cards.
                Manage your wishlist and trade list, and get matched with other trainers.
              </p>
              {user ? (
                 <Link href="/dashboard" className="bg-blue-600 rounded-md px-4 py-2 text-foreground text-white mx-auto">
                    Go to Dashboard
                 </Link>
              ) : (
                <Link href="/auth/login" className="bg-blue-600 rounded-md px-4 py-2 text-foreground text-white mx-auto">
                    Get Started
                </Link>
              )}
            </div>
          </div>
        )
      }
      ```

---

### Phase 2: Displaying Pokémon Card Data

**Task 2.1: Create Client-Side Pokémon Data Fetching Hook**

- **Goal:** Build a reusable hook that fetches all card data from GitHub and caches it in `localStorage` for performance.
- **Steps:**
  1.  Create the directory `hooks/`.
  2.  Create the file `hooks/usePokemonData.ts`.
  3.  Populate it with the following code.
      ```typescript
      // hooks/usePokemonData.ts
      "use client";
      import { useState, useEffect } from "react";
      import { Card, RawCard, SetData, RarityData } from "@/lib/types";
      import toast from "react-hot-toast";

      const CACHE_KEY = "pokemon_data_cache";
      const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
      const GITHUB_URLS = { /* ... same as original plan ... */ };

      interface CacheData { timestamp: number; data: Card[]; }

      export function usePokemonData() {
        const [data, setData] = useState<Card[] | null>(null);
        const [isLoading, setIsLoading] = useState<boolean>(true);
        const [error, setError] = useState<Error | null>(null);

        useEffect(() => {
          const fetchData = async () => { /* ... same fetching logic as original plan ... */ };
          fetchData();
        }, []);

        return { data, isLoading, error };
      }
      ```
      *(The full, unchanged code from the previous detailed plan should be pasted here for the `fetchData` function.)*

**Task 2.2: Create the Reusable Card Component & Configure Image Domain**

- **Goal:** Build the visual representation of a single card and configure Next.js Image optimization.
- **Steps:**
  1.  Open `next.config.ts` and add the image remote pattern.
      ```typescript
      // next.config.ts
      /** @type {import('next').NextConfig} */
      const nextConfig = {
        images: {
          remotePatterns: [
            {
              protocol: 'https',
              hostname: 'raw.githubusercontent.com',
              pathname: '/flibustier/pokemon-tcg-exchange/main/public/images/cards/**',
            },
          ],
        },
      }
      module.exports = nextConfig
      ```
  2.  Create the directory `components/cards/`.
  3.  Create `components/cards/Card.tsx`.
      ```typescript
      // components/cards/Card.tsx
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
        const imageUrl = `https://raw.githubusercontent.com/flibustier/pokemon-tcg-exchange/main/public/images/cards/${cardData.imageName}`;
        const handleClick = () => !isDisabled && onToggle(cardData.id);

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
              src={imageUrl} alt={cardData.name} fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 12.5vw"
              className={clsx("object-cover transition-filter duration-200", { "grayscale": !isSelected && !isDisabled })}
            />
          </div>
        );
      }
      ```

---

### Phase 3: Building the Card Management Page

**Task 3.1: Create the Server Page for Auth Check**

- **Goal:** Create the main route for `/cards` and ensure the user is logged in.
- **Steps:**
  1. Create the directory `app/cards/`.
  2. Create `app/cards/page.tsx`.
     ```typescript
     // app/cards/page.tsx
     import { createClient } from '@/lib/supabase/server'
     import { redirect } from 'next/navigation'
     import CardsClientPage from './CardsClientPage'

     export default async function CardsPage() {
       const supabase = createClient()
       const { data: { user } } = await supabase.auth.getUser()
       if (!user) {
         redirect('/auth/login')
       }
       return <CardsClientPage />
     }
     ```

**Task 3.2: Create the Client Page for Interaction**

- **Goal:** Build the interactive UI for searching, filtering, and selecting cards for the wishlist and trade list.
- **Steps:**
  1. Create `app/cards/CardsClientPage.tsx`.
  2. Populate it with the logic to fetch data and manage UI state.
     ```typescript
     // app/cards/CardsClientPage.tsx
     "use client";
     import { useState, useMemo, useEffect } from 'react';
     import { usePokemonData } from '@/hooks/usePokemonData';
     import CardComponent from '@/components/cards/Card';
     import { Card, UserData } from '@/lib/types';
     import useSWR from 'swr';
     import toast from 'react-hot-toast';
     import SaveChangesBar from '@/components/cards/SaveChangesBar';
     import { Input } from '@/components/ui/input';
     import Spinner from '@/components/spinner'; // New spinner component needed

     type ActiveTab = 'wishlist' | 'tradeList';
     const ALLOWED_TRADE_RARITIES = new Set(['C', 'U', 'R', 'RR', 'AR']);
     const fetcher = (url: string) => fetch(url).then(res => res.json());

     export default function CardsClientPage() {
       const { data: allCards, isLoading: cardsLoading, error: cardsError } = usePokemonData();
       const { data: userData, error: userError, isLoading: userDataLoading, mutate } = useSWR<UserData>('/api/user/me', fetcher);

       // ... (All state variables: activeTab, searchQuery, selections, etc. from original plan) ...
       // ... (All logic: handleToggleCard, hasChanges, handleSaveChanges, handleDiscardChanges) ...
       // ... (The full implementation from the previous plan's "Task 3.3" goes here) ...

       if (cardsLoading || userDataLoading) {
         return <div className="flex w-full justify-center items-center h-64"><Spinner /></div>;
       }
       // ... error handling ...

       // ... return JSX with tabs, filters, grid, and SaveChangesBar ...
     }
     ```
     *(Note: Create a simple `components/spinner.tsx` or adapt an existing one if available in the template for the loading state.)*

**Task 3.3: Implement User Data and Update API Routes**

- **Goal:** Create the backend endpoints for fetching and updating the user's card lists.
- **Steps:**
  1.  Create `app/api/user/me/route.ts` (Logic is unchanged from original plan).
  2.  Create `app/api/user/wishlist/batch-update/route.ts` (Logic is unchanged).
  3.  Create `app/api/user/tradelist/batch-update/route.ts` (Logic is unchanged, just swapping the table name).
  4.  Create `components/cards/SaveChangesBar.tsx`.
      ```typescript
      // components/cards/SaveChangesBar.tsx
      import { Button } from '@/components/ui/button';
      interface Props { onSave: () => void; onDiscard: () => void; isSaving: boolean; }

      export default function SaveChangesBar({ onSave, onDiscard, isSaving }: Props) {
         return (
             <div className="fixed bottom-0 left-0 right-0 bg-card p-4 shadow-lg flex justify-center items-center gap-4 z-50 border-t">
                 <p>You have unsaved changes.</p>
                 <Button onClick={onSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                 </Button>
                 <Button variant="outline" onClick={onDiscard} disabled={isSaving}>Discard</Button>
             </div>
         );
      }
      ```

---

### Phase 4: Matchmaking

**Task 4.1: Implement the Core Matchmaking API Endpoint**

- **Goal:** Create the API route that performs the matchmaking logic.
- **Steps:**
  1. Create `app/api/matches/route.ts`.
  2. Populate it with the matchmaking logic (unchanged from the original plan).
     ```typescript
     // app/api/matches/route.ts
     import { createClient } from '@/lib/supabase/server';
     import { NextResponse } from 'next/server';
     // ... (The full implementation from the previous plan's "Task 4.1" goes here) ...
     ```

**Task 4.2: Create the Matches Page UI**

- **Goal:** Create the page at `/matches` to display potential trades.
- **Steps:**
  1. Create the directory `app/matches/`.
  2. Create the server page `app/matches/page.tsx` for the auth check.
     ```typescript
     // app/matches/page.tsx
     import { createClient } from '@/lib/supabase/server'
     import { redirect } from 'next/navigation'
     import MatchesClientPage from './MatchesClientPage'

     export default async function MatchesPage() {
       const supabase = createClient()
       const { data: { user } } = await supabase.auth.getUser()
       if (!user) {
         redirect('/auth/login')
       }
       return <MatchesClientPage />
     }
     ```
  3. Create the client page `app/matches/MatchesClientPage.tsx`.
     ```typescript
     // app/matches/MatchesClientPage.tsx
     "use client";
     import useSWR from 'swr';
     import { usePokemonData } from '@/hooks/usePokemonData';
     import Spinner from '@/components/spinner';
     import CardComponent from '@/components/cards/Card';
     import { Card as CardType } from '@/lib/types';
     import toast from 'react-hot-toast';
     import { Button } from '@/components/ui/button';

     // ... (Interface Match, fetcher constant) ...
     // ... (The full implementation from the previous plan's "Task 4.2" goes here) ...
     ```

---

### Phase 5: Finalization & Deployment

**Task 5.1: Create the Dashboard Page**

- **Goal:** Provide a central navigation hub for logged-in users.
- **Steps:**
  1. Create the directory `app/dashboard/`.
  2. Create `app/dashboard/page.tsx`.
     ```typescript
     // app/dashboard/page.tsx
     import { createClient } from '@/lib/supabase/server'
     import { redirect } from 'next/navigation'
     import Link from 'next/link'

     export default async function DashboardPage() {
       const supabase = createClient()
       const { data: { user } } = await supabase.auth.getUser()
       if (!user) { redirect('/auth/login') }

       const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();

       return (
         <div className="w-full max-w-4xl mx-auto p-4">
           <h1 className="text-3xl font-bold mb-4">Welcome, {profile?.username || user.email}!</h1>
           <p className="mb-6 text-foreground/80">Manage your collection and find new trades.</p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Link href="/cards" className="block p-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
               <h2 className="text-2xl font-bold">Manage My Cards</h2>
               <p>Update your Wishlist and Trade List.</p>
             </Link>
             <Link href="/matches" className="block p-6 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
               <h2 className="text-2xl font-bold">Find Trades</h2>
               <p>See all potential 1-for-1 trades.</p>
             </Link>
           </div>
         </div>
       )
     }
     ```

**Task 5.2: Implement API Rate Limiting**

- **Goal:** Protect API routes from abuse by adding logic to the existing middleware.
- **Steps:**
  1. Create a KV Database in your Vercel project dashboard and link it.
  2. Open the root `middleware.ts` and modify it.
     ```typescript
     // middleware.ts
     import { type NextRequest, NextResponse } from 'next/server'
     import { updateSession } from '@/lib/supabase/middleware'
     import { kv } from '@vercel/kv'

     const TIME_WINDOW_S = 60; // 1 minute
     const MAX_REQUESTS = 30;  // Max requests per window per IP

     export async function middleware(request: NextRequest) {
       if (request.nextUrl.pathname.startsWith('/api/')) {
         const ip = request.ip ?? '127.0.0.1';
         const key = `rate-limit:${ip}`;
         const currentRequests = await kv.get<number>(key);

         if (currentRequests && currentRequests >= MAX_REQUESTS) {
           return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
             status: 429, headers: { 'Content-Type': 'application/json' }
           });
         }

         const pipe = kv.pipeline();
         pipe.incr(key);
         if (!currentRequests) {
           pipe.expire(key, TIME_WINDOW_S);
         }
         await pipe.exec();
       }
       // The original session management middleware must still run
       return await updateSession(request)
     }

     export const config = {
       matcher: [
         '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
       ],
     }
     ```

**Task 5.3: Prepare for and Deploy to Vercel**

- **Goal:** Deploy the completed application to the web.
- **Steps:**
  1. **Code Review:** Read through your codebase, removing `console.log` statements.
  2. **GitHub:** Push your final code to a new GitHub repository.
  3. **Vercel Project:** On vercel.com, create a "New Project" and import your GitHub repository.
  4. **Configure Environment Variables:** In the Vercel project settings under "Environment Variables", add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the values from your `.env.local` file.
  5. **Link Vercel KV:** In the Vercel project settings under "Storage", ensure your KV database is linked.
  6. **Deploy:** Trigger a deployment from the Vercel dashboard.
  7. **Final Testing:** Thoroughly test the live application. Create accounts, add/remove cards from lists, and verify that the matchmaking page displays correct results.

### Implementation Task Breakdown

The tasks are ordered by dependency. Complete them sequentially.

### Phase 1: Project Setup & Core Foundations

**Task 1.1: Initialize Next.js Project with Tailwind CSS**

- **Goal:** Create the basic project structure.
- **Steps:**
  1.  Run `npx create-next-app@latest pocket-matchmaker` in your terminal. Select options for TypeScript, ESLint, Tailwind CSS, and the App Router.
  2.  Navigate into the new directory: `cd pocket-matchmaker`.
  3.  Install the Supabase client library: `npm install @supabase/supabase-js`.
  4.  Run `npm run dev` to ensure the default Next.js application starts correctly.

**Task 1.2: Set Up Supabase Project and Database Schema**

- **Goal:** Create the backend database and tables.
- **Steps:**
  1.  Go to [supabase.com](https://supabase.com), sign up/log in, and create a new project.
  2.  Navigate to the "SQL Editor" section.
  3.  Create a new query and execute the following SQL to create the `profiles` table. This table links to Supabase's built-in `auth.users` table.
      ```sql
      CREATE TABLE public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        username TEXT UNIQUE NOT NULL,
        friend_id VARCHAR(19) UNIQUE NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ```
  4.  Execute the following SQL to create the `user_wishlist` and `user_trade_list` tables.

      ```sql
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
      ```

  5.  Enable Row Level Security (RLS) on all three new tables in the Supabase Dashboard under `Authentication -> Policies`.

      ```sql
      -- Policies for 'profiles' table
      -- 1. Allow users to see their own profile
      CREATE POLICY "Allow individual read access" ON public.profiles FOR SELECT USING (auth.uid() = id);
      -- 2. Allow users to update their own profile
      CREATE POLICY "Allow individual update access" ON public.profiles FOR UPDATE USING (auth.uid() = id);

      -- Policies for 'user_wishlist' table
      -- 1. Allow users to see their own wishlist items
      CREATE POLICY "Allow individual read access" ON public.user_wishlist FOR SELECT USING (auth.uid() = user_id);
      -- 2. Allow users to add items to their own wishlist
      CREATE POLICY "Allow individual insert access" ON public.user_wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
      -- 3. Allow users to remove items from their own wishlist
      CREATE POLICY "Allow individual delete access" ON public.user_wishlist FOR DELETE USING (auth.uid() = user_id);

      -- Policies for 'user_trade_list' table
      -- 1. Allow users to see their own trade list items
      CREATE POLICY "Allow individual read access" ON public.user_trade_list FOR SELECT USING (auth.uid() = user_id);
      -- 2. Allow users to add items to their own trade list
      CREATE POLICY "Allow individual insert access" ON public.user_trade_list FOR INSERT WITH CHECK (auth.uid() = user_id);
      -- 3. Allow users to remove items from their own trade list
      CREATE POLICY "Allow individual delete access" ON public.user_trade_list FOR DELETE USING (auth.uid() = user_id);
      ```

**Task 1.3: Configure Environment Variables and Supabase Client**

- **Goal:** Securely connect the Next.js app to Supabase.
- **Steps:**
  1.  In the Supabase Dashboard, go to `Project Settings -> API`. Copy the `Project URL` and the `anon` `public` key.
  2.  In your Next.js project root, create a file named `.env.local`.
  3.  Add the copied credentials to `.env.local`:
      ```
      NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
      NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
      ```
  4.  Create a utility file `lib/supabase/client.ts` to initialize the client singleton for use in client components:

      ```typescript
      import { createClient } from "@supabase/supabase-js";

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      export const supabase = createClient(supabaseUrl, supabaseAnonKey);
      ```

**Task 1.4: Create Authentication UI (Login & Signup Forms)**

- **Goal:** Build the user interface for signing in and creating an account.
- **Steps:**
  1.  Create a new page file at `app/login/page.tsx`.
  2.  This page must be a Client Component. Add `"use client";` to the top of the file.
  3.  Build a React component with a form containing fields for:
      - Email (`type="email"`)
      - Password (`type="password"`)
  4.  Build a separate form component for signup with fields for:
      - Username (`type="text"`)
      - Email (`type="email"`)
      - Password (`type="password"`)
      - Friend ID (`type="text"`, `placeholder="1234-1234-1234-1234"`)
  5.  Use `useState` to manage the state of the form inputs.
  6.  Add a button or link to toggle between the Login and Signup forms on the page.
  7.  Style the forms using Tailwind CSS. Do not implement the submission logic yet.

**Task 1.5: Implement Backend Authentication Logic**

- **Goal:** Make the login and signup forms functional.
- **Steps:**
  1.  Create the API route file `app/api/auth/signup/route.ts`.
  2.  In this file, export an async function named `POST` that accepts a `Request` object.

      ```typescript
      // app/api/auth/signup/route.ts
      import { NextResponse } from "next/server";

      export async function POST(request: Request) {
        // Logic goes here
      }
      ```

  3.  Inside `POST`, parse the `email`, `password`, `username`, and `friendId` from the request body using `await request.json()`.
  4.  Validate and sanitize the inputs. For `friendId`, enforce its specific format of `/^\d{4}-\d{4}-\d{4}-\d{4}$`. Prevent XSS attacks by sanitizing all inputs.
  5.  Use a server-side Supabase client (see Supabase docs for App Router setup) to perform the signup: `const { data, error } = await supabase.auth.signUp({ email, password })`.
  6.  If the signup is successful, insert a new row into the `profiles` table with the `id` from `data.user.id`, `username`, and `friendId`.
  7.  Return a `NextResponse.json()` with a success or error message.
  8.  Create the API route file `app/api/auth/login/route.ts` and implement a similar `POST` handler for login using `supabase.auth.signInWithPassword({ email, password })`.
  9.  Connect the UI forms from Task 1.4 to call these API endpoints upon submission.

**Task 1.6: Implement Global Auth State and Navbar**

- **Goal:** Make the application aware of the user's login state and reflect it in the UI.
- **Steps:**
  1.  Create a global context for authentication in a file like `context/AuthContext.tsx`. This must be a client component (`"use client";`).
  2.  In this context provider, use `useState` and `useEffect` to listen to Supabase's `onAuthStateChange` event. Store the user session in the context's state.
  3.  In the root layout `app/layout.tsx`, wrap the `children` prop with your new `AuthProvider`.

      ```tsx
      // app/layout.tsx
      import { AuthProvider } from "@/context/AuthContext";
      import Navbar from "@/components/Navbar";

      export default function RootLayout({
        children,
      }: {
        children: React.ReactNode;
      }) {
        return (
          <html lang="en">
            <body>
              <AuthProvider>
                <Navbar />
                {children}
              </AuthProvider>
            </body>
          </html>
        );
      }
      ```

  4.  Create a `components/Navbar.tsx` component. It must also be a client component to use the context.
  5.  Inside the Navbar, use `useContext` to access the auth state.
  6.  Conditionally render links:
      - If no user, show "Login".
      - If a user is logged in, show links to "Dashboard", "Cards", and a "Logout" button.
  7.  The "Logout" button should call `supabase.auth.signOut()`.

### Phase 2: Displaying Pokémon Card Data

**Task 2.1: Create Client-Side Data Fetching Hook**

- **Goal:** Build the reusable hook for fetching and caching all Pokémon card data.
- **Steps:**
  1.  Create a new file `hooks/usePokemonData.ts`. This hook must be used in a Client Component.
  2.  Define interfaces for your data types (e.g., `Card`, `Set`, `Rarity`).
  3.  Inside the custom hook, implement the following logic:
      - On mount (`useEffect`), check `localStorage` for an item `pokemon_data`.
      - If it exists, parse it. Check its timestamp. If it's less than 24 hours old, set the data to state and return.
      - If it doesn't exist or is stale, perform `fetch` requests to the three GitHub URLs: `cards.json`, `sets.json`, and `rarity.json`.
      - Use `Promise.all` to fetch them concurrently.
      - Once all data is fetched, process it:
        - Create maps from `sets.json` (`code` -> `label.en`) and `rarity.json` (`code` -> `name`).
        - Iterate through the `cards.json` array. For each card, add the enriched fields: `id`, `rarityFullName`, and `setName`.
      - Store the final enriched array in `localStorage` as a stringified JSON object with a new timestamp.
      - Set the data to state.
  4.  The hook should return an object like `{ data, isLoading, error }`.

**Task 2.2: Create the Reusable Card Component**

- **Goal:** Build the visual representation of a single Pokémon card.
- **Steps:**
  1.  Create `components/Card.tsx`. It must be a client component (`"use client";`) because it handles user interaction.
  2.  Define the component's props with TypeScript interfaces:
      ```typescript
      interface CardProps {
        cardData: Card; // Your enriched card type from the hook
        isSelected: boolean;
        isDisabled: boolean;
        onToggle: (cardId: string) => void;
      }
      ```
  3.  Render an `<img>` tag. The `src` will be `https://raw.githubusercontent.com/flibustier/pokemon-tcg-exchange/refs/heads/main/public/images/cards/${cardData.imageName}`.
  4.  Render the card's name (`cardData.label.eng`) and rarity (`cardData.rarityFullName`).
  5.  Use the `isSelected` prop to conditionally apply a CSS class (e.g., `filter grayscale-0` vs `filter grayscale`).
  6.  Use the `isDisabled` prop to apply styles like `opacity-50` and `cursor-not-allowed`.
  7.  The root element should have an `onClick` handler that calls `onToggle(cardData.id)` if not disabled.

**Task 2.3: Build the Card Management Page UI Shell**

- **Goal:** Create the main page for users to manage their lists, including tabs and filters.
- **Steps:**
  1.  Create the page file `app/cards/page.tsx`. This page must be a client component (`"use client";`).
  2.  At the top, create a `TabNavigation` component with two buttons: "Wishlist" and "Trade List". Manage the active tab with `useState`.
  3.  Below the tabs, add UI controls:
      - An `<input type="text">` for searching by name.
      - A `<select>` dropdown for filtering by rarity.
  4.  Use `useState` to manage the state of the search query and selected rarity filter.
  5.  This page should be protected; users who are not logged in should be redirected.

**Task 2.4: Display the Card Grid with Client-Side Filtering**

- **Goal:** Populate the Card Management page with cards and make the filters work.
- **Steps:**
  1.  In `app/cards/page.tsx`, call the `usePokemonData()` hook to get the card data.
  2.  Use `useMemo` to create a `filteredCards` array. This memoized value should re-calculate whenever the source `data`, `searchQuery`, or `rarityFilter` changes.
  3.  The filtering logic should be case-insensitive and check if the card's name includes the search query and if its rarity matches the filter.
  4.  Render the `filteredCards` array in a responsive grid layout using Tailwind CSS (`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4`).
  5.  For each card in the grid, render the `<Card />` component created in Task 2.2. For now, pass static props for `isSelected`, `isDisabled`, etc.

### Phase 3: User List Management

**Task 3.1: Fetch and Display User's Existing Lists**

- **Goal:** When the `/cards` page loads, fetch the user's saved lists and initialize the selection state.
- **Steps:**
  1.  Create the protected API route `app/api/user/me/route.ts`. It should query and return the user's `profiles`, `user_wishlist` identifiers, and `user_trade_list` identifiers.
  2.  In `app/cards/page.tsx`, use a library like SWR (`useSWR`) to fetch data from `/api/user/me`.
  3.  Create two `Set` objects in state: `wishlistSelection` and `tradeListSelection`.
  4.  In a `useEffect` hook that runs when the user data loads, initialize these `Set`s with the card identifiers returned from the API.
  5.  Pass the correct `isSelected` prop to each `<Card />` component based on the active tab and whether the card's ID is in the corresponding selection set.

**Task 3.2: Implement Client-Side Toggling Logic**

- **Goal:** Allow users to click on cards to add or remove them from their selections.
- **Steps:**
  1.  Create the `onToggle` function in `app/cards/page.tsx`.
  2.  This function should:
      - Check which tab is active ("wishlist" or "tradeList").
      - If "tradeList", check if the toggled card's rarity is one of the allowed types. If not, show a notification (e.g., using a toast library like `react-hot-toast`) and return early.
      - Create a new copy of the relevant selection `Set`.
      - If the card ID is already in the set, `delete` it. If not, `add` it.
      - Update the state with the new `Set`.

**Task 3.3: Implement Batch Update Backend API**

- **Goal:** Create the endpoints that will persist the user's changes to the database.
- **Steps:**
  1.  Create the protected API route `app/api/user/wishlist/batch-update/route.ts`.
  2.  Export a `POST` function that accepts a `NextRequest`.
  3.  Parse the body: `const { toAdd, toRemove }: { toAdd: string[]; toRemove: string[] } = await request.json()`.
  4.  Use a server-side Supabase client to `insert` the `toAdd` array and `delete` from the `toRemove` array.
  5.  Repeat this process for `app/api/user/tradelist/batch-update/route.ts`.

**Task 3.4: Implement "Save Changes" Functionality**

- **Goal:** Allow the user to commit their changes from the UI to the backend.
- **Steps:**
  1.  In `app/cards/page.tsx`, keep track of the initial lists fetched from the server.
  2.  Create a `SaveChangesBar` component that is only visible when the current selection sets differ from the initial lists.
  3.  The "Save" button in this bar will:
      - Calculate the differences (`toAdd`, `toRemove`) for both the wishlist and tradelist.
      - Make `fetch` calls to the two batch update API endpoints with the calculated differences.
      - On success, hide the bar and update the "initial lists" state to match the current selections.
  4.  The "Discard" button will reset the selection sets to match the initial lists and hide the bar.

**Task 3.5: Secure API Routes against CSRF and DoS**

- **Goal:** Protect all state-changing API endpoints from Cross-Site Request Forgery (CSRF) and prevent Denial of Service (DoS) from oversized requests.
- **Steps:**
  1.  **Install Supabase Server-Side Helpers:** This library provides tools for securely handling sessions and protecting against CSRF attacks.
      ```bash
      npm install @supabase/ssr cookies-next
      ```
  2.  **Refactor the `batch-update` API:** Open `app/api/user/wishlist/batch-update/route.ts`. Use the Supabase server client for the App Router, which automatically handles session management and CSRF protection from cookies.

      ```typescript
      import { createServerClient } from "@supabase/ssr";
      import { cookies } from "next/headers";
      import { NextResponse } from "next/server";

      const MAX_BATCH_SIZE = 1000; // Define a reasonable limit

      export async function POST(request: Request) {
        const { toAdd, toRemove } = await request.json();
        const cookieStore = cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { get: (name) => cookieStore.get(name)?.value } },
        );

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
            status: 401,
          });
        }

        // --- DoS Protection: Input Size Validation ---
        if (!Array.isArray(toAdd) || !Array.isArray(toRemove)) {
          return new NextResponse(
            JSON.stringify({ message: "Invalid payload format." }),
            { status: 400 },
          );
        }
        if (toAdd.length > MAX_BATCH_SIZE || toRemove.length > MAX_BATCH_SIZE) {
          return new NextResponse(
            JSON.stringify({
              message: `Batch size cannot exceed ${MAX_BATCH_SIZE}.`,
            }),
            { status: 413 },
          );
        }
        // ---

        // Proceed with your Supabase insert and delete logic here...
        // ...

        return new NextResponse(
          JSON.stringify({ message: "Wishlist updated successfully." }),
          { status: 200 },
        );
      }
      ```

  3.  **Apply the Pattern:** Apply this same security pattern to all other API routes that handle `POST` requests or modify data:
      - `app/api/user/tradelist/batch-update/route.ts`
      - `app/api/auth/signup/route.ts`
      - `app/api/auth/login/route.ts`

### Phase 4: Matchmaking

**Task 4.1: Implement Matchmaking Backend API**

- **Goal:** Create the core logic that finds potential trades.
- **Steps:**
  1.  Create the protected API route `app/api/matches/route.ts`.
  2.  Inside the `GET` route handler, implement a simple in-memory cache for the `cards.json` data to avoid re-fetching on every call.
  3.  Get the current user's session using a server-side Supabase client.
  4.  Fetch the user's wishlist and tradelist.
  5.  Construct a SQL query to find potential matches. This is the most complex query. A simplified approach would be:
      - Find all users (B) who want a card that the current user (A) has on their tradelist.
      - From that subset, find users (B) who have a card on their tradelist that the user (A) wants.
  6.  After getting potential matches from the DB, iterate through them in your JavaScript code. Use your in-memory card cache to check the rarities. Only return pairs where `rarity(A_offers) === rarity(B_offers)`.
  7.  Format the final results into a clean JSON array and return it.

**Task 4.2: Create and Populate the Matches Page**

- **Goal:** Display the found matches to the user in a clear, actionable way.
- **Steps:**
  1.  Create the protected page `app/matches/page.tsx`. This must be a client component to use SWR.
  2.  Use SWR to fetch data from `/api/matches`.
  3.  Display a loading indicator while the data is being fetched.
  4.  If no matches are found, display a friendly message.
  5.  If matches are found, map over the results and render a `MatchResultCard` component for each.
  6.  The `MatchResultCard` should display:
      - Partner's Username and Friend ID.
      - "You Give:" followed by the `<Card />` component for your offered card.
      - "You Get:" followed by the `<Card />` component for their offered card.

### Phase 5: Finalization & Deployment

**Task 5.1: Comprehensive Responsive Styling**

- **Goal:** Ensure the application is usable and looks good on all screen sizes.
- **Steps:**
  1.  Review every page (`/login`, `/cards`, `/dashboard`, `/matches`) on mobile, tablet, and desktop viewports.
  2.  Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) to adjust layouts, font sizes, and spacing as needed.
  3.  Pay special attention to the card grid on the `/cards` page, ensuring the number of columns adjusts appropriately.

**Task 5.2: Add User Feedback (Loading & Error States)**

- **Goal:** Improve user experience by providing clear feedback.
- **Steps:**
  1.  For every data-fetching operation (cards, user data, matches), implement a clear loading state (e.g., a skeleton screen or a spinner).
  2.  For every API call, implement error handling. Display a user-friendly error message if a request fails (e.g., using a toast notification).
  3.  Ensure form submissions provide feedback (e.g., disabling the button while submitting).

**Task 5.3: Implement Rate Limiting for Expensive Endpoints**

- **Goal:** Protect computationally expensive API routes, like `/api/matches`, from abuse and potential DoS attacks by implementing rate limiting.
- **Steps:**
  1.  **Create Middleware File:** In the root of your project (or inside a `src` directory if you have one), create a file named `middleware.ts`. Vercel will automatically execute this file for incoming requests.
  2.  **Implement IP-Based Rate Limiting:** Add the following code to `middleware.ts`. This is a basic implementation that stores visitor request times in memory to block them if they make too many requests in a short period.

      ```typescript /poketrade/middleware.ts
      import { NextRequest, NextResponse } from "next/server";

      // A simple in-memory store for rate limiting
      const rateLimitStore = new Map<string, number[]>();

      export function middleware(request: NextRequest) {
        // We only want to rate limit the matchmaking API
        if (request.nextUrl.pathname.startsWith("/api/matches")) {
          const ip = request.ip ?? "127.0.0.1";

          const limit = 5; // Max 5 requests...
          const windowMs = 60 * 1000; // ...per 1 minute

          const records = rateLimitStore.get(ip) ?? [];
          const now = Date.now();

          // Filter out old records
          const recentRecords = records.filter(
            (timestamp) => now - timestamp < windowMs,
          );

          if (recentRecords.length >= limit) {
            // If the user has made too many requests, block them.
            return new NextResponse(
              JSON.stringify({ message: "Too many requests" }),
              { status: 429, headers: { "Content-Type": "application/json" } },
            );
          }

          // Add the current request timestamp to the store
          recentRecords.push(now);
          rateLimitStore.set(ip, recentRecords);
        }

        // Continue to the requested route
        return NextResponse.next();
      }
      ```

  3.  **Note on Production Use:** This in-memory solution is effective but will reset with each deployment or serverless function restart. For a more robust production solution, consider using a service like [Upstash Redis](https://upstash.com/docs/redis/sdks/javascript-sdk/rate-limiting) with Vercel Edge Functions for persistent rate limiting. However, for the scope of this project, the in-memory approach is a great starting point.

**Task 5.4: Security Hardening**

- **Goal:** Implement critical security measures to protect the application and user data before deployment.
- **Steps:**
  1.  **Confirm API Rate Limiting:**
      - Expand the logic in `middleware.ts` to apply rate limiting to all sensitive API routes (`/api/auth/*`, `/api/user/*`, `/api/matches`).
      - Use the `rateLimitStore` to track request timestamps keyed by IP address.
      - Return a `429 Too Many Requests` response if an IP exceeds the defined request limit.
  2.  **Verify CSRF Protection:**
      - The `@supabase/ssr` library's `createServerClient` (for Route Handlers) and `createBrowserClient` (for Client Components) work together to handle CSRF protection automatically using cookies.
      - Ensure you are using these official Supabase helper clients for all database and auth operations to benefit from this built-in protection. No manual implementation of the "Double Submit Cookie" pattern is required.
  3.  **Add Server-Side Input Sanitization:**
      - In the `app/api/auth/signup/route.ts` endpoint, add logic to sanitize the `username` field before saving it to the database.
      - Use a library or regex to strip characters that could be part of HTML/script tags (e.g., `<`, `>`).

**Task 5.4: Vercel Deployment**

- **Goal:** Deploy the application to the web.
- **Steps:**
  1.  Push your code to a new GitHub repository.
  2.  Sign up/log in to [vercel.com](https://vercel.com) with your GitHub account.
  3.  Create a new project and import your GitHub repository.
  4.  In the Vercel project settings, navigate to "Environment Variables".
  5.  Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the same values from your `.env.local` file.
  6.  Trigger a deployment. Vercel will automatically build and deploy the application.
  7.  Test the deployed application thoroughly.

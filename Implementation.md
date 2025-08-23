### Implementation Task Breakdown

This document breaks down the implementation of the Pokémon TCG Pocket Matchmaker into distinct phases and tasks.

---

### Phase 1: Project Setup & Core Foundations

**Task 1.1: Initialize Next.js Project**
- **Goal:** Create a new Next.js application with TypeScript and Tailwind CSS.
- **Steps:**
  - 1. Run `npx create-next-app@latest --ts --tailwind .`
  - 2. Clean up boilerplate code from the default template.
  - 3. Set up directory structure (e.g., `components`, `hooks`, `lib`, `app/api`).

**Task 1.2: Set Up Supabase**
- **Goal:** Configure a new Supabase project and define the database schema.
- **Steps:**
  - 1. Create a new project on the Supabase dashboard.
  - 2. Use the SQL editor to execute `CREATE TABLE` statements for `profiles`, `user_wishlist`, and `user_trade_list` as defined in `Design.md`.
  - 3. Enable Row Level Security (RLS) on all tables containing user data.
  - 4. Define RLS policies to ensure users can only access and modify their own data.
  - 5. Store Supabase URL and anon key in environment variables (`.env.local`).

**Task 1.3: Implement User Authentication**
- **Goal:** Create the backend and frontend for user signup, login, and logout.
- **Steps:**
  - 1. Create API route `/api/auth/signup` to handle user registration using Supabase Auth.
  - 2. Create API route `/api/auth/login` to handle user login and session creation (JWT in `httpOnly` cookie).
  - 3. Create API route `/api/auth/logout` to clear the session cookie.
  - 4. Build the UI components for the signup and login forms on the landing page (`/`).
  - 5. Implement client-side logic to call the auth APIs and manage user state (e.g., using React Context).
  - 6. Create a server-side Supabase client that uses the service role key for admin tasks.

---

### Phase 2: Displaying Pokémon Card Data

**Task 2.1: Create Data Fetching Hook**
- **Goal:** Develop a custom React hook to fetch and cache Pokémon card data on the client-side.
- **Steps:**
  - 1. Create a `usePokemonData` hook.
  - 2. Inside the hook, check `localStorage` for cached `cards`, `sets`, and `rarity` data.
  - 3. If the cache is empty or stale (older than 24 hours), fetch the JSON files from the GitHub source.
  - 4. Store the fetched data along with a timestamp in `localStorage`.
  - 5. The hook should return the data, loading state, and any errors.

**Task 2.2: Build the Card Management UI Shell**
- **Goal:** Create the main page for users to browse cards and manage their lists.
- **Steps:**
  - 1. Create the `/cards` page.
  - 2. Implement the `TabNavigation` component to switch between "Wishlist" and "Trade List" views.
  - 3. Add a search bar and filter controls (e.g., by rarity, set).
  - 4. Create the `CardGrid` component that receives and displays a list of cards.
  - 5. Create the `Card` component to display a single card's image and basic info.

**Task 2.3: Implement Client-Side Filtering**
- **Goal:** Enable users to search and filter the full card list instantly in the browser.
- **Steps:**
  - 1. Add state management (`useState`) to the `/cards` page for search terms and filter selections.
  - 2. Write logic that filters the card data from the `usePokemonData` hook based on the current state.
  - 3. Pass the filtered data to the `CardGrid` component.

---

### Phase 3: User List Management

**Task 3.1: Fetch User's Lists**
- **Goal:** Retrieve the logged-in user's existing Wishlist and Trade List from the database.
- **Steps:**
  - 1. Create the API route `GET /api/user/me`.
  - 2. This route will use the user's JWT to identify them, and query the Supabase database for their profile, `user_wishlist` entries, and `user_trade_list` entries.
  - 3. On the `/cards` page, call this API after the page loads to get the user's saved lists.

**Task 3.2: Implement Card Selection Logic**
- **Goal:** Allow users to add and remove cards from the active list.
- **Steps:**
  - 1. Manage the "selected" state for both the Wishlist and Trade List on the `/cards` page (e.g., using two `Set` objects).
  - 2. When a user clicks a `Card` component, toggle its `card_identifier` in the appropriate `Set`.
  - 3. Update the `Card` component to change its appearance (e.g., full color vs. greyed out) based on whether it is selected in the currently active list.
  - 4. Implement the trading rule: prevent selection of cards with non-tradable rarities when the "Trade List" tab is active.

**Task 3.3: Implement Batch Updates**
- **Goal:** Save changes to the user's lists efficiently with a single action.
- **Steps:**
  - 1. Create the API route `POST /api/user/wishlist/batch-update`.
  - 2. Create the API route `POST /api/user/tradelist/batch-update`.
  - 3. These routes will accept `{ toAdd: string[], toRemove: string[] }` in the request body and perform bulk `INSERT` and `DELETE` operations on the corresponding table within a transaction.
  - 4. Implement the `SaveChangesBar` component, which appears only when there are unsaved changes.
  - 5. The "Save" button will trigger API calls to both batch update endpoints with the calculated changes.

---

### Phase 4: Matchmaking

**Task 4.1: Create Matchmaking API Endpoint**
- **Goal:** Develop the core server-side logic to find potential trades.
- **Steps:**
  - 1. Create the API route `GET /api/matches`.
  - 2. The handler will first query the database to get every user's Wishlist and Trade List.
  - 3. It will then execute the matchmaking logic: For each user, iterate through their Wishlist and find other users who have that card in their Trade List, and vice-versa.
  - 4. The logic must respect the rarity trading rules (e.g., a Rare can be traded for another Rare, etc.).
  - 5. The endpoint should return a structured list of matches for the currently authenticated user.

**Task 4.2: Build the Matches Page**
- **Goal:** Create a UI to display the user's potential trade partners.
- **Steps:**
  - 1. Create the `/matches` page.
  - 2. On page load, fetch data from the `/api/matches` endpoint.
  - 3. Render the list of matches, clearly showing:
      - The partner's `username` and `friend_id`.
      - "You Give:" followed by the `<Card />` component for your offered card.
      - "You Get:" followed by the `<Card />` component for their offered card.

---

### Phase 5: Security Hardening

**Task 5.1: Implement API Rate Limiting**
- **Goal:** Protect the API from brute-force attacks and resource exhaustion.
- **Steps:**
  - 1. Create a middleware function that intercepts requests to sensitive API routes.
  - 2. Use an in-memory store (e.g., the `rateLimitStore` `Map`) to track request counts and timestamps for each IP address.
  - 3. If an IP exceeds the configured limit (e.g., 100 requests per minute), reject the request with a `429 Too Many Requests` status code.
  - 4. Apply this middleware to all `/api/auth/*`, `/api/user/*`, and `/api/matches` routes.

**Task 5.2: Implement CSRF Protection**
- **Goal:** Prevent Cross-Site Request Forgery attacks on all state-changing endpoints.
- **Steps:**
  - 1. Extend the API middleware to manage CSRF tokens using the "Double Submit Cookie" pattern.
  - 2. On a user's first visit or login, generate a cryptographically secure, random token and set it in a secure, `httpOnly` cookie.
  - 3. On the client, retrieve the token and include it in a custom `X-CSRF-Token` header for every `POST`, `PUT`, or `DELETE` request.
  - 4. The middleware must verify that the token in the request header matches the token in the cookie before allowing the request to proceed.

**Task 5.3: Implement Server-Side Input Sanitization**
- **Goal:** Mitigate the risk of Stored Cross-Site Scripting (XSS) by cleaning user-provided input.
- **Steps:**
  - 1. In the `/api/auth/signup` endpoint, intercept the user-provided `username`.
  - 2. Use a trusted library (like `dompurify` configured for the server-side) or a strict regular expression to strip any characters that could form HTML or script tags.
  - 3. Ensure only the sanitized `username` is passed to the Supabase client for storage.

**Task 5.4: Ensure Secure Error Handling**
- **Goal:** Prevent user enumeration by returning generic error messages from authentication endpoints.
- **Steps:**
  - 1. Review the `catch` blocks and error response logic in the `/api/auth/login` and `/api/auth/signup` routes.
  - 2. For a failed login, ensure the response is always a generic message like "Invalid credentials," regardless of whether the user exists or the password was wrong.
  - 3. For a failed signup (e.g., username already exists), return a generic message like "Unable to create account" to prevent confirming which usernames are taken.

---

### Phase 6: Finalization & Deployment

**Task 6.1: Comprehensive Responsive Styling**
- **Goal:** Ensure the application is fully usable and looks polished on all screen sizes, from mobile to desktop.
- **Steps:**
  - 1. Review every page and component.
  - 2. Use Tailwind CSS's responsive prefixes (e.g., `md:`, `lg:`) to adjust layouts, font sizes, and spacing.
  - 3. Test on real devices or in a browser's device emulator.

**Task 6.2: Final Testing and Deployment**
- **Goal:** Perform final checks and deploy the application to Vercel.
- **Steps:**
  - 1. Manually test all application features: signup, login, list management, and matchmaking.
  - 2. Set up a new project on Vercel and link it to the GitHub repository.
  - 3. Configure the production environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.) in the Vercel project settings.
  - 4. Push the `main` branch to trigger the first deployment.
  - 5. Verify the deployed application is working correctly.
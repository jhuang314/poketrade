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

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
          err instanceof Error ? err : new Error("An unknown error occurred"),
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

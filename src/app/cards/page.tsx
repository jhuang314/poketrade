// src/app/cards/page.tsx
"use client";
import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { usePokemonData } from "@/hooks/usePokemonData";
import Card from "@/components/cards/Card";
import Spinner from "@/components/ui/Spinner";
import type { Card as CardType } from "@/lib/types";

type ActiveTab = "wishlist" | "tradeList";
const ALLOWED_TRADE_RARITIES = new Set(["C", "U", "R", "RR", "AR"]);

export default function CardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: allCards, isLoading: cardsLoading, error } = usePokemonData();

  const [activeTab, setActiveTab] = useState<ActiveTab>("wishlist");
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");

  // Placeholder for user selections - will be populated in Phase 3
  const [wishlistSelection] = useState<Set<string>>(new Set());
  const [tradeListSelection] = useState<Set<string>>(new Set());

  const filteredCards = useMemo(() => {
    if (!allCards) return [];
    return allCards.filter((card) => {
      const nameMatch = card.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const rarityMatch = rarityFilter
        ? card.rarityCode === rarityFilter
        : true;
      return nameMatch && rarityMatch;
    });
  }, [allCards, searchQuery, rarityFilter]);

  const rarities = useMemo(
    () =>
      allCards ? [...new Set(allCards.map((c) => c.rarityCode))].sort() : [],
    [allCards],
  );

  // Redirect if not logged in
  if (!authLoading && !user) {
    router.replace("/login");
    return null;
  }

  const handleToggleCard = (card: CardType) => {
    // Logic will be fully implemented in Phase 3
    console.log(`Toggled card: ${card.id} for ${activeTab}`);
  };

  if (authLoading || cardsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return <p className="text-center text-red-500">Error loading card data.</p>;
  }

  const selectionSet =
    activeTab === "wishlist" ? wishlistSelection : tradeListSelection;

  return (
    <div>
      <div className="flex gap-2 mb-4 border-b">
        {/* Tab Navigation */}
        <button
          onClick={() => setActiveTab("wishlist")}
          className={`px-4 py-2 ${activeTab === "wishlist" ? "border-b-2 border-blue-500" : ""}`}
        >
          Wishlist
        </button>
        <button
          onClick={() => setActiveTab("tradeList")}
          className={`px-4 py-2 ${activeTab === "tradeList" ? "border-b-2 border-blue-500" : ""}`}
        >
          Trade List
        </button>
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
          {rarities.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {filteredCards.map((card) => (
          <Card
            key={card.id}
            cardData={card}
            isSelected={selectionSet.has(card.id)}
            isDisabled={
              activeTab === "tradeList" &&
              !ALLOWED_TRADE_RARITIES.has(card.rarityCode)
            }
            onToggle={handleToggleCard}
          />
        ))}
      </div>
    </div>
  );
}

"use client";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { usePokemonData } from "@/hooks/usePokemonData";
import CardComponent from "@/components/cards/Card"; // Renamed to avoid conflict with type
import Spinner from "@/components/ui/Spinner";
import { Card, UserData } from "@/lib/types";
import useSWR from "swr";
import toast from "react-hot-toast";
import SaveChangesBar from "@/components/cards/SaveChangesBar";

type ActiveTab = "wishlist" | "tradeList";
const ALLOWED_TRADE_RARITIES = new Set(["C", "U", "R", "RR", "AR"]);
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    data: allCards,
    isLoading: cardsLoading,
    error: cardsError,
  } = usePokemonData();
  const {
    data: userData,
    error: userError,
    isLoading: userDataLoading,
    mutate,
  } = useSWR<UserData>("/api/user/me", fetcher);

  const [activeTab, setActiveTab] = useState<ActiveTab>("wishlist");
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");

  const [initialWishlist, setInitialWishlist] = useState<Set<string>>(
    new Set(),
  );
  const [initialTradeList, setInitialTradeList] = useState<Set<string>>(
    new Set(),
  );
  const [wishlistSelection, setWishlistSelection] = useState<Set<string>>(
    new Set(),
  );
  const [tradeListSelection, setTradeListSelection] = useState<Set<string>>(
    new Set(),
  );

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

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

  const handleToggleCard = (card: Card) => {
    const isTradeTab = activeTab === "tradeList";
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
    const wishlistChanged =
      initialWishlist.size !== wishlistSelection.size ||
      [...initialWishlist].some((id) => !wishlistSelection.has(id)) ||
      [...wishlistSelection].some((id) => !initialWishlist.has(id));
    const tradeListChanged =
      initialTradeList.size !== tradeListSelection.size ||
      [...initialTradeList].some((id) => !tradeListSelection.has(id)) ||
      [...tradeListSelection].some((id) => !initialTradeList.has(id));
    return wishlistChanged || tradeListChanged;
  }, [
    initialWishlist,
    wishlistSelection,
    initialTradeList,
    tradeListSelection,
  ]);

  const handleSaveChanges = async () => {
    const wishlistToAdd = [...wishlistSelection].filter(
      (id) => !initialWishlist.has(id),
    );
    const wishlistToRemove = [...initialWishlist].filter(
      (id) => !wishlistSelection.has(id),
    );
    const tradeListToAdd = [...tradeListSelection].filter(
      (id) => !initialTradeList.has(id),
    );
    const tradeListToRemove = [...initialTradeList].filter(
      (id) => !tradeListSelection.has(id),
    );

    const promise = Promise.all([
      fetch("/api/user/wishlist/batch-update", {
        method: "POST",
        body: JSON.stringify({
          toAdd: wishlistToAdd,
          toRemove: wishlistToRemove,
        }),
        headers: { "Content-Type": "application/json" },
      }),
      fetch("/api/user/tradelist/batch-update", {
        method: "POST",
        body: JSON.stringify({
          toAdd: tradeListToAdd,
          toRemove: tradeListToRemove,
        }),
        headers: { "Content-Type": "application/json" },
      }),
    ]).then(async ([wishlistRes, tradeListRes]) => {
      if (!wishlistRes.ok || !tradeListRes.ok)
        throw new Error("Failed to save changes.");
      const data = await Promise.all([wishlistRes.json(), tradeListRes.json()]);
      mutate(); // Re-fetch user data from SWR cache
      return data;
    });

    toast.promise(promise, {
      loading: "Saving changes...",
      success: "Lists updated successfully!",
      error: "Could not save changes.",
    });
  };

  const handleDiscardChanges = () => {
    setWishlistSelection(new Set(initialWishlist));
    setTradeListSelection(new Set(initialTradeList));
  };

  if (authLoading || cardsLoading || userDataLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }
  if (cardsError || userError) {
    return <p className="text-center text-red-500">Error loading data.</p>;
  }

  if (!user) {
    return null; // router.replace is handling redirection
  }

  const selectionSet =
    activeTab === "wishlist" ? wishlistSelection : tradeListSelection;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center mb-6 border-b">
        <button
          onClick={() => setActiveTab("wishlist")}
          className={`px-6 py-2 text-lg font-semibold ${activeTab === "wishlist" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-blue-600"}`}
        >
          Wishlist
        </button>
        <button
          onClick={() => setActiveTab("tradeList")}
          className={`px-6 py-2 text-lg font-semibold ${activeTab === "tradeList" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-blue-600"}`}
        >
          Trade List
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="p-2 border rounded shadow-sm w-full sm:w-1/3"
        />
        <select
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
          className="p-2 border rounded shadow-sm w-full sm:w-1/4"
        >
          <option value="">All Rarities</option>
          {rarities.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredCards.map((card) => (
          <CardComponent
            key={card.id}
            cardData={card}
            isSelected={selectionSet.has(card.id)}
            isDisabled={
              activeTab === "tradeList" &&
              !ALLOWED_TRADE_RARITIES.has(card.rarityCode)
            }
            onToggle={() => handleToggleCard(card)}
          />
        ))}
      </div>
      {hasChanges && (
        <SaveChangesBar
          onSave={handleSaveChanges}
          onDiscard={handleDiscardChanges}
        />
      )}
    </div>
  );
}

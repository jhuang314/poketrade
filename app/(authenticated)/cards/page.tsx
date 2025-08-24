"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { CardGrid } from "@/components/card-grid";
import { TabNavigation } from "@/components/tab-navigation";
import { SaveChangesBar } from "@/components/save-changes-bar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ListFilter } from "lucide-react";
import { toast } from "react-hot-toast";

// Data type definitions based on the provided JSON structures
interface CardLabel {
  slug: string;
  eng: string;
}

interface CardData {
  set: string;
  number: number;
  rarity: string;
  rarityCode: string;
  imageName: string;
  label: CardLabel;
  packs: string[];
}

type RarityData = Record<string, string>;

type ActiveList = "wishlist" | "tradelist";

const TRADEABLE_RARITIES = ["C", "U", "R", "RR", "AR"];

export default function CardsPage() {
  const router = useRouter();
  const supabase = createClient();

  // Component State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Card Data State
  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [rarities, setRarities] = useState<RarityData>({});

  // User's Collection State
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [tradelist, setTradelist] = useState<Set<string>>(new Set());
  const [initialWishlist, setInitialWishlist] = useState<Set<string>>(
    new Set(),
  );
  const [initialTradelist, setInitialTradelist] = useState<Set<string>>(
    new Set(),
  );

  // UI State
  const [activeList, setActiveList] = useState<ActiveList>("wishlist");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRarities, setSelectedRarities] = useState<Set<string>>(
    new Set(),
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch user and their data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser(user);

      // Fetch both lists concurrently
      const [wishlistRes, tradelistRes] = await Promise.all([
        supabase
          .from("user_wishlist")
          .select("card_identifier")
          .eq("user_id", user.id),
        supabase
          .from("user_trade_list")
          .select("card_identifier")
          .eq("user_id", user.id),
      ]);

      if (wishlistRes.error) {
        console.error("Error fetching wishlist:", wishlistRes.error);
        toast.error("Could not fetch your wishlist.");
      }
      if (tradelistRes.error) {
        console.error("Error fetching tradelist:", tradelistRes.error);
        toast.error("Could not fetch your trade list.");
      }

      const initialWish = new Set<string>(
        wishlistRes.data?.map((item) => item.card_identifier) || [],
      );
      const initialTrade = new Set<string>(
        tradelistRes.data?.map((item) => item.card_identifier) || [],
      );

      setWishlist(new Set(initialWish));
      setTradelist(new Set(initialTrade));
      setInitialWishlist(new Set(initialWish));
      setInitialTradelist(new Set(initialTrade));

      setLoading(false);
    };

    fetchData();
  }, [supabase, router]);

  // Fetch card data from external source
  useEffect(() => {
    const fetchCardData = async () => {
      try {
        const [cardsRes, rarityRes] = await Promise.all([
          fetch(
            "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/cards.json",
          ),
          fetch(
            "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/rarity.json",
          ),
        ]);
        const cardsData = await cardsRes.json();
        const rarityData = await rarityRes.json();
        setAllCards(cardsData);
        setRarities(rarityData);
      } catch (error) {
        console.error("Failed to fetch card data:", error);
        toast.error("Failed to load Pokémon card data.");
      }
    };
    fetchCardData();
  }, []);

  // Check for unsaved changes whenever the lists are modified
  useEffect(() => {
    const wishlistChanged =
      wishlist.size !== initialWishlist.size ||
      [...wishlist].some((id) => !initialWishlist.has(id));
    const tradelistChanged =
      tradelist.size !== initialTradelist.size ||
      [...tradelist].some((id) => !initialTradelist.has(id));

    setHasUnsavedChanges(wishlistChanged || tradelistChanged);
  }, [wishlist, tradelist, initialWishlist, initialTradelist]);

  const filteredCards = useMemo(() => {
    return allCards.filter(
      (card) =>
        card.label.eng.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (selectedRarities.size === 0 || selectedRarities.has(card.rarityCode)),
    );
  }, [allCards, searchQuery, selectedRarities]);

  const handleCardToggle = useCallback(
    (card: CardData) => {
      const cardId = `${card.set}-${card.number}`;
      const listToUpdate = activeList === "wishlist" ? wishlist : tradelist;
      const setList = activeList === "wishlist" ? setWishlist : setTradelist;

      if (
        activeList === "tradelist" &&
        !TRADEABLE_RARITIES.includes(card.rarityCode)
      ) {
        toast.error(
          `Only Common, Uncommon, Rare, Double Rare, and Art Rare cards can be added to the trade list.`,
        );
        return;
      }

      const newList = new Set(listToUpdate);
      if (newList.has(cardId)) {
        newList.delete(cardId);
      } else {
        newList.add(cardId);
      }
      setList(newList);
    },
    [activeList, wishlist, tradelist],
  );

  const handleSaveChanges = async () => {
    if (!user) return;
    const savingToast = toast.loading("Saving changes...");

    try {
      // Calculate diffs
      const cardsToAddWishlist = [...wishlist].filter(
        (id) => !initialWishlist.has(id),
      );
      const cardsToRemoveWishlist = [...initialWishlist].filter(
        (id) => !wishlist.has(id),
      );
      const cardsToAddTradelist = [...tradelist].filter(
        (id) => !initialTradelist.has(id),
      );
      const cardsToRemoveTradelist = [...initialTradelist].filter(
        (id) => !tradelist.has(id),
      );

      const dbOperations = [];

      // Wishlist additions
      if (cardsToAddWishlist.length > 0) {
        dbOperations.push(
          supabase.from("user_wishlist").insert(
            cardsToAddWishlist.map((id) => ({
              user_id: user.id,
              card_identifier: id,
            })),
          ),
        );
      }
      // Wishlist removals
      if (cardsToRemoveWishlist.length > 0) {
        dbOperations.push(
          supabase
            .from("user_wishlist")
            .delete()
            .eq("user_id", user.id)
            .in("card_identifier", cardsToRemoveWishlist),
        );
      }
      // Tradelist additions
      if (cardsToAddTradelist.length > 0) {
        dbOperations.push(
          supabase.from("user_trade_list").insert(
            cardsToAddTradelist.map((id) => ({
              user_id: user.id,
              card_identifier: id,
            })),
          ),
        );
      }
      // Tradelist removals
      if (cardsToRemoveTradelist.length > 0) {
        dbOperations.push(
          supabase
            .from("user_trade_list")
            .delete()
            .eq("user_id", user.id)
            .in("card_identifier", cardsToRemoveTradelist),
        );
      }

      const results = await Promise.all(dbOperations);

      const error = results.find((res) => res.error);
      if (error) {
        throw error.error;
      }

      toast.success("Changes saved successfully!", { id: savingToast });
      setInitialWishlist(new Set(wishlist));
      setInitialTradelist(new Set(tradelist));
      setHasUnsavedChanges(false);
    } catch (error) {
      toast.error("Failed to save changes.", { id: savingToast });
      console.error(error);
    }
  };

  const handleDiscardChanges = () => {
    setWishlist(new Set(initialWishlist));
    setTradelist(new Set(initialTradelist));
    setHasUnsavedChanges(false);
    toast("Changes discarded.");
  };

  const handleRarityToggle = (rarityCode: string) => {
    const newSelected = new Set(selectedRarities);
    if (newSelected.has(rarityCode)) {
      newSelected.delete(rarityCode);
    } else {
      newSelected.add(rarityCode);
    }
    setSelectedRarities(newSelected);
  };

  if (loading || allCards.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading your collection...</p>
      </div>
    );
  }

  const currentList = activeList === "wishlist" ? wishlist : tradelist;

  return (
    <div className="flex flex-col w-full min-h-screen p-4 md:p-6">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4">
        <TabNavigation activeList={activeList} setActiveList={setActiveList} />
        <div className="flex gap-4 mt-4">
          <Input
            type="search"
            placeholder="Search by card name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shrink-0">
                <ListFilter className="mr-2 h-4 w-4" />
                Filter Rarity
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filter by Rarity</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(rarities).map(([code, name]) => (
                <DropdownMenuCheckboxItem
                  key={code}
                  checked={selectedRarities.has(code)}
                  onCheckedChange={() => handleRarityToggle(code)}
                >
                  {name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-grow pt-4">
        <CardGrid
          cards={filteredCards}
          selectedCards={currentList}
          onCardToggle={handleCardToggle}
          activeList={activeList}
        />
      </main>

      <SaveChangesBar
        isVisible={hasUnsavedChanges}
        onSave={handleSaveChanges}
        onDiscard={handleDiscardChanges}
      />
    </div>
  );
}

// poketrade/components/card.tsx

"use client";

import { cn } from "@/lib/utils";

// Re-exporting interfaces to be used across components
export interface CardLabel {
  slug: string;
  eng: string;
}

export interface CardData {
  set: string;
  number: number;
  rarity: string;
  rarityCode: string;
  imageName: string;
  label: CardLabel;
  packs: string[];
}

type ActiveList = "wishlist" | "tradelist";

interface CardProps {
  card: CardData;
  isSelected: boolean;
  onToggle: (card: CardData) => void;
  activeList: ActiveList;
}

const TRADEABLE_RARITIES = ["C", "U", "R", "RR", "AR"];
const IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/flibustier/pokemon-tcg-exchange/refs/heads/main/public/images/cards/";

export function Card({ card, isSelected, onToggle, activeList }: CardProps) {
  const imageUrl = `${IMAGE_BASE_URL}${card.imageName}`;
  const isTradeable = TRADEABLE_RARITIES.includes(card.rarityCode);

  // A card is disabled if the active list is 'tradelist' and the card's rarity is not tradeable.
  const isDisabled = activeList === "tradelist" && !isTradeable;

  const handleToggle = () => {
    // Prevent toggling if the card is disabled
    if (isDisabled) return;
    onToggle(card);
  };

  return (
    <div
      onClick={handleToggle}
      className={cn(
        "relative aspect-[3/4] overflow-hidden rounded-lg border-2 transition-all duration-200 ease-in-out",
        // Apply styles based on selection and disabled state
        isSelected
          ? "border-primary shadow-lg scale-105"
          : "border-transparent",
        isDisabled
          ? "cursor-not-allowed opacity-30"
          : "cursor-pointer hover:scale-105 hover:shadow-md",
      )}
      title={
        isDisabled
          ? `${card.label.eng} (${card.rarity}) - This rarity cannot be added to your trade list.`
          : `${card.label.eng} (${card.rarity})`
      }
    >
      <img
        src={imageUrl}
        alt={card.label.eng}
        loading="lazy"
        className={cn(
          "h-full w-full object-cover transition-all duration-200",
          // Apply grayscale if the card is not selected and not disabled
          !isSelected && !isDisabled && "grayscale",
        )}
      />
      {/* Overlay to show card info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2">
        <p className="truncate text-xs font-bold text-white shadow-black/50 [text-shadow:0_1px_2px_var(--tw-shadow-color)]">
          {card.label.eng}
        </p>
        <p className="text-xs text-gray-300 shadow-black/50 [text-shadow:0_1px_2px_var(--tw-shadow-color)]">
          {card.rarity}
        </p>
      </div>
      {/* Additional overlay for disabled cards to make the reason clear */}
      {isDisabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <p className="text-center text-xs font-semibold text-white p-2">
            Not Tradeable
          </p>
        </div>
      )}
    </div>
  );
}

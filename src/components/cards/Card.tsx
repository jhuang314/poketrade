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

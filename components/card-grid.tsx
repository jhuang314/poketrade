import { Card, type CardData } from "@/components/card";

type ActiveList = "wishlist" | "tradelist";

interface CardGridProps {
  cards: CardData[];
  selectedCards: Set<string>;
  onCardToggle: (card: CardData) => void;
  activeList: ActiveList;
}

export function CardGrid({
  cards,
  selectedCards,
  onCardToggle,
  activeList,
}: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          No cards found matching your criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4">
      {cards.map((card) => {
        const cardId = `${card.set}-${card.number}`;
        const isSelected = selectedCards.has(cardId);
        return (
          <Card
            key={cardId}
            card={card}
            isSelected={isSelected}
            onToggle={onCardToggle}
            activeList={activeList}
          />
        );
      })}
    </div>
  );
}

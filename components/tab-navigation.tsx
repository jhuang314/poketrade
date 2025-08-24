// poketrade/components/tab-navigation.tsx
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ActiveList = "wishlist" | "tradelist";

interface TabNavigationProps {
  activeList: ActiveList;
  setActiveList: (list: ActiveList) => void;
}

export function TabNavigation({
  activeList,
  setActiveList,
}: TabNavigationProps) {
  return (
    <div className="flex w-full justify-center">
      <div className="inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
        <Button
          onClick={() => setActiveList("wishlist")}
          variant={activeList === "wishlist" ? "secondary" : "ghost"}
          className={cn(
            "w-32",
            activeList === "wishlist"
              ? "shadow-sm"
              : "hover:bg-muted/50",
          )}
        >
          Wishlist
        </Button>
        <Button
          onClick={() => setActiveList("tradelist")}
          variant={activeList === "tradelist" ? "secondary" : "ghost"}
          className={cn(
            "w-32",
            activeList === "tradelist"
              ? "shadow-sm"
              : "hover:bg-muted/50",
          )}
        >
          Trade List
        </Button>
      </div>
    </div>
  );
}

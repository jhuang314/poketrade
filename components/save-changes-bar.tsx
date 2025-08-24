// poketrade/components/save-changes-bar.tsx
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Save, XCircle } from "lucide-react";

interface SaveChangesBarProps {
  isVisible: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function SaveChangesBar({
  isVisible,
  onSave,
  onDiscard,
}: SaveChangesBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="container mx-auto flex max-w-md items-center justify-between gap-4 rounded-t-lg border-t border-l border-r bg-card p-4 shadow-2xl">
        <p className="text-sm font-medium text-card-foreground">
          You have unsaved changes.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDiscard}>
            <XCircle />
            Discard
          </Button>
          <Button size="sm" onClick={onSave}>
            <Save />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

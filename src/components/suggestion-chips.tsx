"use client";

import { Button } from "@/components/ui/button";

interface SuggestionChip {
  label: string;
  message: string;
}

interface SuggestionChipsProps {
  chips: SuggestionChip[];
  onSelect: (message: string) => void;
}

export function SuggestionChips({ chips, onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center px-4">
      {chips.map((chip) => (
        <Button
          key={chip.label}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelect(chip.message)}
          className="rounded-full text-sm font-medium bg-secondary text-foreground border-0 hover:bg-primary/15 hover:text-primary whitespace-nowrap h-auto px-4 py-2 transition-colors"
        >
          {chip.label}
        </Button>
      ))}
    </div>
  );
}

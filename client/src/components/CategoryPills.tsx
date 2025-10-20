import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface CategoryPillsProps {
  categories: string[];
  onSelect?: (category: string) => void;
}

export default function CategoryPills({ categories, onSelect }: CategoryPillsProps) {
  const [selected, setSelected] = useState(categories[0]);

  const handleSelect = (category: string) => {
    setSelected(category);
    onSelect?.(category);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <Badge
          key={category}
          variant={selected === category ? "default" : "outline"}
          className={`cursor-pointer whitespace-nowrap px-4 h-8 ${
            selected === category
              ? "bg-gradient-primary text-white border-0"
              : "border-border hover-elevate"
          }`}
          onClick={() => handleSelect(category)}
          data-testid={`pill-${category.toLowerCase()}`}
        >
          {category}
        </Badge>
      ))}
    </div>
  );
}

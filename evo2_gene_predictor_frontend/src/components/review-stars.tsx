"use client";

import { Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const MAX_STARS = 4;

export function ReviewStars({
  stars,
  status,
}: {
  stars: number;
  status: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          role="img"
          aria-label={`ClinVar review status: ${stars} of ${MAX_STARS} stars`}
          className="inline-flex cursor-help items-center gap-0.5 outline-none"
        >
          {Array.from({ length: MAX_STARS }, (_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${i < stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
            />
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-left leading-relaxed">
        <span className="font-semibold">
          {stars} of {MAX_STARS} stars.
        </span>{" "}
        {status
          ? status.charAt(0).toUpperCase() + status.slice(1)
          : "No review status provided"}
      </TooltipContent>
    </Tooltip>
  );
}

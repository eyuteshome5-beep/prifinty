"use client";

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-9 w-9 md:h-7 md:w-7',
};

export function StarRating({ 
  rating, 
  maxRating = 5, 
  size = 'md',
  interactive = false,
  onRatingChange 
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const displayRating = hoverRating || rating;
  
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= displayRating;
        const isHalfFilled = starValue - 0.5 <= displayRating && starValue > displayRating;
        
        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            className={cn(
              "transition-all duration-300 p-1 md:p-0.5",
              interactive && "hover:scale-125 cursor-pointer active:scale-90",
              !interactive && "cursor-default"
            )}
            onClick={() => interactive && onRatingChange?.(starValue)}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-all duration-300",
                isFilled 
                  ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" 
                  : isHalfFilled
                  ? "fill-amber-400/50 text-amber-400"
                  : "text-muted-foreground/20 hover:text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

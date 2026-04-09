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
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
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
              "transition-transform",
              interactive && "hover:scale-110 cursor-pointer",
              !interactive && "cursor-default"
            )}
            onClick={() => interactive && onRatingChange?.(starValue)}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                isFilled 
                  ? "fill-amber-400 text-amber-400" 
                  : isHalfFilled
                  ? "fill-amber-400/50 text-amber-400"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { usePathname } from 'next/navigation';

export function AppBackground() {
  const pathname = usePathname();
  
  // Only show the animated diagonal background on pages OTHER than the landing page
  if (pathname === '/') return null;
  
  return <div className="diagonal-red-white" />;
}

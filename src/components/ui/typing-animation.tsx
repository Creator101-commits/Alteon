"use client";

import { useEffect, useState, useRef } from "react";

export function useTypingAnimation(text: string, speed: number = 30, skipAnimation: boolean = false) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!text) return;
    
    // If we should skip animation, show all text immediately
    if (skipAnimation) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }
    
    // Reset state when text changes
    setDisplayedText("");
    setIsComplete(false);
    indexRef.current = 0;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start typing animation
    intervalRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        setIsComplete(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, speed, skipAnimation]);

  return { displayedText, isComplete };
}
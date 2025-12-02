import { useEffect, useState, useRef } from "react";
import { useTypingAnimation } from "@/components/ui/typing-animation";
import { FormattedMessage } from "@/components/ui/FormattedMessage";

interface AnimatedMessageProps {
  content: string;
  className?: string;
  onAnimationComplete?: () => void;
}

// Store completed animations to prevent re-animation
const completedAnimations = new Set<string>();

export function AnimatedMessage({ 
  content, 
  className = "",
  onAnimationComplete
}: AnimatedMessageProps) {
  const [isInstantComplete, setIsInstantComplete] = useState(false);
  const contentHash = useRef(content);
  
  // Check if this content was already animated
  useEffect(() => {
    if (completedAnimations.has(content)) {
      setIsInstantComplete(true);
    } else {
      setIsInstantComplete(false);
    }
  }, [content]);

  const { displayedText, isComplete } = useTypingAnimation(
    content, 
    4, // ~130 WPM (4ms per character for faster typing)
    isInstantComplete
  );

  // Mark animation as complete and store in memory
  useEffect(() => {
    if (isComplete && !isInstantComplete) {
      completedAnimations.add(content);
      onAnimationComplete?.();
    }
  }, [isComplete, isInstantComplete, content, onAnimationComplete]);

  // If already completed, show formatted message immediately
  if (isInstantComplete) {
    return (
      <div className={className}>
        <FormattedMessage content={content} />
      </div>
    );
  }

  return (
    <div className={className}>
      {!isComplete ? (
        <div className="text-sm">
          <FormattedMessage content={displayedText} />
          <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 opacity-75"></span>
        </div>
      ) : (
        <FormattedMessage content={content} />
      )}
    </div>
  );
}
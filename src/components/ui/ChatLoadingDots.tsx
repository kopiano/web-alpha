import { memo } from "react";

type ChatLoadingDotsProps = {
  className?: string;
  dotClassName?: string;
};

export const ChatLoadingDots = memo(function ChatLoadingDots({
  className = "",
  dotClassName = "bg-violet-300/35",
}: ChatLoadingDotsProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {[0, 160, 320].map((delay) => (
        <span
          key={delay}
          className={`w-1.5 h-1.5 rounded-full ${dotClassName} animate-bounce`}
          style={{ animationDelay: `${delay}ms`, animationDuration: "0.8s" }}
        />
      ))}
    </div>
  );
});

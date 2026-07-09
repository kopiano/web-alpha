import { memo } from "react";

type ChatLoadingDotsProps = {
  className?: string;
  ringClassName?: string;
};

export const ChatLoadingDots = memo(function ChatLoadingDots({
  className = "",
  ringClassName = "border-t-violet-400",
}: ChatLoadingDotsProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`w-8 h-8 rounded-full border-2 border-white/10 ${ringClassName} animate-spin`} />
    </div>
  );
});

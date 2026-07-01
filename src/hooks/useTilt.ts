import { useState, useCallback, useRef } from "react";

interface TiltResult {
  ref: React.RefObject<HTMLDivElement | null>;
  style: {
    transform: string;
    transition: string;
  };
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
}

export function useTilt(intensity: number = 8): TiltResult {
  const ref = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setRotation({ x: -y * intensity, y: x * intensity });
    },
    [intensity]
  );

  const onMouseLeave = useCallback(() => {
    setRotation({ x: 0, y: 0 });
  }, []);

  return {
    ref,
    style: {
      transform: `perspective(800px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
    },
    onMouseMove,
    onMouseLeave,
  };
}

import { useMemo } from "react";

export const Particles = ({ count = 24 }: { count?: number }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 20,
        duration: 18 + Math.random() * 18,
        size: 1 + Math.random() * 2.5,
        hue: [270, 190, 220, 320][Math.floor(Math.random() * 4)],
      })),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: `-20px`,
            width: p.size,
            height: p.size,
            background: `hsl(${p.hue}, 95%, 70%)`,
            boxShadow: `0 0 ${p.size * 6}px hsl(${p.hue}, 95%, 65%)`,
            animation: `float-particle ${p.duration}s linear ${p.delay}s infinite`,
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
};

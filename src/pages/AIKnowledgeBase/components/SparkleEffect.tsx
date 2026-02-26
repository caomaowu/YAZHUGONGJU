import React, { useEffect, useState } from 'react';

interface SparkleProps {
  active: boolean;
}

export const SparkleEffect: React.FC<SparkleProps> = ({ active }) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; color: string; delay: number }[]>([]);

  useEffect(() => {
    if (active) {
      // Create explosion particles
      const newParticles = Array.from({ length: 60 }).map((_, i) => ({
        id: Date.now() + i, // Use timestamp to ensure unique keys for re-renders
        // Start from center
        x: 50, 
        y: 50,
        // Larger movement direction to cover more screen
        dx: (Math.random() - 0.5) * 800,
        dy: (Math.random() - 0.5) * 800,
        size: Math.random() * 6 + 3,
        color: ['#f59e0b', '#fbbf24', '#fcd34d', '#ffffff'][Math.floor(Math.random() * 4)],
        delay: Math.random() * 0.2
      }));
      // @ts-ignore
      setParticles(newParticles);

      // Cleanup after animation
      const timer = setTimeout(() => {
        // @ts-ignore
        setParticles([]);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
       // Reset particles when inactive to allow re-triggering
       // @ts-ignore
       setParticles([]);
    }
  }, [active]);

  if (!active && particles.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      {/* @ts-ignore */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="sparkle-particle"
          style={{
            left: '50%',
            top: '50%',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            // @ts-ignore
            '--tx': `${p.dx}px`,
            // @ts-ignore
            '--ty': `${p.dy}px`,
            animationDelay: `${p.delay}s`
          }}
        />
      ))}
      <style>{`
        .sparkle-particle {
          position: absolute;
          border-radius: 50%;
          opacity: 0;
          animation: sparkle-explode 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes sparkle-explode {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0);
          }
          15% {
             opacity: 1;
             transform: translate(calc(-50% + var(--tx) * 0.2), calc(-50% + var(--ty) * 0.2)) scale(1.5);
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0);
          }
        }
      `}</style>
    </div>
  );
};

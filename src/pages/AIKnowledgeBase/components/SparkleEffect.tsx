import React, { useMemo } from 'react';

interface SparkleProps {
  active: boolean;
}

export const SparkleEffect: React.FC<SparkleProps> = ({ active }) => {
  const particles = useMemo<SparkleParticle[]>(() => {
    if (!active) return [];
    const colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#ffffff'];
    const count = 60;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 200 + (i % 6) * 30;
      return {
        id: i,
        dx: Math.cos(angle) * radius,
        dy: Math.sin(angle) * radius,
        size: 3 + (i % 4),
        color: colors[i % colors.length],
        delay: (i % 10) * 0.02
      };
    });
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
      {particles.map((p) => (
        <div
          key={p.id}
          className="sparkle-particle"
          style={({
            left: '50%',
            top: '50%',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            '--tx': `${p.dx}px`,
            '--ty': `${p.dy}px`,
            animationDelay: `${p.delay}s`
          } as SparkleStyle)}
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

type SparkleParticle = {
  id: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  delay: number;
};

type SparkleStyle = React.CSSProperties & {
  '--tx'?: string;
  '--ty'?: string;
};

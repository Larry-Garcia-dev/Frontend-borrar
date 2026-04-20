"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

interface ParticleLoaderProps {
  message?: string;
  progress?: number;
}

const colors = [
  "rgba(99, 102, 241, 0.8)",   // Primary
  "rgba(139, 92, 246, 0.8)",   // Accent
  "rgba(59, 130, 246, 0.7)",   // Blue
  "rgba(168, 85, 247, 0.7)",   // Purple
  "rgba(236, 72, 153, 0.6)",   // Pink
];

export function ParticleLoader({ message = "Generando imagen...", progress = 0 }: ParticleLoaderProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const radius = 80 + Math.random() * 60;
      newParticles.push({
        id: i,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: 4 + Math.random() * 8,
        duration: 2 + Math.random() * 2,
        delay: Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12">
      {/* Particle container */}
      <div className="relative h-64 w-64">
        {/* Central glow */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Orbiting ring */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Second ring */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />

        {/* Particles */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            }}
            initial={{
              x: 0,
              y: 0,
              opacity: 0,
            }}
            animate={{
              x: [0, particle.x, particle.x * 0.5, 0],
              y: [0, particle.y, particle.y * 0.5, 0],
              opacity: [0, 1, 0.8, 0],
              scale: [0.5, 1, 0.8, 0.5],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Center icon */}
        <motion.div
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-xl"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <path d="M12 3v3" />
            <path d="m18.4 5.6-2.1 2.1" />
            <path d="M21 12h-3" />
            <path d="m18.4 18.4-2.1-2.1" />
            <path d="M12 21v-3" />
            <path d="m5.6 18.4 2.1-2.1" />
            <path d="M3 12h3" />
            <path d="m5.6 5.6 2.1 2.1" />
          </svg>
        </motion.div>
      </div>

      {/* Message and progress */}
      <div className="flex flex-col items-center gap-4">
        <motion.p
          className="text-xl font-medium text-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {message}
        </motion.p>

        {/* Progress bar */}
        {progress > 0 && (
          <div className="h-2 w-64 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        <p className="text-base text-muted-foreground">
          Esto puede tomar unos segundos...
        </p>
      </div>

      {/* Floating particles background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`bg-particle-${i}`}
            className="absolute h-2 w-2 rounded-full bg-primary/20"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

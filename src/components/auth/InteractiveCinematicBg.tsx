"use client";

import { useEffect, useRef } from "react";

interface MicroStar {
  x: number;
  y: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
  color: string;
  isHubbleSpike: boolean;
  spikeLength: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  dx: number;
  dy: number;
  alpha: number;
  active: boolean;
}

export default function InteractiveCinematicBg() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Pure astronomical star colors
    const starColors = [
      "#ffffff", // Crisp White
      "#f0f6ff", // Deep Sky Blue
      "#e0f2fe", // Hubble Cyan
      "#fef08a", // Solar Yellow
      "#fecaca", // Deep Red Star
    ];

    let stars: MicroStar[] = [];
    let shootingStar: ShootingStar | null = null;
    let nextShootingStarTime = Date.now() + Math.random() * 4000 + 3000;

    const spawnShootingStar = () => {
      const startX = Math.random() * width * 0.8;
      const startY = Math.random() * height * 0.4;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2;
      const speed = Math.random() * 10 + 14;

      shootingStar = {
        x: startX,
        y: startY,
        length: Math.random() * 70 + 80,
        speed,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        alpha: 1,
        active: true,
      };
    };

    const initScene = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      // Generate Crisp Micro Starfield
      stars = [];
      const totalStars = Math.floor((width * height) / 2500);

      for (let i = 0; i < totalStars; i++) {
        const isHubbleSpike = Math.random() < 0.035; // ~3.5% crisp spike stars
        const size = isHubbleSpike ? Math.random() * 1.2 + 1.8 : Math.random() * 1.0 + 0.4;
        const baseAlpha = isHubbleSpike ? Math.random() * 0.3 + 0.7 : Math.random() * 0.5 + 0.2;

        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size,
          alpha: baseAlpha,
          baseAlpha,
          twinkleSpeed: Math.random() * 0.02 + 0.006,
          phase: Math.random() * Math.PI * 2,
          color: starColors[Math.floor(Math.random() * starColors.length)],
          isHubbleSpike,
          spikeLength: isHubbleSpike ? size * (Math.random() * 2.5 + 3.5) : 0,
        });
      }
    };

    initScene();

    const handleResize = () => {
      initScene();
    };

    window.addEventListener("resize", handleResize);

    const render = () => {
      // 1. Pure Crisp Deep Space Black Background (ZERO Blur / ZERO Artifact Blobs)
      ctx.fillStyle = "#020408";
      ctx.fillRect(0, 0, width, height);

      // 2. Render Micro Starfield with Crisp 4-Point Cross Spikes
      ctx.globalCompositeOperation = "source-over";

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        star.phase += star.twinkleSpeed;
        const twinkle = Math.sin(star.phase) * 0.25;
        star.alpha = Math.max(0.1, Math.min(1, star.baseAlpha + twinkle));

        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.alpha;

        // Draw Sharp Star Core
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw Sharp 4-Point Cross Spikes (Zero Blur Blobs)
        if (star.isHubbleSpike && star.alpha > 0.5) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = star.color;
          ctx.lineWidth = 0.6;
          ctx.globalAlpha = star.alpha * 0.5;

          const spike = star.spikeLength * (0.85 + Math.sin(star.phase) * 0.15);

          // Sharp Horizontal Line
          ctx.beginPath();
          ctx.moveTo(star.x - spike, star.y);
          ctx.lineTo(star.x + spike, star.y);
          ctx.stroke();

          // Sharp Vertical Line
          ctx.beginPath();
          ctx.moveTo(star.x, star.y - spike);
          ctx.lineTo(star.x, star.y + spike);
          ctx.stroke();

          ctx.restore();
        }
      }

      // 3. Render Shooting Star / Meteor Event
      const now = Date.now();
      if (!shootingStar && now > nextShootingStarTime) {
        spawnShootingStar();
        nextShootingStarTime = now + Math.random() * 7000 + 5000;
      }

      if (shootingStar && shootingStar.active) {
        const s = shootingStar;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const tailX = s.x - s.dx * (s.length / s.speed);
        const tailY = s.y - s.dy * (s.length / s.speed);

        const trailGrad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        trailGrad.addColorStop(0, `rgba(255, 255, 255, ${s.alpha})`);
        trailGrad.addColorStop(0.4, `rgba(239, 68, 68, ${s.alpha * 0.6})`);
        trailGrad.addColorStop(1, "transparent");

        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        s.x += s.dx;
        s.y += s.dy;
        s.alpha -= 0.025;

        if (s.alpha <= 0 || s.x > width + 100 || s.y > height + 100) {
          s.active = false;
          shootingStar = null;
        }

        ctx.restore();
      }

      ctx.globalAlpha = 1;
      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#020408]">
      {/* Pure Crisp Deep Space Canvas Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

import confetti from "canvas-confetti";

export function burstConfetti() {
  try {
    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.5 },
      colors: ["#22c55e", "#3b82f6", "#facc15", "#a855f7"],
    });
  } catch {
    /* ignore */
  }
}
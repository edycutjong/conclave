"use client";

interface Props {
  /** Confidence in basis points (0–10000). */
  confidenceBps: number;
  /** Diameter of the dial in pixels. */
  size?: number;
}

export function ConfidenceDial({ confidenceBps, size = 120 }: Props) {
  const confidence = confidenceBps / 10000;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - confidence);

  // Color based on confidence
  const color =
    confidence >= 0.8 ? "#22c55e" : confidence >= 0.5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="6"
        />
        {/* Confidence arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="confidence-arc"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      {/* Center value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold" style={{ color }}>
          {confidence.toFixed(2)}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-slate-500">confidence</span>
      </div>
    </div>
  );
}

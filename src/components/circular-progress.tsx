"use client";

interface CircularProgressProps {
  label: string;
  current: number;
  target?: number;
  unit: string;
  color: string;
  size?: number;
}

export function CircularProgress({
  label,
  current,
  target,
  unit,
  color,
  size = 80,
}: CircularProgressProps) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target && target > 0 ? Math.min(1, current / target) : 0;
  const offset = circumference * (1 - progress);

  const displayValue = current >= 1000
    ? `${(current / 1000).toFixed(1)}k`
    : `${Math.round(current)}`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
          />
        </svg>
        {/* Center value */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: size >= 90 ? "16px" : "13px",
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1,
            }}
          >
            {displayValue}
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-tertiary)",
              lineHeight: 1,
              marginTop: "2px",
            }}
          >
            {unit}
          </span>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
          {label}
        </div>
        {target && (
          <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
            / {target}{unit}
          </div>
        )}
      </div>
    </div>
  );
}

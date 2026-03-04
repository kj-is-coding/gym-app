"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

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
  const [showTooltip, setShowTooltip] = useState(false);

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target && target > 0 ? Math.min(1, current / target) : 0;
  const offset = circumference * (1 - progress);
  const percentage = target && target > 0 ? Math.round((current / target) * 100) : 0;
  const remaining = target ? Math.max(0, target - current) : null;

  const displayValue = current >= 1000
    ? `${(current / 1000).toFixed(1)}k`
    : `${Math.round(current)}`;

  const handleClick = useCallback(() => {
    setShowTooltip((v) => !v);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowTooltip(false);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1.5 relative">
      {/* Tooltip overlay */}
      {showTooltip && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleDismiss}
          onTouchEnd={handleDismiss}
        />
      )}

      {/* Tooltip content */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-popover text-popover-foreground px-3 py-2.5 rounded-xl shadow-lg border border-border min-w-[140px]">
            <div className="text-sm font-semibold text-foreground mb-1" style={{ color }}>
              {label}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Current</span>
                <span className="font-medium text-foreground">{current.toLocaleString()} {unit}</span>
              </div>
              {target && (
                <>
                  <div className="flex justify-between">
                    <span>Target</span>
                    <span className="font-medium text-foreground">{target.toLocaleString()} {unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Progress</span>
                    <span className="font-medium text-foreground">{percentage}%</span>
                  </div>
                  {remaining !== null && (
                    <div className="flex justify-between">
                      <span>Remaining</span>
                      <span className="font-medium text-foreground">{remaining.toLocaleString()} {unit}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {target && (
              <Link
                href="/app/goals"
                className="block mt-2 pt-2 border-t border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleDismiss}
              >
                View goals
              </Link>
            )}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2.5 h-2.5 rotate-45 bg-popover border-r border-b border-border" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
        aria-label={`${label}: ${current} of ${target ?? 'no'} ${unit}. Tap for details.`}
      >
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
      </button>
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

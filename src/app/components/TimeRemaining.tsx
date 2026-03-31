/**
 * TimeRemaining — live countdown that ticks every second.
 * Identical display on both Shopkeeper and Vendor dashboards.
 *
 * Props:
 *   initialSeconds  — seconds_remaining from the API (can be negative = overdue)
 *   compact         — single-line badge mode (default false)
 */
import { useState, useEffect, useRef } from 'react';

interface Props {
  initialSeconds: number;
  compact?: boolean;
}

function formatCountdown(secs: number): { text: string; overdue: boolean } {
  const overdue = secs < 0;
  const abs = Math.abs(secs);
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;

  let text = '';
  if (d > 0) text = `${d}d ${h}h ${m}m`;
  else if (h > 0) text = `${h}h ${m}m ${s}s`;
  else if (m > 0) text = `${m}m ${s}s`;
  else text = `${s}s`;

  return { text: overdue ? `${text} overdue` : `${text} remaining`, overdue };
}

export default function TimeRemaining({ initialSeconds, compact = false }: Props) {
  const [secs, setSecs] = useState(initialSeconds);
  const ref = useRef(initialSeconds);

  useEffect(() => {
    ref.current = initialSeconds;
    setSecs(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    const id = setInterval(() => {
      ref.current -= 1;
      setSecs(ref.current);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const { text, overdue } = formatCountdown(secs);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        overdue ? 'bg-red-100 text-red-700' : secs < 86400 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
      }`}>
        {overdue ? '⚠' : '⏱'} {text}
      </span>
    );
  }

  return (
    <p className={`text-sm font-semibold ${
      overdue ? 'text-red-600' : secs < 86400 ? 'text-orange-500' : 'text-green-600'
    }`}>
      {overdue ? '⚠ ' : '⏱ '}{text}
    </p>
  );
}

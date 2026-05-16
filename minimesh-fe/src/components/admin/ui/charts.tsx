interface LineChartProps {
  data: number[];
  height?: number;
  className?: string;
  gradientId?: string;
}

export function GlowLineChart({
  data,
  height = 120,
  className = "",
  gradientId = "lineGrad",
}: LineChartProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 400;
  const h = height;
  const pad = 8;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`w-full ${className}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--admin-chart-cyan)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--admin-chart-cyan)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--admin-chart-cyan)" />
          <stop offset="100%" stopColor="var(--admin-chart-accent)" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={`url(#${gradientId}-stroke)`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface DonutProps {
  segments: { value: number; color: string }[];
  size?: number;
}

export function GlowDonutChart({ segments, size = 140 }: DonutProps) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 40;
  const cx = 50;
  const cy = 50;
  let offset = 0;

  const arcs = segments.map((seg, i) => {
    const pct = seg.value / total;
    const dash = pct * 2 * Math.PI * r;
    const gap = 2 * Math.PI * r;
    const circle = (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth="12"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        className="opacity-90"
      />
    );
    offset += dash;
    return circle;
  });

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="shrink-0">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        className="admin-donut-track"
        strokeWidth="12"
      />
      {arcs}
    </svg>
  );
}

export function MiniBarChart({
  data,
  className = "",
}: {
  data: number[];
  className?: string;
}) {
  const max = Math.max(...data);
  return (
    <div className={`flex h-24 items-end gap-1 ${className}`}>
      {data.map((v, i) => (
        <div
          key={i}
          className="admin-bar flex-1 rounded-t transition-all"
          style={{ height: `${(v / max) * 100}%`, minHeight: 4 }}
        />
      ))}
    </div>
  );
}

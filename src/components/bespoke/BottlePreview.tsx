'use client'

export type BottleShape = 'classic' | 'rounded' | 'square'

interface BottlePreviewProps {
  shape: BottleShape
  color: string
  engravingLine1: string
  engravingLine2: string
  volume: number
}

function ClassicBottle({ color }: { color: string }) {
  return (
    <g>
      <rect x="105" y="60" width="90" height="40" rx="4" fill="#1a1612" stroke="#2a241b" />
      <rect x="120" y="40" width="60" height="22" rx="3" fill="#4a3d2b" />
      <path
        d="M105 100 Q105 95, 110 95 L190 95 Q195 95, 195 100 L195 300 Q195 320, 175 320 L125 320 Q105 320, 105 300 Z"
        fill={color}
      />
      <path
        d="M105 100 Q105 95, 110 95 L190 95 Q195 95, 195 100 L195 105 L105 105 Z"
        fill="rgba(255,255,255,0.18)"
      />
      <rect
        x="115"
        y="135"
        width="70"
        height="120"
        fill="rgba(255,255,255,0.92)"
        stroke="rgba(0,0,0,0.05)"
      />
    </g>
  )
}

function RoundedBottle({ color }: { color: string }) {
  return (
    <g>
      <rect x="115" y="55" width="70" height="35" rx="3" fill="#1a1612" stroke="#2a241b" />
      <rect x="125" y="40" width="50" height="18" rx="2" fill="#4a3d2b" />
      <path
        d="M150 90 C 90 90, 60 160, 60 220 C 60 290, 100 325, 150 325 C 200 325, 240 290, 240 220 C 240 160, 210 90, 150 90 Z"
        fill={color}
      />
      <path
        d="M150 90 C 90 90, 60 160, 60 220 C 60 230, 60 235, 65 245 C 75 220, 100 200, 150 200 C 200 200, 225 220, 235 245 C 240 235, 240 230, 240 220 C 240 160, 210 90, 150 90 Z"
        fill="rgba(255,255,255,0.16)"
      />
      <ellipse
        cx="150"
        cy="225"
        rx="65"
        ry="55"
        fill="rgba(255,255,255,0.92)"
      />
    </g>
  )
}

function SquareBottle({ color }: { color: string }) {
  return (
    <g>
      <rect x="120" y="55" width="60" height="35" rx="2" fill="#1a1612" stroke="#2a241b" />
      <rect x="130" y="40" width="40" height="18" rx="2" fill="#4a3d2b" />
      <rect x="80" y="90" width="140" height="235" fill={color} />
      <rect x="80" y="90" width="140" height="12" fill="rgba(255,255,255,0.2)" />
      <rect
        x="100"
        y="135"
        width="100"
        height="155"
        fill="rgba(255,255,255,0.92)"
      />
    </g>
  )
}

export default function BottlePreview({
  shape,
  color,
  engravingLine1,
  engravingLine2,
  volume,
}: BottlePreviewProps) {
  const Bottle = shape === 'rounded' ? RoundedBottle : shape === 'square' ? SquareBottle : ClassicBottle

  const labelX = 150
  const labelLine1Y = shape === 'rounded' ? 220 : 185
  const labelLine2Y = labelLine1Y + 22
  const labelMetaY = shape === 'rounded' ? 268 : 235

  return (
    <svg
      viewBox="0 0 300 360"
      className="h-full w-full"
      role="img"
      aria-label="Bespoke bottle preview"
    >
      <defs>
        <linearGradient id="bespoke-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1612" />
          <stop offset="100%" stopColor="#0a0a08" />
        </linearGradient>
      </defs>

      <rect width="300" height="360" fill="url(#bespoke-bg)" />

      <Bottle color={color} />

      {/* Engraving */}
      <text
        x={labelX}
        y={labelLine1Y}
        textAnchor="middle"
        fill="#1a1612"
        className="font-display"
        fontSize="15"
        fontStyle="italic"
      >
        {engravingLine1 || 'Your Name'}
      </text>
      {engravingLine2 && (
        <text
          x={labelX}
          y={labelLine2Y}
          textAnchor="middle"
          fill="#5C4E38"
          fontSize="9"
          letterSpacing="1.5"
        >
          {engravingLine2.toUpperCase()}
        </text>
      )}
      <text
        x={labelX}
        y={labelMetaY}
        textAnchor="middle"
        fill="#5C4E38"
        fontSize="8"
        letterSpacing="2"
      >
        {volume}ML · EDP
      </text>
    </svg>
  )
}

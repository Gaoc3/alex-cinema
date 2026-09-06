const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgBanner = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1324" />
      <stop offset="50%" stop-color="#060811" />
      <stop offset="100%" stop-color="#030408" />
    </linearGradient>

    <!-- Radial Red Glow -->
    <radialGradient id="redGlow" cx="50%" cy="42%" r="50%">
      <stop offset="0%" stop-color="#e50914" stop-opacity="0.38" />
      <stop offset="60%" stop-color="#e50914" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#e50914" stop-opacity="0" />
    </radialGradient>

    <!-- Primary Red Gradient -->
    <linearGradient id="primary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff2a34" />
      <stop offset="50%" stop-color="#e50914" />
      <stop offset="100%" stop-color="#9b0008" />
    </linearGradient>

    <!-- Metallic Silver Gradient -->
    <linearGradient id="silver" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#a1a1aa" />
    </linearGradient>

    <!-- Drop Shadow -->
    <filter id="shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="640" height="360" fill="url(#bg)" />
  
  <!-- Red Ambient Glow -->
  <rect width="640" height="360" fill="url(#redGlow)" />
  
  <!-- Subtle decorative rings -->
  <circle cx="320" cy="140" r="110" fill="none" stroke="rgba(229,9,20,0.2)" stroke-width="1.5" stroke-dasharray="6 6" />

  <!-- Center Emblem -->
  <g transform="translate(320, 135)" filter="url(#shadow)">
    <circle cx="0" cy="0" r="68" fill="#0d1628" stroke="url(#primary)" stroke-width="3" />
    <circle cx="0" cy="0" r="62" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1" />

    <!-- 'A' Monogram inside Emblem -->
    <g transform="translate(-32, -38) scale(0.25)">
      <!-- 'A' Left Diagonal -->
      <path d="M 110 0 L 160 0 L 70 270 L 20 270 Z" fill="url(#silver)" />
      
      <!-- 'A' Right Diagonal / Play Shape -->
      <path d="M 140 0 L 300 135 L 140 270 L 90 270 L 230 135 L 90 0 Z" fill="url(#primary)" />
      
      <!-- Crossbar -->
      <path d="M 60 170 L 180 170 L 170 210 L 45 210 Z" fill="url(#silver)" />
    </g>
  </g>

  <!-- ALEX CINEMA Title -->
  <text x="320" y="248" font-family="'Segoe UI', Arial, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4">
    ALEX <tspan fill="#e50914">CINEMA</tspan>
  </text>

  <!-- Arabic Subtitle -->
  <text x="320" y="280" font-family="'Cairo', Arial, sans-serif" font-size="14" font-weight="700" fill="#94a3b8" text-anchor="middle">
    المنصة الأولى لمشاهدة الأفلام والمسلسلات بجودة عالية
  </text>

  <!-- 4K ULTRA HD Badge Pill -->
  <g transform="translate(320, 312)">
    <rect x="-60" y="-12" width="120" height="24" rx="12" fill="rgba(229,9,20,0.2)" stroke="rgba(229,9,20,0.5)" stroke-width="1" />
    <text x="0" y="4" font-family="'Segoe UI', sans-serif" font-size="10" font-weight="800" fill="#fca5a5" text-anchor="middle" letter-spacing="2">
      4K ULTRA HD
    </text>
  </g>
</svg>
`;

async function generateCover() {
  const outputPath = path.join(__dirname, 'public', 'bot-cover-640x360.png');
  const buffer = Buffer.from(svgBanner);

  await sharp(buffer)
    .resize(640, 360)
    .png({ quality: 100 })
    .toFile(outputPath);

  console.log('Successfully generated 640x360 cover at:', outputPath);
}

generateCover().catch(console.error);

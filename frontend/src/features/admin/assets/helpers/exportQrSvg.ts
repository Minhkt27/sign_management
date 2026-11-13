import qr from 'qr.js';
import { Asset, Location } from '@/shared/types';

export interface QrSvgExportOptions {
  assets: Asset[];
  locations?: Location[];
  baseUrl: string;
  groupByFloor?: boolean;
  columns?: number;
  cardWidth?: number;
  cardHeight?: number;
  qrSize?: number;
  padding?: number;
  gap?: number;
  floorGap?: number;
  includeAssetCode?: boolean;
  includeLocation?: boolean;
}

export interface FloorGroup {
  floorId: number | null;
  floorName: string;
  assets: Asset[];
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text: string, maxCharsPerLine = 20, maxLines = 2): string[] {
  const clean = (text || '').trim();
  if (!clean) return ['(Chưa đặt tên)'];
  if (clean.length <= maxCharsPerLine) return [clean];

  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= maxCharsPerLine) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        break;
      }
    }
  }

  if (current) {
    if (lines.length < maxLines) {
      const remainingWords = words.slice(lines.join(' ').split(/\s+/).length);
      const remainingText = remainingWords.join(' ');
      if (remainingText.length > maxCharsPerLine) {
        lines.push(remainingText.slice(0, maxCharsPerLine - 1) + '…');
      } else if (remainingText) {
        lines.push(remainingText);
      } else {
        lines.push(current);
      }
    }
  }

  if (lines.length === 0) {
    lines.push(clean.slice(0, maxCharsPerLine - 1) + '…');
  }

  return lines;
}

export function getFloorInfo(
  asset: Asset,
  locations: Location[] = []
): { id: number | null; name: string } {
  if (!asset.location?.id) {
    return { id: null, name: 'Chưa phân tầng' };
  }

  // Walk up ancestor chain
  const chain: Location[] = [];
  let currentId: number | null = asset.location.id;
  const visited = new Set<number>();

  while (currentId !== null && currentId !== undefined && !visited.has(currentId)) {
    visited.add(currentId);
    const found = locations.find((loc) => loc.id === currentId);
    if (!found) {
      if (asset.location && asset.location.id === currentId) {
        chain.unshift(asset.location);
      }
      break;
    }
    chain.unshift(found);
    currentId = found.parentId;
  }

  if (chain.length === 0) {
    if (asset.location.name) {
      return { id: asset.location.id, name: asset.location.name };
    }
    return { id: null, name: 'Chưa phân tầng' };
  }

  // Look for location explicitly marked as 'FLOOR'
  const floorNode = chain.find((loc) => loc.type === 'FLOOR');
  const buildingNode =
    chain.find((loc) => loc.type === 'BUILDING') ||
    (chain.length > 0 && chain[0] !== floorNode ? chain[0] : null);

  if (floorNode) {
    const prefix = buildingNode ? `${buildingNode.name} - ` : '';
    return { id: floorNode.id, name: `${prefix}${floorNode.name}` };
  }

  // If hierarchy has at least 2 levels (e.g. Building -> Floor/Area)
  if (chain.length >= 2) {
    return { id: chain[1].id, name: `${chain[0].name} - ${chain[1].name}` };
  }

  // 1 node in chain
  const single = chain[0];
  return { id: single.id, name: single.name };
}

export function groupAssetsByFloor(
  assets: Asset[],
  locations: Location[] = []
): FloorGroup[] {
  const map = new Map<string, { floorId: number | null; assets: Asset[] }>();

  assets.forEach((asset) => {
    const { id, name } = getFloorInfo(asset, locations);
    const existing = map.get(name);
    if (existing) {
      existing.assets.push(asset);
    } else {
      map.set(name, { floorId: id, assets: [asset] });
    }
  });

  const keys = Array.from(map.keys()).sort((a, b) => {
    if (a === 'Chưa phân tầng') return 1;
    if (b === 'Chưa phân tầng') return -1;
    return a.localeCompare(b, 'vi', { numeric: true });
  });

  return keys.map((key) => {
    const item = map.get(key)!;
    return {
      floorId: item.floorId,
      floorName: key,
      assets: item.assets,
    };
  });
}

function renderCardSvg(
  asset: Asset,
  cardX: number,
  cardY: number,
  cardWidth: number,
  cardHeight: number,
  qrSize: number,
  cleanBase: string,
  includeAssetCode: boolean,
  includeLocation: boolean
): string {
  // Build URL to encode in QR
  const url = `${cleanBase}/scan/${encodeURIComponent(asset.assetCode)}${
    asset.hospitalId != null ? `?h=${asset.hospitalId}` : ''
  }`;

  // Generate QR matrix with UTF-8 byte encoding
  const utf8Bytes = Array.from(new TextEncoder().encode(url));
  const binaryString = utf8Bytes.map((b) => String.fromCharCode(b & 0xff)).join('');
  const qrObj = qr(binaryString, { errorCorrectLevel: qr.ErrorCorrectLevel.M });
  const modules: boolean[][] = qrObj.modules;
  const modCount = modules.length;

  // Run-length encoded horizontal paths for smaller file size and crisp rendering
  const pathParts: string[] = [];
  for (let r = 0; r < modCount; r++) {
    let c = 0;
    while (c < modCount) {
      if (modules[r][c]) {
        let run = 1;
        while (c + run < modCount && modules[r][c + run]) {
          run++;
        }
        pathParts.push(`M ${c} ${r} h ${run} v 1 h -${run} Z`);
        c += run;
      } else {
        c++;
      }
    }
  }
  const qrPathData = pathParts.join(' ');

  const qrX = cardX + (cardWidth - qrSize) / 2;
  const qrY = cardY + 16;
  const qrScale = (qrSize / modCount).toFixed(4);

  // Format text
  const nameLines = wrapText(asset.name || asset.assetCode, 22, 2);
  const nameYStart = qrY + qrSize + 22;

  const nameTspans = nameLines
    .map(
      (line, lineIdx) =>
        `<tspan x="${cardX + cardWidth / 2}" dy="${lineIdx === 0 ? 0 : 16}">${escapeXml(line)}</tspan>`
    )
    .join('');

  const codeY = nameYStart + (nameLines.length > 1 ? 26 : 20);
  const locationText = asset.location?.name || '';
  const locY = codeY + 16;

  return `
    <!-- Card: ${escapeXml(asset.assetCode)} -->
    <g id="card-${escapeXml(asset.assetCode)}">
      <!-- Card background & border -->
      <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="12" ry="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />

      <!-- QR background frame -->
      <rect x="${qrX - 6}" y="${qrY - 6}" width="${qrSize + 12}" height="${qrSize + 12}" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />

      <!-- QR Code vector path -->
      <g transform="translate(${qrX}, ${qrY}) scale(${qrScale})">
        <path d="${qrPathData}" fill="#0f172a" shape-rendering="crispEdges" />
      </g>

      <!-- Tên biển báo -->
      <text x="${cardX + cardWidth / 2}" y="${nameYStart}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a">
        ${nameTspans}
      </text>

      ${
        includeAssetCode
          ? `<!-- Mã biển báo -->
      <text x="${cardX + cardWidth / 2}" y="${codeY}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="11" font-weight="600" fill="#475569">
        ${escapeXml(asset.assetCode)}
      </text>`
          : ''
      }

      ${
        includeLocation && locationText
          ? `<!-- Vị trí -->
      <text x="${cardX + cardWidth / 2}" y="${locY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#64748b">
        ${escapeXml(locationText)}
      </text>`
          : ''
      }
    </g>`;
}

function renderFloorHeaderSvg(
  floorName: string,
  assetCount: number,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  const badgeWidth = String(assetCount).length * 8 + 68;
  return `
    <!-- Section: ${escapeXml(floorName)} -->
    <g class="floor-section-header">
      <!-- Background banner -->
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" ry="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
      <!-- Left color accent bar -->
      <rect x="${x}" y="${y}" width="7" height="${height}" rx="3.5" ry="3.5" fill="#4f46e5" />
      <!-- Floor Name -->
      <text x="${x + 22}" y="${y + 25}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#1e1b4b">
        ${escapeXml(floorName.toUpperCase())}
      </text>
      <!-- Subtitle badge: Count -->
      <rect x="${x + 22}" y="${y + 32}" width="${badgeWidth}" height="18" rx="9" fill="#eef2ff" stroke="#c7d2fe" stroke-width="1" />
      <text x="${x + 22 + badgeWidth / 2}" y="${y + 45}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="600" fill="#4338ca">
        ${assetCount} biển báo
      </text>
    </g>`;
}

export function generateQrGridSvg(options: QrSvgExportOptions): string {
  const {
    assets,
    locations = [],
    baseUrl,
    groupByFloor = true,
    columns = 4,
    cardWidth = 220,
    cardHeight = 280,
    qrSize = 160,
    padding = 24,
    gap = 20,
    floorGap = 44,
    includeAssetCode = true,
    includeLocation = false,
  } = options;

  if (assets.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="600" height="200">
  <rect width="100%" height="100%" fill="#f8fafc" />
  <text x="300" y="100" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="#64748b">
    Không có biển báo nào để xuất.
  </text>
</svg>`;
  }

  const effectiveColumns = Math.max(1, Math.min(columns, assets.length));
  const contentWidth = effectiveColumns * cardWidth + (effectiveColumns - 1) * gap;
  const totalWidth = padding * 2 + contentWidth;
  const cleanBase = baseUrl.trim().replace(/\/+$/, '');

  const elementsSvg: string[] = [];
  let totalHeight = 0;

  if (groupByFloor) {
    const floorGroups = groupAssetsByFloor(assets, locations);
    const headerHeight = 58;
    let currentY = padding;

    floorGroups.forEach((group) => {
      // 1. Render floor header banner
      elementsSvg.push(
        renderFloorHeaderSvg(
          group.floorName,
          group.assets.length,
          padding,
          currentY,
          contentWidth,
          headerHeight
        )
      );

      const cardsStartY = currentY + headerHeight + 16;

      // 2. Render cards grid for this floor
      group.assets.forEach((asset, idx) => {
        const col = idx % effectiveColumns;
        const row = Math.floor(idx / effectiveColumns);
        const cardX = padding + col * (cardWidth + gap);
        const cardY = cardsStartY + row * (cardHeight + gap);

        elementsSvg.push(
          renderCardSvg(
            asset,
            cardX,
            cardY,
            cardWidth,
            cardHeight,
            qrSize,
            cleanBase,
            includeAssetCode,
            includeLocation
          )
        );
      });

      const groupRows = Math.ceil(group.assets.length / effectiveColumns);
      const cardsHeight = groupRows * cardHeight + (groupRows - 1) * gap;
      currentY = cardsStartY + cardsHeight + floorGap;
    });

    totalHeight = currentY - floorGap + padding;
  } else {
    // Ungrouped flat grid
    const totalRows = Math.ceil(assets.length / effectiveColumns);
    totalHeight = padding * 2 + totalRows * cardHeight + (totalRows - 1) * gap;

    assets.forEach((asset, index) => {
      const col = index % effectiveColumns;
      const row = Math.floor(index / effectiveColumns);
      const cardX = padding + col * (cardWidth + gap);
      const cardY = padding + row * (cardHeight + gap);

      elementsSvg.push(
        renderCardSvg(
          asset,
          cardX,
          cardY,
          cardWidth,
          cardHeight,
          qrSize,
          cleanBase,
          includeAssetCode,
          includeLocation
        )
      );
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
  <title>Mã QR Biển Báo - Hospital Signage System</title>
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;display=swap');
      text { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
    </style>
  </defs>

  <!-- Sheet background -->
  <rect width="100%" height="100%" fill="#f1f5f9" />

  <!-- Content -->
  ${elementsSvg.join('\n')}
</svg>`;
}

export function downloadSvgFile(svgContent: string, filename: string): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

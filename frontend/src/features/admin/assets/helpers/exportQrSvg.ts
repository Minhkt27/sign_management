import qr from 'qr.js';
import { Asset } from '@/shared/types';

export interface QrSvgExportOptions {
  assets: Asset[];
  baseUrl: string;
  columns?: number;
  cardWidth?: number;
  cardHeight?: number;
  qrSize?: number;
  padding?: number;
  gap?: number;
  includeAssetCode?: boolean;
  includeLocation?: boolean;
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
      // Line fits or truncate remainder if too long
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

  // Fallback in case a single word was extremely long without spaces
  if (lines.length === 0) {
    lines.push(clean.slice(0, maxCharsPerLine - 1) + '…');
  }

  return lines;
}

export function generateQrGridSvg(options: QrSvgExportOptions): string {
  const {
    assets,
    baseUrl,
    columns = 4,
    cardWidth = 220,
    cardHeight = 280,
    qrSize = 160,
    padding = 24,
    gap = 20,
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
  const totalRows = Math.ceil(assets.length / effectiveColumns);
  const totalWidth = padding * 2 + effectiveColumns * cardWidth + (effectiveColumns - 1) * gap;
  const totalHeight = padding * 2 + totalRows * cardHeight + (totalRows - 1) * gap;

  const cleanBase = baseUrl.trim().replace(/\/+$/, '');

  const cardsSvg: string[] = [];

  assets.forEach((asset, index) => {
    const col = index % effectiveColumns;
    const row = Math.floor(index / effectiveColumns);
    const cardX = padding + col * (cardWidth + gap);
    const cardY = padding + row * (cardHeight + gap);

    // Build URL to encode in QR
    const url = `${cleanBase}/scan/${encodeURIComponent(asset.assetCode)}${
      asset.hospitalId != null ? `?h=${asset.hospitalId}` : ''
    }`;

    // Generate QR matrix with UTF-8 byte encoding
    const utf8Bytes = Array.from(new TextEncoder().encode(url));
    const binaryString = utf8Bytes.map(b => String.fromCharCode(b & 0xff)).join('');
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

    cardsSvg.push(`
    <!-- Card ${index + 1}: ${escapeXml(asset.assetCode)} -->
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
    </g>`);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
  <title>Mã QR Biển Báo - Hospital Signage System</title>
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;display=swap');
      text { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    </style>
  </defs>

  <!-- Sheet background -->
  <rect width="100%" height="100%" fill="#f1f5f9" />

  <!-- Asset QR Cards -->
  ${cardsSvg.join('\n')}
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

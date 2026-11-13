// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { generateQrGridSvg } from '../exportQrSvg';
import { Asset } from '@/shared/types';

describe('exportQrSvg helper', () => {
  const mockLocation = {
    id: 10,
    name: 'Tầng 1 - Khu A',
    parentId: null,
  };

  const mockAssets: Asset[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      assetCode: 'BB-KHAM-01',
      name: 'Phòng khám Nội tổng quát',
      hospitalId: 1,
      status: 'ACTIVE',
      material: 'MICA',
      size: '30x40cm',
      location: mockLocation,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      assetCode: 'BB-CC-02',
      name: 'Khoa Cấp Cứu & Hồi Sức Tích Cực (24/7)',
      hospitalId: 1,
      status: 'ACTIVE',
      material: 'ALU',
      size: '50x70cm',
      location: mockLocation,
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      assetCode: 'BB-XN-03',
      name: 'Phòng Xét Nghiệm Máu <Đặc Biệt> & Test',
      hospitalId: 1,
      status: 'ACTIVE',
      material: 'MICA',
      size: '40x60cm',
      location: mockLocation,
    },
  ];

  it('renders a fallback message when asset list is empty', () => {
    const svg = generateQrGridSvg({
      assets: [],
      baseUrl: 'http://localhost:5173',
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('Không có biển báo nào để xuất.');
  });

  it('generates a valid SVG document with cards for each asset', () => {
    const svg = generateQrGridSvg({
      assets: mockAssets,
      baseUrl: 'https://bv-dakhoa.vn',
      columns: 2,
      includeAssetCode: true,
      includeLocation: true,
    });

    // Check root SVG structure
    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('</svg>');

    // Check each card exists
    expect(svg).toContain('id="card-BB-KHAM-01"');
    expect(svg).toContain('id="card-BB-CC-02"');
    expect(svg).toContain('id="card-BB-XN-03"');

    // Check sign names appear in the SVG
    expect(svg).toContain('Phòng khám Nội');
    expect(svg).toContain('Khoa Cấp Cứu');

    // Check asset codes appear
    expect(svg).toContain('BB-KHAM-01');
    expect(svg).toContain('BB-CC-02');
    expect(svg).toContain('BB-XN-03');

    // Check location appears when enabled
    expect(svg).toContain('Tầng 1 - Khu A');

    // Check QR code vector paths are rendered
    expect(svg).toContain('shape-rendering="crispEdges"');
  });

  it('properly escapes XML special characters in sign name and code', () => {
    const svg = generateQrGridSvg({
      assets: [mockAssets[2]], // has "<Đặc Biệt> & Test"
      baseUrl: 'https://bv-dakhoa.vn',
    });

    // Should escape '&' and '<' and '>'
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&lt;Đặc Biệt&gt;');
    // Should NOT contain unescaped dangerous tags
    expect(svg).not.toContain('<Đặc Biệt>');
  });

  it('respects columns configuration and calculates viewBox correctly', () => {
    const svg = generateQrGridSvg({
      assets: mockAssets,
      baseUrl: 'https://bv-dakhoa.vn',
      columns: 3,
      cardWidth: 200,
      cardHeight: 250,
      padding: 20,
      gap: 10,
    });

    // Total width = 20*2 + 3*200 + 2*10 = 40 + 600 + 20 = 660
    // Total rows = ceil(3 / 3) = 1 row
    // Total height = 20*2 + 1*250 + 0 = 290
    expect(svg).toContain('viewBox="0 0 660 290"');
    expect(svg).toContain('width="660"');
    expect(svg).toContain('height="290"');
  });
});

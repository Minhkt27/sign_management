// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { generateQrGridSvg, groupAssetsByFloor, getFloorInfo } from '../exportQrSvg';
import { Asset, Location } from '@/shared/types';

describe('exportQrSvg helper', () => {
  const mockLocations: Location[] = [
    { id: 1, name: 'Tòa nhà A', type: 'BUILDING', parentId: null },
    { id: 2, name: 'Tầng 1', type: 'FLOOR', parentId: 1 },
    { id: 3, name: 'Phòng 101', type: 'ROOM', parentId: 2 },
    { id: 4, name: 'Tầng 2', type: 'FLOOR', parentId: 1 },
    { id: 5, name: 'Phòng 201', type: 'ROOM', parentId: 4 },
  ];

  const mockAssets: Asset[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      assetCode: 'BB-KHAM-01',
      name: 'Phòng khám Nội tổng quát',
      hospitalId: 1,
      status: 'ACTIVE',
      material: 'MICA',
      size: '30x40cm',
      location: mockLocations[2], // Room 101 in Floor 1
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      assetCode: 'BB-CC-02',
      name: 'Khoa Cấp Cứu & Hồi Sức Tích Cực (24/7)',
      hospitalId: 1,
      status: 'ACTIVE',
      material: 'ALU',
      size: '50x70cm',
      location: mockLocations[4], // Room 201 in Floor 2
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      assetCode: 'BB-XN-03',
      name: 'Phòng Xét Nghiệm Máu <Đặc Biệt> & Test',
      hospitalId: 1,
      status: 'ACTIVE',
      material: 'MICA',
      size: '40x60cm',
      location: mockLocations[2], // Room 101 in Floor 1
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

  it('resolves floor hierarchy accurately with getFloorInfo', () => {
    const info1 = getFloorInfo(mockAssets[0], mockLocations);
    expect(info1.name).toBe('Tòa nhà A - Tầng 1');

    const info2 = getFloorInfo(mockAssets[1], mockLocations);
    expect(info2.name).toBe('Tòa nhà A - Tầng 2');

    const unassignedAsset = { ...mockAssets[0], location: { id: 999, name: 'Khu vực lạ', parentId: null } };
    const info3 = getFloorInfo(unassignedAsset, mockLocations);
    expect(info3.name).toBe('Khu vực lạ');
  });

  it('groups assets by floor in natural order', () => {
    const groups = groupAssetsByFloor(mockAssets, mockLocations);
    expect(groups.length).toBe(2);
    expect(groups[0].floorName).toBe('Tòa nhà A - Tầng 1');
    expect(groups[0].assets.length).toBe(2);
    expect(groups[1].floorName).toBe('Tòa nhà A - Tầng 2');
    expect(groups[1].assets.length).toBe(1);
  });

  it('generates a valid SVG document with floor header sections when groupByFloor is true', () => {
    const svg = generateQrGridSvg({
      assets: mockAssets,
      locations: mockLocations,
      baseUrl: 'https://bv-dakhoa.vn',
      groupByFloor: true,
      columns: 2,
      includeAssetCode: true,
      includeLocation: true,
    });

    // Check root SVG structure
    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('</svg>');

    // Check floor headers exist
    expect(svg).toContain('class="floor-section-header"');
    expect(svg).toContain('TÒA NHÀ A - TẦNG 1');
    expect(svg).toContain('TÒA NHÀ A - TẦNG 2');
    expect(svg).toContain('2 biển báo');
    expect(svg).toContain('1 biển báo');

    // Check each card exists
    expect(svg).toContain('id="card-BB-KHAM-01"');
    expect(svg).toContain('id="card-BB-CC-02"');
    expect(svg).toContain('id="card-BB-XN-03"');

    // Check sign names appear in the SVG
    expect(svg).toContain('Phòng khám Nội');
    expect(svg).toContain('Khoa Cấp Cứu');

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

  it('respects flat layout when groupByFloor is false', () => {
    const svg = generateQrGridSvg({
      assets: mockAssets,
      baseUrl: 'https://bv-dakhoa.vn',
      groupByFloor: false,
      columns: 3,
      cardWidth: 200,
      cardHeight: 250,
      padding: 20,
      gap: 10,
    });

    // When flat: Total width = 20*2 + 3*200 + 2*10 = 660, Total height = 20*2 + 1*250 = 290
    expect(svg).toContain('viewBox="0 0 660 290"');
    expect(svg).toContain('width="660"');
    expect(svg).toContain('height="290"');
    expect(svg).not.toContain('class="floor-section-header"');
  });
});

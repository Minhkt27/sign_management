import { describe, it, expect } from 'vitest';
import {
  ASSET_IMAGE_OPTIONS,
  FLOOR_MAP_IMAGE_OPTIONS,
  compressImage,
} from '../imageCompression';

/**
 * jsdom không có canvas thật nên không kiểm được kết quả nén. Bộ test này phủ các nhánh
 * quyết định TRƯỚC khi đụng tới canvas — đó cũng là nơi dễ sai: bỏ sót một nhánh là ảnh bị
 * biến dạng hoặc bị máy chủ từ chối.
 */
const makeFile = (name: string, type: string, sizeBytes: number): File => {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
};

describe('compressImage', () => {
  it('giữ nguyên file nhỏ — nén thêm chẳng được bao nhiêu', async () => {
    const small = makeFile('bien-bao.jpg', 'image/jpeg', 100 * 1024);

    const result = await compressImage(small, ASSET_IMAGE_OPTIONS);

    expect(result).toBe(small);
  });

  // SVG là ảnh vector; vẽ qua canvas sẽ raster hoá và mất hết ưu điểm của nó.
  it('không đụng vào SVG', async () => {
    const svg = makeFile('so-do.svg', 'image/svg+xml', 2 * 1024 * 1024);

    const result = await compressImage(svg, FLOOR_MAP_IMAGE_OPTIONS);

    expect(result).toBe(svg);
  });

  it('không đụng vào file không phải ảnh', async () => {
    const pdf = makeFile('tai-lieu.pdf', 'application/pdf', 5 * 1024 * 1024);

    const result = await compressImage(pdf, ASSET_IMAGE_OPTIONS);

    expect(result).toBe(pdf);
  });

  // Ảnh hỏng hoặc trình duyệt không dựng được canvas thì vẫn phải tải lên được ảnh gốc —
  // nén là tối ưu hoá, không phải điều kiện để dùng hệ thống.
  //
  // Test này từng làm lộ một lỗi thật: bản đầu tiên không có hạn chờ, nên khi trình duyệt
  // không bắn cả onload lẫn onerror thì lời hứa treo vĩnh viễn và nút tải lên đứng im.
  it('trả về file gốc khi không giải mã được ảnh, không treo và không ném lỗi', async () => {
    const broken = makeFile('hong.jpg', 'image/jpeg', 4 * 1024 * 1024);

    const result = await compressImage(broken, { ...ASSET_IMAGE_OPTIONS, loadTimeoutMs: 50 });

    expect(result).toBe(broken);
  });

  it('sơ đồ tầng được để nét hơn ảnh biển báo', () => {
    expect(FLOOR_MAP_IMAGE_OPTIONS.maxDimension)
      .toBeGreaterThan(ASSET_IMAGE_OPTIONS.maxDimension);
    expect(FLOOR_MAP_IMAGE_OPTIONS.quality)
      .toBeGreaterThan(ASSET_IMAGE_OPTIONS.quality);
  });
});

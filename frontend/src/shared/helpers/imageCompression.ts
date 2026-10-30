/**
 * Nén ảnh ngay trên trình duyệt trước khi tải lên.
 *
 * Ảnh chụp bằng điện thoại thường 4–5 MB, trong khi để nhìn một biển báo trên màn hình thì
 * vài trăm KB là đủ. Nén trước khi gửi giúp ba việc cùng lúc: kho ảnh nhỏ đi khoảng mười lần,
 * bản sao lưu nhẹ theo, và kỹ thuật viên đứng ngoài hành lang bằng 4G không phải chờ tải lên
 * cả tấm ảnh gốc.
 *
 * Dùng Canvas có sẵn của trình duyệt, không thêm thư viện.
 */

export interface CompressOptions {
  /** Cạnh dài nhất sau khi thu nhỏ (giữ nguyên tỉ lệ). */
  maxDimension: number;
  /** Chất lượng JPEG, 0–1. */
  quality: number;
  /** File nhỏ hơn mức này thì giữ nguyên — nén thêm chẳng được bao nhiêu. */
  skipBelowBytes: number;
  /**
   * Hạn chờ giải mã ảnh.
   *
   * Bắt buộc phải có: nếu trình duyệt không bắn cả onload lẫn onerror (file hỏng theo kiểu
   * lạ, hết bộ nhớ), lời hứa sẽ treo vĩnh viễn và nút tải lên đứng im mà không báo gì. Quá
   * hạn thì bỏ nén, gửi thẳng ảnh gốc.
   */
  loadTimeoutMs?: number;
}

const DEFAULT_LOAD_TIMEOUT_MS = 10_000;

export const ASSET_IMAGE_OPTIONS: CompressOptions = {
  maxDimension: 1600,
  quality: 0.8,
  skipBelowBytes: 300 * 1024,
};

/**
 * Sơ đồ tầng để rộng hơn và nét hơn: quản trị viên đặt điểm lên đúng vị trí trên ảnh này,
 * còn bệnh nhân thì phóng to để dò đường — mờ một chút là hỏng cả hai việc.
 */
export const FLOOR_MAP_IMAGE_OPTIONS: CompressOptions = {
  maxDimension: 2400,
  quality: 0.85,
  skipBelowBytes: 500 * 1024,
};

/** Đổi đuôi tên file thành .jpg. */
function toJpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  return `${base || 'image'}.jpg`;
}

function loadImage(file: File, timeoutMs: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    const done = (fn: () => void) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      fn();
    };
    const timer = setTimeout(
      () => done(() => reject(new Error('Quá hạn giải mã ảnh'))),
      timeoutMs,
    );

    img.onload = () => done(() => resolve(img));
    img.onerror = () => done(() => reject(new Error('Không đọc được ảnh')));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Trả về file đã nén, hoặc chính file gốc khi không nén được / nén không có lợi.
 *
 * Không bao giờ ném lỗi: nén là tối ưu hoá, hỏng thì tải ảnh gốc lên vẫn hơn là chặn người
 * dùng lại giữa chừng.
 */
export async function compressImage(file: File, options: CompressOptions): Promise<File> {
  // SVG là ảnh vector — vẽ qua canvas sẽ biến nó thành ảnh raster, mất hết ưu điểm.
  // (Máy chủ hiện cũng không nhận SVG nữa, đây chỉ là lớp phòng thủ.)
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  if (file.size <= options.skipBelowBytes) return file;

  try {
    const img = await loadImage(file, options.loadTimeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS);
    const scale = Math.min(1, options.maxDimension / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // JPEG không có kênh trong suốt: phần trong suốt của PNG sẽ thành đen nếu không tô nền
    // trước. Sơ đồ tầng dạng PNG nền trong suốt là trường hợp gặp thật.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, options.quality);
    if (!blob || blob.size >= file.size) return file;

    // Tên file phải đổi sang .jpg: máy chủ kiểm tra phần mở rộng có khớp định dạng thật hay
    // không, nên giữ tên .png cho nội dung JPEG sẽ bị từ chối.
    return new File([blob], toJpegName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

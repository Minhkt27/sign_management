import { MapNode } from '@/shared/types';
import { assetService } from '@/services/assetService';
import { mapService } from '@/services/mapService';

// Chấp nhận cả URL đầy đủ (nhiều pattern lịch sử: /scan/, /tech/assets/, /assets/) lẫn mã thô không phải URL.
export function extractAssetCode(raw: string): string | null {
  const match = raw.match(/\/(?:scan|tech\/assets|assets)\/([^/?#]+)/);
  if (match) return match[1];

  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    return raw.trim();
  }
  return null;
}

export async function resolveAssetCodeToNode(assetCode: string): Promise<{ node: MapNode; label: string }> {
  const asset = await assetService.getAssetByCode(assetCode);
  if (!asset) throw new Error('Không tìm thấy mã tài sản');

  const node = await mapService.getNodeByAsset(asset.id);
  if (!node) throw new Error('Mã tài sản không được gắn trên bản đồ');

  const label = node.label || asset.name || asset.location?.name || 'Vị trí của bạn';
  return { node, label };
}

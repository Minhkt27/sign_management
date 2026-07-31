import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assetService } from '@/services/assetService';
import { mapService } from '@/services/mapService';
import { HOSPITAL_ID_STORAGE_KEY } from '@/app/store/authStore';

export default function PatientScanPage() {
  const { assetCode } = useParams<{ assetCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // QR mang sẵn hospitalId qua ?h=; mặc định về viện 1 nếu thiếu (QR cũ đã in trước Phase 4).
  // Set đồng bộ trong thân component (không phải useEffect) để đảm bảo sessionStorage đã có
  // giá trị TRƯỚC khi apiClient interceptor xử lý request getAssetByCode bên dưới.
  const hospitalIdParam = searchParams.get('h') || '1';
  if (sessionStorage.getItem(HOSPITAL_ID_STORAGE_KEY) !== hospitalIdParam) {
    sessionStorage.setItem(HOSPITAL_ID_STORAGE_KEY, hospitalIdParam);
  }

  const { data: asset, isError: assetError } = useQuery({
    queryKey: ['public-asset', assetCode],
    queryFn: () => assetService.getAssetByCode(assetCode!),
    enabled: !!assetCode,
    retry: false,
  });

  const { data: node, isError: nodeError } = useQuery({
    queryKey: ['nodeByAsset', asset?.id],
    queryFn: () => mapService.getNodeByAsset(asset!.id),
    enabled: !!asset?.id,
    retry: false,
  });

  useEffect(() => {
    if (node) {
      const label = node.label || asset?.name || asset?.location?.name || 'Vị trí của bạn';
      let url = `/map?from=${node.id}&fromLabel=${encodeURIComponent(label)}`;
      
      const savedDest = localStorage.getItem('wayfinding_dest');
      if (savedDest) {
        url += `&dest=${savedDest}`;
      }
      
      navigate(url, { replace: true });
    } else if (assetError || nodeError) {
      navigate('/map', { replace: true });
    }
  }, [node, asset, assetError, nodeError, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#F2F7F3', fontFamily: "'Be Vietnam Pro', sans-serif" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#1A5C2A', borderTopColor: 'transparent' }} />
        <p className="text-sm font-medium" style={{ color: '#5A7A62' }}>Đang xác định vị trí...</p>
      </div>
    </div>
  );
}

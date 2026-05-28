import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '@/services/assetService';
import { fileService } from '@/services/fileService';

export function useAssetForm(onSuccess: () => void) {
  const queryClient = useQueryClient();

  const [assetCode, setAssetCode] = useState('');
  const [assetName, setAssetName] = useState('');
  const [description, setDescription] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | ''>('');
  const [selectedFloorId, setSelectedFloorId] = useState<number | ''>('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('');
  const [selectedSubRoomId, setSelectedSubRoomId] = useState<number | ''>('');
  const [signTypeId, setSignTypeId] = useState<number | undefined>(undefined);
  const [material, setMaterial] = useState<'MICA' | 'INOX' | 'LED' | 'ALU'>('MICA');
  const [size, setSize] = useState('40x30 cm');
  const [supplier, setSupplier] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const reset = () => {
    setAssetCode('');
    setAssetName('');
    setDescription('');
    setLocationDescription('');
    setAutoGenerateCode(true);
    setMaterial('MICA');
    setSize('40x30 cm');
    setSupplier('');
    setSignTypeId(undefined);
    setImageFile(null);
    setSelectedBuildingId('');
    setSelectedFloorId('');
    setSelectedRoomId('');
    setSelectedSubRoomId('');
  };

  const createMutation = useMutation({
    mutationFn: assetService.createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      reset();
      onSuccess();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalLocationId = selectedSubRoomId || selectedRoomId || selectedFloorId || selectedBuildingId;
    if (!finalLocationId) {
      alert('Vui lòng chọn vị trí lắp đặt.');
      return;
    }
    setIsUploading(true);
    try {
      let uploadedUrl = '';
      if (imageFile) {
        uploadedUrl = await fileService.uploadFile(imageFile);
      }
      createMutation.mutate({
        assetCode: autoGenerateCode ? '' : assetCode,
        name: assetName,
        description,
        locationDescription,
        locationId: Number(finalLocationId),
        signTypeId,
        material,
        size,
        status: 'ACTIVE',
        supplier,
        imageUrl: uploadedUrl,
        installedAt: new Date().toISOString(),
      });
    } catch {
      alert('Lỗi tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  return {
    assetCode, setAssetCode,
    assetName, setAssetName,
    description, setDescription,
    locationDescription, setLocationDescription,
    autoGenerateCode, setAutoGenerateCode,
    selectedBuildingId, setSelectedBuildingId,
    selectedFloorId, setSelectedFloorId,
    selectedRoomId, setSelectedRoomId,
    selectedSubRoomId, setSelectedSubRoomId,
    signTypeId, setSignTypeId,
    material, setMaterial,
    size, setSize,
    supplier, setSupplier,
    setImageFile,
    isSubmitting: isUploading || createMutation.isPending,
    handleSubmit,
  };
}

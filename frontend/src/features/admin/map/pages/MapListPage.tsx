
imgHeight: uploadedImage.height,
    });
  };

  const handleDelete = (floor: MapFloor) => {
    if (window.confirm('Xóa sơ đồ này và toàn bộ nodes/edges?')) {
      deleteMutation.mutate(floor.id);
    }
  };

  const getLocationName = (locationId: number) =>
    locations.find(l => l.id === locationId)?.name ?? `Location #${locationId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Sơ đồ</h1>
          <p className="text-slate-500 text-sm mt-1">Thiết lập sơ đồ mặt bằng và nodes dẫn đường</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm"
        >
          <Plus size={18} /> Tạo sơ đồ mới
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-slate-700">Tạo sơ đồ mới</h2>

          <div className="flex gap-3 max-w-xl">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Tòa nhà</label>
              <select
                value={buildingId}
                onChange={e => { setBuildingId(e.target.value); setLocationId(''); }}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Chọn tòa nhà —</option>
                {locations.filter(l => l.type === 'BUILDING').map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Tầng</label>
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                disabled={!buildingId}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">— Chọn tầng —</option>
                {locations
                  .filter(l => l.type === 'FLOOR' && l.parentId === Number(buildingId))
                  .map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Ảnh mặt bằng</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 border border-dashed border-slate-300 hover:border-blue-400 text-slate-600 hover:text-blue-600 px-4 py-3 rounded-xl text-sm transition-colors"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'Đang upload...' : 'Chọn ảnh mặt bằng'}
            </button>
            {uploadedImage && (
              <div className="mt-3">
                <img src={uploadedImage.url} alt="Preview" className="max-h-48 rounded-lg border border-slate-200" />
                <p className="text-xs text-slate-400 mt-1">{uploadedImage.width} × {uploadedImage.height}px</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={!locationId || !uploadedImage || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2 rounded-xl text-sm font-medium"
            >
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo sơ đồ'}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setUploadedImage(null); setLocationId(''); setBuildingId(''); }}
              className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-5 py-2 rounded-xl text-sm"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Floor list */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Đang tải...</div>
      ) : floors.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Map size={40} className="mx-auto mb-3 opacity-40" />
          <p>Chưa có sơ đồ nào. Tạo sơ đồ đầu tiên!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {floors.map(floor => (
            <div key={floor.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-slate-100 overflow-hidden">
                <img src={floor.imageUrl} alt="Mặt bằng" className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <p className="font-semibold text-slate-800">{getLocationName(floor.locationId)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{floor.imgWidth} × {floor.imgHeight}px</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate(`/admin/assets/tree/map/${floor.id}/edit`)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium py-2 rounded-lg"
                  >
                    <Pencil size={14} /> Chỉnh sửa
                  </button>
                  <button
                    onClick={() => handleDelete(floor)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

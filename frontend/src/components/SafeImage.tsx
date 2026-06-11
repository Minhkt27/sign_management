import { useState, useEffect } from "react";

export function SafeImage({ src, alt, className, style, onClick }: any) {
  const [blobUrl, setBlobUrl] = useState<string>("");

  useEffect(() => {
    if (!src) return;
    let isMounted = true;
    fetch(src, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(res => res.blob())
      .then(blob => {
        if (isMounted) setBlobUrl(URL.createObjectURL(blob));
      })
      .catch(err => console.error("SafeImage load error", err));
    return () => { isMounted = false; };
  }, [src]);

  if (!blobUrl) {
    return (
      <div className={`flex flex-col items-center justify-center animate-pulse bg-green-50/50 border border-green-100 rounded-xl min-h-[400px] w-full ${className}`} style={style}>
        <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-green-700">Đang tải bản đồ...</p>
        <p className="text-xs text-green-600/70 mt-1">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }
  return <img src={blobUrl} alt={alt} className={className} style={style} onClick={onClick} />;
}

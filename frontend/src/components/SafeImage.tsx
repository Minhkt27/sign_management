import { useState, useEffect, useRef } from "react";

interface SafeImageProps {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onLoad?: () => void;
}

export function SafeImage({ src, alt, className, style, onClick, onLoad: onLoadProp }: SafeImageProps) {
  const [loaded, setLoaded] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);

  const onLoadRef = useRef(onLoadProp);
  useEffect(() => {
    onLoadRef.current = onLoadProp;
  }, [onLoadProp]);

  // Reset when src changes so spinner re-shows for new image
  useEffect(() => { setLoaded(false); }, [src]);

  useEffect(() => {
    if (!src) {
      setLoaded(true);
      onLoadRef.current?.();
    } else if (imgRef.current?.complete) {
      setLoaded(true);
      onLoadRef.current?.();
    }
  }, [src]);

  return (
    <>
      {!loaded && (
        <div
          className={`flex flex-col items-center justify-center animate-pulse bg-green-50/50 border border-green-100 rounded-xl min-h-[400px] w-full ${className}`}
          style={style}
        >
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold text-green-700">Đang tải bản đồ...</p>
          <p className="text-xs text-green-600/70 mt-1">Vui lòng chờ trong giây lát</p>
        </div>
      )}
      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={className}
          style={loaded ? style : { ...style, opacity: 0, position: 'absolute', pointerEvents: 'none' }}
          onClick={onClick}
          onLoad={() => {
            setLoaded(true);
            onLoadProp?.();
          }}
          onError={() => {
            setLoaded(true);
            onLoadProp?.();
          }}
        />
      )}
    </>
  );
}

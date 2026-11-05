import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getGalleryImages, syncImagesFromSupabase, type GalleryImage } from '@/lib/galleryStore';




function splitColumns<T>(images: T[], n: number): T[][] {
  const cols: T[][] = Array.from({ length: n }, () => []);
  images.forEach((img, i) => cols[i % n].push(img));
  return cols;
}

interface AnimatedImageProps {
  alt: string;
  src: string;
  ratio: number;
  className?: string;
  onClick?: () => void;
}

function AnimatedImage({ alt, src, ratio, className, onClick }: AnimatedImageProps) {
  const ref = React.useRef(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [imgSrc, setImgSrc] = React.useState(src);

  return (
    <AspectRatio
      ref={ref}
      ratio={ratio}
      className={cn('group relative w-full cursor-zoom-in overflow-hidden rounded-xl border border-white/5 bg-white/5', className)}
      onClick={onClick}
    >
      <img
        alt={alt}
        src={imgSrc}
        className={cn(
          'size-full rounded-xl object-cover transition-all duration-700 ease-in-out opacity-0 group-hover:scale-105',
          { 'opacity-100': !isLoading }
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => setImgSrc('https://placehold.co/800x450/1a1a1a/E8A820?text=Muscle+Empire')}
        loading="lazy"
      />
      {/* hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-300 rounded-xl flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-xs font-semibold tracking-wide bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
          View
        </span>
      </div>
    </AspectRatio>
  );
}

function Lightbox({ images, index, onClose }: { images: { src: string; alt?: string }[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = React.useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const resetZoom = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };

  const prev = (e: React.MouseEvent) => { e.stopPropagation(); resetZoom(); setCurrent(i => (i - 1 + images.length) % images.length); };
  const next = (e: React.MouseEvent) => { e.stopPropagation(); resetZoom(); setCurrent(i => (i + 1) % images.length); };

  // keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { resetZoom(); setCurrent(i => (i - 1 + images.length) % images.length); }
      if (e.key === 'ArrowRight') { resetZoom(); setCurrent(i => (i + 1) % images.length); }
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 4));
      if (e.key === '-') setZoom(z => Math.max(z - 0.5, 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  // scroll to zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    setZoom(z => Math.min(Math.max(z - e.deltaY * 0.001, 1), 4));
  };

  // drag to pan when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.stopPropagation();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: dragStart.current.ox + e.clientX - dragStart.current.x, y: dragStart.current.oy + e.clientY - dragStart.current.y });
  };
  const handleMouseUp = () => setDragging(false);

  // double-click to toggle zoom
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 1) { resetZoom(); } else { setZoom(2); }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[300] bg-black flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => { if (zoom <= 1) onClose(); }}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button onClick={e => { e.stopPropagation(); setZoom(z => Math.max(z - 0.5, 1)); }} className="bg-white/10 hover:bg-white/20 text-white w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors">−</button>
        <span className="text-white/50 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={e => { e.stopPropagation(); setZoom(z => Math.min(z + 0.5, 4)); }} className="bg-white/10 hover:bg-white/20 text-white w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors">+</button>
        {zoom > 1 && <button onClick={e => { e.stopPropagation(); resetZoom(); }} className="bg-white/10 hover:bg-white/20 text-white/60 hover:text-white px-3 h-9 rounded-full text-xs uppercase tracking-widest transition-colors">Reset</button>}
        <button className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white p-2 rounded-full transition-colors ml-1" onClick={onClose}><X size={18} /></button>
      </div>

      <button className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors" onClick={prev}><ChevronLeft size={28} /></button>
      <button className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors" onClick={next}><ChevronRight size={28} /></button>

      {/* Image */}
      <div
        className="w-full h-full flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        <motion.img
          key={current}
          src={images[current].src.startsWith('data:') ? images[current].src : images[current].src.replace('w=800', 'w=1600')}
          alt={images[current].alt || `Gallery image ${current + 1}`}
          className="select-none"
          style={{
            width: '100vw',
            height: '100vh',
            objectFit: 'contain',
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
            transition: dragging ? 'none' : 'transform 0.15s ease',
          }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          onDoubleClick={handleDoubleClick}
          draggable={false}
        />
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-white/40 text-xs select-none">
        <span>{current + 1} / {images.length}</span>
        <span className="text-white/20">·</span>
        <span>Scroll to zoom · Double-click to toggle</span>
      </div>
    </motion.div>
  );
}

export function ImageGallery() {
  const [storeImages, setStoreImages] = useState<GalleryImage[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    // Render local cache instantly
    getGalleryImages().then(setStoreImages);
    // Force sync fresh from database
    syncImagesFromSupabase().then(setStoreImages);
    const handler = () => {
      getGalleryImages().then(setStoreImages);
    };
    window.addEventListener("galleryUpdated", handler);
    return () => window.removeEventListener("galleryUpdated", handler);
  }, []);

  // Convert to ratio-aware format — alternate portrait/landscape
  const images = storeImages.map((img, i) => ({
    ...img,
    ratio: i % 2 === 0 ? 16 / 9 : 9 / 16,
  }));

  const columns = splitColumns(images, 4);
  const getIndex = (col: number, row: number) => col + row * 4;

  return (
    <div className="relative w-full">
      <div className="mx-auto grid w-full max-w-7xl gap-3 sm:grid-cols-3 lg:grid-cols-4 px-5 md:px-8">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="grid gap-3">
            {col.map((img, rowIdx) => (
              <AnimatedImage
                key={img.id}
                alt={img.alt}
                src={img.src}
                ratio={img.ratio}
                onClick={() => setLightbox(getIndex(colIdx, rowIdx))}
              />
            ))}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {lightbox !== null && images[lightbox] && (
          <Lightbox images={images} index={lightbox} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

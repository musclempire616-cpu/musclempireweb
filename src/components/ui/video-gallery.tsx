import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Play, Volume2, VolumeX } from 'lucide-react';
import { getGalleryVideos, syncVideosFromSupabase, type GalleryVideo } from '@/lib/galleryStore';

function getYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/;
  const match = clean.match(regExp);
  if (match && match[1]) return match[1];

  try {
    const parsed = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
      const v = parsed.searchParams.get("v");
      if (v && v.length === 11) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && last.length === 11) return last;
    }
  } catch {}
  return null;
}

function getYoutubeEmbedUrl(url: string): string | null {
  const id = getYoutubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
}

function getYoutubeThumbnail(url: string): string | null {
  const id = getYoutubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

function getDriveEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  return getYoutubeEmbedUrl(url) || getDriveEmbedUrl(url);
}

function getThumbnail(url: string): string | null {
  if (!url) return null;
  return getYoutubeThumbnail(url);
}

interface VideoCardProps {
  video: GalleryVideo;
  onClick: () => void;
}

function VideoCard({ video, onClick }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const thumb = video.thumbnail || getThumbnail(video.src);
  const embedUrl = getEmbedUrl(video.src);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const isBase64 = video.src.startsWith('data:');
  const videoSrc = isBase64 ? video.src : (video.src.includes('#t=') ? video.src : `${video.src}#t=0.001`);

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-white/5 transition-all duration-300 hover:shadow-lg hover:shadow-[#E8A820]/5 hover:border-[#E8A820]/30 w-full"
    >
      {thumb ? (
        <div className="relative w-full bg-[#111] overflow-hidden">
          <img
            src={thumb}
            alt={video.alt}
            className="w-full h-auto block object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#E8A820]/90 text-black flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg shadow-[#E8A820]/20">
              <Play size={20} fill="currentColor" className="ml-0.5" />
            </div>
          </div>
        </div>
      ) : embedUrl ? (
        <div className="relative w-full aspect-video bg-[#161b22] flex flex-col items-center justify-center gap-2 overflow-hidden group-hover:bg-[#1c222b] transition-colors">
          <div className="w-12 h-12 rounded-full bg-[#E8A820]/90 text-black flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg shadow-[#E8A820]/20">
            <Play size={20} fill="currentColor" className="ml-0.5" />
          </div>
          <span className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">Watch Video</span>
        </div>
      ) : (
        <div className="relative w-full bg-black overflow-hidden">
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            playsInline
            loop
            preload="auto"
            className="w-full h-auto block object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
            <div className={cn(
              "w-12 h-12 rounded-full bg-black/50 text-white border border-white/10 flex items-center justify-center transition-all duration-300 group-hover:bg-[#E8A820]/90 group-hover:text-black group-hover:border-transparent group-hover:scale-110",
              isHovered ? "opacity-0" : "opacity-100"
            )}>
              <Play size={20} fill="currentColor" className="ml-0.5" />
            </div>
          </div>
        </div>
      )}
      <div className="p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent absolute bottom-0 inset-x-0">
        <p className="text-xs font-bold text-white tracking-wide truncate">{video.alt}</p>
      </div>
    </div>
  );
}

function VideoLightbox({ video, onClose }: { video: GalleryVideo; onClose: () => void }) {
  const embedUrl = getEmbedUrl(video.src);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-colors z-50 cursor-pointer"
        onClick={onClose}
      >
        <X size={20} />
      </button>

      <div
        className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={video.alt}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-[85vw] max-w-4xl aspect-video"
          />
        ) : (
          <div className="relative group">
            <video
              src={video.src}
              autoPlay
              controls
              loop
              playsInline
              muted={muted}
              className="max-h-[80vh] w-full h-auto object-contain"
            />
            <button
              onClick={() => setMuted(!muted)}
              className="absolute bottom-16 right-4 p-2.5 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/80 border border-white/10 transition-all opacity-0 group-hover:opacity-100"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-bold uppercase tracking-widest text-center max-w-md truncate px-4">
        {video.alt}
      </div>
    </motion.div>
  );
}

export function VideoGallery() {
  const [storeVideos, setStoreVideos] = useState<GalleryVideo[]>([]);
  const [activeVideo, setActiveVideo] = useState<GalleryVideo | null>(null);

  useEffect(() => {
    getGalleryVideos().then(setStoreVideos);
    syncVideosFromSupabase().then(setStoreVideos);
    const handler = () => {
      getGalleryVideos().then(setStoreVideos);
    };
    window.addEventListener("galleryUpdated", handler);
    return () => window.removeEventListener("galleryUpdated", handler);
  }, []);

  return (
    <div className="relative w-full">
      {storeVideos.length > 0 ? (
        <div className="mx-auto w-full max-w-7xl px-5 md:px-8 columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {storeVideos.map((vid) => (
            <div key={vid.id} className="break-inside-avoid mb-4">
              <VideoCard
                video={vid}
                onClick={() => setActiveVideo(vid)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-white/40 text-sm">No videos found. Check back later!</p>
        </div>
      )}

      <AnimatePresence>
        {activeVideo !== null && (
          <VideoLightbox video={activeVideo} onClose={() => setActiveVideo(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

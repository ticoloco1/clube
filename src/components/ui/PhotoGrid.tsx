'use client';
import { useState, useRef } from 'react';
import { X, Upload, GripVertical } from 'lucide-react';

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  onUpload: (files: FileList) => void;
  uploading?: boolean;
  max?: number;
}

export function PhotoGrid({ images, onChange, onUpload, uploading, max = 10 }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOver(i);
  };
  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const newImages = [...images];
    const [moved] = newImages.splice(dragIdx, 1);
    newImages.splice(i, 0, moved);
    onChange(newImages);
    setDragIdx(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOver(null); };
  const remove = (i: number) => onChange(images.filter((_, j) => j !== i));

  return (
    <div>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
        {images.map((img, i) => (
          <div key={i}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={e => handleDragOver(e, i)}
            onDrop={e => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
              dragOver === i ? 'border-brand scale-105' : 'border-[var(--border)]'
            } ${dragIdx === i ? 'opacity-40' : ''}`}>
            <img src={img} alt="" className="w-full h-full object-cover" />
            <div className="absolute top-1 left-1 bg-black/50 rounded-lg p-0.5">
              <GripVertical className="w-3 h-3 text-white" />
            </div>
            <button onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <X className="w-3 h-3 text-white" />
            </button>
            {i === 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-brand/80 text-white text-[9px] font-bold text-center py-0.5">
                COVER
              </div>
            )}
          </div>
        ))}

        {/* Upload slot */}
        {images.length < max && (
          <button onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-1 hover:border-brand hover:bg-brand/5 transition-all">
            {uploading
              ? <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              : <Upload className="w-4 h-4 text-[var(--text2)]" />
            }
            <span className="text-[10px] text-[var(--text2)]">{images.length}/{max}</span>
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { if (e.target.files) onUpload(e.target.files); e.target.value = ''; }} />

      {images.length > 1 && (
        <p className="text-xs text-[var(--text2)]">
          <GripVertical className="w-3 h-3 inline" /> Drag to reorder · First photo is cover
        </p>
      )}
    </div>
  );
}

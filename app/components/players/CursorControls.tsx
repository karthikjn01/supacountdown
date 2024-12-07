import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CursorControlsProps {
  onMoveCursor: (direction: 'left' | 'right') => void;
}

export function CursorControls({ onMoveCursor }: CursorControlsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onMoveCursor('left')}
        className="p-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400 transition-colors"
        aria-label="Move cursor left"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => onMoveCursor('right')}
        className="p-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400 transition-colors"
        aria-label="Move cursor right"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
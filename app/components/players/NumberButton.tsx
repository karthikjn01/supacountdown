import React from 'react';

interface NumberButtonProps {
  number: number;
  onClick: (number: number) => void;
  disabled: boolean;
}

export function NumberButton({ number, onClick, disabled }: NumberButtonProps) {
  return (
    <button
      onClick={() => onClick(number)}
      disabled={disabled}
      className={`
        p-3 rounded-lg text-lg font-semibold transition-all
        ${disabled 
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'}
      `}
    >
      {number}
    </button>
  );
}
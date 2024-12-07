import React from 'react';
import { Operation } from '../types/calculator';

interface OperatorButtonProps {
  operator: Operation;
  onClick: (operator: Operation) => void;
}

export function OperatorButton({ operator, onClick }: OperatorButtonProps) {
  return (
    <button
      onClick={() => onClick(operator)}
      className="p-3 rounded-lg text-lg font-semibold bg-gray-700 text-white hover:bg-gray-800 active:bg-gray-900 transition-all"
    >
      {operator}
    </button>
  );
}
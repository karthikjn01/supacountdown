import React from 'react';
import { Token } from '../types/calculator';

interface ExpressionDisplayProps {
  tokens: Token[];
}

export function ExpressionDisplay({ tokens }: ExpressionDisplayProps) {
  return (
    <div className="text-xl font-mono flex items-center gap-1 min-h-[2rem]">
      {tokens.map((token, index) => {
        if (token.type === 'cursor') {
          return (
            <div
              key={`cursor-${index}`}
              className="w-0.5 h-6 bg-blue-500 animate-pulse mx-0.5"
            />
          );
        }
        
        if (token.type === 'operation') {
          return (
            <span
              key={`op-${index}`}
              className="px-1 text-gray-700"
            >
              {token.value}
            </span>
          );
        }
        
        return (
          <span
            key={`num-${index}`}
            className="text-blue-600 font-semibold"
          >
            {token.value}
          </span>
        );
      })}
    </div>
  );
}
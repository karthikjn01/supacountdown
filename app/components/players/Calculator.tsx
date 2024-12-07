import React, { useState, useEffect } from 'react';
import { NumberButton } from './NumberButton';
import { OperatorButton } from './OperatorButton';
import { CursorControls } from './CursorControls';
import { ExpressionDisplay } from './ExpressionDisplay';
import { Token, Operation, evaluateExpression, balanceBrackets } from '~/types/calculator';

interface CalculatorProps {
  numbers: number[];
  target: number;
  onSubmit: (result: number, method: string) => Promise<void>;
}

export function Calculator({ numbers, target, onSubmit }: CalculatorProps) {
  const [availableNumbers] = useState(numbers);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [tokens, setTokens] = useState<Token[]>([{ type: 'cursor' }]);
  const [result, setResult] = useState<number | null>(null);

  const getCursorIndex = (): number => {
    return tokens.findIndex(token => token.type === 'cursor');
  };

  const handleNumberClick = (num: number, index: number) => {
    if (!usedIndices.has(index)) {
      const cursorIndex = getCursorIndex();
      const prevToken = tokens[cursorIndex - 1];

      const newTokens = [...tokens];
      const numberToken = { type: 'number' as const, value: num, index };

      if (prevToken?.type === 'number') {
        newTokens.splice(cursorIndex, 0,
          { type: 'operation', value: '*' },
          numberToken
        );
      } else {
        newTokens.splice(cursorIndex, 0, numberToken);
      }

      setTokens(newTokens);
      setUsedIndices(new Set([...usedIndices, index]));
    }
  };

  const handleOperatorClick = (operator: Operation) => {
    const cursorIndex = getCursorIndex();
    const newTokens = [...tokens];
    newTokens.splice(cursorIndex, 0, { type: 'operation', value: operator });
    setTokens(newTokens);
  };

  const handleBackspace = () => {
    const cursorIndex = getCursorIndex();
    if (cursorIndex > 0) {
      const tokenToRemove = tokens[cursorIndex - 1];
      const newTokens = [...tokens];

      if (tokenToRemove.type === 'number') {
        setUsedIndices(new Set([...usedIndices].filter(i => i !== tokenToRemove.index)));
      }

      newTokens.splice(cursorIndex - 1, 1);
      setTokens(newTokens);
    }
  };

  const handleClear = () => {
    setTokens([{ type: 'cursor' }]);
    setUsedIndices(new Set());
    setResult(null);
  };

  const handleMoveCursor = (direction: 'left' | 'right') => {
    const cursorIndex = getCursorIndex();
    const newTokens = [...tokens];
    newTokens.splice(cursorIndex, 1);

    let newIndex;
    if (direction === 'left') {
      newIndex = Math.max(0, cursorIndex - 1);
    } else {
      newIndex = Math.min(tokens.length - 1, cursorIndex + 1);
    }

    newTokens.splice(newIndex, 0, { type: 'cursor' });
    setTokens(newTokens);
  };

  useEffect(() => {
    const result = evaluateExpression(balanceBrackets(tokens));
    setResult(result);
  }, [tokens]);

  const handleSubmit = async () => {
    if (result !== null) {
      await onSubmit(result, tokens.filter(t => t.type !== 'cursor').map(t => t.value).join(' '));
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl shadow-lg p-6 w-full max-w-md mx-auto">
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <ExpressionDisplay tokens={tokens} />
        <div className="h-8 flex items-center justify-end text-lg text-gray-600 mt-2">
          {result !== null && `= ${result}`}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {numbers.map((num, index) => (
            <NumberButton
              key={num}
              number={num}
              onClick={() => handleNumberClick(num, index)}
              disabled={usedIndices.has(index)}
            />
          ))}
        </div>

        <div className="grid grid-cols-4 gap-3">
          {['+', '-', '*', '/'].map((op) => (
            <OperatorButton
              key={op}
              operator={op as Operation}
              onClick={handleOperatorClick}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <OperatorButton operator="(" onClick={handleOperatorClick} />
          <OperatorButton operator=")" onClick={handleOperatorClick} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleBackspace}
            className="p-3 rounded-lg text-lg font-semibold bg-red-500 text-white hover:bg-red-600 active:bg-red-700 transition-colors"
          >
            Backspace
          </button>
          <button
            onClick={handleClear}
            className="p-3 rounded-lg text-lg font-semibold bg-gray-500 text-white hover:bg-gray-600 active:bg-gray-700 transition-colors"
          >
            Clear
          </button>
        </div>

        <div className="flex justify-end">
          <CursorControls onMoveCursor={handleMoveCursor} />
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={handleSubmit}
          disabled={result === null}
          className="w-full p-3 rounded-lg text-lg font-semibold bg-green-500 text-white hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answer
        </button>
      </div>
    </div>
  );
}
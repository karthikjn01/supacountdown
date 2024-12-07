export type Operation = '+' | '-' | '*' | '/' | '(' | ')';

export interface NumberToken {
  type: 'number';
  index: number;
  value: number;
}

export interface OperationToken {
  type: 'operation';
  value: Operation;
}

export interface CursorToken {
  type: 'cursor';
}

export type Token = NumberToken | OperationToken | CursorToken;

export function isOperation(value: string): value is Operation {
  return ['+', '-', '*', '/', '(', ')'].includes(value);
}

export function balanceBrackets(tokens: Token[]): Token[] {
  const tokensWithoutCursor = tokens.filter(token => token.type !== 'cursor');
  let openBrackets = 0;
  
  // Count unmatched open brackets
  tokensWithoutCursor.forEach(token => {
    if (token.type === 'operation') {
      if (token.value === '(') openBrackets++;
      if (token.value === ')') openBrackets--;
    }
  });

  // Add closing brackets if needed
  const result = [...tokensWithoutCursor];
  while (openBrackets > 0) {
    result.push({ type: 'operation', value: ')' });
    openBrackets--;
  }

  return result;
}

export function evaluateExpression(tokens: Token[]): number | null {
  try {
    const expression = tokens
      .filter(token => token.type !== 'cursor')
      .map(token => token.type === 'number' ? token.value : token.value)
      .join(' ');
    
    if (!expression) return null;
    
    const result = new Function(`return ${expression}`)();
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
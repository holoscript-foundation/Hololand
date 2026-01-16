// HoloScript Parser - Lexer
export type TokenType =
  | 'ZONE'
  | 'ENTITY'
  | 'CREATE'
  | 'ON_CLICK'
  | 'ON_HOVER'
  | 'PLAY_SOUND'
  | 'POSITION'
  | 'MODEL'
  | 'COLOR'
  | 'ANIMATE'
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'STRING'
  | 'LBRACE'
  | 'RBRACE'
  | 'LPAREN'
  | 'RPAREN'
  | 'COLON'
  | 'COMMA'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const KEYWORDS: Record<string, TokenType> = {
  ZONE: 'ZONE',
  ENTITY: 'ENTITY',
  CREATE: 'CREATE',
  ON_CLICK: 'ON_CLICK',
  ON_HOVER: 'ON_HOVER',
  PLAY_SOUND: 'PLAY_SOUND',
  POSITION: 'POSITION',
  MODEL: 'MODEL',
  COLOR: 'COLOR',
  ANIMATE: 'ANIMATE',
};

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let line = 1;
  let column = 1;
  let i = 0;

  while (i < source.length) {
    const char = source[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      if (char === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
      i++;
      continue;
    }

    // Skip comments
    if (char === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      line++;
      column = 1;
      i++;
      continue;
    }

    // Strings
    if (char === '"') {
      let value = '';
      i++;
      column++;
      while (i < source.length && source[i] !== '"') {
        value += source[i];
        i++;
        column++;
      }
      i++; // Skip closing quote
      column++;
      tokens.push({ type: 'STRING', value, line, column });
      continue;
    }

    // Numbers
    if (/\d/.test(char)) {
      let value = '';
      while (i < source.length && /[\d.]/.test(source[i])) {
        value += source[i];
        i++;
        column++;
      }
      tokens.push({ type: 'NUMBER', value, line, column });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(char)) {
      let value = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
        value += source[i];
        i++;
        column++;
      }
      const type = KEYWORDS[value] || 'IDENTIFIER';
      tokens.push({ type: type as TokenType, value, line, column });
      continue;
    }

    // Symbols
    const symbolMap: Record<string, TokenType> = {
      '{': 'LBRACE',
      '}': 'RBRACE',
      '(': 'LPAREN',
      ')': 'RPAREN',
      ':': 'COLON',
      ',': 'COMMA',
    };

    if (symbolMap[char]) {
      tokens.push({ type: symbolMap[char], value: char, line, column });
      i++;
      column++;
      continue;
    }

    i++;
    column++;
  }

  tokens.push({ type: 'EOF', value: '', line, column });
  return tokens;
}

/**
 * @holoscript/core - Lexer
 *
 * Tokenizes HoloScript and HoloScript Plus source code.
 */

export enum TokenType {
  // Literals
  Number = 'Number',
  String = 'String',
  Boolean = 'Boolean',
  Null = 'Null',
  Color = 'Color',

  // Identifiers and Keywords
  Identifier = 'Identifier',
  Keyword = 'Keyword',

  // Operators
  Operator = 'Operator',
  Assignment = 'Assignment',
  Arrow = 'Arrow',

  // Delimiters
  OpenParen = 'OpenParen',
  CloseParen = 'CloseParen',
  OpenBrace = 'OpenBrace',
  CloseBrace = 'CloseBrace',
  OpenBracket = 'OpenBracket',
  CloseBracket = 'CloseBracket',
  Semicolon = 'Semicolon',
  Colon = 'Colon',
  Comma = 'Comma',
  Dot = 'Dot',

  // Special
  Comment = 'Comment',
  Newline = 'Newline',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  offset: number;
}

// Keywords for both .holo and .hsplus
const HOLO_KEYWORDS = [
  'orb', 'world', 'material', 'physics', 'audio', 'light', 'camera',
  'geometry', 'color', 'position', 'rotation', 'scale', 'texture',
];

const HSPLUS_KEYWORDS = [
  ...HOLO_KEYWORDS,
  // Variables
  'let', 'const',
  // Functions
  'fn', 'return', 'async', 'await',
  // Control flow
  'if', 'else', 'for', 'while', 'loop', 'break', 'continue', 'match',
  // Types
  'true', 'false', 'null',
  // Modules
  'import', 'export', 'from', 'as',
  // OOP-like
  'system', 'state', 'init', 'update', 'cleanup',
  // Macros
  'macro',
  // Other
  'in', 'of',
];

// Operators ordered by length (longest first for proper matching)
const OPERATORS = [
  // Assignment
  '+=', '-=', '*=', '/=', '%=', '&&=', '||=', '??=',
  // Comparison
  '===', '!==', '==', '!=', '<=', '>=', '<', '>',
  // Logical
  '&&', '||', '??', '!',
  // Arithmetic
  '**', '+', '-', '*', '/', '%',
  // Bitwise
  '&', '|', '^', '~', '<<', '>>',
  // Other
  '..', '.', '?', ':',
];

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private isHsPlus: boolean;
  private keywords: Set<string>;

  constructor(source: string, isHsPlus: boolean = true) {
    this.source = source;
    this.isHsPlus = isHsPlus;
    this.keywords = new Set(isHsPlus ? HSPLUS_KEYWORDS : HOLO_KEYWORDS);
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      column: this.column,
      offset: this.pos,
    });

    return this.tokens;
  }

  private scanToken(): void {
    this.skipWhitespace();
    if (this.isAtEnd()) return;

    const start = this.pos;
    const startLine = this.line;
    const startColumn = this.column;
    const char = this.peek();

    // Comments
    if (char === '/' && this.peekNext() === '/') {
      this.scanLineComment(start, startLine, startColumn);
      return;
    }

    if (char === '/' && this.peekNext() === '*') {
      this.scanBlockComment(start, startLine, startColumn);
      return;
    }

    // Strings
    if (char === '"' || char === "'") {
      this.scanString(char, start, startLine, startColumn);
      return;
    }

    // Template strings (hsplus only)
    if (char === '`' && this.isHsPlus) {
      this.scanTemplateString(start, startLine, startColumn);
      return;
    }

    // Numbers
    if (this.isDigit(char) || (char === '.' && this.isDigit(this.peekNext()))) {
      this.scanNumber(start, startLine, startColumn);
      return;
    }

    // Colors (#hex)
    if (char === '#') {
      this.scanColor(start, startLine, startColumn);
      return;
    }

    // Identifiers and keywords
    if (this.isAlpha(char) || char === '_') {
      this.scanIdentifier(start, startLine, startColumn);
      return;
    }

    // Arrow (=>)
    if (char === '=' && this.peekNext() === '>') {
      this.advance();
      this.advance();
      this.addToken(TokenType.Arrow, '=>', start, startLine, startColumn);
      return;
    }

    // Arrow (->)
    if (char === '-' && this.peekNext() === '>') {
      this.advance();
      this.advance();
      this.addToken(TokenType.Arrow, '->', start, startLine, startColumn);
      return;
    }

    // Operators
    for (const op of OPERATORS) {
      if (this.matchString(op)) {
        const type = op === '=' ? TokenType.Assignment : TokenType.Operator;
        this.addToken(type, op, start, startLine, startColumn);
        return;
      }
    }

    // Single character tokens
    switch (char) {
      case '(':
        this.advance();
        this.addToken(TokenType.OpenParen, '(', start, startLine, startColumn);
        return;
      case ')':
        this.advance();
        this.addToken(TokenType.CloseParen, ')', start, startLine, startColumn);
        return;
      case '{':
        this.advance();
        this.addToken(TokenType.OpenBrace, '{', start, startLine, startColumn);
        return;
      case '}':
        this.advance();
        this.addToken(TokenType.CloseBrace, '}', start, startLine, startColumn);
        return;
      case '[':
        this.advance();
        this.addToken(TokenType.OpenBracket, '[', start, startLine, startColumn);
        return;
      case ']':
        this.advance();
        this.addToken(TokenType.CloseBracket, ']', start, startLine, startColumn);
        return;
      case ';':
        this.advance();
        this.addToken(TokenType.Semicolon, ';', start, startLine, startColumn);
        return;
      case ':':
        this.advance();
        this.addToken(TokenType.Colon, ':', start, startLine, startColumn);
        return;
      case ',':
        this.advance();
        this.addToken(TokenType.Comma, ',', start, startLine, startColumn);
        return;
      case '=':
        this.advance();
        this.addToken(TokenType.Assignment, '=', start, startLine, startColumn);
        return;
    }

    // Unknown character - skip it
    this.advance();
  }

  private scanLineComment(start: number, startLine: number, startColumn: number): void {
    this.advance(); // skip /
    this.advance(); // skip /

    while (!this.isAtEnd() && this.peek() !== '\n') {
      this.advance();
    }

    const value = this.source.slice(start, this.pos);
    this.addToken(TokenType.Comment, value, start, startLine, startColumn);
  }

  private scanBlockComment(start: number, startLine: number, startColumn: number): void {
    this.advance(); // skip /
    this.advance(); // skip *

    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance();
        this.advance();
        break;
      }
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      this.advance();
    }

    const value = this.source.slice(start, this.pos);
    this.addToken(TokenType.Comment, value, start, startLine, startColumn);
  }

  private scanString(quote: string, start: number, startLine: number, startColumn: number): void {
    this.advance(); // skip opening quote

    let value = '';
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        if (!this.isAtEnd()) {
          const escaped = this.advance();
          switch (escaped) {
            case 'n': value += '\n'; break;
            case 't': value += '\t'; break;
            case 'r': value += '\r'; break;
            case '\\': value += '\\'; break;
            case '"': value += '"'; break;
            case "'": value += "'"; break;
            default: value += escaped;
          }
        }
      } else {
        value += this.advance();
      }
    }

    if (!this.isAtEnd()) {
      this.advance(); // skip closing quote
    }

    this.addToken(TokenType.String, value, start, startLine, startColumn);
  }

  private scanTemplateString(start: number, startLine: number, startColumn: number): void {
    this.advance(); // skip `

    let value = '';
    while (!this.isAtEnd() && this.peek() !== '`') {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
        value += '\n';
        this.advance();
      } else {
        value += this.advance();
      }
    }

    if (!this.isAtEnd()) {
      this.advance(); // skip `
    }

    this.addToken(TokenType.String, value, start, startLine, startColumn);
  }

  private scanNumber(start: number, startLine: number, startColumn: number): void {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance(); // skip .
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    // Exponent part
    if (this.peek() === 'e' || this.peek() === 'E') {
      this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        this.advance();
      }
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const value = this.source.slice(start, this.pos);
    this.addToken(TokenType.Number, value, start, startLine, startColumn);
  }

  private scanColor(start: number, startLine: number, startColumn: number): void {
    this.advance(); // skip #

    while (this.isHexDigit(this.peek())) {
      this.advance();
    }

    const value = this.source.slice(start, this.pos);
    this.addToken(TokenType.Color, value, start, startLine, startColumn);
  }

  private scanIdentifier(start: number, startLine: number, startColumn: number): void {
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      this.advance();
    }

    const value = this.source.slice(start, this.pos);

    // Check for boolean literals
    if (value === 'true' || value === 'false') {
      this.addToken(TokenType.Boolean, value, start, startLine, startColumn);
      return;
    }

    // Check for null literal
    if (value === 'null') {
      this.addToken(TokenType.Null, value, start, startLine, startColumn);
      return;
    }

    // Check for keywords
    if (this.keywords.has(value)) {
      this.addToken(TokenType.Keyword, value, start, startLine, startColumn);
      return;
    }

    this.addToken(TokenType.Identifier, value, start, startLine, startColumn);
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '\n') {
        this.line++;
        this.column = 1;
        this.pos++;
      } else {
        break;
      }
    }
  }

  private matchString(str: string): boolean {
    for (let i = 0; i < str.length; i++) {
      if (this.pos + i >= this.source.length) return false;
      if (this.source[this.pos + i] !== str[i]) return false;
    }
    for (let i = 0; i < str.length; i++) {
      this.advance();
    }
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.pos];
  }

  private peekNext(): string {
    if (this.pos + 1 >= this.source.length) return '\0';
    return this.source[this.pos + 1];
  }

  private advance(): string {
    const char = this.source[this.pos];
    this.pos++;
    this.column++;
    return char;
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isHexDigit(char: string): boolean {
    return this.isDigit(char) || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F');
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private addToken(type: TokenType, value: string, offset: number, line: number, column: number): void {
    this.tokens.push({ type, value, line, column, offset });
  }
}

/**
 * Tokenize HoloScript source
 */
export function tokenize(source: string, isHsPlus = true): Token[] {
  return new Lexer(source, isHsPlus).tokenize();
}

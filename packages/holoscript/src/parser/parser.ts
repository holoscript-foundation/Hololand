// HoloScript Parser - AST Definitions
export interface ASTNode {
  type: string;
  line: number;
  column: number;
}

export interface ZoneNode extends ASTNode {
  type: 'Zone';
  name: string;
  position?: [number, number, number];
  entities: EntityNode[];
  handlers: HandlerNode[];
}

export interface EntityNode extends ASTNode {
  type: 'Entity';
  name: string;
  properties: Record<string, any>;
  handlers: HandlerNode[];
}

export interface HandlerNode extends ASTNode {
  type: string;
  action: ActionNode[];
}

export interface ActionNode extends ASTNode {
  type: string;
  args?: any[];
}

export interface PropertyNode extends ASTNode {
  type: 'Property';
  key: string;
  value: any;
}

// Parser using tokens from lexer
import { Token } from './lexer';

export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ZoneNode[] {
    const zones: ZoneNode[] = [];
    while (!this.isAtEnd()) {
      if (this.peek().type === 'ZONE') {
        zones.push(this.parseZone());
      } else {
        this.advance();
      }
    }
    return zones;
  }

  private parseZone(): ZoneNode {
    this.consume('ZONE', 'Expected ZONE');
    const name = this.consume('IDENTIFIER', 'Expected zone name').value;
    this.consume('LBRACE', 'Expected {');

    const zone: ZoneNode = {
      type: 'Zone',
      name,
      entities: [],
      handlers: [],
      line: this.tokens[this.pos].line,
      column: this.tokens[this.pos].column,
    };

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      if (this.peek().type === 'ENTITY') {
        zone.entities.push(this.parseEntity());
      } else if (this.peek().type === 'POSITION') {
        zone.position = this.parsePosition();
      } else {
        this.advance();
      }
    }

    this.consume('RBRACE', 'Expected }');
    return zone;
  }

  private parseEntity(): EntityNode {
    this.consume('ENTITY', 'Expected ENTITY');
    const name = this.consume('IDENTIFIER', 'Expected entity name').value;
    this.consume('LBRACE', 'Expected {');

    const entity: EntityNode = {
      type: 'Entity',
      name,
      properties: {},
      handlers: [],
      line: this.tokens[this.pos].line,
      column: this.tokens[this.pos].column,
    };

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      if (this.peek().type === 'ON_CLICK' || this.peek().type === 'ON_HOVER') {
        entity.handlers.push(this.parseHandler());
      } else {
        const prop = this.parseProperty();
        entity.properties[prop.key] = prop.value;
      }
    }

    this.consume('RBRACE', 'Expected }');
    return entity;
  }

  private parseHandler(): HandlerNode {
    const handlerType = this.advance().value;
    this.consume('LBRACE', 'Expected {');

    const actions: ActionNode[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      const actionType = this.peek().value;
      this.advance();

      const args = [];
      if (this.check('LPAREN')) {
        this.consume('LPAREN', 'Expected (');
        while (!this.check('RPAREN') && !this.isAtEnd()) {
          args.push(this.parseValue());
          if (this.check('COMMA')) {
            this.advance();
          }
        }
        this.consume('RPAREN', 'Expected )');
      }

      actions.push({
        type: actionType,
        args,
        line: this.tokens[this.pos].line,
        column: this.tokens[this.pos].column,
      });
    }

    this.consume('RBRACE', 'Expected }');

    return {
      type: handlerType,
      action: actions,
      line: this.tokens[this.pos].line,
      column: this.tokens[this.pos].column,
    };
  }

  private parseProperty(): PropertyNode {
    const key = this.consume('IDENTIFIER', 'Expected property name').value;
    this.consume('COLON', 'Expected :');
    const value = this.parseValue();

    return {
      type: 'Property',
      key,
      value,
      line: this.tokens[this.pos].line,
      column: this.tokens[this.pos].column,
    };
  }

  private parsePosition(): [number, number, number] {
    this.consume('POSITION', 'Expected POSITION');
    this.consume('COLON', 'Expected :');
    this.consume('LPAREN', 'Expected (');

    const x = parseFloat(this.consume('NUMBER', 'Expected number').value);
    this.consume('COMMA', 'Expected ,');
    const y = parseFloat(this.consume('NUMBER', 'Expected number').value);
    this.consume('COMMA', 'Expected ,');
    const z = parseFloat(this.consume('NUMBER', 'Expected number').value);

    this.consume('RPAREN', 'Expected )');

    return [x, y, z];
  }

  private parseValue(): any {
    const token = this.peek();

    if (token.type === 'STRING') {
      this.advance();
      return token.value;
    }

    if (token.type === 'NUMBER') {
      this.advance();
      return parseFloat(token.value);
    }

    if (token.type === 'IDENTIFIER') {
      const name = this.advance().value;
      if (this.check('LPAREN')) {
        // Function call
        return { type: 'FunctionCall', name };
      }
      return name;
    }

    this.advance();
    return null;
  }

  private consume(type: string, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw new Error(`${message} at line ${this.peek().line}`);
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }
}

export function parse(tokens: Token[]): ZoneNode[] {
  const parser = new Parser(tokens);
  return parser.parse();
}

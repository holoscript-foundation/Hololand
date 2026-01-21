/**
 * @holoscript/core - Parser
 *
 * Parses tokens into an AST for HoloScript and HoloScript Plus.
 */

import { Lexer, TokenType, type Token } from './lexer.js';
import type {
  Program,
  ASTNode,
  Declaration,
  Statement,
  Expression,
  ParseError,
  ParseResult,
  Identifier,
  NumberLiteral,
  StringLiteral,
  BooleanLiteral,
  NullLiteral,
  ArrayLiteral,
  ObjectLiteral,
  ColorLiteral,
  Vec3Literal,
  PropertyAssignment,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  MemberExpression,
  ConditionalExpression,
  AssignmentExpression,
  ArrowFunctionExpression,
  AwaitExpression,
  VariableDeclaration,
  VariableDeclarator,
  TypeAnnotation,
  FunctionDeclaration,
  Parameter,
  BlockStatement,
  IfStatement,
  ForStatement,
  ForOfStatement,
  WhileStatement,
  ReturnStatement,
  BreakStatement,
  ContinueStatement,
  MatchStatement,
  MatchCase,
  ExpressionStatement,
  ImportDeclaration,
  ImportSpecifier,
  ExportDeclaration,
  OrbDeclaration,
  OrbProperty,
  WorldDeclaration,
  MaterialDeclaration,
  SystemDeclaration,
} from '../types.js';

export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;
  private errors: ParseError[] = [];
  private warnings: ParseError[] = [];
  private isHsPlus: boolean;

  constructor(isHsPlus: boolean = true) {
    this.isHsPlus = isHsPlus;
  }

  parse(source: string): ParseResult {
    this.errors = [];
    this.warnings = [];
    this.current = 0;

    // Tokenize
    const lexer = new Lexer(source, this.isHsPlus);
    this.tokens = lexer.tokenize().filter((t) => t.type !== TokenType.Comment);

    // Parse program
    const body: (Declaration | Statement)[] = [];

    while (!this.isAtEnd()) {
      try {
        const decl = this.parseDeclaration();
        if (decl) {
          body.push(decl);
        }
      } catch (error) {
        this.synchronize();
      }
    }

    const program: Program = {
      type: 'Program',
      body,
      sourceType: this.isHsPlus ? 'hsplus' : 'holo',
    };

    return {
      success: this.errors.length === 0,
      ast: body,
      program,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private parseDeclaration(): Declaration | Statement | null {
    // Skip semicolons
    while (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    if (this.isAtEnd()) return null;

    // Import declaration
    if (this.checkKeyword('import')) {
      return this.parseImport();
    }

    // Export declaration
    if (this.checkKeyword('export')) {
      return this.parseExport();
    }

    // Variable declaration
    if (this.checkKeyword('let') || this.checkKeyword('const')) {
      return this.parseVariableDeclaration();
    }

    // Function declaration
    if (this.checkKeyword('fn') || this.checkKeyword('async')) {
      return this.parseFunctionDeclaration();
    }

    // Orb declaration
    if (this.checkKeyword('orb')) {
      return this.parseOrbDeclaration();
    }

    // World declaration
    if (this.checkKeyword('world')) {
      return this.parseWorldDeclaration();
    }

    // Material declaration
    if (this.checkKeyword('material')) {
      return this.parseMaterialDeclaration();
    }

    // System declaration
    if (this.checkKeyword('system')) {
      return this.parseSystemDeclaration();
    }

    // Statement
    return this.parseStatement();
  }

  // ============================================================================
  // Import/Export
  // ============================================================================

  private parseImport(): ImportDeclaration {
    const token = this.advance(); // consume 'import'
    const specifiers: ImportSpecifier[] = [];

    if (this.check(TokenType.OpenBrace)) {
      // Named imports: import { a, b } from "module"
      this.advance(); // consume {

      while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
        const imported = this.consumeIdentifier('Expected import name');
        let local = imported;

        if (this.checkKeyword('as')) {
          this.advance(); // consume 'as'
          local = this.consumeIdentifier('Expected local name');
        }

        specifiers.push({
          type: 'ImportSpecifier',
          imported: { type: 'Identifier', name: imported.name },
          local: { type: 'Identifier', name: local.name },
          line: imported.line,
          column: imported.column,
        });

        if (!this.check(TokenType.CloseBrace)) {
          this.consume(TokenType.Comma, 'Expected comma between imports');
        }
      }

      this.consume(TokenType.CloseBrace, 'Expected }');
    } else if (this.check(TokenType.Identifier)) {
      // Default import: import foo from "module"
      const name = this.consumeIdentifier('Expected import name');
      specifiers.push({
        type: 'ImportSpecifier',
        imported: { type: 'Identifier', name: 'default' },
        local: { type: 'Identifier', name: name.name },
        line: name.line,
        column: name.column,
      });
    }

    this.consumeKeyword('from', 'Expected "from" after import');
    const source = this.consumeString('Expected module path');

    this.consumeOptionalSemicolon();

    return {
      type: 'ImportDeclaration',
      specifiers,
      source: { type: 'StringLiteral', value: source.value, raw: source.value },
      line: token.line,
      column: token.column,
    };
  }

  private parseExport(): ExportDeclaration {
    const token = this.advance(); // consume 'export'

    // export default
    if (this.checkKeyword('default')) {
      this.advance();
      // TODO: Handle default exports
    }

    // export { ... }
    if (this.check(TokenType.OpenBrace)) {
      // TODO: Named exports
    }

    // export declaration
    let declaration: Declaration | null = null;

    if (this.checkKeyword('let') || this.checkKeyword('const')) {
      declaration = this.parseVariableDeclaration();
    } else if (this.checkKeyword('fn') || this.checkKeyword('async')) {
      declaration = this.parseFunctionDeclaration();
    } else if (this.checkKeyword('orb')) {
      declaration = this.parseOrbDeclaration();
    } else if (this.checkKeyword('world')) {
      declaration = this.parseWorldDeclaration();
    } else if (this.checkKeyword('system')) {
      declaration = this.parseSystemDeclaration();
    }

    return {
      type: 'ExportDeclaration',
      declaration,
      specifiers: [],
      source: null,
      line: token.line,
      column: token.column,
    };
  }

  // ============================================================================
  // Variable Declaration
  // ============================================================================

  private parseVariableDeclaration(): VariableDeclaration {
    const token = this.advance(); // consume 'let' or 'const'
    const kind = token.value as 'let' | 'const';
    const declarations: VariableDeclarator[] = [];

    do {
      const id = this.consumeIdentifier('Expected variable name');

      let typeAnnotation: TypeAnnotation | undefined;
      if (this.check(TokenType.Colon)) {
        this.advance();
        typeAnnotation = this.parseTypeAnnotation();
      }

      let init: Expression | null = null;
      if (this.check(TokenType.Assignment)) {
        this.advance();
        init = this.parseExpression();
      }

      declarations.push({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: id.name },
        init,
        typeAnnotation,
        line: id.line,
        column: id.column,
      });
    } while (this.match(TokenType.Comma));

    this.consumeOptionalSemicolon();

    return {
      type: 'VariableDeclaration',
      kind,
      declarations,
      line: token.line,
      column: token.column,
    };
  }

  private parseTypeAnnotation(): TypeAnnotation {
    const token = this.peek();
    let typeIdentifier = this.consumeIdentifier('Expected type name').name;
    let isArray = false;
    const genericArgs: TypeAnnotation[] = [];

    // Check for array type
    if (this.check(TokenType.OpenBracket)) {
      this.advance();
      this.consume(TokenType.CloseBracket, 'Expected ]');
      isArray = true;
    }

    // Check for generic arguments
    if (this.checkOperator('<')) {
      this.advance();
      while (!this.checkOperator('>') && !this.isAtEnd()) {
        genericArgs.push(this.parseTypeAnnotation());
        if (!this.checkOperator('>')) {
          this.consume(TokenType.Comma, 'Expected comma between type arguments');
        }
      }
      this.consumeOperator('>', 'Expected >');
    }

    return {
      type: 'TypeAnnotation',
      typeIdentifier,
      isArray,
      genericArgs: genericArgs.length > 0 ? genericArgs : undefined,
      line: token.line,
      column: token.column,
    };
  }

  // ============================================================================
  // Function Declaration
  // ============================================================================

  private parseFunctionDeclaration(): FunctionDeclaration {
    let async = false;

    if (this.checkKeyword('async')) {
      this.advance();
      async = true;
    }

    const token = this.advance(); // consume 'fn'
    const name = this.consumeIdentifier('Expected function name').name;

    this.consume(TokenType.OpenParen, 'Expected ( after function name');
    const params = this.parseParameters();
    this.consume(TokenType.CloseParen, 'Expected ) after parameters');

    let returnType: TypeAnnotation | undefined;
    if (this.check(TokenType.Arrow) && this.peek().value === '->') {
      this.advance();
      returnType = this.parseTypeAnnotation();
    }

    const body = this.parseBlockStatement();

    return {
      type: 'FunctionDeclaration',
      name,
      params,
      returnType,
      body,
      async,
      line: token.line,
      column: token.column,
    };
  }

  private parseParameters(): Parameter[] {
    const params: Parameter[] = [];

    while (!this.check(TokenType.CloseParen) && !this.isAtEnd()) {
      const nameToken = this.consumeIdentifier('Expected parameter name');

      let typeAnnotation: TypeAnnotation | undefined;
      if (this.check(TokenType.Colon)) {
        this.advance();
        typeAnnotation = this.parseTypeAnnotation();
      }

      let defaultValue: Expression | undefined;
      if (this.check(TokenType.Assignment)) {
        this.advance();
        defaultValue = this.parseExpression();
      }

      params.push({
        type: 'Parameter',
        name: nameToken.name,
        typeAnnotation,
        defaultValue,
        line: nameToken.line,
        column: nameToken.column,
      });

      if (!this.check(TokenType.CloseParen)) {
        this.consume(TokenType.Comma, 'Expected comma between parameters');
      }
    }

    return params;
  }

  // ============================================================================
  // HoloScript Declarations (orb, world, material, system)
  // ============================================================================

  private parseOrbDeclaration(): OrbDeclaration {
    const token = this.advance(); // consume 'orb'
    const name = this.consumeIdentifier('Expected orb name').name;

    this.consume(TokenType.OpenBrace, 'Expected { after orb name');
    const properties = this.parseOrbProperties();
    this.consume(TokenType.CloseBrace, 'Expected }');

    return {
      type: 'OrbDeclaration',
      name,
      properties,
      line: token.line,
      column: token.column,
    };
  }

  private parseOrbProperties(): OrbProperty[] {
    const properties: OrbProperty[] = [];

    while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
      if (this.check(TokenType.Identifier) || this.check(TokenType.Keyword)) {
        const nameToken = this.advance();
        this.consume(TokenType.Colon, 'Expected : after property name');
        const value = this.parseExpression();

        properties.push({
          type: 'OrbProperty',
          name: nameToken.value,
          value,
          line: nameToken.line,
          column: nameToken.column,
        });

        // Optional semicolon
        this.match(TokenType.Semicolon);
      } else {
        this.error('Expected property name');
        this.advance();
      }
    }

    return properties;
  }

  private parseWorldDeclaration(): WorldDeclaration {
    const token = this.advance(); // consume 'world'
    const name = this.consumeIdentifier('Expected world name').name;

    this.consume(TokenType.OpenBrace, 'Expected { after world name');

    const properties: OrbProperty[] = [];
    const children: (OrbDeclaration | Statement)[] = [];

    while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
      if (this.checkKeyword('orb')) {
        children.push(this.parseOrbDeclaration());
      } else if (this.check(TokenType.Identifier) || this.check(TokenType.Keyword)) {
        // Check if it's a property assignment
        const lookahead = this.tokens[this.current + 1];
        if (lookahead && lookahead.type === TokenType.Colon) {
          const nameToken = this.advance();
          this.advance(); // consume :
          const value = this.parseExpression();
          properties.push({
            type: 'OrbProperty',
            name: nameToken.value,
            value,
            line: nameToken.line,
            column: nameToken.column,
          });
          this.match(TokenType.Semicolon);
        } else {
          children.push(this.parseStatement());
        }
      } else {
        children.push(this.parseStatement());
      }
    }

    this.consume(TokenType.CloseBrace, 'Expected }');

    return {
      type: 'WorldDeclaration',
      name,
      properties,
      children,
      line: token.line,
      column: token.column,
    };
  }

  private parseMaterialDeclaration(): MaterialDeclaration {
    const token = this.advance(); // consume 'material'
    const name = this.consumeIdentifier('Expected material name').name;

    this.consume(TokenType.OpenBrace, 'Expected { after material name');
    const properties = this.parseOrbProperties();
    this.consume(TokenType.CloseBrace, 'Expected }');

    return {
      type: 'MaterialDeclaration',
      name,
      properties,
      line: token.line,
      column: token.column,
    };
  }

  private parseSystemDeclaration(): SystemDeclaration {
    const token = this.advance(); // consume 'system'
    const name = this.consumeIdentifier('Expected system name').name;

    this.consume(TokenType.OpenBrace, 'Expected { after system name');

    const system: SystemDeclaration = {
      type: 'SystemDeclaration',
      name,
      line: token.line,
      column: token.column,
    };

    const methods: FunctionDeclaration[] = [];

    while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
      if (this.checkKeyword('state')) {
        this.advance();
        this.consume(TokenType.Colon, 'Expected : after state');
        system.state = this.parseObjectLiteral();
        this.match(TokenType.Semicolon);
      } else if (this.checkKeyword('init') || this.checkKeyword('update') || this.checkKeyword('cleanup')) {
        const methodName = this.advance().value;
        this.consume(TokenType.Colon, 'Expected : after method name');

        if (this.checkKeyword('fn') || this.checkKeyword('async')) {
          const fn = this.parseFunctionDeclaration();
          if (methodName === 'init') system.init = fn;
          else if (methodName === 'update') system.update = fn;
          else if (methodName === 'cleanup') system.cleanup = fn;
        } else {
          // Arrow function
          const arrowFn = this.parseArrowFunction();
          if (methodName === 'init') system.init = arrowFn as unknown as FunctionDeclaration;
          else if (methodName === 'update') system.update = arrowFn as unknown as FunctionDeclaration;
          else if (methodName === 'cleanup') system.cleanup = arrowFn as unknown as FunctionDeclaration;
        }
        this.match(TokenType.Semicolon);
      } else if (this.checkKeyword('fn')) {
        methods.push(this.parseFunctionDeclaration());
      } else {
        this.error('Expected state, init, update, cleanup, or fn in system');
        this.advance();
      }
    }

    if (methods.length > 0) {
      system.methods = methods;
    }

    this.consume(TokenType.CloseBrace, 'Expected }');

    return system;
  }

  // ============================================================================
  // Statements
  // ============================================================================

  private parseStatement(): Statement {
    if (this.check(TokenType.OpenBrace)) {
      return this.parseBlockStatement();
    }

    if (this.checkKeyword('if')) {
      return this.parseIfStatement();
    }

    if (this.checkKeyword('for')) {
      return this.parseForStatement();
    }

    if (this.checkKeyword('while')) {
      return this.parseWhileStatement();
    }

    if (this.checkKeyword('return')) {
      return this.parseReturnStatement();
    }

    if (this.checkKeyword('break')) {
      const token = this.advance();
      this.consumeOptionalSemicolon();
      return { type: 'BreakStatement', line: token.line, column: token.column };
    }

    if (this.checkKeyword('continue')) {
      const token = this.advance();
      this.consumeOptionalSemicolon();
      return { type: 'ContinueStatement', line: token.line, column: token.column };
    }

    if (this.checkKeyword('match')) {
      return this.parseMatchStatement();
    }

    return this.parseExpressionStatement();
  }

  private parseBlockStatement(): BlockStatement {
    const token = this.consume(TokenType.OpenBrace, 'Expected {');
    const body: Statement[] = [];

    while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
      const decl = this.parseDeclaration();
      if (decl) {
        body.push(decl as Statement);
      }
    }

    this.consume(TokenType.CloseBrace, 'Expected }');

    return {
      type: 'BlockStatement',
      body,
      line: token.line,
      column: token.column,
    };
  }

  private parseIfStatement(): IfStatement {
    const token = this.advance(); // consume 'if'
    this.consume(TokenType.OpenParen, 'Expected ( after if');
    const test = this.parseExpression();
    this.consume(TokenType.CloseParen, 'Expected ) after condition');

    const consequent = this.parseStatement();

    let alternate: Statement | null = null;
    if (this.checkKeyword('else')) {
      this.advance();
      alternate = this.parseStatement();
    }

    return {
      type: 'IfStatement',
      test,
      consequent,
      alternate,
      line: token.line,
      column: token.column,
    };
  }

  private parseForStatement(): ForStatement | ForOfStatement {
    const token = this.advance(); // consume 'for'
    this.consume(TokenType.OpenParen, 'Expected ( after for');

    // Check for for-of: for (x of items)
    if (this.check(TokenType.Identifier) || this.checkKeyword('let') || this.checkKeyword('const')) {
      const savedCurrent = this.current;

      let left: VariableDeclaration | Identifier;
      if (this.checkKeyword('let') || this.checkKeyword('const')) {
        left = this.parseVariableDeclaration();
      } else {
        left = { type: 'Identifier', name: this.advance().value } as Identifier;
      }

      if (this.checkKeyword('of') || this.checkKeyword('in')) {
        this.advance(); // consume 'of' or 'in'
        const right = this.parseExpression();
        this.consume(TokenType.CloseParen, 'Expected ) after for-of');
        const body = this.parseStatement();

        return {
          type: 'ForOfStatement',
          left,
          right,
          body,
          line: token.line,
          column: token.column,
        };
      }

      // Not a for-of, restore position
      this.current = savedCurrent;
    }

    // Regular for loop
    let init: VariableDeclaration | ExpressionStatement | null = null;
    if (!this.check(TokenType.Semicolon)) {
      if (this.checkKeyword('let') || this.checkKeyword('const')) {
        init = this.parseVariableDeclaration();
      } else {
        init = this.parseExpressionStatement();
      }
    } else {
      this.advance(); // consume ;
    }

    let test: Expression | null = null;
    if (!this.check(TokenType.Semicolon)) {
      test = this.parseExpression();
    }
    this.consume(TokenType.Semicolon, 'Expected ; after for condition');

    let update: Expression | null = null;
    if (!this.check(TokenType.CloseParen)) {
      update = this.parseExpression();
    }
    this.consume(TokenType.CloseParen, 'Expected ) after for');

    const body = this.parseStatement();

    return {
      type: 'ForStatement',
      init,
      test,
      update,
      body,
      line: token.line,
      column: token.column,
    };
  }

  private parseWhileStatement(): WhileStatement {
    const token = this.advance(); // consume 'while'
    this.consume(TokenType.OpenParen, 'Expected ( after while');
    const test = this.parseExpression();
    this.consume(TokenType.CloseParen, 'Expected ) after condition');

    const body = this.parseStatement();

    return {
      type: 'WhileStatement',
      test,
      body,
      line: token.line,
      column: token.column,
    };
  }

  private parseReturnStatement(): ReturnStatement {
    const token = this.advance(); // consume 'return'

    let argument: Expression | null = null;
    if (!this.check(TokenType.Semicolon) && !this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
      argument = this.parseExpression();
    }

    this.consumeOptionalSemicolon();

    return {
      type: 'ReturnStatement',
      argument,
      line: token.line,
      column: token.column,
    };
  }

  private parseMatchStatement(): MatchStatement {
    const token = this.advance(); // consume 'match'
    this.consume(TokenType.OpenParen, 'Expected ( after match');
    const discriminant = this.parseExpression();
    this.consume(TokenType.CloseParen, 'Expected ) after match expression');

    this.consume(TokenType.OpenBrace, 'Expected { after match');

    const cases: MatchCase[] = [];
    while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
      const pattern = this.peek().value === '_' ? (this.advance(), '_' as const) : this.parseExpression();
      this.consume(TokenType.Arrow, 'Expected => after match pattern');
      const body = this.check(TokenType.OpenBrace) ? this.parseBlockStatement() : this.parseExpression();
      this.match(TokenType.Comma);

      cases.push({
        type: 'MatchCase',
        pattern,
        body,
      });
    }

    this.consume(TokenType.CloseBrace, 'Expected }');

    return {
      type: 'MatchStatement',
      discriminant,
      cases,
      line: token.line,
      column: token.column,
    };
  }

  private parseExpressionStatement(): ExpressionStatement {
    const expression = this.parseExpression();
    this.consumeOptionalSemicolon();

    return {
      type: 'ExpressionStatement',
      expression,
      line: expression.line,
      column: expression.column,
    };
  }

  // ============================================================================
  // Expressions (Pratt parser)
  // ============================================================================

  private parseExpression(): Expression {
    return this.parseAssignment();
  }

  private parseAssignment(): Expression {
    const expr = this.parseTernary();

    if (this.check(TokenType.Assignment) || this.checkCompoundAssignment()) {
      const operator = this.advance().value;
      const right = this.parseAssignment();

      return {
        type: 'AssignmentExpression',
        operator,
        left: expr as Identifier | MemberExpression,
        right,
        line: expr.line,
        column: expr.column,
      };
    }

    return expr;
  }

  private parseTernary(): Expression {
    let expr = this.parseOr();

    if (this.checkOperator('?')) {
      this.advance();
      const consequent = this.parseExpression();
      this.consume(TokenType.Colon, 'Expected : in ternary');
      const alternate = this.parseTernary();

      return {
        type: 'ConditionalExpression',
        test: expr,
        consequent,
        alternate,
        line: expr.line,
        column: expr.column,
      };
    }

    return expr;
  }

  private parseOr(): Expression {
    let expr = this.parseAnd();

    while (this.checkOperator('||') || this.checkOperator('??')) {
      const operator = this.advance().value;
      const right = this.parseAnd();
      expr = { type: 'BinaryExpression', operator, left: expr, right, line: expr.line, column: expr.column };
    }

    return expr;
  }

  private parseAnd(): Expression {
    let expr = this.parseEquality();

    while (this.checkOperator('&&')) {
      const operator = this.advance().value;
      const right = this.parseEquality();
      expr = { type: 'BinaryExpression', operator, left: expr, right, line: expr.line, column: expr.column };
    }

    return expr;
  }

  private parseEquality(): Expression {
    let expr = this.parseComparison();

    while (this.checkOperator('==') || this.checkOperator('!=') || this.checkOperator('===') || this.checkOperator('!==')) {
      const operator = this.advance().value;
      const right = this.parseComparison();
      expr = { type: 'BinaryExpression', operator, left: expr, right, line: expr.line, column: expr.column };
    }

    return expr;
  }

  private parseComparison(): Expression {
    let expr = this.parseAddition();

    while (this.checkOperator('<') || this.checkOperator('>') || this.checkOperator('<=') || this.checkOperator('>=')) {
      const operator = this.advance().value;
      const right = this.parseAddition();
      expr = { type: 'BinaryExpression', operator, left: expr, right, line: expr.line, column: expr.column };
    }

    return expr;
  }

  private parseAddition(): Expression {
    let expr = this.parseMultiplication();

    while (this.checkOperator('+') || this.checkOperator('-')) {
      const operator = this.advance().value;
      const right = this.parseMultiplication();
      expr = { type: 'BinaryExpression', operator, left: expr, right, line: expr.line, column: expr.column };
    }

    return expr;
  }

  private parseMultiplication(): Expression {
    let expr = this.parsePower();

    while (this.checkOperator('*') || this.checkOperator('/') || this.checkOperator('%')) {
      const operator = this.advance().value;
      const right = this.parsePower();
      expr = { type: 'BinaryExpression', operator, left: expr, right, line: expr.line, column: expr.column };
    }

    return expr;
  }

  private parsePower(): Expression {
    let expr = this.parseUnary();

    if (this.checkOperator('**')) {
      const operator = this.advance().value;
      const right = this.parsePower(); // Right associative
      expr = { type: 'BinaryExpression', operator, left: expr, right, line: expr.line, column: expr.column };
    }

    return expr;
  }

  private parseUnary(): Expression {
    if (this.checkOperator('!') || this.checkOperator('-') || this.checkOperator('+') || this.checkOperator('~')) {
      const token = this.advance();
      const argument = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator: token.value,
        argument,
        prefix: true,
        line: token.line,
        column: token.column,
      };
    }

    if (this.checkKeyword('await')) {
      const token = this.advance();
      const argument = this.parseUnary();
      return {
        type: 'AwaitExpression',
        argument,
        line: token.line,
        column: token.column,
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): Expression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.check(TokenType.OpenParen)) {
        this.advance();
        const args = this.parseArguments();
        this.consume(TokenType.CloseParen, 'Expected ) after arguments');
        expr = {
          type: 'CallExpression',
          callee: expr,
          arguments: args,
          line: expr.line,
          column: expr.column,
        };
      } else if (this.check(TokenType.OpenBracket)) {
        this.advance();
        const property = this.parseExpression();
        this.consume(TokenType.CloseBracket, 'Expected ]');
        expr = {
          type: 'MemberExpression',
          object: expr,
          property,
          computed: true,
          line: expr.line,
          column: expr.column,
        };
      } else if (this.check(TokenType.Dot) || this.checkOperator('.')) {
        this.advance();
        const property = this.consumeIdentifier('Expected property name');
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: { type: 'Identifier', name: property.name },
          computed: false,
          line: expr.line,
          column: expr.column,
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private parseArguments(): Expression[] {
    const args: Expression[] = [];

    while (!this.check(TokenType.CloseParen) && !this.isAtEnd()) {
      args.push(this.parseExpression());
      if (!this.check(TokenType.CloseParen)) {
        this.consume(TokenType.Comma, 'Expected comma between arguments');
      }
    }

    return args;
  }

  private parsePrimary(): Expression {
    const token = this.peek();

    // Literals
    if (this.check(TokenType.Number)) {
      this.advance();
      return {
        type: 'NumberLiteral',
        value: parseFloat(token.value),
        raw: token.value,
        line: token.line,
        column: token.column,
      };
    }

    if (this.check(TokenType.String)) {
      this.advance();
      return {
        type: 'StringLiteral',
        value: token.value,
        raw: token.value,
        line: token.line,
        column: token.column,
      };
    }

    if (this.check(TokenType.Boolean)) {
      this.advance();
      return {
        type: 'BooleanLiteral',
        value: token.value === 'true',
        line: token.line,
        column: token.column,
      };
    }

    if (this.check(TokenType.Null)) {
      this.advance();
      return {
        type: 'NullLiteral',
        line: token.line,
        column: token.column,
      };
    }

    if (this.check(TokenType.Color)) {
      this.advance();
      return {
        type: 'ColorLiteral',
        value: token.value,
        line: token.line,
        column: token.column,
      };
    }

    // Array literal
    if (this.check(TokenType.OpenBracket)) {
      return this.parseArrayLiteral();
    }

    // Object literal
    if (this.check(TokenType.OpenBrace)) {
      return this.parseObjectLiteral();
    }

    // Arrow function or grouped expression
    if (this.check(TokenType.OpenParen)) {
      return this.parseParenthesizedOrArrow();
    }

    // Arrow function shorthand: fn(params) => expr
    if (this.checkKeyword('fn')) {
      return this.parseArrowFunction();
    }

    // Identifier
    if (this.check(TokenType.Identifier) || this.check(TokenType.Keyword)) {
      this.advance();
      return {
        type: 'Identifier',
        name: token.value,
        line: token.line,
        column: token.column,
      };
    }

    this.error(`Unexpected token: ${token.value}`);
    this.advance();
    return { type: 'Identifier', name: 'error', line: token.line, column: token.column };
  }

  private parseArrayLiteral(): ArrayLiteral {
    const token = this.advance(); // consume [
    const elements: Expression[] = [];

    while (!this.check(TokenType.CloseBracket) && !this.isAtEnd()) {
      elements.push(this.parseExpression());
      if (!this.check(TokenType.CloseBracket)) {
        this.consume(TokenType.Comma, 'Expected comma between array elements');
      }
    }

    this.consume(TokenType.CloseBracket, 'Expected ]');

    return {
      type: 'ArrayLiteral',
      elements,
      line: token.line,
      column: token.column,
    };
  }

  private parseObjectLiteral(): ObjectLiteral {
    const token = this.advance(); // consume {
    const properties: PropertyAssignment[] = [];

    while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
      const keyToken = this.peek();
      let key: Identifier | StringLiteral;

      if (this.check(TokenType.String)) {
        this.advance();
        key = { type: 'StringLiteral', value: keyToken.value, raw: keyToken.value };
      } else {
        const id = this.consumeIdentifier('Expected property name');
        key = { type: 'Identifier', name: id.name };
      }

      this.consume(TokenType.Colon, 'Expected : after property name');
      const value = this.parseExpression();

      properties.push({
        type: 'PropertyAssignment',
        key,
        value,
        line: keyToken.line,
        column: keyToken.column,
      });

      if (!this.check(TokenType.CloseBrace)) {
        this.consume(TokenType.Comma, 'Expected comma between properties');
      }
    }

    this.consume(TokenType.CloseBrace, 'Expected }');

    return {
      type: 'ObjectLiteral',
      properties,
      line: token.line,
      column: token.column,
    };
  }

  private parseParenthesizedOrArrow(): Expression {
    const startToken = this.advance(); // consume (

    // Empty parens or arrow function
    if (this.check(TokenType.CloseParen)) {
      this.advance();
      if (this.check(TokenType.Arrow)) {
        this.advance();
        const body = this.check(TokenType.OpenBrace) ? this.parseBlockStatement() : this.parseExpression();
        return {
          type: 'ArrowFunctionExpression',
          params: [],
          body,
          async: false,
          line: startToken.line,
          column: startToken.column,
        };
      }
      // Empty tuple/unit - treat as null for now
      return { type: 'NullLiteral', line: startToken.line, column: startToken.column };
    }

    // Parse first expression/parameter
    const first = this.parseExpression();

    // Check if it's an arrow function with single param or multiple params
    if (this.check(TokenType.Comma) || (this.check(TokenType.CloseParen) && this.tokens[this.current + 1]?.type === TokenType.Arrow)) {
      // Collect remaining parameters
      const params: Parameter[] = [this.expressionToParameter(first)];

      while (this.check(TokenType.Comma)) {
        this.advance();
        const param = this.parseExpression();
        params.push(this.expressionToParameter(param));
      }

      this.consume(TokenType.CloseParen, 'Expected )');

      if (this.check(TokenType.Arrow)) {
        this.advance();
        const body = this.check(TokenType.OpenBrace) ? this.parseBlockStatement() : this.parseExpression();
        return {
          type: 'ArrowFunctionExpression',
          params,
          body,
          async: false,
          line: startToken.line,
          column: startToken.column,
        };
      }
    }

    this.consume(TokenType.CloseParen, 'Expected )');
    return first;
  }

  private expressionToParameter(expr: Expression): Parameter {
    if (expr.type === 'Identifier') {
      return { type: 'Parameter', name: expr.name, line: expr.line, column: expr.column };
    }
    // For now, just use a placeholder
    return { type: 'Parameter', name: 'param', line: expr.line, column: expr.column };
  }

  private parseArrowFunction(): ArrowFunctionExpression {
    let async = false;

    if (this.checkKeyword('async')) {
      this.advance();
      async = true;
    }

    const token = this.advance(); // consume 'fn'

    this.consume(TokenType.OpenParen, 'Expected (');
    const params = this.parseParameters();
    this.consume(TokenType.CloseParen, 'Expected )');

    // Optional return type
    if (this.check(TokenType.Arrow) && this.peek().value === '->') {
      this.advance();
      this.parseTypeAnnotation(); // Consume but ignore for arrow functions
    }

    // Arrow or block
    if (this.check(TokenType.Arrow) && this.peek().value === '=>') {
      this.advance();
    }

    const body = this.check(TokenType.OpenBrace) ? this.parseBlockStatement() : this.parseExpression();

    return {
      type: 'ArrowFunctionExpression',
      params,
      body,
      async,
      line: token.line,
      column: token.column,
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private peek(): Token {
    return this.tokens[this.current];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkKeyword(keyword: string): boolean {
    return this.check(TokenType.Keyword) && this.peek().value === keyword;
  }

  private checkOperator(operator: string): boolean {
    return this.check(TokenType.Operator) && this.peek().value === operator;
  }

  private checkCompoundAssignment(): boolean {
    const token = this.peek();
    return token.type === TokenType.Operator && ['+=', '-=', '*=', '/=', '%=', '&&=', '||=', '??='].includes(token.value);
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    this.error(message);
    return this.peek();
  }

  private consumeKeyword(keyword: string, message: string): Token {
    if (this.checkKeyword(keyword)) {
      return this.advance();
    }
    this.error(message);
    return this.peek();
  }

  private consumeOperator(operator: string, message: string): Token {
    if (this.checkOperator(operator)) {
      return this.advance();
    }
    this.error(message);
    return this.peek();
  }

  private consumeIdentifier(message: string): { name: string; line: number; column: number } {
    if (this.check(TokenType.Identifier) || this.check(TokenType.Keyword)) {
      const token = this.advance();
      return { name: token.value, line: token.line, column: token.column };
    }
    this.error(message);
    return { name: 'error', line: this.peek().line, column: this.peek().column };
  }

  private consumeString(message: string): { value: string; line: number; column: number } {
    if (this.check(TokenType.String)) {
      const token = this.advance();
      return { value: token.value, line: token.line, column: token.column };
    }
    this.error(message);
    return { value: '', line: this.peek().line, column: this.peek().column };
  }

  private consumeOptionalSemicolon(): void {
    this.match(TokenType.Semicolon);
  }

  private error(message: string): void {
    const token = this.peek();
    this.errors.push({
      message,
      line: token.line,
      column: token.column,
      offset: token.offset,
    });
  }

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.tokens[this.current - 1].type === TokenType.Semicolon) return;

      switch (this.peek().value) {
        case 'fn':
        case 'let':
        case 'const':
        case 'if':
        case 'for':
        case 'while':
        case 'return':
        case 'orb':
        case 'world':
        case 'system':
        case 'import':
        case 'export':
          return;
      }

      this.advance();
    }
  }
}

/**
 * Parse HoloScript source
 */
export function parse(source: string, isHsPlus = true): ParseResult {
  return new Parser(isHsPlus).parse(source);
}

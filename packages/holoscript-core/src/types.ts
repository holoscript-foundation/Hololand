/**
 * @holoscript/core - Type Definitions
 *
 * Core types for the HoloScript language parser and runtime.
 */

/**
 * Position in source code
 */
export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

/**
 * Source range
 */
export interface SourceRange {
  start: SourceLocation;
  end: SourceLocation;
}

/**
 * Base AST node
 */
export interface BaseNode {
  type: string;
  loc?: SourceRange;
  line?: number;
  column?: number;
}

// ============================================================================
// Literal Types
// ============================================================================

export interface NumberLiteral extends BaseNode {
  type: 'NumberLiteral';
  value: number;
  raw: string;
}

export interface StringLiteral extends BaseNode {
  type: 'StringLiteral';
  value: string;
  raw: string;
}

export interface BooleanLiteral extends BaseNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface NullLiteral extends BaseNode {
  type: 'NullLiteral';
}

export interface ArrayLiteral extends BaseNode {
  type: 'ArrayLiteral';
  elements: Expression[];
}

export interface ObjectLiteral extends BaseNode {
  type: 'ObjectLiteral';
  properties: PropertyAssignment[];
}

export interface PropertyAssignment extends BaseNode {
  type: 'PropertyAssignment';
  key: Identifier | StringLiteral;
  value: Expression;
}

export interface Vec2Literal extends BaseNode {
  type: 'Vec2Literal';
  x: Expression;
  y: Expression;
}

export interface Vec3Literal extends BaseNode {
  type: 'Vec3Literal';
  x: Expression;
  y: Expression;
  z: Expression;
}

export interface ColorLiteral extends BaseNode {
  type: 'ColorLiteral';
  value: string; // hex color
}

// ============================================================================
// Expression Types
// ============================================================================

export interface Identifier extends BaseNode {
  type: 'Identifier';
  name: string;
}

export interface MemberExpression extends BaseNode {
  type: 'MemberExpression';
  object: Expression;
  property: Identifier | Expression;
  computed: boolean; // true for a[b], false for a.b
}

export interface CallExpression extends BaseNode {
  type: 'CallExpression';
  callee: Expression;
  arguments: Expression[];
}

export interface BinaryExpression extends BaseNode {
  type: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends BaseNode {
  type: 'UnaryExpression';
  operator: string;
  argument: Expression;
  prefix: boolean;
}

export interface ConditionalExpression extends BaseNode {
  type: 'ConditionalExpression';
  test: Expression;
  consequent: Expression;
  alternate: Expression;
}

export interface AssignmentExpression extends BaseNode {
  type: 'AssignmentExpression';
  operator: string;
  left: Identifier | MemberExpression;
  right: Expression;
}

export interface ArrowFunctionExpression extends BaseNode {
  type: 'ArrowFunctionExpression';
  params: Parameter[];
  body: Expression | BlockStatement;
  async: boolean;
}

export interface AwaitExpression extends BaseNode {
  type: 'AwaitExpression';
  argument: Expression;
}

export interface NewExpression extends BaseNode {
  type: 'NewExpression';
  callee: Expression;
  arguments: Expression[];
}

export type Literal = NumberLiteral | StringLiteral | BooleanLiteral | NullLiteral | ArrayLiteral | ObjectLiteral | Vec2Literal | Vec3Literal | ColorLiteral;

export type Expression =
  | Literal
  | Identifier
  | MemberExpression
  | CallExpression
  | BinaryExpression
  | UnaryExpression
  | ConditionalExpression
  | AssignmentExpression
  | ArrowFunctionExpression
  | AwaitExpression
  | NewExpression;

// ============================================================================
// Statement Types
// ============================================================================

export interface ExpressionStatement extends BaseNode {
  type: 'ExpressionStatement';
  expression: Expression;
}

export interface VariableDeclaration extends BaseNode {
  type: 'VariableDeclaration';
  kind: 'let' | 'const';
  declarations: VariableDeclarator[];
}

export interface VariableDeclarator extends BaseNode {
  type: 'VariableDeclarator';
  id: Identifier;
  init: Expression | null;
  typeAnnotation?: TypeAnnotation;
}

export interface TypeAnnotation extends BaseNode {
  type: 'TypeAnnotation';
  typeIdentifier: string;
  isArray?: boolean;
  genericArgs?: TypeAnnotation[];
}

export interface BlockStatement extends BaseNode {
  type: 'BlockStatement';
  body: Statement[];
}

export interface IfStatement extends BaseNode {
  type: 'IfStatement';
  test: Expression;
  consequent: Statement;
  alternate: Statement | null;
}

export interface ForStatement extends BaseNode {
  type: 'ForStatement';
  init: VariableDeclaration | ExpressionStatement | null;
  test: Expression | null;
  update: Expression | null;
  body: Statement;
}

export interface ForOfStatement extends BaseNode {
  type: 'ForOfStatement';
  left: VariableDeclaration | Identifier;
  right: Expression;
  body: Statement;
}

export interface WhileStatement extends BaseNode {
  type: 'WhileStatement';
  test: Expression;
  body: Statement;
}

export interface ReturnStatement extends BaseNode {
  type: 'ReturnStatement';
  argument: Expression | null;
}

export interface BreakStatement extends BaseNode {
  type: 'BreakStatement';
}

export interface ContinueStatement extends BaseNode {
  type: 'ContinueStatement';
}

export interface MatchStatement extends BaseNode {
  type: 'MatchStatement';
  discriminant: Expression;
  cases: MatchCase[];
}

export interface MatchCase extends BaseNode {
  type: 'MatchCase';
  pattern: Expression | '_';
  body: Statement | Expression;
}

export type Statement =
  | ExpressionStatement
  | VariableDeclaration
  | BlockStatement
  | IfStatement
  | ForStatement
  | ForOfStatement
  | WhileStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | MatchStatement;

// ============================================================================
// Declaration Types
// ============================================================================

export interface Parameter extends BaseNode {
  type: 'Parameter';
  name: string;
  typeAnnotation?: TypeAnnotation;
  defaultValue?: Expression;
}

export interface FunctionDeclaration extends BaseNode {
  type: 'FunctionDeclaration';
  name: string;
  params: Parameter[];
  returnType?: TypeAnnotation;
  body: BlockStatement;
  async: boolean;
}

export interface ImportDeclaration extends BaseNode {
  type: 'ImportDeclaration';
  specifiers: ImportSpecifier[];
  source: StringLiteral;
}

export interface ImportSpecifier extends BaseNode {
  type: 'ImportSpecifier';
  imported: Identifier;
  local: Identifier;
}

export interface ExportDeclaration extends BaseNode {
  type: 'ExportDeclaration';
  declaration: Declaration | null;
  specifiers: ExportSpecifier[];
  source: StringLiteral | null;
}

export interface ExportSpecifier extends BaseNode {
  type: 'ExportSpecifier';
  local: Identifier;
  exported: Identifier;
}

// ============================================================================
// HoloScript-Specific Types
// ============================================================================

export interface OrbDeclaration extends BaseNode {
  type: 'OrbDeclaration';
  name: string;
  properties: OrbProperty[];
  children?: OrbDeclaration[];
}

export interface OrbProperty extends BaseNode {
  type: 'OrbProperty';
  name: string;
  value: Expression;
}

export interface WorldDeclaration extends BaseNode {
  type: 'WorldDeclaration';
  name: string;
  properties: OrbProperty[];
  children: (OrbDeclaration | Statement)[];
}

export interface MaterialDeclaration extends BaseNode {
  type: 'MaterialDeclaration';
  name: string;
  properties: OrbProperty[];
}

export interface SystemDeclaration extends BaseNode {
  type: 'SystemDeclaration';
  name: string;
  state?: ObjectLiteral;
  init?: FunctionDeclaration | ArrowFunctionExpression;
  update?: FunctionDeclaration | ArrowFunctionExpression;
  cleanup?: FunctionDeclaration | ArrowFunctionExpression;
  methods?: FunctionDeclaration[];
}

export interface MacroDeclaration extends BaseNode {
  type: 'MacroDeclaration';
  name: string;
  params: Parameter[];
  body: Statement[];
}

export interface MacroCall extends BaseNode {
  type: 'MacroCall';
  name: string;
  arguments: Expression[];
}

export type Declaration =
  | FunctionDeclaration
  | ImportDeclaration
  | ExportDeclaration
  | OrbDeclaration
  | WorldDeclaration
  | MaterialDeclaration
  | SystemDeclaration
  | MacroDeclaration
  | VariableDeclaration;

// ============================================================================
// Program
// ============================================================================

export interface Program extends BaseNode {
  type: 'Program';
  body: (Declaration | Statement)[];
  sourceType: 'holo' | 'hsplus';
  comments?: Comment[];
}

export interface Comment extends BaseNode {
  type: 'Comment';
  value: string;
  style: 'line' | 'block';
}

// ============================================================================
// AST Node Union
// ============================================================================

export type ASTNode =
  | Program
  | Declaration
  | Statement
  | Expression
  | Parameter
  | OrbProperty
  | ImportSpecifier
  | ExportSpecifier
  | MatchCase
  | Comment;

// ============================================================================
// Parse Result
// ============================================================================

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
  offset?: number;
}

export interface ParseResult {
  success: boolean;
  ast: ASTNode[];
  program?: Program;
  errors: ParseError[];
  warnings: ParseError[];
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================================
// Runtime
// ============================================================================

export interface RuntimeContext {
  variables: Map<string, unknown>;
  functions: Map<string, (...args: unknown[]) => unknown>;
  systems: Map<string, SystemInstance>;
  orbs: Map<string, OrbInstance>;
  worlds: Map<string, WorldInstance>;
}

export interface SystemInstance {
  name: string;
  state: Record<string, unknown>;
  update?: (deltaTime: number) => void;
  cleanup?: () => void;
}

export interface OrbInstance {
  name: string;
  properties: Record<string, unknown>;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export interface WorldInstance {
  name: string;
  properties: Record<string, unknown>;
  orbs: OrbInstance[];
}

export interface ExecutionResult {
  success: boolean;
  value?: unknown;
  error?: string;
  context?: RuntimeContext;
}

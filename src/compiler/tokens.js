// Token Types and Token Class for Tiny C Compiler

export const TokenType = {
  // End of file / Special
  EOF: 'EOF',
  ERROR: 'ERROR',

  // Keywords
  INT: 'INT',
  CHAR: 'CHAR',
  VOID: 'VOID',
  IF: 'IF',
  ELSE: 'ELSE',
  WHILE: 'WHILE',
  FOR: 'FOR',
  RETURN: 'RETURN',
  BREAK: 'BREAK',
  CONTINUE: 'CONTINUE',

  // Identifiers & Literals
  IDENTIFIER: 'IDENTIFIER',
  INT_LITERAL: 'INT_LITERAL',
  CHAR_LITERAL: 'CHAR_LITERAL',
  STRING_LITERAL: 'STRING_LITERAL',

  // Operators
  PLUS: '+',
  MINUS: '-',
  STAR: '*',
  SLASH: '/',
  PERCENT: '%',
  ASSIGN: '=',
  PLUS_ASSIGN: '+=',
  MINUS_ASSIGN: '-=',
  STAR_ASSIGN: '*=',
  SLASH_ASSIGN: '/=',
  INC: '++',
  DEC: '--',

  // Logical & Relational
  EQ: '==',
  NEQ: '!=',
  LT: '<',
  LTE: '<=',
  GT: '>',
  GTE: '>=',
  AND: '&&',
  OR: '||',
  NOT: '!',

  // Delimiters / Punctuators
  SEMICOLON: ';',
  COMMA: ',',
  LPAREN: '(',
  RPAREN: ')',
  LBRACE: '{',
  RBRACE: '}',
  LBRACKET: '[',
  RBRACKET: ']',
};

export const KEYWORDS = {
  int: TokenType.INT,
  char: TokenType.CHAR,
  void: TokenType.VOID,
  if: TokenType.IF,
  else: TokenType.ELSE,
  while: TokenType.WHILE,
  for: TokenType.FOR,
  return: TokenType.RETURN,
  break: TokenType.BREAK,
  continue: TokenType.CONTINUE,
};

export class Token {
  constructor(type, value, line, column, length = 0) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
    this.length = length || (value ? String(value).length : 0);
  }

  toString() {
    return `Token(${this.type}, ${JSON.stringify(this.value)}, Line: ${this.line}:${this.column})`;
  }
}

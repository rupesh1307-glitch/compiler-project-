// Recursive Descent Parser for Tiny C Language
import { TokenType } from './tokens.js';
import {
  ProgramNode,
  VarDeclNode,
  FunctionDeclNode,
  BlockNode,
  IfStmtNode,
  WhileStmtNode,
  ForStmtNode,
  ReturnStmtNode,
  BreakStmtNode,
  ContinueStmtNode,
  ExprStmtNode,
  BinaryExprNode,
  UnaryExprNode,
  AssignExprNode,
  CallExprNode,
  ArrayAccessExprNode,
  VariableExprNode,
  LiteralExprNode,
} from './ast.js';

export class Parser {
  constructor(tokens) {
    this.tokens = tokens || [];
    this.current = 0;
    this.errors = [];
  }

  parse() {
    this.current = 0;
    this.errors = [];
    const declarations = [];

    while (!this.isAtEnd()) {
      try {
        const decl = this.declaration();
        if (decl) declarations.push(decl);
      } catch (err) {
        // Record error and synchronize
        this.synchronize();
      }
    }

    return {
      ast: new ProgramNode(declarations),
      errors: this.errors,
    };
  }

  isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  peek() {
    return this.tokens[this.current] || { type: TokenType.EOF, value: '', line: 0, column: 0 };
  }

  previous() {
    return this.tokens[this.current - 1];
  }

  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  consume(type, message) {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  error(token, message) {
    const err = {
      line: token ? token.line : 0,
      column: token ? token.column : 0,
      length: token ? token.length : 1,
      message,
    };
    this.errors.push(err);
    return new Error(message);
  }

  synchronize() {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;
      if (this.previous().type === TokenType.RBRACE) return;

      switch (this.peek().type) {
        case TokenType.INT:
        case TokenType.CHAR:
        case TokenType.VOID:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.FOR:
        case TokenType.RETURN:
          return;
      }
      this.advance();
    }
  }

  // --- Grammar rules ---

  declaration() {
    if (this.match(TokenType.INT, TokenType.CHAR, TokenType.VOID)) {
      const typeToken = this.previous();
      const type = typeToken.value;

      const nameToken = this.consume(TokenType.IDENTIFIER, `Expected identifier after type '${type}'`);
      const name = nameToken.value;

      // Function definition or global variable
      if (this.match(TokenType.LPAREN)) {
        return this.functionDeclaration(type, name, nameToken);
      } else {
        return this.varDeclarationRest(type, name, nameToken);
      }
    }

    throw this.error(this.peek(), `Expected type declaration ('int', 'char', 'void') but found '${this.peek().value}'`);
  }

  functionDeclaration(returnType, name, nameToken) {
    const params = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        if (!this.match(TokenType.INT, TokenType.CHAR, TokenType.VOID)) {
          throw this.error(this.peek(), `Expected parameter type ('int', 'char')`);
        }
        const paramType = this.previous().value;
        const paramNameToken = this.consume(TokenType.IDENTIFIER, `Expected parameter name`);
        let isArray = false;
        if (this.match(TokenType.LBRACKET)) {
          this.consume(TokenType.RBRACKET, `Expected ']' in array parameter`);
          isArray = true;
        }
        params.push({
          type: paramType,
          name: paramNameToken.value,
          isArray,
          line: paramNameToken.line,
          column: paramNameToken.column,
        });
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, `Expected ')' after parameters`);
    this.consume(TokenType.LBRACE, `Expected '{' before function body`);
    const body = this.block();

    return new FunctionDeclNode(returnType, name, params, body, nameToken.line, nameToken.column);
  }

  varDeclarationRest(type, name, nameToken) {
    let isArray = false;
    let arraySize = null;

    if (this.match(TokenType.LBRACKET)) {
      isArray = true;
      if (this.match(TokenType.INT_LITERAL)) {
        arraySize = this.previous().value;
      }
      this.consume(TokenType.RBRACKET, `Expected ']' in array declaration`);
    }

    let initExpr = null;
    if (this.match(TokenType.ASSIGN)) {
      initExpr = this.expression();
    }

    this.consume(TokenType.SEMICOLON, `Expected ';' after variable declaration`);
    return new VarDeclNode(type, name, isArray, arraySize, initExpr, nameToken.line, nameToken.column);
  }

  block() {
    const startToken = this.previous();
    const statements = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      try {
        statements.push(this.statement());
      } catch (e) {
        this.synchronize();
      }
    }

    this.consume(TokenType.RBRACE, `Expected '}' to close block`);
    return new BlockNode(statements, startToken.line, startToken.column);
  }

  statement() {
    if (this.match(TokenType.LBRACE)) {
      return this.block();
    }
    if (this.match(TokenType.IF)) {
      return this.ifStatement();
    }
    if (this.match(TokenType.WHILE)) {
      return this.whileStatement();
    }
    if (this.match(TokenType.FOR)) {
      return this.forStatement();
    }
    if (this.match(TokenType.RETURN)) {
      return this.returnStatement();
    }
    if (this.match(TokenType.BREAK)) {
      const tok = this.previous();
      this.consume(TokenType.SEMICOLON, `Expected ';' after break`);
      return new BreakStmtNode(tok.line, tok.column);
    }
    if (this.match(TokenType.CONTINUE)) {
      const tok = this.previous();
      this.consume(TokenType.SEMICOLON, `Expected ';' after continue`);
      return new ContinueStmtNode(tok.line, tok.column);
    }
    if (this.match(TokenType.INT, TokenType.CHAR, TokenType.VOID)) {
      const type = this.previous().value;
      const nameToken = this.consume(TokenType.IDENTIFIER, `Expected variable name`);
      return this.varDeclarationRest(type, nameToken.value, nameToken);
    }

    return this.expressionStatement();
  }

  ifStatement() {
    const ifToken = this.previous();
    this.consume(TokenType.LPAREN, `Expected '(' after 'if'`);
    const condition = this.expression();
    this.consume(TokenType.RPAREN, `Expected ')' after if condition`);

    const thenBranch = this.statement();
    let elseBranch = null;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement();
    }

    return new IfStmtNode(condition, thenBranch, elseBranch, ifToken.line, ifToken.column);
  }

  whileStatement() {
    const whileToken = this.previous();
    this.consume(TokenType.LPAREN, `Expected '(' after 'while'`);
    const condition = this.expression();
    this.consume(TokenType.RPAREN, `Expected ')' after while condition`);

    const body = this.statement();
    return new WhileStmtNode(condition, body, whileToken.line, whileToken.column);
  }

  forStatement() {
    const forToken = this.previous();
    this.consume(TokenType.LPAREN, `Expected '(' after 'for'`);

    let init = null;
    if (this.match(TokenType.SEMICOLON)) {
      init = null;
    } else if (this.match(TokenType.INT, TokenType.CHAR)) {
      const type = this.previous().value;
      const nameToken = this.consume(TokenType.IDENTIFIER, `Expected variable name`);
      init = this.varDeclarationRest(type, nameToken.value, nameToken);
    } else {
      init = this.expression();
      this.consume(TokenType.SEMICOLON, `Expected ';' after for loop init`);
    }

    let condition = null;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    this.consume(TokenType.SEMICOLON, `Expected ';' after for loop condition`);

    let update = null;
    if (!this.check(TokenType.RPAREN)) {
      update = this.expression();
    }
    this.consume(TokenType.RPAREN, `Expected ')' after for loop update`);

    const body = this.statement();
    return new ForStmtNode(init, condition, update, body, forToken.line, forToken.column);
  }

  returnStatement() {
    const retToken = this.previous();
    let value = null;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }
    this.consume(TokenType.SEMICOLON, `Expected ';' after return value`);
    return new ReturnStmtNode(value, retToken.line, retToken.column);
  }

  expressionStatement() {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, `Expected ';' after expression`);
    return new ExprStmtNode(expr, expr.line, expr.column);
  }

  // --- Expressions with operator precedence ---

  expression() {
    return this.assignment();
  }

  assignment() {
    const expr = this.logicalOr();

    if (
      this.match(
        TokenType.ASSIGN,
        TokenType.PLUS_ASSIGN,
        TokenType.MINUS_ASSIGN,
        TokenType.STAR_ASSIGN,
        TokenType.SLASH_ASSIGN
      )
    ) {
      const equalsToken = this.previous();
      const value = this.assignment(); // Right-associative

      if (expr instanceof VariableExprNode || expr instanceof ArrayAccessExprNode) {
        return new AssignExprNode(expr, equalsToken.value, value, equalsToken.line, equalsToken.column);
      }
      throw this.error(equalsToken, `Invalid assignment target (l-value required)`);
    }

    return expr;
  }

  logicalOr() {
    let expr = this.logicalAnd();
    while (this.match(TokenType.OR)) {
      const op = this.previous();
      const right = this.logicalAnd();
      expr = new BinaryExprNode(op.value, expr, right, op.line, op.column);
    }
    return expr;
  }

  logicalAnd() {
    let expr = this.equality();
    while (this.match(TokenType.AND)) {
      const op = this.previous();
      const right = this.equality();
      expr = new BinaryExprNode(op.value, expr, right, op.line, op.column);
    }
    return expr;
  }

  equality() {
    let expr = this.relational();
    while (this.match(TokenType.EQ, TokenType.NEQ)) {
      const op = this.previous();
      const right = this.relational();
      expr = new BinaryExprNode(op.value, expr, right, op.line, op.column);
    }
    return expr;
  }

  relational() {
    let expr = this.additive();
    while (this.match(TokenType.LT, TokenType.LTE, TokenType.GT, TokenType.GTE)) {
      const op = this.previous();
      const right = this.additive();
      expr = new BinaryExprNode(op.value, expr, right, op.line, op.column);
    }
    return expr;
  }

  additive() {
    let expr = this.multiplicative();
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const op = this.previous();
      const right = this.multiplicative();
      expr = new BinaryExprNode(op.value, expr, right, op.line, op.column);
    }
    return expr;
  }

  multiplicative() {
    let expr = this.unary();
    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const op = this.previous();
      const right = this.unary();
      expr = new BinaryExprNode(op.value, expr, right, op.line, op.column);
    }
    return expr;
  }

  unary() {
    if (this.match(TokenType.NOT, TokenType.MINUS, TokenType.PLUS, TokenType.INC, TokenType.DEC)) {
      const op = this.previous();
      const operand = this.unary();
      return new UnaryExprNode(op.value, operand, true, op.line, op.column);
    }
    return this.postfix();
  }

  postfix() {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LBRACKET)) {
        // Array subscript
        const indexExpr = this.expression();
        this.consume(TokenType.RBRACKET, `Expected ']' after array index`);
        expr = new ArrayAccessExprNode(expr, indexExpr, expr.line, expr.column);
      } else if (this.match(TokenType.LPAREN)) {
        // Function call
        if (!(expr instanceof VariableExprNode)) {
          throw this.error(this.previous(), `Only identifiers can be called as functions`);
        }
        const args = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.expression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, `Expected ')' after function arguments`);
        expr = new CallExprNode(expr.name, args, expr.line, expr.column);
      } else if (this.match(TokenType.INC, TokenType.DEC)) {
        const op = this.previous();
        expr = new UnaryExprNode(op.value, expr, false, op.line, op.column);
      } else {
        break;
      }
    }

    return expr;
  }

  primary() {
    if (this.match(TokenType.INT_LITERAL)) {
      const tok = this.previous();
      return new LiteralExprNode(tok.value, 'int', tok.line, tok.column);
    }
    if (this.match(TokenType.CHAR_LITERAL)) {
      const tok = this.previous();
      return new LiteralExprNode(tok.value, 'char', tok.line, tok.column);
    }
    if (this.match(TokenType.STRING_LITERAL)) {
      const tok = this.previous();
      return new LiteralExprNode(tok.value, 'string', tok.line, tok.column);
    }
    if (this.match(TokenType.IDENTIFIER)) {
      const tok = this.previous();
      return new VariableExprNode(tok.value, tok.line, tok.column);
    }
    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RPAREN, `Expected ')' after grouped expression`);
      return expr;
    }

    throw this.error(this.peek(), `Expected expression, found '${this.peek().value || this.peek().type}'`);
  }
}

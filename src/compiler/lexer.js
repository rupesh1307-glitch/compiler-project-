// Lexer (Scanner) for Tiny C Language
import { TokenType, KEYWORDS, Token } from './tokens.js';

export class Lexer {
  constructor(source) {
    this.source = source || '';
    this.tokens = [];
    this.errors = [];
    this.start = 0;
    this.current = 0;
    this.line = 1;
    this.column = 1;
    this.tokenStartCol = 1;
  }

  tokenize() {
    this.tokens = [];
    this.errors = [];
    this.start = 0;
    this.current = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      this.start = this.current;
      this.tokenStartCol = this.column;
      this.scanToken();
    }

    this.tokens.push(new Token(TokenType.EOF, '', this.line, this.column, 0));
    return {
      tokens: this.tokens,
      errors: this.errors,
    };
  }

  isAtEnd() {
    return this.current >= this.source.length;
  }

  peek() {
    if (this.isAtEnd()) return '\0';
    return this.source[this.current];
  }

  peekNext() {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source[this.current + 1];
  }

  advance() {
    const c = this.source[this.current];
    this.current++;
    this.column++;
    return c;
  }

  match(expected) {
    if (this.isAtEnd()) return false;
    if (this.source[this.current] !== expected) return false;
    this.current++;
    this.column++;
    return true;
  }

  addToken(type, value = null) {
    const text = value !== null ? value : this.source.slice(this.start, this.current);
    this.tokens.push(new Token(type, text, this.line, this.tokenStartCol, this.current - this.start));
  }

  addError(message) {
    this.errors.push({
      line: this.line,
      column: this.tokenStartCol,
      length: Math.max(1, this.current - this.start),
      message,
    });
  }

  scanToken() {
    const c = this.advance();

    switch (c) {
      // Whitespace
      case ' ':
      case '\r':
      case '\t':
        break;

      case '\n':
        this.line++;
        this.column = 1;
        break;

      // Delimiters
      case '(': this.addToken(TokenType.LPAREN); break;
      case ')': this.addToken(TokenType.RPAREN); break;
      case '{': this.addToken(TokenType.LBRACE); break;
      case '}': this.addToken(TokenType.RBRACE); break;
      case '[': this.addToken(TokenType.LBRACKET); break;
      case ']': this.addToken(TokenType.RBRACKET); break;
      case ',': this.addToken(TokenType.COMMA); break;
      case ';': this.addToken(TokenType.SEMICOLON); break;

      // Operators
      case '+':
        if (this.match('+')) this.addToken(TokenType.INC);
        else if (this.match('=')) this.addToken(TokenType.PLUS_ASSIGN);
        else this.addToken(TokenType.PLUS);
        break;

      case '-':
        if (this.match('-')) this.addToken(TokenType.DEC);
        else if (this.match('=')) this.addToken(TokenType.MINUS_ASSIGN);
        else this.addToken(TokenType.MINUS);
        break;

      case '*':
        if (this.match('=')) this.addToken(TokenType.STAR_ASSIGN);
        else this.addToken(TokenType.STAR);
        break;

      case '%':
        this.addToken(TokenType.PERCENT);
        break;

      case '/':
        if (this.match('/')) {
          // Single-line comment: skip until end of line
          while (this.peek() !== '\n' && !this.isAtEnd()) {
            this.advance();
          }
        } else if (this.match('*')) {
          // Multi-line comment: skip until */
          this.scanBlockComment();
        } else if (this.match('=')) {
          this.addToken(TokenType.SLASH_ASSIGN);
        } else {
          this.addToken(TokenType.SLASH);
        }
        break;

      case '!':
        if (this.match('=')) this.addToken(TokenType.NEQ);
        else this.addToken(TokenType.NOT);
        break;

      case '=':
        if (this.match('=')) this.addToken(TokenType.EQ);
        else this.addToken(TokenType.ASSIGN);
        break;

      case '<':
        if (this.match('=')) this.addToken(TokenType.LTE);
        else this.addToken(TokenType.LT);
        break;

      case '>':
        if (this.match('=')) this.addToken(TokenType.GTE);
        else this.addToken(TokenType.GT);
        break;

      case '&':
        if (this.match('&')) {
          this.addToken(TokenType.AND);
        } else {
          this.addError(`Unexpected character '&'. Did you mean '&&'?`);
        }
        break;

      case '|':
        if (this.match('|')) {
          this.addToken(TokenType.OR);
        } else {
          this.addError(`Unexpected character '|'. Did you mean '||'?`);
        }
        break;

      case '"':
        this.scanString();
        break;

      case "'":
        this.scanChar();
        break;

      default:
        if (this.isDigit(c)) {
          this.scanNumber();
        } else if (this.isAlpha(c)) {
          this.scanIdentifier();
        } else {
          this.addError(`Unexpected character '${c}'`);
        }
        break;
    }
  }

  scanBlockComment() {
    const startLine = this.line;
    const startCol = this.tokenStartCol;
    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance(); // consume *
        this.advance(); // consume /
        return;
      }
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
      }
      this.advance();
    }
    this.errors.push({
      line: startLine,
      column: startCol,
      length: 2,
      message: 'Unterminated block comment /* ... */',
    });
  }

  scanString() {
    let val = '';
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      if (this.peek() === '\\') {
        this.advance();
        const esc = this.advance();
        if (esc === 'n') val += '\n';
        else if (esc === 't') val += '\t';
        else if (esc === 'r') val += '\r';
        else if (esc === '\\') val += '\\';
        else if (esc === '"') val += '"';
        else val += esc;
      } else {
        val += this.advance();
      }
    }

    if (this.isAtEnd()) {
      this.addError('Unterminated string literal');
      return;
    }

    this.advance(); // closing quote
    this.addToken(TokenType.STRING_LITERAL, val);
  }

  scanChar() {
    let charVal = '';
    if (this.peek() === '\\') {
      this.advance();
      const esc = this.advance();
      if (esc === 'n') charVal = '\n';
      else if (esc === 't') charVal = '\t';
      else if (esc === '0') charVal = '\0';
      else if (esc === '\\') charVal = '\\';
      else if (esc === "'") charVal = "'";
      else charVal = esc;
    } else if (!this.isAtEnd() && this.peek() !== "'") {
      charVal = this.advance();
    }

    if (!this.match("'")) {
      this.addError("Unterminated character literal, expected closing single quote '");
      return;
    }

    this.addToken(TokenType.CHAR_LITERAL, charVal);
  }

  scanNumber() {
    while (this.isDigit(this.peek())) {
      this.advance();
    }
    const text = this.source.slice(this.start, this.current);
    this.addToken(TokenType.INT_LITERAL, parseInt(text, 10));
  }

  scanIdentifier() {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }
    const text = this.source.slice(this.start, this.current);
    const type = KEYWORDS[text] || TokenType.IDENTIFIER;
    this.addToken(type, text);
  }

  isDigit(c) {
    return c >= '0' && c <= '9';
  }

  isAlpha(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  isAlphaNumeric(c) {
    return this.isAlpha(c) || this.isDigit(c);
  }
}

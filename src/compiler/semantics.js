// Semantic Analyzer and Symbol Table for Tiny C
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

export class Symbol {
  constructor({ name, category, type, isArray = false, arraySize = null, params = [], scopeDepth = 0, line = 0, column = 0, offset = 0 }) {
    this.name = name;
    this.category = category; // 'variable' | 'array' | 'function' | 'builtin'
    this.type = type; // 'int' | 'char' | 'void'
    this.isArray = isArray;
    this.arraySize = arraySize;
    this.params = params; // [{ type, name, isArray }]
    this.scopeDepth = scopeDepth;
    this.line = line;
    this.column = column;
    this.offset = offset;
  }
}

export class Scope {
  constructor(name = 'global', parent = null, depth = 0) {
    this.name = name;
    this.parent = parent;
    this.depth = depth;
    this.symbols = new Map();
    this.children = [];
    if (parent) {
      parent.children.push(this);
    }
  }

  define(symbol) {
    this.symbols.set(symbol.name, symbol);
  }

  lookup(name) {
    if (this.symbols.has(name)) {
      return this.symbols.get(name);
    }
    if (this.parent) {
      return this.parent.lookup(name);
    }
    return null;
  }

  lookupLocal(name) {
    return this.symbols.get(name) || null;
  }
}

export class SemanticAnalyzer {
  constructor() {
    this.globalScope = new Scope('global', null, 0);
    this.currentScope = this.globalScope;
    this.errors = [];
    this.warnings = [];
    this.allScopes = [this.globalScope];
    this.currentFunction = null;
    this.loopDepth = 0;
    this.localOffset = 0;

    this.initBuiltins();
  }

  initBuiltins() {
    const builtins = [
      { name: 'print', type: 'void', params: [{ type: 'int', name: 'val', isArray: false }] },
      { name: 'println', type: 'void', params: [] },
      { name: 'print_int', type: 'void', params: [{ type: 'int', name: 'val', isArray: false }] },
      { name: 'print_char', type: 'void', params: [{ type: 'char', name: 'val', isArray: false }] },
      { name: 'print_str', type: 'void', params: [{ type: 'string', name: 'val', isArray: false }] },
      { name: 'read_int', type: 'int', params: [] },
    ];

    for (const b of builtins) {
      this.globalScope.define(
        new Symbol({
          name: b.name,
          category: 'builtin',
          type: b.type,
          params: b.params,
          scopeDepth: 0,
        })
      );
    }
  }

  analyze(ast) {
    this.errors = [];
    this.warnings = [];
    this.allScopes = [this.globalScope];
    this.currentScope = this.globalScope;
    this.currentFunction = null;
    this.loopDepth = 0;

    this.visit(ast);

    // Check if main() function exists
    const mainSym = this.globalScope.lookup('main');
    if (!mainSym || (mainSym.category !== 'function')) {
      this.warnings.push({
        line: 1,
        column: 1,
        message: "Program has no 'main()' function. You can define 'int main() { ... }' as the entry point.",
      });
    }

    return {
      errors: this.errors,
      warnings: this.warnings,
      globalScope: this.globalScope,
      allScopes: this.allScopes,
    };
  }

  enterScope(name) {
    const newScope = new Scope(name, this.currentScope, this.currentScope.depth + 1);
    this.currentScope = newScope;
    this.allScopes.push(newScope);
    return newScope;
  }

  exitScope() {
    if (this.currentScope.parent) {
      this.currentScope = this.currentScope.parent;
    }
  }

  addError(node, message) {
    this.errors.push({
      line: node ? node.line : 0,
      column: node ? node.column : 0,
      message,
    });
  }

  addWarning(node, message) {
    this.warnings.push({
      line: node ? node.line : 0,
      column: node ? node.column : 0,
      message,
    });
  }

  visit(node) {
    if (!node) return null;

    switch (node.nodeType) {
      case 'Program':
        return this.visitProgram(node);
      case 'VarDecl':
        return this.visitVarDecl(node);
      case 'FunctionDecl':
        return this.visitFunctionDecl(node);
      case 'Block':
        return this.visitBlock(node);
      case 'IfStmt':
        return this.visitIfStmt(node);
      case 'WhileStmt':
        return this.visitWhileStmt(node);
      case 'ForStmt':
        return this.visitForStmt(node);
      case 'ReturnStmt':
        return this.visitReturnStmt(node);
      case 'BreakStmt':
        return this.visitBreakStmt(node);
      case 'ContinueStmt':
        return this.visitContinueStmt(node);
      case 'ExprStmt':
        return this.visitExprStmt(node);
      case 'BinaryExpr':
        return this.visitBinaryExpr(node);
      case 'UnaryExpr':
        return this.visitUnaryExpr(node);
      case 'AssignExpr':
        return this.visitAssignExpr(node);
      case 'CallExpr':
        return this.visitCallExpr(node);
      case 'ArrayAccessExpr':
        return this.visitArrayAccessExpr(node);
      case 'VariableExpr':
        return this.visitVariableExpr(node);
      case 'LiteralExpr':
        return this.visitLiteralExpr(node);
      default:
        return null;
    }
  }

  visitProgram(node) {
    for (const decl of node.declarations) {
      this.visit(decl);
    }
  }

  visitVarDecl(node) {
    const existing = this.currentScope.lookupLocal(node.name);
    if (existing) {
      this.addError(node, `Redeclaration of variable '${node.name}' in the same scope`);
      return;
    }

    if (node.type === 'void') {
      this.addError(node, `Variable '${node.name}' cannot have 'void' type`);
      return;
    }

    if (node.isArray && node.arraySize !== null && node.arraySize <= 0) {
      this.addError(node, `Array '${node.name}' must have size greater than 0`);
    }

    if (node.initExpr) {
      const initType = this.visit(node.initExpr);
      if (node.isArray) {
        this.addError(node, `Cannot initialize array '${node.name}' with direct assignment`);
      } else if (initType && initType !== 'error' && initType !== node.type) {
        // Warning or allow implicit conversion between int & char
        if (!((node.type === 'int' && initType === 'char') || (node.type === 'char' && initType === 'int'))) {
          this.addWarning(node, `Type mismatch in initialization of '${node.name}': expected '${node.type}', got '${initType}'`);
        }
      }
    }

    const symbol = new Symbol({
      name: node.name,
      category: node.isArray ? 'array' : 'variable',
      type: node.type,
      isArray: node.isArray,
      arraySize: node.arraySize,
      scopeDepth: this.currentScope.depth,
      line: node.line,
      column: node.column,
      offset: this.localOffset++,
    });

    this.currentScope.define(symbol);
    node.symbol = symbol;
  }

  visitFunctionDecl(node) {
    const existing = this.globalScope.lookupLocal(node.name);
    if (existing) {
      this.addError(node, `Redefinition of function '${node.name}'`);
      return;
    }

    const fnSymbol = new Symbol({
      name: node.name,
      category: 'function',
      type: node.returnType,
      params: node.params,
      scopeDepth: 0,
      line: node.line,
      column: node.column,
    });
    this.globalScope.define(fnSymbol);
    node.symbol = fnSymbol;

    const prevFunc = this.currentFunction;
    const prevOffset = this.localOffset;
    this.currentFunction = fnSymbol;
    this.localOffset = 0;

    this.enterScope(`fn_${node.name}`);

    // Register parameters into function scope
    for (const p of node.params) {
      const pSym = new Symbol({
        name: p.name,
        category: p.isArray ? 'array' : 'variable',
        type: p.type,
        isArray: p.isArray,
        scopeDepth: this.currentScope.depth,
        line: p.line || node.line,
        column: p.column || node.column,
        offset: this.localOffset++,
      });
      this.currentScope.define(pSym);
    }

    if (node.body) {
      // Body is a BlockNode, visit its statements directly without creating an extra redundant scope
      for (const stmt of node.body.statements) {
        this.visit(stmt);
      }
    }

    this.exitScope();
    this.currentFunction = prevFunc;
    this.localOffset = prevOffset;
  }

  visitBlock(node) {
    this.enterScope(`block_d${this.currentScope.depth + 1}`);
    for (const stmt of node.statements) {
      this.visit(stmt);
    }
    this.exitScope();
  }

  visitIfStmt(node) {
    this.visit(node.condition);
    this.visit(node.thenBranch);
    if (node.elseBranch) {
      this.visit(node.elseBranch);
    }
  }

  visitWhileStmt(node) {
    this.visit(node.condition);
    this.loopDepth++;
    this.visit(node.body);
    this.loopDepth--;
  }

  visitForStmt(node) {
    this.enterScope(`for_loop`);
    if (node.init) this.visit(node.init);
    if (node.condition) this.visit(node.condition);
    if (node.update) this.visit(node.update);

    this.loopDepth++;
    this.visit(node.body);
    this.loopDepth--;

    this.exitScope();
  }

  visitReturnStmt(node) {
    if (!this.currentFunction) {
      this.addError(node, `'return' statement outside of function definition`);
      return;
    }

    if (node.value) {
      const retType = this.visit(node.value);
      if (this.currentFunction.type === 'void') {
        this.addError(node, `Function '${this.currentFunction.name}' is declared 'void' and cannot return a value`);
      }
    } else {
      if (this.currentFunction.type !== 'void') {
        this.addWarning(node, `Function '${this.currentFunction.name}' declared '${this.currentFunction.type}' should return a value`);
      }
    }
  }

  visitBreakStmt(node) {
    if (this.loopDepth <= 0) {
      this.addError(node, `'break' statement must be inside a loop`);
    }
  }

  visitContinueStmt(node) {
    if (this.loopDepth <= 0) {
      this.addError(node, `'continue' statement must be inside a loop`);
    }
  }

  visitExprStmt(node) {
    this.visit(node.expression);
  }

  visitBinaryExpr(node) {
    const leftType = this.visit(node.left);
    const rightType = this.visit(node.right);

    const relational = ['==', '!=', '<', '<=', '>', '>=', '&&', '||'];
    if (relational.includes(node.operator)) {
      return 'int'; // boolean result in C is int
    }

    return leftType || 'int';
  }

  visitUnaryExpr(node) {
    const operandType = this.visit(node.operand);
    if (['++', '--'].includes(node.operator)) {
      if (!(node.operand instanceof VariableExprNode || node.operand instanceof ArrayAccessExprNode)) {
        this.addError(node, `Operator '${node.operator}' requires an l-value (variable or array element)`);
      }
    }
    return operandType;
  }

  visitAssignExpr(node) {
    const targetType = this.visit(node.target);
    const valueType = this.visit(node.value);

    if (node.target instanceof VariableExprNode) {
      const sym = this.currentScope.lookup(node.target.name);
      if (sym && sym.isArray) {
        this.addError(node, `Cannot assign directly to array '${node.target.name}'`);
      }
    }

    return targetType;
  }

  visitCallExpr(node) {
    const sym = this.currentScope.lookup(node.callee);
    if (!sym) {
      this.addError(node, `Undefined function '${node.callee}' called`);
      return 'int';
    }

    if (sym.category !== 'function' && sym.category !== 'builtin') {
      this.addError(node, `'${node.callee}' is a ${sym.category}, not a function`);
      return 'int';
    }

    // Argument count check (for non-variadic builtins)
    if (sym.name !== 'printf') {
      if (sym.params && node.args.length !== sym.params.length) {
        this.addError(node, `Function '${node.callee}' expects ${sym.params.length} arguments, but got ${node.args.length}`);
      }
    }

    for (const arg of node.args) {
      this.visit(arg);
    }

    return sym.type;
  }

  visitArrayAccessExpr(node) {
    let arrayName = '';
    if (node.array instanceof VariableExprNode) {
      arrayName = node.array.name;
    } else if (typeof node.array === 'string') {
      arrayName = node.array;
    }

    const sym = this.currentScope.lookup(arrayName);
    if (!sym) {
      this.addError(node, `Undefined array '${arrayName}'`);
      return 'int';
    }

    if (!sym.isArray) {
      this.addError(node, `'${arrayName}' is not an array and cannot be indexed`);
    }

    this.visit(node.index);
    return sym.type;
  }

  visitVariableExpr(node) {
    const sym = this.currentScope.lookup(node.name);
    if (!sym) {
      this.addError(node, `Undefined variable '${node.name}'`);
      return 'error';
    }
    node.symbol = sym;
    return sym.type;
  }

  visitLiteralExpr(node) {
    return node.literalType;
  }
}

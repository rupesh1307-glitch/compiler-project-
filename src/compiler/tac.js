// Intermediate Code Generator (Three-Address Code - TAC) for Tiny C
import { VariableExprNode, ArrayAccessExprNode } from './ast.js';

export class TACInstruction {
  constructor(op, arg1 = null, arg2 = null, result = null, comment = '') {
    this.op = op; // '+', '-', '*', '/', '=', 'label', 'goto', 'ifFalse', 'call', 'param', 'return', etc.
    this.arg1 = arg1;
    this.arg2 = arg2;
    this.result = result;
    this.comment = comment;
  }

  toString() {
    switch (this.op) {
      case 'label':
        return `${this.result}:`;
      case 'goto':
        return `goto ${this.result}`;
      case 'if':
        return `if ${this.arg1} goto ${this.result}`;
      case 'ifFalse':
        return `ifFalse ${this.arg1} goto ${this.result}`;
      case '=':
        return `${this.result} = ${this.arg1}`;
      case '+=':
      case '-=':
      case '*=':
      case '/=':
        return `${this.result} = ${this.result} ${this.op[0]} ${this.arg1}`;
      case 'param':
        return `param ${this.arg1}`;
      case 'call':
        if (this.result) {
          return `${this.result} = call ${this.arg1}, ${this.arg2}`;
        }
        return `call ${this.arg1}, ${this.arg2}`;
      case 'return':
        return this.arg1 !== null ? `return ${this.arg1}` : `return`;
      case 'array_load':
        return `${this.result} = ${this.arg1}[${this.arg2}]`;
      case 'array_store':
        return `${this.result}[${this.arg1}] = ${this.arg2}`;
      case 'alloc_array':
        return `alloc_array ${this.result}[${this.arg1}]`;
      case 'func_begin':
        return `\n; --- Function ${this.arg1} ---`;
      case 'func_end':
        return `; --- End Function ${this.arg1} ---\n`;
      default:
        // Binary arithmetic or logical: result = arg1 op arg2
        if (this.arg2 !== null) {
          return `${this.result} = ${this.arg1} ${this.op} ${this.arg2}`;
        }
        // Unary: result = op arg1
        if (this.arg1 !== null) {
          return `${this.result} = ${this.op} ${this.arg1}`;
        }
        return `${this.op} ${this.result || ''}`;
    }
  }
}

export class TACGenerator {
  constructor() {
    this.instructions = [];
    this.tempCounter = 0;
    this.labelCounter = 0;
    this.loopStack = []; // for break and continue
  }

  newTemp() {
    return `t${this.tempCounter++}`;
  }

  newLabel() {
    return `L${this.labelCounter++}`;
  }

  emit(op, arg1 = null, arg2 = null, result = null, comment = '') {
    const instr = new TACInstruction(op, arg1, arg2, result, comment);
    this.instructions.push(instr);
    return instr;
  }

  generate(ast) {
    this.instructions = [];
    this.tempCounter = 0;
    this.labelCounter = 0;
    this.loopStack = [];

    this.visit(ast);
    return this.instructions;
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
    // 1. Emit global variable declarations first
    for (const decl of node.declarations) {
      if (decl.nodeType === 'VarDecl') {
        this.visit(decl);
      }
    }

    // 2. Invoke main entry point if present
    const hasMain = node.declarations.some(
      (d) => d.nodeType === 'FunctionDecl' && d.name === 'main'
    );
    if (hasMain) {
      this.emit('call', 'main', 0);
      this.emit('return');
    }

    // 3. Emit function declarations
    for (const decl of node.declarations) {
      if (decl.nodeType === 'FunctionDecl') {
        this.visit(decl);
      }
    }
  }

  visitVarDecl(node) {
    if (node.isArray) {
      this.emit('alloc_array', node.arraySize || 0, null, node.name);
    }
    if (node.initExpr) {
      const val = this.visit(node.initExpr);
      this.emit('=', val, null, node.name);
    }
    return node.name;
  }

  visitFunctionDecl(node) {
    this.emit('func_begin', node.name);
    this.emit('label', null, null, node.name);

    // Param declarations
    for (let i = 0; i < node.params.length; i++) {
      const p = node.params[i];
      this.emit('param_get', i, null, p.name);
    }

    if (node.body) {
      this.visit(node.body);
    }

    // Default return void if not explicit
    this.emit('return', null);
    this.emit('func_end', node.name);
  }

  visitBlock(node) {
    for (const stmt of node.statements) {
      this.visit(stmt);
    }
  }

  visitIfStmt(node) {
    const cond = this.visit(node.condition);
    const elseLabel = node.elseBranch ? this.newLabel() : null;
    const endLabel = this.newLabel();

    const targetFalseLabel = elseLabel || endLabel;
    this.emit('ifFalse', cond, null, targetFalseLabel);

    this.visit(node.thenBranch);

    if (node.elseBranch) {
      this.emit('goto', null, null, endLabel);
      this.emit('label', null, null, elseLabel);
      this.visit(node.elseBranch);
    }

    this.emit('label', null, null, endLabel);
  }

  visitWhileStmt(node) {
    const startLabel = this.newLabel();
    const endLabel = this.newLabel();

    this.loopStack.push({ start: startLabel, end: endLabel });

    this.emit('label', null, null, startLabel);
    const cond = this.visit(node.condition);
    this.emit('ifFalse', cond, null, endLabel);

    this.visit(node.body);

    this.emit('goto', null, null, startLabel);
    this.emit('label', null, null, endLabel);

    this.loopStack.pop();
  }

  visitForStmt(node) {
    const condLabel = this.newLabel();
    const updateLabel = this.newLabel();
    const endLabel = this.newLabel();

    if (node.init) {
      this.visit(node.init);
    }

    this.loopStack.push({ start: updateLabel, end: endLabel });

    this.emit('label', null, null, condLabel);

    if (node.condition) {
      const cond = this.visit(node.condition);
      this.emit('ifFalse', cond, null, endLabel);
    }

    this.visit(node.body);

    this.emit('label', null, null, updateLabel);
    if (node.update) {
      this.visit(node.update);
    }

    this.emit('goto', null, null, condLabel);
    this.emit('label', null, null, endLabel);

    this.loopStack.pop();
  }

  visitReturnStmt(node) {
    let retVal = null;
    if (node.value) {
      retVal = this.visit(node.value);
    }
    this.emit('return', retVal);
  }

  visitBreakStmt(node) {
    if (this.loopStack.length > 0) {
      const currentLoop = this.loopStack[this.loopStack.length - 1];
      this.emit('goto', null, null, currentLoop.end);
    }
  }

  visitContinueStmt(node) {
    if (this.loopStack.length > 0) {
      const currentLoop = this.loopStack[this.loopStack.length - 1];
      this.emit('goto', null, null, currentLoop.start);
    }
  }

  visitExprStmt(node) {
    this.visit(node.expression);
  }

  visitBinaryExpr(node) {
    // Short-circuit logical AND / OR handling
    if (node.operator === '&&') {
      const result = this.newTemp();
      const falseLabel = this.newLabel();
      const endLabel = this.newLabel();

      const left = this.visit(node.left);
      this.emit('ifFalse', left, null, falseLabel);

      const right = this.visit(node.right);
      this.emit('ifFalse', right, null, falseLabel);

      this.emit('=', 1, null, result);
      this.emit('goto', null, null, endLabel);

      this.emit('label', null, null, falseLabel);
      this.emit('=', 0, null, result);

      this.emit('label', null, null, endLabel);
      return result;
    }

    if (node.operator === '||') {
      const result = this.newTemp();
      const trueLabel = this.newLabel();
      const endLabel = this.newLabel();

      const left = this.visit(node.left);
      this.emit('if', left, null, trueLabel);

      const right = this.visit(node.right);
      this.emit('if', right, null, trueLabel);

      this.emit('=', 0, null, result);
      this.emit('goto', null, null, endLabel);

      this.emit('label', null, null, trueLabel);
      this.emit('=', 1, null, result);

      this.emit('label', null, null, endLabel);
      return result;
    }

    const left = this.visit(node.left);
    const right = this.visit(node.right);
    const result = this.newTemp();

    this.emit(node.operator, left, right, result);
    return result;
  }

  visitUnaryExpr(node) {
    if (node.operator === '++' || node.operator === '--') {
      const op = node.operator === '++' ? '+' : '-';
      const target = node.operand.name;
      if (node.isPrefix) {
        // ++x: x = x + 1, return x
        this.emit(op, target, 1, target);
        return target;
      } else {
        // x++: old = x; x = x + 1; return old
        const oldTemp = this.newTemp();
        this.emit('=', target, null, oldTemp);
        this.emit(op, target, 1, target);
        return oldTemp;
      }
    }

    const operand = this.visit(node.operand);
    const result = this.newTemp();
    this.emit(node.operator, operand, null, result);
    return result;
  }

  visitAssignExpr(node) {
    const value = this.visit(node.value);

    if (node.target instanceof VariableExprNode) {
      if (node.operator === '=') {
        this.emit('=', value, null, node.target.name);
      } else {
        const op = node.operator[0]; // '+', '-', '*', '/'
        this.emit(op, node.target.name, value, node.target.name);
      }
      return node.target.name;
    }

    if (node.target instanceof ArrayAccessExprNode) {
      const arrayName = node.target.array.name || node.target.array;
      const index = this.visit(node.target.index);
      if (node.operator === '=') {
        this.emit('array_store', index, value, arrayName);
      } else {
        const op = node.operator[0];
        const temp = this.newTemp();
        this.emit('array_load', arrayName, index, temp);
        this.emit(op, temp, value, temp);
        this.emit('array_store', index, temp, arrayName);
      }
      return value;
    }

    return value;
  }

  visitCallExpr(node) {
    const evaluatedArgs = [];
    for (const arg of node.args) {
      evaluatedArgs.push(this.visit(arg));
    }

    for (const a of evaluatedArgs) {
      this.emit('param', a);
    }

    const result = this.newTemp();
    this.emit('call', node.callee, evaluatedArgs.length, result);
    return result;
  }

  visitArrayAccessExpr(node) {
    const arrayName = node.array.name || node.array;
    const index = this.visit(node.index);
    const result = this.newTemp();
    this.emit('array_load', arrayName, index, result);
    return result;
  }

  visitVariableExpr(node) {
    return node.name;
  }

  visitLiteralExpr(node) {
    if (node.literalType === 'string') {
      return JSON.stringify(node.value);
    }
    if (node.literalType === 'char') {
      return `'${node.value}'`;
    }
    return node.value;
  }
}

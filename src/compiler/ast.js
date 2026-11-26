// Abstract Syntax Tree (AST) node definitions for Tiny C

export class ASTNode {
  constructor(nodeType, line = 0, column = 0) {
    this.nodeType = nodeType;
    this.line = line;
    this.column = column;
  }
}

export class ProgramNode extends ASTNode {
  constructor(declarations = [], line = 1, column = 1) {
    super('Program', line, column);
    this.declarations = declarations;
  }
}

export class VarDeclNode extends ASTNode {
  constructor(type, name, isArray = false, arraySize = null, initExpr = null, line = 0, column = 0) {
    super('VarDecl', line, column);
    this.type = type; // 'int' | 'char' | 'void'
    this.name = name;
    this.isArray = isArray;
    this.arraySize = arraySize; // number or null
    this.initExpr = initExpr; // ASTNode or null
  }
}

export class FunctionDeclNode extends ASTNode {
  constructor(returnType, name, params = [], body = null, line = 0, column = 0) {
    super('FunctionDecl', line, column);
    this.returnType = returnType;
    this.name = name;
    this.params = params; // array of { type, name, isArray }
    this.body = body; // BlockNode
  }
}

export class BlockNode extends ASTNode {
  constructor(statements = [], line = 0, column = 0) {
    super('Block', line, column);
    this.statements = statements;
  }
}

export class IfStmtNode extends ASTNode {
  constructor(condition, thenBranch, elseBranch = null, line = 0, column = 0) {
    super('IfStmt', line, column);
    this.condition = condition;
    this.thenBranch = thenBranch;
    this.elseBranch = elseBranch;
  }
}

export class WhileStmtNode extends ASTNode {
  constructor(condition, body, line = 0, column = 0) {
    super('WhileStmt', line, column);
    this.condition = condition;
    this.body = body;
  }
}

export class ForStmtNode extends ASTNode {
  constructor(init, condition, update, body, line = 0, column = 0) {
    super('ForStmt', line, column);
    this.init = init; // VarDecl, Expr, or null
    this.condition = condition; // Expr or null
    this.update = update; // Expr or null
    this.body = body;
  }
}

export class ReturnStmtNode extends ASTNode {
  constructor(value = null, line = 0, column = 0) {
    super('ReturnStmt', line, column);
    this.value = value;
  }
}

export class BreakStmtNode extends ASTNode {
  constructor(line = 0, column = 0) {
    super('BreakStmt', line, column);
  }
}

export class ContinueStmtNode extends ASTNode {
  constructor(line = 0, column = 0) {
    super('ContinueStmt', line, column);
  }
}

export class ExprStmtNode extends ASTNode {
  constructor(expression, line = 0, column = 0) {
    super('ExprStmt', line, column);
    this.expression = expression;
  }
}

export class BinaryExprNode extends ASTNode {
  constructor(operator, left, right, line = 0, column = 0) {
    super('BinaryExpr', line, column);
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
}

export class UnaryExprNode extends ASTNode {
  constructor(operator, operand, isPrefix = true, line = 0, column = 0) {
    super('UnaryExpr', line, column);
    this.operator = operator;
    this.operand = operand;
    this.isPrefix = isPrefix;
  }
}

export class AssignExprNode extends ASTNode {
  constructor(target, operator, value, line = 0, column = 0) {
    super('AssignExpr', line, column);
    this.target = target; // VariableExprNode or ArrayAccessExprNode
    this.operator = operator; // '=', '+=', '-=', etc.
    this.value = value;
  }
}

export class CallExprNode extends ASTNode {
  constructor(callee, args = [], line = 0, column = 0) {
    super('CallExpr', line, column);
    this.callee = callee; // string function name
    this.args = args; // array of expressions
  }
}

export class ArrayAccessExprNode extends ASTNode {
  constructor(array, index, line = 0, column = 0) {
    super('ArrayAccessExpr', line, column);
    this.array = array; // VariableExprNode or string
    this.index = index; // ExprNode
  }
}

export class VariableExprNode extends ASTNode {
  constructor(name, line = 0, column = 0) {
    super('VariableExpr', line, column);
    this.name = name;
  }
}

export class LiteralExprNode extends ASTNode {
  constructor(value, literalType, line = 0, column = 0) {
    super('LiteralExpr', line, column);
    this.value = value;
    this.literalType = literalType; // 'int' | 'char' | 'string'
  }
}

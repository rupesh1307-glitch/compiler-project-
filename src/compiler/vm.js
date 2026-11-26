// Stack Virtual Machine (TinyVM) and Bytecode Generator for Tiny C

export class BytecodeInstruction {
  constructor(op, arg = null, ip = 0, comment = '') {
    this.op = op;
    this.arg = arg;
    this.ip = ip;
    this.comment = comment;
  }

  toString() {
    const ipStr = String(this.ip).padStart(4, '0');
    const argStr = this.arg !== null ? JSON.stringify(this.arg) : '';
    const commentStr = this.comment ? ` ; ${this.comment}` : '';
    return `${ipStr}:  ${this.op.padEnd(16)} ${argStr}${commentStr}`;
  }
}

export class BytecodeEmitter {
  constructor() {
    this.instructions = [];
    this.labelAddresses = new Map();
    this.fixups = []; // { index, label }
  }

  emit(op, arg = null, comment = '') {
    const ip = this.instructions.length;
    const inst = new BytecodeInstruction(op, arg, ip, comment);
    this.instructions.push(inst);
    return inst;
  }

  generate(tacInstructions) {
    this.instructions = [];
    this.labelAddresses.clear();
    this.fixups = [];

    // First pass: emit instructions and track label addresses
    for (const tac of tacInstructions) {
      if (tac.op === 'label') {
        this.labelAddresses.set(tac.result, this.instructions.length);
        continue;
      }
      if (tac.op === 'func_begin' || tac.op === 'func_end') {
        continue;
      }

      this.translateTac(tac);
    }

    // Ensure program ends with HALT
    this.emit('HALT');

    // Second pass: resolve label jump addresses
    for (const fixup of this.fixups) {
      const targetIp = this.labelAddresses.get(fixup.label);
      if (targetIp !== undefined) {
        if (typeof this.instructions[fixup.index].arg === 'object' && this.instructions[fixup.index].arg !== null) {
          this.instructions[fixup.index].arg.targetIp = targetIp;
        } else {
          this.instructions[fixup.index].arg = targetIp;
        }
      } else {
        console.warn(`Unresolved label: ${fixup.label}`);
      }
    }

    return this.instructions;
  }

  translateTac(tac) {
    switch (tac.op) {
      case '=':
        // result = arg1
        this.emitPush(tac.arg1);
        this.emit('STORE', tac.result);
        break;

      case '+':
      case '-':
      case '*':
      case '/':
      case '%':
      case '==':
      case '!=':
      case '<':
      case '<=':
      case '>':
      case '>=':
      case '&&':
      case '||': {
        this.emitPush(tac.arg1);
        this.emitPush(tac.arg2);
        const opMap = {
          '+': 'ADD',
          '-': 'SUB',
          '*': 'MUL',
          '/': 'DIV',
          '%': 'MOD',
          '==': 'EQ',
          '!=': 'NEQ',
          '<': 'LT',
          '<=': 'LTE',
          '>': 'GT',
          '>=': 'GTE',
          '&&': 'AND',
          '||': 'OR',
        };
        this.emit(opMap[tac.op] || 'ADD');
        this.emit('STORE', tac.result);
        break;
      }

      case '!':
        this.emitPush(tac.arg1);
        this.emit('NOT');
        this.emit('STORE', tac.result);
        break;

      case 'goto': {
        const idx = this.instructions.length;
        this.emit('JMP', null, `goto ${tac.result}`);
        this.fixups.push({ index: idx, label: tac.result });
        break;
      }

      case 'if': {
        this.emitPush(tac.arg1);
        const idx = this.instructions.length;
        this.emit('JMP_IF_NOT_ZERO', null, `if ${tac.arg1} goto ${tac.result}`);
        this.fixups.push({ index: idx, label: tac.result });
        break;
      }

      case 'ifFalse': {
        this.emitPush(tac.arg1);
        const idx = this.instructions.length;
        this.emit('JMP_IF_ZERO', null, `ifFalse ${tac.arg1} goto ${tac.result}`);
        this.fixups.push({ index: idx, label: tac.result });
        break;
      }

      case 'param':
        this.emitPush(tac.arg1);
        break;

      case 'param_get':
        // tac.arg1 is parameter index, tac.result is parameter name
        this.emit('PARAM_GET', { index: tac.arg1, name: tac.result });
        break;

      case 'call': {
        const callee = tac.arg1;
        const argCount = tac.arg2;

        if (callee === 'print' || callee === 'print_int') {
          this.emit('PRINT');
          if (tac.result) {
            this.emit('PUSH_CONST', 0);
            this.emit('STORE', tac.result);
          }
        } else if (callee === 'println') {
          this.emit('PRINTLN');
          if (tac.result) {
            this.emit('PUSH_CONST', 0);
            this.emit('STORE', tac.result);
          }
        } else if (callee === 'print_char') {
          this.emit('PRINT_CHAR');
          if (tac.result) {
            this.emit('PUSH_CONST', 0);
            this.emit('STORE', tac.result);
          }
        } else if (callee === 'print_str') {
          this.emit('PRINT_STR');
          if (tac.result) {
            this.emit('PUSH_CONST', 0);
            this.emit('STORE', tac.result);
          }
        } else if (callee === 'read_int') {
          this.emit('READ_INT');
          if (tac.result) this.emit('STORE', tac.result);
        } else {
          const idx = this.instructions.length;
          this.emit('CALL', { func: callee, args: argCount, targetIp: null });
          this.fixups.push({ index: idx, label: callee });
          if (tac.result) {
            this.emit('STORE', tac.result);
          }
        }
        break;
      }

      case 'return':
        if (tac.arg1 !== null) {
          this.emitPush(tac.arg1);
        } else {
          this.emit('PUSH_CONST', 0); // default return 0
        }
        this.emit('RET');
        break;

      case 'alloc_array':
        this.emit('ALLOC_ARRAY', { name: tac.result, size: tac.arg1 || 10 });
        break;

      case 'array_store':
        // result[arg1] = arg2
        this.emitPush(tac.arg1); // index
        this.emitPush(tac.arg2); // value
        this.emit('ASTORE', tac.result);
        break;

      case 'array_load':
        // result = arg1[arg2]
        this.emitPush(tac.arg2); // index
        this.emit('ALOAD', tac.arg1);
        this.emit('STORE', tac.result);
        break;
    }
  }

  emitPush(val) {
    if (typeof val === 'number') {
      this.emit('PUSH_CONST', val);
    } else if (typeof val === 'string') {
      if (val.startsWith('"') && val.endsWith('"')) {
        try {
          this.emit('PUSH_CONST', JSON.parse(val));
        } catch (e) {
          this.emit('PUSH_CONST', val.slice(1, -1));
        }
      } else if (val.startsWith("'") && val.endsWith("'")) {
        const inner = val.slice(1, -1);
        this.emit('PUSH_CONST', inner.charCodeAt(0));
      } else if (!isNaN(val) && val.trim() !== '') {
        this.emit('PUSH_CONST', Number(val));
      } else {
        this.emit('LOAD', val);
      }
    } else {
      this.emit('PUSH_CONST', val);
    }
  }
}

export class TinyVM {
  constructor(bytecode = []) {
    this.bytecode = bytecode;
    this.reset();
  }

  reset() {
    this.ip = 0;
    this.stack = [];
    this.callStack = [];
    this.globals = new Map();
    this.heap = new Map(); // arrayName -> Array
    this.output = [];
    this.isHalted = false;
    this.isWaitingForInput = false;
    this.stepsCount = 0;
    this.inputPromptCallback = null;
  }

  loadBytecode(bytecode) {
    this.bytecode = bytecode;
    this.reset();
  }

  getVar(name) {
    // Check local frame first
    if (this.callStack.length > 0) {
      const topFrame = this.callStack[this.callStack.length - 1];
      if (topFrame.locals.has(name)) {
        return topFrame.locals.get(name);
      }
    }
    return this.globals.has(name) ? this.globals.get(name) : 0;
  }

  setVar(name, val) {
    if (this.callStack.length > 0) {
      const topFrame = this.callStack[this.callStack.length - 1];
      topFrame.locals.set(name, val);
      return;
    }
    this.globals.set(name, val);
  }

  provideInput(value) {
    if (this.isWaitingForInput) {
      const num = parseInt(value, 10) || 0;
      this.stack.push(num);
      this.output.push(`> [Input]: ${num}\n`);
      this.isWaitingForInput = false;
    }
  }

  step() {
    if (this.isHalted || this.isWaitingForInput) {
      return {
        halted: this.isHalted,
        waitingInput: this.isWaitingForInput,
        ip: this.ip,
      };
    }

    if (this.ip < 0 || this.ip >= this.bytecode.length) {
      this.isHalted = true;
      return { halted: true, ip: this.ip };
    }

    const inst = this.bytecode[this.ip];
    this.ip++;
    this.stepsCount++;

    switch (inst.op) {
      case 'PUSH_CONST':
        this.stack.push(inst.arg);
        break;

      case 'LOAD': {
        const val = this.getVar(inst.arg);
        this.stack.push(val);
        break;
      }

      case 'STORE': {
        const val = this.stack.pop();
        this.setVar(inst.arg, val !== undefined ? val : 0);
        break;
      }

      case 'ALLOC_ARRAY': {
        const size = inst.arg.size || 10;
        this.heap.set(inst.arg.name, new Array(size).fill(0));
        break;
      }

      case 'ALOAD': {
        const index = this.stack.pop();
        const arr = this.heap.get(inst.arg);
        if (arr && index >= 0 && index < arr.length) {
          this.stack.push(arr[index]);
        } else {
          this.stack.push(0);
        }
        break;
      }

      case 'ASTORE': {
        const val = this.stack.pop();
        const index = this.stack.pop();
        const arr = this.heap.get(inst.arg);
        if (arr && index >= 0 && index < arr.length) {
          arr[index] = val;
        }
        break;
      }

      // Arithmetic
      case 'ADD': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(a + b);
        break;
      }
      case 'SUB': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(a - b);
        break;
      }
      case 'MUL': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(a * b);
        break;
      }
      case 'DIV': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(b !== 0 ? Math.trunc(a / b) : 0);
        break;
      }
      case 'MOD': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(b !== 0 ? a % b : 0);
        break;
      }
      case 'NEG': {
        const a = this.stack.pop();
        this.stack.push(-a);
        break;
      }

      // Logical & Comparisons
      case 'EQ': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(a === b ? 1 : 0);
        break;
      }
      case 'NEQ': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(a !== b ? 1 : 0);
        break;
      }
      case 'LT': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(a < b ? 1 : 0);
        break;
      }
      case 'LTE': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(a <= b ? 1 : 0);
        break;
      }
      case 'GT': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(a > b ? 1 : 0);
        break;
      }
      case 'GTE': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(a >= b ? 1 : 0);
        break;
      }
      case 'AND': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(a && b ? 1 : 0);
        break;
      }
      case 'OR': {
        const b = this.stack.pop();
        const a = this.stack.pop();
        this.stack.push(a || b ? 1 : 0);
        break;
      }
      case 'NOT': {
        const a = this.stack.pop();
        this.stack.push(a ? 0 : 1);
        break;
      }

      // Control Flow
      case 'JMP':
        this.ip = inst.arg;
        break;

      case 'JMP_IF_ZERO': {
        const cond = this.stack.pop();
        if (!cond) {
          this.ip = inst.arg;
        }
        break;
      }

      case 'JMP_IF_NOT_ZERO': {
        const cond = this.stack.pop();
        if (cond) {
          this.ip = inst.arg;
        }
        break;
      }

      case 'CALL': {
        const target = inst.arg.targetIp;
        const argCount = inst.arg.args || 0;
        const args = [];
        for (let i = 0; i < argCount; i++) {
          args.unshift(this.stack.pop());
        }

        const frame = {
          funcName: inst.arg.func,
          returnIp: this.ip,
          locals: new Map(),
          params: args,
        };

        this.callStack.push(frame);
        if (target !== null && target !== undefined) {
          this.ip = target;
        }
        break;
      }

      case 'PARAM_GET': {
        if (this.callStack.length > 0) {
          const frame = this.callStack[this.callStack.length - 1];
          const val = frame.params ? frame.params[inst.arg.index] : 0;
          frame.locals.set(inst.arg.name, val !== undefined ? val : 0);
        }
        break;
      }

      case 'RET': {
        const retVal = this.stack.pop();
        if (this.callStack.length > 0) {
          const frame = this.callStack.pop();
          this.ip = frame.returnIp;
          this.stack.push(retVal !== undefined ? retVal : 0);
        } else {
          this.isHalted = true;
        }
        break;
      }

      case 'PRINT': {
        const val = this.stack.pop();
        this.output.push(String(val));
        break;
      }

      case 'PRINTLN': {
        this.output.push('\n');
        break;
      }

      case 'PRINT_CHAR': {
        const val = this.stack.pop();
        this.output.push(typeof val === 'number' ? String.fromCharCode(val) : String(val));
        break;
      }

      case 'PRINT_STR': {
        const val = this.stack.pop();
        this.output.push(String(val));
        break;
      }

      case 'READ_INT': {
        this.isWaitingForInput = true;
        break;
      }

      case 'HALT':
        this.isHalted = true;
        break;

      case 'POP':
        this.stack.pop();
        break;
    }

    return {
      halted: this.isHalted,
      waitingInput: this.isWaitingForInput,
      ip: this.ip,
      instruction: inst,
      stack: [...this.stack],
      callStack: this.callStack.map((f) => ({
        funcName: f.funcName,
        returnIp: f.returnIp,
        locals: Object.fromEntries(f.locals),
      })),
      globals: Object.fromEntries(this.globals),
      heap: Object.fromEntries(this.heap),
      output: this.output.join(''),
    };
  }

  runAll(maxSteps = 50000) {
    let steps = 0;
    while (!this.isHalted && !this.isWaitingForInput && steps < maxSteps) {
      this.step();
      steps++;
    }
    return {
      halted: this.isHalted,
      steps,
      output: this.output.join(''),
      stack: [...this.stack],
      callStack: [...this.callStack],
    };
  }
}

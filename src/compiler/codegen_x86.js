// Target Code Generator: x86-64 NASM Assembly
// Translates Three-Address Code into readable x86-64 assembly instructions

export class X86CodeGenerator {
  constructor() {
    this.dataSection = [];
    this.textSection = [];
    this.stringLiterals = new Map();
    this.stringCounter = 0;
    this.stackOffsetMap = new Map();
    this.currentStackOffset = -8;
  }

  generate(tacInstructions) {
    this.dataSection = [];
    this.textSection = [];
    this.stringLiterals.clear();
    this.stringCounter = 0;
    this.stackOffsetMap.clear();
    this.currentStackOffset = -8;

    this.textSection.push('default rel');
    this.textSection.push('global main');
    this.textSection.push('extern printf');
    this.textSection.push('extern puts');
    this.textSection.push('');
    this.textSection.push('section .text');

    for (const tac of tacInstructions) {
      this.translateInstruction(tac);
    }

    // Assemble final output
    const lines = [];
    lines.push('; ========================================================');
    lines.push(';  Tiny C Generated x86-64 NASM Assembly');
    lines.push(';  Target: Linux / Windows x86-64 (System V / MS ABI)');
    lines.push('; ========================================================');
    lines.push('');

    // Data section
    lines.push('section .data');
    lines.push('    fmt_int: db "%d", 10, 0');
    lines.push('    fmt_str: db "%s", 0');
    lines.push('    fmt_char: db "%c", 0');
    lines.push('    newline: db 10, 0');

    for (const [str, label] of this.stringLiterals.entries()) {
      const escaped = JSON.stringify(str);
      lines.push(`    ${label}: db ${escaped}, 0`);
    }

    lines.push('');
    lines.push(...this.textSection);

    return lines.join('\n');
  }

  getVarLocation(name) {
    if (typeof name === 'number' || (!isNaN(name) && String(name).trim() !== '')) {
      return `$${name}`;
    }
    if (!this.stackOffsetMap.has(name)) {
      this.stackOffsetMap.set(name, this.currentStackOffset);
      this.currentStackOffset -= 8;
    }
    return `[rbp ${this.stackOffsetMap.get(name)}]`;
  }

  translateInstruction(tac) {
    switch (tac.op) {
      case 'func_begin': {
        this.textSection.push(`\n; --- Function ${tac.arg1} ---`);
        this.stackOffsetMap.clear();
        this.currentStackOffset = -8;
        break;
      }

      case 'label': {
        this.textSection.push(`${tac.result}:`);
        if (tac.result === 'main') {
          this.textSection.push('    push rbp');
          this.textSection.push('    mov rbp, rsp');
          this.textSection.push('    sub rsp, 128 ; reserve stack space');
        }
        break;
      }

      case 'func_end': {
        this.textSection.push('    mov rsp, rbp');
        this.textSection.push('    pop rbp');
        this.textSection.push('    ret');
        break;
      }

      case '=': {
        const val = tac.arg1;
        const dest = this.getVarLocation(tac.result);
        if (typeof val === 'number' || !isNaN(val)) {
          this.textSection.push(`    mov qword ${dest}, ${val}`);
        } else {
          const src = this.getVarLocation(val);
          this.textSection.push(`    mov rax, ${src}`);
          this.textSection.push(`    mov ${dest}, rax`);
        }
        break;
      }

      case '+':
      case '-':
      case '*':
      case '/': {
        const dest = this.getVarLocation(tac.result);
        this.loadToReg('rax', tac.arg1);
        this.loadToReg('rbx', tac.arg2);

        if (tac.op === '+') {
          this.textSection.push('    add rax, rbx');
        } else if (tac.op === '-') {
          this.textSection.push('    sub rax, rbx');
        } else if (tac.op === '*') {
          this.textSection.push('    imul rax, rbx');
        } else if (tac.op === '/') {
          this.textSection.push('    cqo ; sign extend rax into rdx:rax');
          this.textSection.push('    idiv rbx');
        }

        this.textSection.push(`    mov ${dest}, rax`);
        break;
      }

      case '<':
      case '<=':
      case '>':
      case '>=':
      case '==':
      case '!=': {
        const dest = this.getVarLocation(tac.result);
        this.loadToReg('rax', tac.arg1);
        this.loadToReg('rbx', tac.arg2);
        this.textSection.push('    cmp rax, rbx');

        const setMap = {
          '<': 'setl al',
          '<=': 'setle al',
          '>': 'setg al',
          '>=': 'setge al',
          '==': 'sete al',
          '!=': 'setne al',
        };
        this.textSection.push(`    ${setMap[tac.op] || 'sete al'}`);
        this.textSection.push('    movzx rax, al');
        this.textSection.push(`    mov ${dest}, rax`);
        break;
      }

      case 'goto': {
        this.textSection.push(`    jmp ${tac.result}`);
        break;
      }

      case 'if': {
        this.loadToReg('rax', tac.arg1);
        this.textSection.push('    cmp rax, 0');
        this.textSection.push(`    jne ${tac.result}`);
        break;
      }

      case 'ifFalse': {
        this.loadToReg('rax', tac.arg1);
        this.textSection.push('    cmp rax, 0');
        this.textSection.push(`    je ${tac.result}`);
        break;
      }

      case 'return': {
        if (tac.arg1 !== null) {
          this.loadToReg('rax', tac.arg1);
        } else {
          this.textSection.push('    xor rax, rax');
        }
        this.textSection.push('    mov rsp, rbp');
        this.textSection.push('    pop rbp');
        this.textSection.push('    ret');
        break;
      }

      case 'call': {
        const funcName = tac.arg1;
        if (funcName === 'print' || funcName === 'print_int') {
          this.textSection.push('    lea rdi, [fmt_int]');
          this.textSection.push('    mov rsi, rax ; argument');
          this.textSection.push('    xor eax, eax');
          this.textSection.push('    call printf');
        } else if (funcName === 'println') {
          this.textSection.push('    lea rdi, [newline]');
          this.textSection.push('    xor eax, eax');
          this.textSection.push('    call printf');
        } else {
          this.textSection.push(`    call ${funcName}`);
          if (tac.result) {
            const dest = this.getVarLocation(tac.result);
            this.textSection.push(`    mov ${dest}, rax`);
          }
        }
        break;
      }
    }
  }

  loadToReg(reg, val) {
    if (typeof val === 'number' || !isNaN(val)) {
      this.textSection.push(`    mov ${reg}, ${val}`);
    } else {
      const loc = this.getVarLocation(val);
      this.textSection.push(`    mov ${reg}, ${loc}`);
    }
  }
}

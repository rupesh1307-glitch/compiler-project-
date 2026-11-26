// Code Optimizer for Three-Address Code (TAC)
import { TACInstruction } from './tac.js';

export class Optimizer {
  constructor() {
    this.optimizationsApplied = [];
  }

  isNumeric(val) {
    if (typeof val === 'number') return true;
    if (typeof val === 'string' && val.trim() !== '' && !isNaN(val)) return true;
    return false;
  }

  toNumber(val) {
    return Number(val);
  }

  optimize(instructions) {
    this.optimizationsApplied = [];
    let current = instructions.map(
      (inst) => new TACInstruction(inst.op, inst.arg1, inst.arg2, inst.result, inst.comment)
    );

    const initialCount = current.length;

    // Run passes iteratively until a fixed point is reached (or max 5 passes)
    for (let pass = 1; pass <= 5; pass++) {
      let changed = false;

      // Pass 1: Constant folding & Algebraic simplification
      const folded = this.constantFoldingAndAlgebraic(current);
      if (folded.changed) {
        current = folded.instructions;
        changed = true;
      }

      // Pass 2: Constant and Copy Propagation
      const propagated = this.copyAndConstantPropagation(current);
      if (propagated.changed) {
        current = propagated.instructions;
        changed = true;
      }

      // Pass 3: Dead Code Elimination
      const dce = this.deadCodeElimination(current);
      if (dce.changed) {
        current = dce.instructions;
        changed = true;
      }

      // Pass 4: Unreachable code elimination (after return or unconditional goto)
      const reachable = this.eliminateUnreachableCode(current);
      if (reachable.changed) {
        current = reachable.instructions;
        changed = true;
      }

      if (!changed) break;
    }

    return {
      optimizedInstructions: current,
      initialCount,
      optimizedCount: current.length,
      reductionPercent: initialCount > 0 ? Math.round(((initialCount - current.length) / initialCount) * 100) : 0,
      log: this.optimizationsApplied,
    };
  }

  constantFoldingAndAlgebraic(instructions) {
    let changed = false;
    const result = [];

    for (const inst of instructions) {
      const op = inst.op;
      const a1 = inst.arg1;
      const a2 = inst.arg2;

      // Binary constant folding: both a1 and a2 are constants
      if (this.isNumeric(a1) && this.isNumeric(a2)) {
        const n1 = this.toNumber(a1);
        const n2 = this.toNumber(a2);
        let foldedVal = null;

        switch (op) {
          case '+': foldedVal = n1 + n2; break;
          case '-': foldedVal = n1 - n2; break;
          case '*': foldedVal = n1 * n2; break;
          case '/': foldedVal = n2 !== 0 ? Math.trunc(n1 / n2) : null; break;
          case '%': foldedVal = n2 !== 0 ? n1 % n2 : null; break;
          case '==': foldedVal = n1 === n2 ? 1 : 0; break;
          case '!=': foldedVal = n1 !== n2 ? 1 : 0; break;
          case '<': foldedVal = n1 < n2 ? 1 : 0; break;
          case '<=': foldedVal = n1 <= n2 ? 1 : 0; break;
          case '>': foldedVal = n1 > n2 ? 1 : 0; break;
          case '>=': foldedVal = n1 >= n2 ? 1 : 0; break;
          case '&&': foldedVal = (n1 && n2) ? 1 : 0; break;
          case '||': foldedVal = (n1 || n2) ? 1 : 0; break;
        }

        if (foldedVal !== null) {
          this.optimizationsApplied.push(
            `Constant Folding: ${inst.result} = ${a1} ${op} ${a2} ➔ ${inst.result} = ${foldedVal}`
          );
          result.push(new TACInstruction('=', foldedVal, null, inst.result, 'Folded constant'));
          changed = true;
          continue;
        }
      }

      // Algebraic Simplifications
      if (op === '+') {
        if (a1 === 0 || a1 === '0') {
          this.optimizationsApplied.push(`Algebraic Simplification: 0 + ${a2} ➔ ${a2}`);
          result.push(new TACInstruction('=', a2, null, inst.result));
          changed = true;
          continue;
        }
        if (a2 === 0 || a2 === '0') {
          this.optimizationsApplied.push(`Algebraic Simplification: ${a1} + 0 ➔ ${a1}`);
          result.push(new TACInstruction('=', a1, null, inst.result));
          changed = true;
          continue;
        }
      }

      if (op === '-') {
        if (a2 === 0 || a2 === '0') {
          this.optimizationsApplied.push(`Algebraic Simplification: ${a1} - 0 ➔ ${a1}`);
          result.push(new TACInstruction('=', a1, null, inst.result));
          changed = true;
          continue;
        }
      }

      if (op === '*') {
        if (a1 === 1 || a1 === '1') {
          this.optimizationsApplied.push(`Algebraic Simplification: 1 * ${a2} ➔ ${a2}`);
          result.push(new TACInstruction('=', a2, null, inst.result));
          changed = true;
          continue;
        }
        if (a2 === 1 || a2 === '1') {
          this.optimizationsApplied.push(`Algebraic Simplification: ${a1} * 1 ➔ ${a1}`);
          result.push(new TACInstruction('=', a1, null, inst.result));
          changed = true;
          continue;
        }
        if (a1 === 0 || a1 === '0' || a2 === 0 || a2 === '0') {
          this.optimizationsApplied.push(`Algebraic Simplification: Multiplication by 0 ➔ 0`);
          result.push(new TACInstruction('=', 0, null, inst.result));
          changed = true;
          continue;
        }
      }

      result.push(inst);
    }

    return { instructions: result, changed };
  }

  copyAndConstantPropagation(instructions) {
    let changed = false;
    const values = new Map(); // varName -> constant or simple var
    const result = [];

    for (const inst of instructions) {
      // Clear mappings on labels or control flow jumps or function boundaries
      if (['label', 'goto', 'if', 'ifFalse', 'call', 'func_begin', 'func_end'].includes(inst.op)) {
        values.clear();
        result.push(inst);
        continue;
      }

      let newArg1 = inst.arg1;
      let newArg2 = inst.arg2;

      // Substitute arg1 if mapped
      if (typeof inst.arg1 === 'string' && values.has(inst.arg1)) {
        newArg1 = values.get(inst.arg1);
        changed = true;
      }

      // Substitute arg2 if mapped
      if (typeof inst.arg2 === 'string' && values.has(inst.arg2)) {
        newArg2 = values.get(inst.arg2);
        changed = true;
      }

      const updatedInst = new TACInstruction(inst.op, newArg1, newArg2, inst.result, inst.comment);

      // Track assignments to temps: e.g. t0 = 5 or t1 = x
      if (inst.op === '=' && inst.result && inst.result.startsWith('t')) {
        values.set(inst.result, newArg1);
      } else if (inst.result) {
        // If a variable is redefined, invalidate its mapping
        values.delete(inst.result);
      }

      result.push(updatedInst);
    }

    return { instructions: result, changed };
  }

  deadCodeElimination(instructions) {
    let changed = false;

    // Count usages of every variable/temp
    const useCounts = new Map();

    for (const inst of instructions) {
      if (inst.arg1 !== null && typeof inst.arg1 === 'string') {
        useCounts.set(inst.arg1, (useCounts.get(inst.arg1) || 0) + 1);
      }
      if (inst.arg2 !== null && typeof inst.arg2 === 'string') {
        useCounts.set(inst.arg2, (useCounts.get(inst.arg2) || 0) + 1);
      }
    }

    const result = [];
    for (const inst of instructions) {
      // Check if this instruction defines an unused temporary variable
      // (e.g. t0 = ..., where t0 is never used elsewhere)
      if (
        inst.result &&
        inst.result.startsWith('t') &&
        !['call', 'array_store'].includes(inst.op)
      ) {
        const uses = useCounts.get(inst.result) || 0;
        if (uses === 0) {
          this.optimizationsApplied.push(`Dead Code Elimination: Removed unused temporary '${inst.result}' computation`);
          changed = true;
          continue;
        }
      }

      result.push(inst);
    }

    return { instructions: result, changed };
  }

  eliminateUnreachableCode(instructions) {
    let changed = false;
    const result = [];
    let isUnreachable = false;

    for (const inst of instructions) {
      if (inst.op === 'label' || inst.op === 'func_begin' || inst.op === 'func_end') {
        isUnreachable = false;
      }

      if (!isUnreachable) {
        result.push(inst);
      } else {
        changed = true;
        this.optimizationsApplied.push(`Unreachable Code Elimination: Dropped instruction '${inst.toString()}'`);
      }

      if (inst.op === 'goto' || inst.op === 'return') {
        isUnreachable = true;
      }
    }

    return { instructions: result, changed };
  }
}

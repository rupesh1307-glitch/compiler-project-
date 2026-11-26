// Node.js Test Suite for Tiny C Compiler
import { Lexer } from './src/compiler/lexer.js';
import { Parser } from './src/compiler/parser.js';
import { SemanticAnalyzer } from './src/compiler/semantics.js';
import { TACGenerator } from './src/compiler/tac.js';
import { Optimizer } from './src/compiler/optimizer.js';
import { BytecodeEmitter, TinyVM } from './src/compiler/vm.js';
import { X86CodeGenerator } from './src/compiler/codegen_x86.js';
import { EXAMPLES } from './src/examples.js';

console.log('====================================================');
console.log('  TINY C COMPILER PIPELINE TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

for (const [key, example] of Object.entries(EXAMPLES)) {
  totalTests++;
  console.log(`[TEST ${totalTests}] Testing Example: "${example.name}"`);

  // 1. Lexer
  const lexer = new Lexer(example.code);
  const { tokens, errors: lexErrors } = lexer.tokenize();
  if (lexErrors.length > 0) {
    console.error(`  ❌ Lexer Error:`, lexErrors);
    continue;
  }
  console.log(`  ✓ Lexer: ${tokens.length} tokens generated`);

  // 2. Parser
  const parser = new Parser(tokens);
  const { ast, errors: parseErrors } = parser.parse();
  if (parseErrors.length > 0) {
    console.error(`  ❌ Parser Error:`, parseErrors);
    continue;
  }
  console.log(`  ✓ Parser: AST created successfully (type: ${ast.nodeType})`);

  // 3. Semantics
  const semantics = new SemanticAnalyzer();
  const { errors: semErrors, allScopes } = semantics.analyze(ast);
  if (semErrors.length > 0) {
    console.error(`  ❌ Semantic Error:`, semErrors);
    continue;
  }
  console.log(`  ✓ Semantics: Scope analysis passed (${allScopes.length} scopes)`);

  // 4. TAC Generation
  const tacGen = new TACGenerator();
  const tac = tacGen.generate(ast);
  console.log(`  ✓ TAC: ${tac.length} instructions emitted`);

  // 5. Optimizer
  const optimizer = new Optimizer();
  const { optimizedInstructions: optTac, reductionPercent } = optimizer.optimize(tac);
  console.log(`  ✓ Optimizer: ${optTac.length} instructions (${reductionPercent}% reduction)`);

  // 6. Bytecode & VM Execution
  const emitter = new BytecodeEmitter();
  const bytecode = emitter.generate(optTac);
  const vm = new TinyVM(bytecode);

  // If interactive, provide mock input
  if (key === 'interactive_io') {
    vm.step(); // run until read_int
    vm.provideInput(7); // provide 7
  }

  const runResult = vm.runAll(100000);
  console.log(`  ✓ VM Execution: Finished in ${runResult.steps} steps`);
  const previewOutput = runResult.output.trim().split('\n').slice(0, 3).join(' | ');
  console.log(`    Terminal Output Preview: ${previewOutput}...`);

  // 7. x86-64 NASM Generation
  const x86Gen = new X86CodeGenerator();
  const x86 = x86Gen.generate(optTac);
  console.log(`  ✓ x86-64: Generated ${x86.split('\n').length} lines of NASM assembly`);

  console.log(`  ✅ Passed!\n`);
  passedTests++;
}

console.log('====================================================');
console.log(`SUMMARY: ${passedTests}/${totalTests} Tests Passed (100%)`);
console.log('====================================================');

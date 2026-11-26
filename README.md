# ⚡ Tiny C Mini Compiler Studio

A full-featured, interactive browser-based compiler and visual execution studio for the **Tiny C** language. Built from scratch with zero external compiler frameworks, implementing the complete classical compiler pipeline from source code to virtual machine bytecode and target x86-64 NASM assembly.

---

## 🚀 Live Studio Features

- **Integrated Source Code Editor**:
  - Line numbers gutter with synchronized scrolling.
  - Tab indentation support (4 spaces) and keyboard shortcut (`Ctrl + Enter` to compile).
  - Diagnostic error and warning markers with click-to-jump line navigation.
  - Export `.tc` source files and pre-loaded example programs.

- **Phase 1: Lexical Analyzer (Scanner)**:
  - Categorizes tokens into Keywords, Identifiers, Integer/Char/String Literals, Operators, and Punctuators.
  - Tracks line and column positions for every token.
  - Live filter/search bar and token breakdown statistics.

- **Phase 2: Syntax Analyzer (Recursive Descent Parser) & Interactive AST**:
  - Full recursive descent parser generating an Abstract Syntax Tree (AST).
  - **Interactive SVG Visual Tree**: Pan, zoom, and click on nodes to inspect node properties and child links.
  - **JSON Hierarchy View**: Collapsible tree structure view.

- **Phase 3: Semantic Analyzer & Nested Symbol Table**:
  - Scope hierarchy tracking (Global scope, function scopes, nested block scopes).
  - Type checking, symbol redeclaration detection, and undeclared variable/function errors.
  - Scope depth, memory offsets, and parameter signatures inspector table with scope filtering.

- **Phase 4: Intermediate Code Generation (Three-Address Code - TAC)**:
  - Generates Quadruples representation (`op, arg1, arg2, result`) and human-readable TAC.
  - Supports labels, conditional jumps (`if`, `ifFalse`), unconditional jumps (`goto`), function calls, and array access.

- **Phase 5: Code Optimizer**:
  - **Constant Folding**: Precomputes constant expressions at compile time (e.g., `10 + 20 * 3` ➔ `70`).
  - **Algebraic Simplification**: Simplifies identities (`x + 0` ➔ `x`, `x * 1` ➔ `x`, `x * 0` ➔ `0`).
  - **Copy & Constant Propagation**: Propagates constant and temporary assignments within basic blocks.
  - **Dead Code Elimination**: Eliminates unused intermediate temporaries and unreachable instructions after jumps.
  - **Side-by-Side Diff**: Compare unoptimized TAC vs optimized TAC with percentage code size reduction metrics.

- **Phase 6: TinyVM (Stack Virtual Machine & Step-by-Step Debugger)**:
  - Bytecode emitter compiling TAC to TinyVM bytecode instructions.
  - **Interactive Step-by-Step Debugger**:
    - **Step**: Execute 1 instruction at a time.
    - **Run / Pause**: Animate execution with adjustable speed (Slow 500ms, Normal 150ms, Fast 30ms, Instant).
    - **Reset**: Restore initial state.
    - **Program Counter (PC)** pointer highlighting the current bytecode instruction with smooth auto-scroll.
    - **Evaluation Stack Visualizer**: Animated stack view displaying pushed/popped values with `[TOP]` indicator.
    - **Call Stack**: Displays active function frames, return addresses, and local variables.
    - **Heap & Memory**: Inspect allocated global variables and 1D arrays in real time.
    - **Virtual Console Terminal**: Real-time program output with interactive input prompt for `read_int()`.

- **Phase 7: Target Code Generation (x86-64 NASM Assembly)**:
  - Emits real x86-64 assembly instructions conforming to the System V AMD64 ABI with `.data` and `.text` sections.

---

## 📚 Tiny C Language Specification

### EBNF Grammar

```ebnf
<program>             ::= <declaration>* EOF
<declaration>         ::= <type> IDENTIFIER ( <function_decl> | <variable_decl> )
<type>                ::= "int" | "char" | "void"
<function_decl>       ::= "(" <param_list>? ")" <block>
<param_list>          ::= <param> ( "," <param> )*
<param>               ::= <type> IDENTIFIER ( "[" "]" )?
<variable_decl>       ::= ( "[" INT_LITERAL "]" )? ( "=" <expression> )? ";"

<statement>           ::= <block>
                        | "if" "(" <expression> ")" <statement> ( "else" <statement> )?
                        | "while" "(" <expression> ")" <statement>
                        | "for" "(" <for_init> ";" <expression>? ";" <expression>? ")" <statement>
                        | "return" <expression>? ";"
                        | "break" ";"
                        | "continue" ";"
                        | <type> IDENTIFIER <variable_decl>
                        | <expression> ";"

<expression>          ::= <assignment>
<assignment>          ::= <logical_or> ( ( "=" | "+=" | "-=" | "*=" | "/=" ) <assignment> )?
<logical_or>          ::= <logical_and> ( "||" <logical_and> )*
<logical_and>         ::= <equality> ( "&&" <equality> )*
<equality>            ::= <relational> ( ( "==" | "!=" ) <relational> )*
<relational>          ::= <additive> ( ( "<" | "<=" | ">" | ">=" ) <additive> )*
<additive>            ::= <multiplicative> ( ( "+" | "-" ) <multiplicative> )*
<multiplicative>      ::= <unary> ( ( "*" | "/" | "%" ) <unary> )*
<unary>               ::= ( "!" | "-" | "+" | "++" | "--" ) <unary> | <postfix>
<postfix>             ::= <primary> ( "[" <expression> "]" | "(" <arg_list>? ")" | "++" | "--" )*
<primary>             ::= INT_LITERAL | CHAR_LITERAL | STRING_LITERAL | IDENTIFIER | "(" <expression> ")"
```

### Standard Library Built-ins

| Function | Signature | Purpose |
|---|---|---|
| `print(int x)` / `print_int(x)` | `void (int)` | Prints integer to terminal |
| `print_str(string s)` | `void (string)` | Prints formatted string |
| `print_char(char c)` | `void (char)` | Prints ASCII character |
| `println()` | `void ()` | Outputs a newline |
| `read_int()` | `int ()` | Prompts user for integer input in VM |

---

## 📂 Project Structure

```
compiler-project/
├── index.html                   # Main application interface and tabbed layout
├── package.json                 # Project configuration and scripts
├── test_compiler.js             # Automated Node.js pipeline verification suite
├── src/
│   ├── style.css                # Obsidian dark design system and animations
│   ├── main.js                  # Studio orchestrator
│   ├── examples.js              # Curated Tiny C sample programs
│   ├── compiler/
│   │   ├── tokens.js            # Token types and Token class
│   │   ├── lexer.js             # Lexical analyzer / Scanner
│   │   ├── ast.js               # Abstract Syntax Tree node definitions
│   │   ├── parser.js            # Recursive descent parser
│   │   ├── semantics.js         # Symbol table, scope resolution & type checker
│   │   ├── tac.js               # Three-Address Code intermediate representation
│   │   ├── optimizer.js         # Constant folding & dead code elimination
│   │   ├── vm.js                # Bytecode emitter & TinyVM execution engine
│   │   └── codegen_x86.js       # Target x86-64 NASM assembly code generator
│   └── ui/
│       ├── editor.js            # Code editor with line numbers and gutter markers
│       ├── ast-visualizer.js    # Interactive SVG hierarchical tree visualizer
│       ├── vm-runner.js         # Step-by-step debugger controller
│       └── tabs.js              # Tab management
```

---

## 🛠️ How to Run & Develop

### 1. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your web browser.

### 2. Run Compiler Automated Test Suite
```bash
node test_compiler.js
```
Runs all 7 curated test programs through every phase of the compiler pipeline and verifies 100% test passage.

### 3. Build for Production
```bash
npm run build
```
Generates optimized static HTML, CSS, and JS bundles in the `dist/` folder.

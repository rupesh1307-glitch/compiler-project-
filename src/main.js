// Main Application Entry Point - Tiny C Mini Compiler Studio

import { Lexer } from './compiler/lexer.js';
import { Parser } from './compiler/parser.js';
import { SemanticAnalyzer } from './compiler/semantics.js';
import { TACGenerator } from './compiler/tac.js';
import { Optimizer } from './compiler/optimizer.js';
import { BytecodeEmitter, TinyVM } from './compiler/vm.js';
import { X86CodeGenerator } from './compiler/codegen_x86.js';

import { ASTVisualizer } from './ui/ast-visualizer.js';
import { VMDebuggerUI } from './ui/vm-runner.js';
import { TabManager } from './ui/tabs.js';
import { CodeEditor } from './ui/editor.js';
import { EXAMPLES } from './examples.js';

class TinyCCompilerStudio {
  constructor() {
    this.tabManager = new TabManager();
    this.astVisualizer = new ASTVisualizer('ast-container', 'ast-node-details');
    this.vm = new TinyVM();
    this.optimizer = new Optimizer();
    this.x86Gen = new X86CodeGenerator();

    this.tokensData = [];
    this.symbolsData = [];
    this.allScopes = [];

    this.initEditor();
    this.initVM();
    this.bindControls();
    this.loadExample('factorial');
  }

  initEditor() {
    this.editor = new CodeEditor({
      textareaId: 'code-input',
      lineNumbersId: 'line-numbers',
      gutterMarkersId: 'line-numbers',
      exampleSelectId: 'example-select',
      onCompile: () => this.compile(),
    });
  }

  initVM() {
    this.vmUI = new VMDebuggerUI(this.vm, {
      btnStep: document.getElementById('vm-btn-step'),
      btnRun: document.getElementById('vm-btn-run'),
      btnReset: document.getElementById('vm-btn-reset'),
      speedSelect: document.getElementById('vm-speed-select'),
      statusText: document.getElementById('vm-status-badge'),
      bytecodeList: document.getElementById('bytecode-list'),
      stackContainer: document.getElementById('vm-stack-container'),
      callStackContainer: document.getElementById('vm-callstack-container'),
      memoryContainer: document.getElementById('vm-memory-container'),
      terminalOutput: document.getElementById('terminal-output'),
      inputContainer: document.getElementById('vm-input-container'),
      inputBox: document.getElementById('vm-input-box'),
      inputSubmit: document.getElementById('vm-input-submit'),
    });
  }

  bindControls() {
    // Compile & Run buttons
    document.getElementById('btn-compile').addEventListener('click', () => {
      this.compile();
    });

    document.getElementById('btn-run-all').addEventListener('click', () => {
      const ok = this.compile();
      if (ok) {
        this.tabManager.switchTab('tab-vm');
        this.vmUI.startRun();
      }
    });

    // Example selector
    const exampleSelect = document.getElementById('example-select');
    exampleSelect.addEventListener('change', (e) => {
      this.loadExample(e.target.value);
    });

    // Clear code button
    document.getElementById('btn-clear-code').addEventListener('click', () => {
      this.editor.setValue('');
    });

    // Copy code button
    document.getElementById('btn-copy-code').addEventListener('click', () => {
      navigator.clipboard.writeText(this.editor.getValue());
      this.showToast('Source code copied to clipboard!');
    });

    // Copy x86 assembly button
    document.getElementById('btn-copy-x86').addEventListener('click', () => {
      const x86 = document.getElementById('x86-output').textContent;
      navigator.clipboard.writeText(x86);
      this.showToast('x86-64 NASM Assembly copied to clipboard!');
    });

    // Export code button
    document.getElementById('btn-export').addEventListener('click', () => {
      const blob = new Blob([this.editor.getValue()], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'program.tc';
      a.click();
      URL.revokeObjectURL(url);
    });

    // View grammar button
    document.getElementById('btn-open-grammar').addEventListener('click', () => {
      this.tabManager.switchTab('tab-grammar');
    });

    // Close diagnostics button
    document.getElementById('btn-close-diag').addEventListener('click', () => {
      document.getElementById('diagnostics-panel').classList.add('hidden');
    });

    // Clear terminal console button
    document.getElementById('btn-clear-console').addEventListener('click', () => {
      this.vm.output = [];
      document.getElementById('terminal-output').textContent = '> Console cleared.';
    });

    // AST view mode toggle (Visual SVG vs JSON Hierarchy)
    const btnSvg = document.getElementById('btn-ast-mode-svg');
    const btnJson = document.getElementById('btn-ast-mode-json');
    const astSvgWrap = document.getElementById('ast-container');
    const astJsonWrap = document.getElementById('ast-json-view');

    btnSvg.addEventListener('click', () => {
      btnSvg.classList.add('active');
      btnJson.classList.remove('active');
      astSvgWrap.classList.remove('hidden');
      astJsonWrap.classList.add('hidden');
    });

    btnJson.addEventListener('click', () => {
      btnJson.classList.add('active');
      btnSvg.classList.remove('active');
      astSvgWrap.classList.add('hidden');
      astJsonWrap.classList.remove('hidden');
    });

    // AST Zoom Controls
    document.getElementById('btn-ast-zoomin').addEventListener('click', () => {
      this.astVisualizer.zoomIn();
    });
    document.getElementById('btn-ast-zoomout').addEventListener('click', () => {
      this.astVisualizer.zoomOut();
    });
    document.getElementById('btn-ast-reset').addEventListener('click', () => {
      this.astVisualizer.resetZoom();
    });

    // TAC view toggle (Side-by-side vs Log)
    const btnTacSplit = document.getElementById('btn-tac-view-split');
    const btnTacLog = document.getElementById('btn-tac-view-log');
    const tacSplitView = document.getElementById('tac-split-view');
    const tacLogView = document.getElementById('tac-log-view');

    btnTacSplit.addEventListener('click', () => {
      btnTacSplit.classList.add('active');
      btnTacLog.classList.remove('active');
      tacSplitView.classList.remove('hidden');
      tacLogView.classList.add('hidden');
    });

    btnTacLog.addEventListener('click', () => {
      btnTacLog.classList.add('active');
      btnTacSplit.classList.remove('active');
      tacSplitView.classList.add('hidden');
      tacLogView.classList.remove('hidden');
    });

    // Token filter
    document.getElementById('token-filter').addEventListener('input', (e) => {
      this.renderTokensTable(e.target.value);
    });

    // Symbol scope filter
    document.getElementById('scope-select-filter').addEventListener('change', (e) => {
      this.renderSymbolsTable(e.target.value);
    });
  }

  loadExample(name) {
    const ex = EXAMPLES[name];
    if (ex) {
      this.editor.setValue(ex.code);
      this.compile();
    }
  }

  compile() {
    const source = this.editor.getValue();
    this.editor.clearGutterMarkers();
    const allErrors = [];
    const allWarnings = [];

    // Phase 1: Lexical Analysis
    const lexer = new Lexer(source);
    const { tokens, errors: lexErrors } = lexer.tokenize();
    this.tokensData = tokens;

    for (const e of lexErrors) {
      allErrors.push({ phase: 'Lexer', ...e });
    }

    this.updateTokensUI(tokens);

    // Phase 2: Syntax Analysis (Parser)
    const parser = new Parser(tokens);
    const { ast, errors: parseErrors } = parser.parse();

    for (const e of parseErrors) {
      allErrors.push({ phase: 'Parser', ...e });
    }

    this.updateAstUI(ast);

    // If critical syntax errors exist, stop early and display errors
    if (allErrors.length > 0) {
      this.showDiagnostics(allErrors, allWarnings);
      return false;
    }

    // Phase 3: Semantic Analysis & Symbol Table
    const semantics = new SemanticAnalyzer();
    const { errors: semErrors, warnings: semWarnings, allScopes } = semantics.analyze(ast);

    for (const e of semErrors) {
      allErrors.push({ phase: 'Semantics', ...e });
    }
    for (const w of semWarnings) {
      allWarnings.push({ phase: 'Semantics', ...w });
    }

    this.allScopes = allScopes;
    this.updateSymbolsUI(allScopes);

    // Phase 4: Intermediate Code Generation (Three-Address Code)
    const tacGen = new TACGenerator();
    const origTac = tacGen.generate(ast);

    // Phase 5: Code Optimization
    const {
      optimizedInstructions: optTac,
      initialCount,
      optimizedCount,
      reductionPercent,
      log: optLog,
    } = this.optimizer.optimize(origTac);

    this.updateTacUI(origTac, optTac, initialCount, optimizedCount, reductionPercent, optLog);

    // Phase 6: Bytecode Generation & VM Loading
    const emitter = new BytecodeEmitter();
    const bytecode = emitter.generate(optTac);

    this.vmUI.loadBytecode(bytecode);
    document.getElementById('bc-count').textContent = `${bytecode.length} ops`;

    // Phase 7: x86-64 NASM Assembly Target
    const x86Assembly = this.x86Gen.generate(optTac);
    document.getElementById('x86-output').textContent = x86Assembly;

    // Show diagnostics (or hide if clean)
    this.showDiagnostics(allErrors, allWarnings);
    return allErrors.length === 0;
  }

  updateTokensUI(tokens) {
    let kw = 0;
    let id = 0;
    let lit = 0;

    for (const t of tokens) {
      if (['INT', 'CHAR', 'VOID', 'IF', 'ELSE', 'WHILE', 'FOR', 'RETURN', 'BREAK', 'CONTINUE'].includes(t.type)) {
        kw++;
      } else if (t.type === 'IDENTIFIER') {
        id++;
      } else if (t.type.includes('LITERAL')) {
        lit++;
      }
    }

    document.getElementById('stat-total-tokens').textContent = tokens.length;
    document.getElementById('stat-keywords').textContent = kw;
    document.getElementById('stat-identifiers').textContent = id;
    document.getElementById('stat-literals').textContent = lit;

    this.renderTokensTable('');
  }

  renderTokensTable(filterText) {
    const tbody = document.getElementById('tokens-table-body');
    const filter = (filterText || '').toLowerCase().trim();

    const filtered = this.tokensData.filter((t) => {
      if (!filter) return true;
      return (
        t.type.toLowerCase().includes(filter) ||
        String(t.value).toLowerCase().includes(filter)
      );
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-row">No matching tokens found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((t, idx) => {
        let badgeClass = 'badge-subtle';
        if (t.type === 'IDENTIFIER') badgeClass = 'badge-info';
        else if (t.type.includes('LITERAL')) badgeClass = 'badge-warning';
        else if (['INT', 'CHAR', 'VOID', 'IF', 'WHILE', 'RETURN'].includes(t.type)) badgeClass = 'badge-accent';

        return `
        <tr>
          <td><span class="text-muted">${idx + 1}</span></td>
          <td><span class="badge ${badgeClass}">${t.type}</span></td>
          <td><code>${this.escapeHtml(JSON.stringify(t.value))}</code></td>
          <td><span class="text-muted">Line ${t.line}:${t.column}</span></td>
        </tr>
      `;
      })
      .join('');
  }

  updateAstUI(ast) {
    this.astVisualizer.render(ast);
    const jsonPre = document.getElementById('ast-json-content');
    if (jsonPre) {
      jsonPre.textContent = JSON.stringify(ast, null, 2);
    }
  }

  updateSymbolsUI(allScopes) {
    // Update Scope filter options
    const scopeSelect = document.getElementById('scope-select-filter');
    scopeSelect.innerHTML = `<option value="all">All Scopes (${allScopes.length})</option>`;
    allScopes.forEach((s) => {
      scopeSelect.innerHTML += `<option value="${s.name}">${s.name} (depth ${s.depth})</option>`;
    });

    // Flatten symbols
    const symbols = [];
    allScopes.forEach((s) => {
      for (const [name, sym] of s.symbols.entries()) {
        symbols.push({ scopeName: s.name, scopeDepth: s.depth, ...sym });
      }
    });

    this.symbolsData = symbols;
    document.getElementById('stat-scopes-count').textContent = allScopes.length;
    document.getElementById('stat-symbols-count').textContent = symbols.length;

    this.renderSymbolsTable('all');
  }

  renderSymbolsTable(scopeFilter) {
    const tbody = document.getElementById('symbols-table-body');
    const filtered = this.symbolsData.filter((s) => {
      if (!scopeFilter || scopeFilter === 'all') return true;
      return s.scopeName === scopeFilter;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No symbols defined in this scope.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((s) => {
        let catBadge = 'badge-subtle';
        if (s.category === 'function') catBadge = 'badge-accent';
        else if (s.category === 'builtin') catBadge = 'badge-info';
        else if (s.category === 'array') catBadge = 'badge-warning';

        let paramsOrDim = '-';
        if (s.category === 'function' || s.category === 'builtin') {
          paramsOrDim = `(${s.params.map((p) => `${p.type} ${p.name || ''}`).join(', ')})`;
        } else if (s.isArray) {
          paramsOrDim = `[${s.arraySize || ''}]`;
        }

        return `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td><span class="badge badge-subtle">${s.scopeName}</span></td>
          <td><span class="badge ${catBadge}">${s.category}</span></td>
          <td><code>${s.type}</code></td>
          <td><span class="text-secondary">${this.escapeHtml(paramsOrDim)}</span></td>
          <td><span class="text-muted">${s.offset !== undefined ? s.offset : '-'}</span></td>
          <td><span class="text-muted">Line ${s.line || '-'}</span></td>
        </tr>
      `;
      })
      .join('');
  }

  updateTacUI(origTac, optTac, origCount, optCount, reductionPercent, optLog) {
    document.getElementById('tac-stat-orig').textContent = origCount;
    document.getElementById('tac-stat-opt').textContent = optCount;

    const redBadge = document.getElementById('tac-stat-reduction');
    redBadge.textContent = `${reductionPercent}% reduction`;
    if (reductionPercent > 0) {
      redBadge.className = 'badge badge-success';
    } else {
      redBadge.className = 'badge badge-subtle';
    }

    document.getElementById('tac-orig-content').textContent = origTac.map((i) => i.toString()).join('\n');
    document.getElementById('tac-opt-content').textContent = optTac.map((i) => i.toString()).join('\n');

    const logList = document.getElementById('optimizer-log-list');
    if (optLog.length === 0) {
      logList.innerHTML = `<div class="empty-state-subtle">No optimization opportunities found for this input.</div>`;
    } else {
      logList.innerHTML = optLog.map((entry) => `<div class="log-entry">${this.escapeHtml(entry)}</div>`).join('');
    }
  }

  showDiagnostics(errors, warnings) {
    const panel = document.getElementById('diagnostics-panel');
    const summary = document.getElementById('diagnostics-summary');
    const list = document.getElementById('diagnostics-list');

    if (errors.length === 0 && warnings.length === 0) {
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    summary.textContent = `${errors.length} Error(s), ${warnings.length} Warning(s)`;

    let html = '';

    for (const err of errors) {
      this.editor.setGutterError(err.line, err.message);
      html += `
        <div class="diag-item diag-item-error" data-line="${err.line}">
          <span class="diag-loc">[${err.phase || 'Error'} Line ${err.line}:${err.column}]</span>
          <span>${this.escapeHtml(err.message)}</span>
        </div>
      `;
    }

    for (const w of warnings) {
      html += `
        <div class="diag-item diag-item-warning" data-line="${w.line}">
          <span class="diag-loc">[Warning Line ${w.line}:${w.column}]</span>
          <span>${this.escapeHtml(w.message)}</span>
        </div>
      `;
    }

    list.innerHTML = html;

    // Attach click to jump to line in editor
    list.querySelectorAll('.diag-item').forEach((item) => {
      item.addEventListener('click', () => {
        const line = parseInt(item.getAttribute('data-line'), 10);
        if (line) {
          this.editor.scrollToLine(line);
        }
      });
    });
  }

  showToast(msg) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.background = '#1e1b4b';
    toast.style.color = '#fff';
    toast.style.border = '1px solid #8b5cf6';
    toast.style.borderRadius = '8px';
    toast.style.padding = '10px 16px';
    toast.style.fontSize = '13px';
    toast.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
    toast.style.zIndex = '9999';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Start Application on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  window.studio = new TinyCCompilerStudio();
});

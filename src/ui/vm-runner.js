// Interactive Step-by-Step VM Runner and Visual Debugger UI

export class VMDebuggerUI {
  constructor(vm, domElements) {
    this.vm = vm;
    this.elems = domElements;
    this.timer = null;
    this.speed = 150; // ms per step
    this.isRunning = false;

    this.bindEvents();
  }

  bindEvents() {
    if (this.elems.btnStep) {
      this.elems.btnStep.addEventListener('click', () => this.step());
    }
    if (this.elems.btnRun) {
      this.elems.btnRun.addEventListener('click', () => this.toggleRun());
    }
    if (this.elems.btnReset) {
      this.elems.btnReset.addEventListener('click', () => this.reset());
    }
    if (this.elems.speedSelect) {
      this.elems.speedSelect.addEventListener('change', (e) => {
        this.speed = parseInt(e.target.value, 10);
        if (this.isRunning) {
          this.pause();
          this.startRun();
        }
      });
    }
    if (this.elems.inputSubmit && this.elems.inputBox) {
      const submitInput = () => {
        const val = this.elems.inputBox.value;
        if (val.trim() !== '') {
          this.vm.provideInput(val);
          this.elems.inputBox.value = '';
          this.elems.inputContainer.classList.add('hidden');
          this.updateUI();
          if (this.isRunning) {
            this.startRun();
          }
        }
      };

      this.elems.inputSubmit.addEventListener('click', submitInput);
      this.elems.inputBox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitInput();
      });
    }
  }

  loadBytecode(bytecode) {
    this.pause();
    this.vm.loadBytecode(bytecode);
    this.renderBytecodeList();
    this.updateUI();
  }

  toggleRun() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.startRun();
    }
  }

  startRun() {
    if (this.vm.isHalted) {
      this.reset();
    }
    this.isRunning = true;
    if (this.elems.btnRun) {
      this.elems.btnRun.innerHTML = `<span class="icon">⏸</span> Pause`;
      this.elems.btnRun.classList.add('btn-warning');
    }

    if (this.speed === 0) {
      // Instant execution
      this.vm.runAll();
      this.pause();
      this.updateUI();
      return;
    }

    const runLoop = () => {
      if (!this.isRunning) return;
      const res = this.vm.step();
      this.updateUI();

      if (res.waitingInput) {
        this.pause();
        this.promptForInput();
        return;
      }

      if (res.halted) {
        this.pause();
        return;
      }

      this.timer = setTimeout(runLoop, this.speed);
    };

    runLoop();
  }

  pause() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.elems.btnRun) {
      this.elems.btnRun.innerHTML = `<span class="icon">▶</span> Run`;
      this.elems.btnRun.classList.remove('btn-warning');
    }
  }

  step() {
    this.pause();
    if (this.vm.isHalted) return;

    const res = this.vm.step();
    this.updateUI();

    if (res.waitingInput) {
      this.promptForInput();
    }
  }

  reset() {
    this.pause();
    this.vm.reset();
    if (this.elems.inputContainer) {
      this.elems.inputContainer.classList.add('hidden');
    }
    this.updateUI();
  }

  promptForInput() {
    if (this.elems.inputContainer && this.elems.inputBox) {
      this.elems.inputContainer.classList.remove('hidden');
      this.elems.inputBox.focus();
    }
  }

  renderBytecodeList() {
    if (!this.elems.bytecodeList) return;
    const instructions = this.vm.bytecode || [];

    this.elems.bytecodeList.innerHTML = instructions
      .map(
        (inst, idx) => `
        <div class="bytecode-row" data-ip="${idx}" id="bc-row-${idx}">
          <span class="bc-ip">${String(idx).padStart(4, '0')}</span>
          <span class="bc-op">${inst.op}</span>
          <span class="bc-arg">${inst.arg !== null ? JSON.stringify(inst.arg) : ''}</span>
          ${inst.comment ? `<span class="bc-comment">; ${this.escapeHtml(inst.comment)}</span>` : ''}
        </div>
      `
      )
      .join('');
  }

  updateUI() {
    // 1. Highlight active bytecode line
    if (this.elems.bytecodeList) {
      const prevActive = this.elems.bytecodeList.querySelector('.active-ip');
      if (prevActive) prevActive.classList.remove('active-ip');

      const currentActive = document.getElementById(`bc-row-${this.vm.ip}`);
      if (currentActive) {
        currentActive.classList.add('active-ip');
        currentActive.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    // 2. Evaluation Stack
    if (this.elems.stackContainer) {
      const stack = this.vm.stack;
      if (stack.length === 0) {
        this.elems.stackContainer.innerHTML = `<div class="empty-stack-hint">&lt;Empty Stack&gt;</div>`;
      } else {
        this.elems.stackContainer.innerHTML = stack
          .map(
            (val, idx) => `
            <div class="stack-slot ${idx === stack.length - 1 ? 'stack-top' : ''}">
              <span class="stack-idx">[${idx}]</span>
              <span class="stack-val">${this.escapeHtml(JSON.stringify(val))}</span>
              ${idx === stack.length - 1 ? '<span class="top-badge">TOP</span>' : ''}
            </div>
          `
          )
          .reverse()
          .join('');
      }
    }

    // 3. Call Stack
    if (this.elems.callStackContainer) {
      const frames = this.vm.callStack;
      if (frames.length === 0) {
        this.elems.callStackContainer.innerHTML = `<div class="empty-stack-hint">&lt;Global Scope (No active frames)&gt;</div>`;
      } else {
        this.elems.callStackContainer.innerHTML = frames
          .map(
            (f, idx) => `
            <div class="frame-card">
              <div class="frame-header">
                <strong>${this.escapeHtml(f.funcName || 'anonymous')}()</strong>
                <span class="frame-ret">ret: ${f.returnIp}</span>
              </div>
              <div class="frame-locals">
                ${
                  f.locals.size === 0
                    ? '<span class="text-muted">No local variables</span>'
                    : Array.from(f.locals.entries())
                        .map(
                          ([k, v]) =>
                            `<span class="local-pill"><strong>${k}</strong> = ${this.escapeHtml(
                              JSON.stringify(v)
                            )}</span>`
                        )
                        .join('')
                }
              </div>
            </div>
          `
          )
          .reverse()
          .join('');
      }
    }

    // 4. Memory & Heap
    if (this.elems.memoryContainer) {
      const globals = Array.from(this.vm.globals.entries());
      const heap = Array.from(this.vm.heap.entries());

      let html = '';
      if (globals.length > 0) {
        html += `<div class="mem-section-title">Globals</div>`;
        html += `<div class="mem-grid">`;
        globals.forEach(([k, v]) => {
          html += `<div class="mem-item"><span class="mem-key">${k}</span>: <span class="mem-val">${v}</span></div>`;
        });
        html += `</div>`;
      }

      if (heap.length > 0) {
        html += `<div class="mem-section-title">Heap Arrays</div>`;
        heap.forEach(([name, arr]) => {
          html += `
            <div class="array-card">
              <span class="arr-name">${name}[${arr.length}]</span>: 
              <span class="arr-content">[ ${arr.join(', ')} ]</span>
            </div>
          `;
        });
      }

      if (globals.length === 0 && heap.length === 0) {
        html = `<div class="empty-stack-hint">&lt;No allocated memory&gt;</div>`;
      }

      this.elems.memoryContainer.innerHTML = html;
    }

    // 5. Output Console
    if (this.elems.terminalOutput) {
      const text = this.vm.output.join('');
      this.elems.terminalOutput.textContent = text || '> Program ready. Click Run or Step to execute.';
      this.elems.terminalOutput.scrollTop = this.elems.terminalOutput.scrollHeight;
    }

    // 6. Status text
    if (this.elems.statusText) {
      if (this.vm.isHalted) {
        this.elems.statusText.innerHTML = `<span class="badge badge-success">HALTED (Steps: ${this.vm.stepsCount})</span>`;
      } else if (this.vm.isWaitingForInput) {
        this.elems.statusText.innerHTML = `<span class="badge badge-warning">WAITING FOR INPUT (read_int)</span>`;
      } else {
        this.elems.statusText.innerHTML = `<span class="badge badge-info">IP: ${this.vm.ip} | Steps: ${this.vm.stepsCount}</span>`;
      }
    }
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

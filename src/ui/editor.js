// Code Editor Controller with Line Numbers, Tab Indentation, and Diagnostics

export class CodeEditor {
  constructor({ textareaId, lineNumbersId, gutterMarkersId, exampleSelectId, onCompile }) {
    this.textarea = document.getElementById(textareaId);
    this.lineNumbers = document.getElementById(lineNumbersId);
    this.gutterMarkers = document.getElementById(gutterMarkersId);
    this.exampleSelect = document.getElementById(exampleSelectId);
    this.onCompile = onCompile;

    this.bindEvents();
    this.updateLineNumbers();
  }

  bindEvents() {
    if (!this.textarea) return;

    // Synchronize scrolling
    this.textarea.addEventListener('scroll', () => {
      if (this.lineNumbers) {
        this.lineNumbers.scrollTop = this.textarea.scrollTop;
      }
    });

    // Update line numbers on input
    this.textarea.addEventListener('input', () => {
      this.updateLineNumbers();
    });

    // Support Tab key (4 spaces) and auto-closing braces/quotes
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;

        this.textarea.value = value.substring(0, start) + '    ' + value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
        this.updateLineNumbers();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        // Ctrl+Enter to compile
        e.preventDefault();
        if (this.onCompile) this.onCompile();
      }
    });
  }

  getValue() {
    return this.textarea ? this.textarea.value : '';
  }

  setValue(val) {
    if (this.textarea) {
      this.textarea.value = val;
      this.updateLineNumbers();
      this.clearGutterMarkers();
    }
  }

  updateLineNumbers() {
    if (!this.lineNumbers || !this.textarea) return;
    const lines = this.textarea.value.split('\n');
    const count = lines.length;

    let numsHtml = '';
    for (let i = 1; i <= count; i++) {
      numsHtml += `<div class="line-num" data-line="${i}">${i}</div>`;
    }
    this.lineNumbers.innerHTML = numsHtml;
  }

  setGutterError(line, message) {
    if (!this.lineNumbers) return;
    const el = this.lineNumbers.querySelector(`.line-num[data-line="${line}"]`);
    if (el) {
      el.classList.add('line-num-error');
      el.title = message;
    }
  }

  clearGutterMarkers() {
    if (!this.lineNumbers) return;
    this.lineNumbers.querySelectorAll('.line-num-error').forEach((el) => {
      el.classList.remove('line-num-error');
      el.removeAttribute('title');
    });
  }

  scrollToLine(line) {
    if (!this.textarea) return;
    const lines = this.textarea.value.split('\n');
    let charPos = 0;
    for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
      charPos += lines[i].length + 1;
    }
    this.textarea.focus();
    this.textarea.setSelectionRange(charPos, charPos + (lines[line - 1] ? lines[line - 1].length : 0));
  }
}

// Interactive AST Tree Visualizer (SVG Graphic Layout + Collapsible Tree List)

export class ASTVisualizer {
  constructor(containerId, detailsContainerId) {
    this.container = document.getElementById(containerId);
    this.detailsContainer = document.getElementById(detailsContainerId);
    this.ast = null;
    this.collapsedNodes = new Set();
    this.selectedNode = null;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    this.setupInteractivity();
  }

  setupInteractivity() {
    if (!this.container) return;

    this.container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.node-group')) return;
      this.isDragging = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      this.container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.applyTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      if (this.container) this.container.style.cursor = 'grab';
    });

    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      if (e.deltaY < 0) {
        this.zoom = Math.min(2.5, this.zoom * zoomFactor);
      } else {
        this.zoom = Math.max(0.4, this.zoom / zoomFactor);
      }
      this.applyTransform();
    });
  }

  applyTransform() {
    const g = this.container.querySelector('#ast-viewport');
    if (g) {
      g.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
    }
  }

  zoomIn() {
    this.zoom = Math.min(2.5, this.zoom * 1.2);
    this.applyTransform();
  }

  zoomOut() {
    this.zoom = Math.max(0.4, this.zoom / 1.2);
    this.applyTransform();
  }

  resetZoom() {
    this.zoom = 1;
    this.panX = 40;
    this.panY = 40;
    this.applyTransform();
  }

  render(ast) {
    this.ast = ast;
    this.selectedNode = null;
    if (!this.container) return;

    if (!ast) {
      this.container.innerHTML = `<div class="empty-state">No AST available. Click <strong>Compile</strong> to generate the syntax tree.</div>`;
      if (this.detailsContainer) this.detailsContainer.innerHTML = '';
      return;
    }

    // Convert AST into a standard visual tree hierarchy
    const visualTree = this.buildHierarchy(ast);

    // Compute node coordinates
    this.layoutTree(visualTree, 0, 0);

    // Render SVG
    this.renderSVG(visualTree);
  }

  buildHierarchy(node, key = 'root') {
    if (!node) return null;

    let label = node.nodeType || 'Node';
    let detail = '';
    let category = 'structure';
    const children = [];

    switch (node.nodeType) {
      case 'Program':
        label = 'Program';
        category = 'root';
        detail = `${node.declarations ? node.declarations.length : 0} decls`;
        if (node.declarations) {
          node.declarations.forEach((d, i) => {
            const child = this.buildHierarchy(d, `decl_${i}`);
            if (child) children.push(child);
          });
        }
        break;

      case 'FunctionDecl':
        label = `fn ${node.name}`;
        category = 'function';
        detail = `(${node.params.map((p) => `${p.type} ${p.name}`).join(', ')}) -> ${node.returnType}`;
        if (node.body) {
          const bodyNode = this.buildHierarchy(node.body, 'body');
          if (bodyNode) children.push(bodyNode);
        }
        break;

      case 'VarDecl':
        label = `var ${node.name}`;
        category = 'variable';
        detail = node.isArray ? `${node.type}[${node.arraySize || ''}]` : node.type;
        if (node.initExpr) {
          const init = this.buildHierarchy(node.initExpr, 'init');
          if (init) children.push(init);
        }
        break;

      case 'Block':
        label = 'Block';
        category = 'statement';
        detail = `{ ${node.statements.length} stmts }`;
        node.statements.forEach((s, i) => {
          const stmt = this.buildHierarchy(s, `s_${i}`);
          if (stmt) children.push(stmt);
        });
        break;

      case 'IfStmt':
        label = 'if';
        category = 'control';
        if (node.condition) children.push(this.buildHierarchy(node.condition, 'cond'));
        if (node.thenBranch) children.push(this.buildHierarchy(node.thenBranch, 'then'));
        if (node.elseBranch) children.push(this.buildHierarchy(node.elseBranch, 'else'));
        break;

      case 'WhileStmt':
        label = 'while';
        category = 'control';
        if (node.condition) children.push(this.buildHierarchy(node.condition, 'cond'));
        if (node.body) children.push(this.buildHierarchy(node.body, 'body'));
        break;

      case 'ForStmt':
        label = 'for';
        category = 'control';
        if (node.init) children.push(this.buildHierarchy(node.init, 'init'));
        if (node.condition) children.push(this.buildHierarchy(node.condition, 'cond'));
        if (node.update) children.push(this.buildHierarchy(node.update, 'step'));
        if (node.body) children.push(this.buildHierarchy(node.body, 'body'));
        break;

      case 'ReturnStmt':
        label = 'return';
        category = 'control';
        if (node.value) children.push(this.buildHierarchy(node.value, 'val'));
        break;

      case 'ExprStmt':
        label = 'ExprStmt';
        category = 'statement';
        if (node.expression) children.push(this.buildHierarchy(node.expression, 'expr'));
        break;

      case 'BinaryExpr':
        label = `Op '${node.operator}'`;
        category = 'operator';
        if (node.left) children.push(this.buildHierarchy(node.left, 'left'));
        if (node.right) children.push(this.buildHierarchy(node.right, 'right'));
        break;

      case 'UnaryExpr':
        label = `Unary '${node.operator}'`;
        category = 'operator';
        detail = node.isPrefix ? 'prefix' : 'postfix';
        if (node.operand) children.push(this.buildHierarchy(node.operand, 'operand'));
        break;

      case 'AssignExpr':
        label = `Assign '${node.operator}'`;
        category = 'operator';
        if (node.target) children.push(this.buildHierarchy(node.target, 'target'));
        if (node.value) children.push(this.buildHierarchy(node.value, 'val'));
        break;

      case 'CallExpr':
        label = `call ${node.callee}()`;
        category = 'call';
        detail = `${node.args.length} args`;
        node.args.forEach((a, i) => {
          const arg = this.buildHierarchy(a, `arg_${i}`);
          if (arg) children.push(arg);
        });
        break;

      case 'ArrayAccessExpr':
        label = `Index []`;
        category = 'expression';
        if (node.array) children.push(this.buildHierarchy(node.array, 'arr'));
        if (node.index) children.push(this.buildHierarchy(node.index, 'idx'));
        break;

      case 'VariableExpr':
        label = `id: ${node.name}`;
        category = 'identifier';
        break;

      case 'LiteralExpr':
        label = `lit: ${JSON.stringify(node.value)}`;
        category = 'literal';
        detail = node.literalType;
        break;

      default:
        label = node.nodeType || 'Node';
        category = 'structure';
    }

    return {
      id: `${node.nodeType}_${node.line}_${node.column}_${Math.random().toString(36).substr(2, 4)}`,
      label,
      detail,
      category,
      rawNode: node,
      key,
      children,
      width: Math.max(120, label.length * 8 + 30),
      height: detail ? 54 : 42,
      x: 0,
      y: 0,
    };
  }

  layoutTree(root) {
    if (!root) return;

    let currentX = 50;
    const levelHeight = 90;
    const nodeMargin = 30;

    // Helper to compute subtree widths
    function measureSubtree(node) {
      if (!node.children || node.children.length === 0) {
        node.subtreeWidth = node.width;
        return node.subtreeWidth;
      }
      let total = 0;
      node.children.forEach((c) => {
        total += measureSubtree(c) + nodeMargin;
      });
      total -= nodeMargin;
      node.subtreeWidth = Math.max(node.width, total);
      return node.subtreeWidth;
    }

    measureSubtree(root);

    // Second pass: position nodes
    function assignPositions(node, left, depth) {
      const myWidth = node.subtreeWidth;
      node.x = left + myWidth / 2;
      node.y = 50 + depth * levelHeight;

      let childLeft = left;
      if (node.children) {
        node.children.forEach((child) => {
          assignPositions(child, childLeft, depth + 1);
          childLeft += child.subtreeWidth + nodeMargin;
        });
      }
    }

    assignPositions(root, 50, 0);
  }

  renderSVG(root) {
    // Collect all links and nodes
    const links = [];
    const nodes = [];

    function traverse(node) {
      nodes.push(node);
      if (node.children) {
        node.children.forEach((child) => {
          links.push({
            x1: node.x,
            y1: node.y + node.height / 2,
            x2: child.x,
            y2: child.y - child.height / 2,
            key: child.key,
          });
          traverse(child);
        });
      }
    }

    traverse(root);

    // Compute SVG bounds
    let maxX = 800;
    let maxY = 600;
    nodes.forEach((n) => {
      maxX = Math.max(maxX, n.x + n.width + 100);
      maxY = Math.max(maxY, n.y + n.height + 150);
    });

    const categoryColors = {
      root: { bg: '#312e81', border: '#6366f1', text: '#e0e7ff' },
      function: { bg: '#1e1b4b', border: '#8b5cf6', text: '#ddd6fe' },
      variable: { bg: '#064e3b', border: '#10b981', text: '#d1fae5' },
      statement: { bg: '#1e293b', border: '#475569', text: '#f1f5f9' },
      control: { bg: '#701a75', border: '#d946ef', text: '#fae8ff' },
      operator: { bg: '#78350f', border: '#f59e0b', text: '#fef3c7' },
      call: { bg: '#0c4a6e', border: '#0284c7', text: '#e0f2fe' },
      identifier: { bg: '#14532d', border: '#22c55e', text: '#dcfce7' },
      literal: { bg: '#831843', border: '#ec4899', text: '#fce7f3' },
      structure: { bg: '#18181b', border: '#52525b', text: '#f4f4f5' },
    };

    let svgHtml = `
      <svg id="ast-svg" width="100%" height="100%" viewBox="0 0 ${maxX} ${maxY}" style="min-height: 500px;">
        <defs>
          <linearGradient id="link-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.5" />
          </linearGradient>
          <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.4"/>
          </filter>
        </defs>
        <g id="ast-viewport" transform="translate(${this.panX}, ${this.panY}) scale(${this.zoom})">
          <!-- Links -->
          <g class="links-layer">
            ${links
              .map(
                (l) => `
                <path d="M ${l.x1} ${l.y1} C ${l.x1} ${(l.y1 + l.y2) / 2}, ${l.x2} ${(l.y1 + l.y2) / 2}, ${l.x2} ${l.y2}" 
                      fill="none" stroke="url(#link-grad)" stroke-width="2" stroke-linecap="round"/>
                ${
                  l.key && !l.key.startsWith('decl_') && !l.key.startsWith('s_') && !l.key.startsWith('arg_')
                    ? `<text x="${(l.x1 + l.x2) / 2}" y="${(l.y1 + l.y2) / 2 - 4}" 
                            fill="#94a3b8" font-size="10" font-family="JetBrains Mono, monospace" text-anchor="middle">${l.key}</text>`
                    : ''
                }
              `
              )
              .join('')}
          </g>

          <!-- Nodes -->
          <g class="nodes-layer">
            ${nodes
              .map((n) => {
                const color = categoryColors[n.category] || categoryColors.structure;
                const rx = n.x - n.width / 2;
                const ry = n.y - n.height / 2;
                return `
                <g class="node-group" data-id="${n.id}" transform="translate(${rx}, ${ry})" style="cursor: pointer;" filter="url(#node-glow)">
                  <rect width="${n.width}" height="${n.height}" rx="8" 
                        fill="${color.bg}" stroke="${color.border}" stroke-width="1.5" />
                  <text x="${n.width / 2}" y="${n.detail ? 20 : 25}" 
                        fill="${color.text}" font-size="12" font-weight="600" 
                        font-family="JetBrains Mono, monospace" text-anchor="middle">
                    ${this.escapeHtml(n.label)}
                  </text>
                  ${
                    n.detail
                      ? `<text x="${n.width / 2}" y="38" 
                               fill="#94a3b8" font-size="10" 
                               font-family="JetBrains Mono, monospace" text-anchor="middle">
                           ${this.escapeHtml(n.detail)}
                         </text>`
                      : ''
                  }
                </g>
              `;
              })
              .join('')}
          </g>
        </g>
      </svg>
    `;

    this.container.innerHTML = svgHtml;

    // Attach click events to nodes
    this.container.querySelectorAll('.node-group').forEach((elem) => {
      elem.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = elem.getAttribute('data-id');
        const found = nodes.find((n) => n.id === id);
        if (found) {
          this.showNodeDetails(found);
          this.highlightNode(elem);
        }
      });
    });
  }

  highlightNode(element) {
    this.container.querySelectorAll('.node-group rect').forEach((r) => {
      r.setAttribute('stroke-width', '1.5');
    });
    const rect = element.querySelector('rect');
    if (rect) {
      rect.setAttribute('stroke-width', '3');
      rect.setAttribute('stroke', '#ffffff');
    }
  }

  showNodeDetails(nodeInfo) {
    if (!this.detailsContainer) return;
    const raw = nodeInfo.rawNode;

    const attributes = [];
    for (const [key, val] of Object.entries(raw)) {
      if (['line', 'column', 'nodeType'].includes(key)) continue;
      if (typeof val === 'object' && val !== null) {
        if (Array.isArray(val)) {
          attributes.push(`<strong>${key}:</strong> [Array of ${val.length} items]`);
        } else {
          attributes.push(`<strong>${key}:</strong> ${val.nodeType || typeof val}`);
        }
      } else {
        attributes.push(`<strong>${key}:</strong> <code>${JSON.stringify(val)}</code>`);
      }
    }

    this.detailsContainer.innerHTML = `
      <div class="ast-detail-card">
        <div class="ast-detail-header">
          <span class="badge badge-accent">${raw.nodeType}</span>
          <span class="badge badge-subtle">Line ${raw.line || '?'}:${raw.column || '?'}</span>
        </div>
        <div class="ast-detail-title">${nodeInfo.label}</div>
        ${nodeInfo.detail ? `<div class="ast-detail-subtitle">${nodeInfo.detail}</div>` : ''}
        <div class="ast-detail-props">
          ${attributes.map((a) => `<div class="ast-prop-row">${a}</div>`).join('')}
        </div>
      </div>
    `;
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

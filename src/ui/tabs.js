// Tab Switching and Layout Coordinator

export class TabManager {
  constructor() {
    this.tabs = document.querySelectorAll('.tab-btn');
    this.panels = document.querySelectorAll('.tab-panel');
    this.activeTab = 'tab-tokens';

    this.bindEvents();
  }

  bindEvents() {
    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-target');
        this.switchTab(target);
      });
    });
  }

  switchTab(targetId) {
    this.activeTab = targetId;

    this.tabs.forEach((t) => {
      if (t.getAttribute('data-target') === targetId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    this.panels.forEach((p) => {
      if (p.id === targetId) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // Notify window resize so SVG canvas recalculates if needed
    window.dispatchEvent(new Event('resize'));
  }
}

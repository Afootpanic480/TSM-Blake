// CustomContextMenu.js
// Plain JS custom context menu for use in your app
// Usage: attachCustomContextMenu(element, menuItems)
// Place this file in a <script> tag, no import/export needed

(function() {
  let customMenu = null;
  let customMenuTarget = null;
  let keydownHandler = null;
  const delegatedMenus = [];
  const delegatedSelectors = new Set();

  // Hide menu on click, scroll, or resize
  function hideCustomContextMenu() {
    if (customMenu) {
      customMenu.remove();
      customMenu = null;
      document.body.style.overflow = '';
    }
  }

  // Show the menu at the mouse position
  function showCustomContextMenu(e, menuItems) {
    hideCustomContextMenu();
    customMenu = document.createElement('div');
    customMenu.className = 'custom-context-menu';
    customMenu.setAttribute('role', 'menu');
    customMenu.tabIndex = -1;
    const focusableItems = [];
    menuItems.forEach(function(item) {
      if (item === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'custom-context-menu-separator';
        customMenu.appendChild(sep);
        return;
      }
      if (item && (item.isHeader || item.type === 'header')) {
        const header = document.createElement('div');
        header.className = 'custom-context-menu-header';
        header.textContent = item.label || '';
        header.setAttribute('role', 'presentation');
        customMenu.appendChild(header);
        return;
      }
      const menuItem = document.createElement('div');
      menuItem.className = 'custom-context-menu-item';
      menuItem.setAttribute('role', 'menuitem');
      menuItem.tabIndex = -1;
      const iconHtml = item.icon ? `<span class="custom-context-menu-icon">${item.icon}</span>` : '';
      const shortcutHtml = item.shortcut ? `<span class="custom-context-menu-shortcut">${item.shortcut}</span>` : '';
      menuItem.innerHTML = `${iconHtml}<span class="custom-context-menu-label">${item.label || ''}</span>${shortcutHtml}`;
      if (item.onClick && !item.disabled) {
        menuItem.addEventListener('click', function(evt) {
          evt.stopPropagation();
          item.onClick(e, customMenuTarget);
          hideCustomContextMenu();
        });
      }
      if (item.disabled) {
        menuItem.classList.add('disabled');
        menuItem.setAttribute('aria-disabled', 'true');
      } else {
        focusableItems.push(menuItem);
      }
      customMenu.appendChild(menuItem);
    });
    document.body.appendChild(customMenu);
    // Position menu
    const menuWidth = customMenu.offsetWidth;
    const menuHeight = customMenu.offsetHeight;
    let x = e.clientX;
    let y = e.clientY;
    // Prevent overflow
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 4;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 4;
    customMenu.style.top = y + 'px';
    customMenu.style.left = x + 'px';
    customMenu.style.display = 'block';
    customMenuTarget = e.target;
    document.body.style.overflow = 'hidden';

    // Keyboard navigation
    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler, true);
      keydownHandler = null;
    }
    let activeIndex = 0;
    if (focusableItems.length) {
      focusableItems[0].classList.add('focused');
      focusableItems[0].focus();
    }
    keydownHandler = function(ev) {
      if (!customMenu) return;
      const key = ev.key;
      if (key === 'Escape') {
        ev.preventDefault();
        hideCustomContextMenu();
        return;
      }
      if (!focusableItems.length) return;
      if (key === 'ArrowDown' || key === 'Tab') {
        ev.preventDefault();
        focusableItems[activeIndex]?.classList.remove('focused');
        activeIndex = (activeIndex + (ev.shiftKey && key === 'Tab' ? -1 : 1) + focusableItems.length) % focusableItems.length;
        focusableItems[activeIndex].classList.add('focused');
        focusableItems[activeIndex].focus();
      } else if (key === 'ArrowUp') {
        ev.preventDefault();
        focusableItems[activeIndex]?.classList.remove('focused');
        activeIndex = (activeIndex - 1 + focusableItems.length) % focusableItems.length;
        focusableItems[activeIndex].classList.add('focused');
        focusableItems[activeIndex].focus();
      } else if (key === 'Home') {
        ev.preventDefault();
        focusableItems[activeIndex]?.classList.remove('focused');
        activeIndex = 0;
        focusableItems[activeIndex].classList.add('focused');
        focusableItems[activeIndex].focus();
      } else if (key === 'End') {
        ev.preventDefault();
        focusableItems[activeIndex]?.classList.remove('focused');
        activeIndex = focusableItems.length - 1;
        focusableItems[activeIndex].classList.add('focused');
        focusableItems[activeIndex].focus();
      } else if (key === 'Enter' || key === ' ') {
        ev.preventDefault();
        const el = focusableItems[activeIndex];
        if (el && !el.classList.contains('disabled')) {
          el.click();
        }
      }
    };
    document.addEventListener('keydown', keydownHandler, true);
    customMenu.addEventListener('keydown', keydownHandler, true);
  }

  // Attach context menu to an element
  // Track menu-bound elements for specificity
  const contextMenuElements = new WeakMap();

  window.attachCustomContextMenu = function(element, menuItems) {
    if (!element) return;
    contextMenuElements.set(element, menuItems);
    element.addEventListener('contextmenu', function(e) {
      // Allow native context menu inside inputs/textarea/contentEditable
      const tag = (e.target.tagName || '').toLowerCase();
      const isEditable = (e.target.isContentEditable === true) || tag === 'input' || tag === 'textarea';
      if (isEditable) return; // let browser handle it
      // Only trigger if this is the most specific (deepest) menu
      let node = e.target;
      let found = null;
      while (node) {
        if (contextMenuElements.has(node)) {
          found = node;
          break;
        }
        node = node.parentElement;
      }
      if (found === element) {
        e.preventDefault();
        showCustomContextMenu(e, menuItems);
      }
    }, true);
    // Hide menu on click elsewhere, scroll, or resize
    document.addEventListener('click', hideCustomContextMenu);
    window.addEventListener('resize', hideCustomContextMenu);
    window.addEventListener('scroll', hideCustomContextMenu);
  };

  // Only show the global menu if no other menu is present
  document.addEventListener('contextmenu', function(e) {
    let node = e.target;
    // If any ancestor EXCEPT body has a specific menu, let that element's handler handle it
    while (node && node !== document.body) {
      if (contextMenuElements.has(node)) return;
      node = node.parentElement;
    }
    // Delegated selectors fallback: show menu if target is within a registered selector
    for (let i = 0; i < delegatedMenus.length; i++) {
      const { selector, items } = delegatedMenus[i];
      try {
        const container = e.target.closest(selector);
        if (container) {
          const menuItems = (typeof items === 'function') ? items(container, e) : items;
          if (Array.isArray(menuItems) && menuItems.length) {
            e.preventDefault();
            // Open at pointer coords but bind to container for onClick target
            showCustomContextMenuAt(e.clientX, e.clientY, menuItems, container);
            return;
          }
        }
      } catch (_) {}
    }
    // Allow native context menu inside inputs/textarea/contentEditable
    const tag = (e.target.tagName || '').toLowerCase();
    const isEditable = (e.target.isContentEditable === true) || tag === 'input' || tag === 'textarea';
    if (isEditable) return; // let the browser handle it
    e.preventDefault();
    if (contextMenuElements.has(document.body)) {
      showCustomContextMenu(e, contextMenuElements.get(document.body));
    }
  }, true);

  // Programmatic API to open menu at specific coordinates
  window.showCustomContextMenuAt = function(x, y, menuItems, targetEl) {
    const fakeEvent = { clientX: x, clientY: y, target: targetEl || document.body };
    showCustomContextMenu(fakeEvent, menuItems);
  };

  // API to register delegated menus by selector
  window.registerContextMenuDelegate = function(selector, items) {
    if (!selector) return;
    if (delegatedSelectors.has(selector)) return;
    delegatedSelectors.add(selector);
    delegatedMenus.push({ selector, items });
  };

  // Note: We do not force-block all native context menus globally.

})();

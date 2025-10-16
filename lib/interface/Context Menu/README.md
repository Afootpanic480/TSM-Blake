# Blake's Custom Context Menu

This is a custom context menu I created for School Messenger. It's simple, straightforward, and easy to use. This is mostly made for Sam to use in case he wants to add or improve anything.

---

## How to Use/Change

1. **Import the files** (preferably in School_Messenger.html):
   ```html
   <link rel="stylesheet" href="./lib/interface/Context Menu/contextMenu.css">
   <script type="module" src="./lib/interface/Context Menu/CustomContextMenu.js"></script>
   ```

2. **Attach to any element:**
   ```js
   CustomContextMenu.attachTo(document.getElementById('my-element'), [
     { label: 'Copy', icon: '📋', onClick: (e, el) => document.execCommand('copy') },
     { label: 'Paste', icon: '📄', onClick: (e, el) => {/* paste logic */} },
     'separator',
     { label: 'Delete', icon: '🗑️', onClick: (e, el) => el.remove(), disabled: false }
   ]);
   ```

## API
- `attachTo(element, items)` — Attach a menu to any DOM element.
- **Menu item options:**
  - `label`: Text to show
  - `icon`: Emoji or SVG
  - `onClick`: Function `(event, element)`
  - `disabled`: Boolean (optional)
  - Use `'separator'` for a divider

## Customization
- Styles are held in `contextMenu.css`
- Use emojis or SVG for icons
- Disabled items are controlled by the `disabled` property, and it's a boolean which means you enter `true` or `false` for it
- Only one menu shows at a time
- Clicking outside, scrolling, or resizing closes the menu
- Different options are displayed when you right click on different things on the screen (e.g., right clicking on the sidebar, a DM, the sidebar footer, etc.)

---

## Notes
- I want people to know that this is in very very VERY early stages of development, and it's no where near finished.
- I plan to add more features to it, and make it more user-friendly. 

# Mockup Widget Module

You are creating a UI mockup / wireframe that renders inline in a chat conversation.

## Rules (MUST follow)

1. Output: `<style>...</style>` then `<div>...</div>`
2. NO `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, NO HTML comments
3. NO gradients, box-shadows, or blur
4. Font-weight 400 and 500 only
5. All colors via CSS variables
6. Max width 480px for mobile mockups, 100% for desktop
7. Use placeholder rectangles for images

## CSS Variables

```
var(--widget-text), var(--widget-text-secondary), var(--widget-surface), var(--widget-border), var(--widget-accent)
```

## Template: Mobile app mockup

```html
<style>
  .mockup { font-family: system-ui, sans-serif; max-width: 375px; margin: 0 auto; }
  .mockup-frame { border: 1px solid var(--widget-border); border-radius: 1.5rem; overflow: hidden; background: var(--widget-surface); }
  .mockup-status { height: 2.5rem; padding: 0 1.25rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; font-weight: 500; color: var(--widget-text); }
  .mockup-header { padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--widget-border); }
  .mockup-header-title { font-size: 1.0625rem; font-weight: 500; color: var(--widget-text); }
  .mockup-body { padding: 1rem 1.25rem; min-height: 400px; }
  .mockup-nav { display: flex; border-top: 1px solid var(--widget-border); }
  .mockup-nav-item { flex: 1; padding: 0.625rem; text-align: center; font-size: 0.6875rem; color: var(--widget-text-secondary); }
  .mockup-nav-item.active { color: var(--widget-accent); font-weight: 500; }
  .mockup-placeholder { background: var(--widget-border); border-radius: 0.5rem; width: 100%; }
  .mockup-card { padding: 0.75rem; background: var(--widget-surface); border: 1px solid var(--widget-border); border-radius: 0.75rem; margin-bottom: 0.75rem; }
</style>

<div class="mockup">
  <div class="mockup-frame">
    <div class="mockup-status">
      <span>9:41</span>
      <span>...</span>
    </div>
    <div class="mockup-header">
      <div class="mockup-header-title">Screen title</div>
    </div>
    <div class="mockup-body">
      <!-- Content here -->
    </div>
    <div class="mockup-nav">
      <div class="mockup-nav-item active">Home</div>
      <div class="mockup-nav-item">Search</div>
      <div class="mockup-nav-item">Profile</div>
    </div>
  </div>
</div>
```

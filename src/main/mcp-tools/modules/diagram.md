# Diagram Widget Module

You are creating a diagram (flowchart, architecture, process flow, org chart, etc.) that renders inline in a chat conversation.

## Rules (MUST follow)

1. Output: `<style>...</style>` then `<div>...</div>` then optional `<script>...</script>`
2. NO `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags
3. NO HTML comments
4. NO gradients, box-shadows, or blur
5. Font-weight 400 and 500 only
6. All colors via CSS variables
7. Use SVG for diagrams (no external library needed in most cases)
8. Use `viewBox` for responsive sizing

## CSS Variables

```
var(--widget-text)           /* text, labels */
var(--widget-text-secondary) /* secondary labels */
var(--widget-surface)        /* node fills */
var(--widget-border)         /* node strokes, lines */
var(--widget-accent)         /* highlighted nodes/edges */
```

## Template: Flowchart / Architecture diagram (SVG)

```html
<style>
  .diagram { font-family: system-ui, sans-serif; width: 100%; overflow-x: auto; }
  .diagram-title { font-size: 1.125rem; font-weight: 500; color: var(--widget-text); margin-bottom: 1rem; }
  .diagram svg { max-width: 100%; height: auto; display: block; }
  .diagram text { font-family: system-ui, sans-serif; font-size: 13px; }
</style>

<div class="diagram">
  <div class="diagram-title">System architecture</div>
  <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
    <!-- Node: rounded rect + text -->
    <rect x="50" y="50" width="160" height="60" rx="8" fill="var(--widget-surface)" stroke="var(--widget-border)" stroke-width="1.5"/>
    <text x="130" y="85" text-anchor="middle" fill="var(--widget-text)" font-weight="500">Component A</text>

    <!-- Arrow: line + arrowhead -->
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--widget-text-secondary)"/>
      </marker>
    </defs>
    <line x1="210" y1="80" x2="320" y2="80" stroke="var(--widget-text-secondary)" stroke-width="1.5" marker-end="url(#arrow)"/>

    <rect x="320" y="50" width="160" height="60" rx="8" fill="var(--widget-surface)" stroke="var(--widget-border)" stroke-width="1.5"/>
    <text x="400" y="85" text-anchor="middle" fill="var(--widget-text)" font-weight="500">Component B</text>
  </svg>
</div>
```

## Tips

- Keep diagrams left-to-right or top-to-bottom
- Max 8-12 nodes for readability
- Use `text-anchor="middle"` to center text in nodes
- Standard node size: 140-180px wide, 50-70px tall
- Arrow spacing: 40-80px between nodes
- For complex diagrams, consider using Mermaid via CDN:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  ```

# Interactive Widget Module

You are creating an interactive HTML widget (calculator, converter, form, quiz, timer, etc.) that renders inline in a chat conversation.

## Rules (MUST follow)

1. Output a single HTML fragment: `<style>...</style>` then `<div>...</div>` then `<script>...</script>`
2. NO `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags
3. NO HTML comments
4. NO gradients, box-shadows, or blur effects
5. Only font-weight 400 and 500
6. All colors via CSS variables
7. Inputs and buttons must be keyboard accessible
8. Use `box-sizing: border-box` on interactive elements

## CSS Variables (pre-defined)

```
var(--widget-text)            /* primary text */
var(--widget-text-secondary)  /* muted text */
var(--widget-surface)         /* input/card bg */
var(--widget-border)          /* borders */
var(--widget-accent)          /* buttons, focus rings */
```

## No external libraries needed - use vanilla HTML/CSS/JS

## Template: Calculator / Converter

```html
<style>
  .interactive { font-family: system-ui, -apple-system, sans-serif; width: 100%; max-width: 480px; }
  .interactive-title { font-size: 1.125rem; font-weight: 500; color: var(--widget-text); margin-bottom: 1rem; }
  .field { margin-bottom: 0.75rem; }
  .field-label { display: block; font-size: 0.8125rem; color: var(--widget-text-secondary); margin-bottom: 0.375rem; }
  .field-input { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid var(--widget-border); border-radius: 0.5rem; background: var(--widget-surface); color: var(--widget-text); font-size: 0.9375rem; box-sizing: border-box; outline: none; font-family: inherit; }
  .field-input:focus { border-color: var(--widget-accent); }
  .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.625rem 1.25rem; border: none; border-radius: 0.5rem; background: var(--widget-accent); color: #fff; font-size: 0.875rem; font-weight: 500; cursor: pointer; font-family: inherit; }
  .btn:hover { opacity: 0.9; }
  .btn-row { display: flex; gap: 0.5rem; margin-top: 1rem; }
  .result-box { padding: 1rem; background: var(--widget-surface); border: 1px solid var(--widget-border); border-radius: 0.5rem; margin-top: 1rem; }
  .result-label { font-size: 0.8125rem; color: var(--widget-text-secondary); }
  .result-value { font-size: 1.5rem; font-weight: 500; color: var(--widget-text); margin-top: 0.25rem; }
</style>

<div class="interactive">
  <div class="interactive-title">Widget title</div>
  <div class="field">
    <label class="field-label">Input label</label>
    <input class="field-input" type="number" id="input1" placeholder="Enter value">
  </div>
  <div class="btn-row">
    <button class="btn" id="calcBtn">Calculate</button>
  </div>
  <div class="result-box" id="result" style="display:none">
    <div class="result-label">Result</div>
    <div class="result-value" id="resultValue"></div>
  </div>
</div>

<script>
(function() {
  document.getElementById('calcBtn').addEventListener('click', function() {
    var val = parseFloat(document.getElementById('input1').value);
    if (isNaN(val)) return;
    document.getElementById('resultValue').textContent = val * 2;
    document.getElementById('result').style.display = 'block';
  });
})();
</script>
```

## Template: Multi-option selector / Quiz

```html
<style>
  .quiz { font-family: system-ui, sans-serif; width: 100%; max-width: 520px; }
  .quiz-q { font-size: 1rem; font-weight: 500; color: var(--widget-text); margin-bottom: 1rem; }
  .quiz-option { display: block; width: 100%; padding: 0.75rem 1rem; margin-bottom: 0.5rem; border: 1px solid var(--widget-border); border-radius: 0.5rem; background: var(--widget-surface); color: var(--widget-text); font-size: 0.9375rem; cursor: pointer; text-align: left; font-family: inherit; box-sizing: border-box; }
  .quiz-option:hover { border-color: var(--widget-accent); }
  .quiz-option.selected { border-color: var(--widget-accent); background: color-mix(in srgb, var(--widget-accent) 8%, transparent); }
  .quiz-feedback { padding: 0.75rem 1rem; border-radius: 0.5rem; margin-top: 0.75rem; font-size: 0.875rem; }
</style>
```

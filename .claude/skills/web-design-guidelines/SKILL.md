# Web Design Guidelines

Comprehensive accessibility, responsive design, and visual hierarchy patterns for modern web applications.

## WCAG 2.1 Level AA Compliance

### Quick Checklist

| Requirement | Standard | How to Test |
|-------------|----------|-------------|
| Color Contrast (Normal Text) | 4.5:1 minimum | WebAIM Contrast Checker |
| Color Contrast (Large Text) | 3:1 minimum | 18px+ or 14px+ bold |
| Focus Visible | Clear focus indicator | Tab through page |
| Keyboard Accessible | All interactive elements | Navigate without mouse |
| Touch Targets | 44x44px minimum | Measure clickable areas |
| Motion | Respect prefers-reduced-motion | OS accessibility settings |

### Color Contrast

```css
/* ✅ GOOD: Sufficient contrast */
.text-primary {
  color: #1a1a1a; /* On white: 16.1:1 */
}

.text-secondary {
  color: #595959; /* On white: 7.0:1 */
}

.text-muted {
  color: #767676; /* On white: 4.54:1 - Minimum for AA */
}

/* ❌ BAD: Insufficient contrast */
.text-light {
  color: #a0a0a0; /* On white: 2.7:1 - FAILS AA */
}
```

```typescript
// Contrast calculation utility
function getContrastRatio(fg: string, bg: string): number {
  const getLuminance = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16)
    const r = ((rgb >> 16) & 0xff) / 255
    const g = ((rgb >> 8) & 0xff) / 255
    const b = (rgb & 0xff) / 255

    const [rs, gs, bs] = [r, g, b].map(c =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    )

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const l1 = getLuminance(fg)
  const l2 = getLuminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}
```

### Color Accessibility Beyond Contrast

```css
/* ✅ Don't rely on color alone */
.error-field {
  border-color: #dc2626;
  border-width: 2px; /* Visual indicator beyond color */
}

.error-field::before {
  content: "⚠"; /* Icon indicator */
}

/* Error message accompanies the color */
.error-message {
  color: #dc2626;
  font-weight: 500;
}
```

```typescript
// ✅ Status indicators with multiple cues
function StatusBadge({ status }: { status: 'success' | 'error' | 'pending' }) {
  const config = {
    success: { icon: '✓', label: 'Success', className: 'bg-green-100 text-green-800' },
    error: { icon: '✕', label: 'Error', className: 'bg-red-100 text-red-800' },
    pending: { icon: '◐', label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  }

  const { icon, label, className } = config[status]

  return (
    <span className={`px-2 py-1 rounded ${className}`}>
      <span aria-hidden="true">{icon}</span>
      <span className="ml-1">{label}</span>
    </span>
  )
}
```

## Responsive Design

### Breakpoint Strategy

```css
/* Mobile-first breakpoints */
:root {
  --breakpoint-sm: 640px;   /* Small tablets */
  --breakpoint-md: 768px;   /* Tablets */
  --breakpoint-lg: 1024px;  /* Laptops */
  --breakpoint-xl: 1280px;  /* Desktops */
  --breakpoint-2xl: 1536px; /* Large screens */
}

/* Usage */
.container {
  padding: 1rem;
}

@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 3rem;
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### Responsive Typography

```css
/* Fluid typography scale */
:root {
  --font-size-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --font-size-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
  --font-size-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --font-size-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
  --font-size-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
  --font-size-2xl: clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
  --font-size-3xl: clamp(1.875rem, 1.4rem + 2.375vw, 3rem);
  --font-size-4xl: clamp(2.25rem, 1.6rem + 3.25vw, 4rem);
}

body {
  font-size: var(--font-size-base);
  line-height: 1.6;
}

h1 { font-size: var(--font-size-4xl); line-height: 1.1; }
h2 { font-size: var(--font-size-3xl); line-height: 1.2; }
h3 { font-size: var(--font-size-2xl); line-height: 1.3; }
h4 { font-size: var(--font-size-xl); line-height: 1.4; }
```

### Responsive Layout Patterns

```css
/* Auto-fit grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* Flexbox with wrap */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* Stack on mobile, row on desktop */
.form-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 768px) {
  .form-row {
    flex-direction: row;
  }
}
```

## Touch Target Sizing

### Minimum Sizes

```css
/* ✅ GOOD: 44x44px minimum touch targets */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}

.icon-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Checkbox/Radio with adequate touch area */
.checkbox-wrapper {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 0;
}

.checkbox-wrapper input {
  width: 20px;
  height: 20px;
  margin-right: 12px;
}

/* Link spacing in lists */
.nav-link {
  display: block;
  padding: 12px 16px;
  min-height: 44px;
}
```

### Touch-Friendly Spacing

```css
/* Adequate spacing between interactive elements */
.button-group {
  display: flex;
  gap: 8px; /* Minimum 8px between touch targets */
}

.action-list li {
  margin-bottom: 4px; /* Prevents accidental taps */
}
```

## Focus Management

### Focus Indicators

```css
/* ✅ Clear, high-contrast focus ring */
:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* Remove default, add custom */
button:focus {
  outline: none;
}

button:focus-visible {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}

/* High contrast mode support */
@media (forced-colors: active) {
  :focus-visible {
    outline: 3px solid CanvasText;
  }
}
```

### Focus Trap for Modals

```typescript
import { useEffect, useRef } from 'react'

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element
    firstElement?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [isActive])

  return containerRef
}
```

### Skip Links

```typescript
// ✅ Skip to main content link
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
                 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-600
                 focus:rounded focus:shadow-lg"
    >
      Skip to main content
    </a>
  )
}

// Usage in layout
<body>
  <SkipLink />
  <header>...</header>
  <main id="main-content" tabIndex={-1}>
    ...
  </main>
</body>
```

## Keyboard Navigation

### Arrow Key Navigation

```typescript
export function useArrowNavigation<T extends HTMLElement>(
  itemCount: number,
  onSelect?: (index: number) => void
) {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<T>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault()
        setActiveIndex(i => (i + 1) % itemCount)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault()
        setActiveIndex(i => (i - 1 + itemCount) % itemCount)
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(itemCount - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        onSelect?.(activeIndex)
        break
    }
  }, [itemCount, activeIndex, onSelect])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return { containerRef, activeIndex, setActiveIndex }
}
```

### Roving TabIndex

```typescript
export function TabList({ tabs, activeTab, onTabChange }: TabListProps) {
  return (
    <div role="tablist" aria-label="Content tabs">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
```

## Motion & Animation Accessibility

### Respecting User Preferences

```css
/* Default animations */
.fade-in {
  animation: fadeIn 0.3s ease-out;
}

.slide-up {
  animation: slideUp 0.4s ease-out;
}

/* Disable for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```typescript
// Hook for motion preferences
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(query.matches)

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

// Usage
function AnimatedComponent() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
    >
      Content
    </motion.div>
  )
}
```

## Typography & Readability

### Line Length

```css
/* Optimal reading width: 45-75 characters */
.prose {
  max-width: 65ch; /* ~65 characters */
}

.prose-narrow {
  max-width: 55ch;
}

.prose-wide {
  max-width: 75ch;
}
```

### Line Height

```css
/* Line height scales inversely with font size */
body {
  line-height: 1.6; /* Body text */
}

h1, h2, h3 {
  line-height: 1.2; /* Headings */
}

.compact {
  line-height: 1.4; /* UI elements */
}
```

### Spacing Scale

```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
}
```

## Visual Hierarchy

### Size & Weight

```css
/* Primary action */
.btn-primary {
  font-size: 1rem;
  font-weight: 600;
  padding: 12px 24px;
}

/* Secondary action */
.btn-secondary {
  font-size: 0.875rem;
  font-weight: 500;
  padding: 8px 16px;
}

/* Tertiary/Link action */
.btn-tertiary {
  font-size: 0.875rem;
  font-weight: 500;
  padding: 4px 8px;
}
```

### Color as Hierarchy

```css
:root {
  /* Text hierarchy */
  --text-primary: #111827;    /* Most important */
  --text-secondary: #4b5563;  /* Supporting text */
  --text-tertiary: #9ca3af;   /* Metadata, hints */

  /* Interactive hierarchy */
  --action-primary: #2563eb;   /* Primary actions */
  --action-secondary: #64748b; /* Secondary actions */
  --action-danger: #dc2626;    /* Destructive actions */
}
```

### Whitespace

```css
/* Section spacing */
.section {
  padding-top: var(--space-16);
  padding-bottom: var(--space-16);
}

/* Card internal spacing */
.card {
  padding: var(--space-6);
}

.card-header {
  margin-bottom: var(--space-4);
}

.card-body > * + * {
  margin-top: var(--space-3);
}
```

## ARIA Patterns

### Live Regions

```typescript
// Announce dynamic content to screen readers
export function LiveAnnouncer() {
  const [message, setMessage] = useState('')

  // Expose globally
  useEffect(() => {
    window.announce = (text: string) => {
      setMessage('')
      setTimeout(() => setMessage(text), 100)
    }
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

// Usage
window.announce('Item added to cart')
```

### Dialog/Modal

```typescript
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const focusTrapRef = useFocusTrap(isOpen)

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={focusTrapRef}
    >
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose} aria-label="Close modal">
        ✕
      </button>
    </div>
  )
}
```

### Loading States

```typescript
export function LoadingButton({ loading, children, ...props }: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={loading}
      aria-busy={loading}
      aria-disabled={loading}
    >
      {loading ? (
        <>
          <span className="sr-only">Loading...</span>
          <Spinner aria-hidden="true" />
        </>
      ) : (
        children
      )}
    </button>
  )
}
```

## Testing Accessibility

### Automated Testing

```typescript
// jest-axe for automated a11y testing
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('component has no accessibility violations', async () => {
  const { container } = render(<MyComponent />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Manual Testing Checklist

1. **Keyboard**: Tab through entire page, verify all interactive elements are reachable
2. **Screen Reader**: Test with VoiceOver (Mac) or NVDA (Windows)
3. **Zoom**: Test at 200% and 400% zoom
4. **Color**: Use grayscale filter to verify color isn't the only indicator
5. **Motion**: Test with reduced motion preference enabled
6. **Touch**: Test touch targets on actual mobile devices

## Key Principles

1. **Perceivable**: Content must be presentable in ways users can perceive
2. **Operable**: Interface must be operable via various input methods
3. **Understandable**: Information and UI operation must be understandable
4. **Robust**: Content must be robust enough for assistive technologies

**Remember**: Accessibility is not an afterthought - build it in from the start.

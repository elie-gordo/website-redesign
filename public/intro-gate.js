// Runs in <head>, before the first paint (an external file: the CSP forbids inline scripts).
// Only the first visit of the session gets the entry screen; without JS the site opens directly.
try {
  if (!sessionStorage.getItem('tensil-intro-seen')) document.documentElement.classList.add('has-intro');
} catch {
  // Storage blocked: open the site directly rather than gating it on every page view.
}

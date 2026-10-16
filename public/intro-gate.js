// Runs in <head>, before the first paint (an external file: the CSP forbids inline scripts).
// The entry screen shows on the first visit of the session, or on demand with ?intro (header
// wordmark). Without JS the site opens directly.
try {
  const asked = new URLSearchParams(location.search).has('intro');
  if (asked || !sessionStorage.getItem('tensil-intro-seen')) document.documentElement.classList.add('has-intro');
} catch {
  // Storage blocked: open the site directly rather than gating it on every page view.
}

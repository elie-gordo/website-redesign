// Runs in <head>, before the first paint (an external file: the CSP forbids inline scripts).
// The entry screen is the first page of every arrival on the site: any visit that does not come
// from one of the site's own pages, or on demand with ?intro (header wordmark).
// Links between pages skip it. Without JS the site opens directly.
(function () {
  let fromSite = false;
  try {
    fromSite = document.referrer !== '' && new URL(document.referrer).origin === location.origin;
  } catch {
    // Malformed referrer: treat as an arrival.
  }
  const asked = new URLSearchParams(location.search).has('intro');
  let skipped = false;
  try {
    // Set only by the automated tests and the screenshot tool, never by the site.
    skipped = sessionStorage.getItem('tensil-intro-skip') === '1';
  } catch {
    // Storage blocked: no effect on real visitors.
  }
  if (asked || (!fromSite && !skipped)) document.documentElement.classList.add('has-intro');
})();

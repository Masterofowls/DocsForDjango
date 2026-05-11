/* eslint-disable no-restricted-globals */

const OFFLINE_FALLBACK_URL = '/offline.html';

const getPossibleNavigationUrls = (rawUrl) => {
  const url = new URL(rawUrl, self.location.href);

  if (url.origin !== self.location.origin) {
    return [];
  }

  url.search = '';
  url.hash = '';

  const normalized = url.href;
  const indexVariant = `${normalized}${url.pathname.endsWith('/') ? '' : '/'}index.html`;

  return [normalized, indexVariant];
};

const findCachedNavigationResponse = async (requestUrl) => {
  const possibleUrls = getPossibleNavigationUrls(requestUrl);

  for (const candidate of possibleUrls) {
    const cached = await caches.match(candidate);
    if (cached) {
      return cached;
    }
  }

  return undefined;
};

export default function registerNavigationOfflineFallback() {
  self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.mode !== 'navigate') {
      return;
    }

    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cachedPage = await findCachedNavigationResponse(request.url);
          if (cachedPage) {
            return cachedPage;
          }

          const offlinePage = await caches.match(OFFLINE_FALLBACK_URL);
          if (offlinePage) {
            return offlinePage;
          }

          return new Response('Offline and no fallback page available.', {
            status: 503,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
            },
          });
        }
      })(),
    );
  });
}

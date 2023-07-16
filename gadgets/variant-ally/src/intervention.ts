// Handle auto redirection and link fixes.

import { output } from './debug';
import { getPageVariant, isExperiencedUser } from './management';

// Including:
// - w.wiki
const BLOCKED_REFERRER_HOST = /^w\.wiki$/i;

const WIKIURL_REGEX = /^\/(?:wiki|zh(?:-\w+)?)\//i;

// Used to suppress exceptions of URL constructor
const DUMMY_REFERRER = 'a:';

function rewriteLink(link: string, variant: string): string {
  const url = new URL(link);
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  // Only handle same origin urls
  if (url.host === location.host) {
    if (WIKIURL_REGEX.test(pathname)) {
      url.pathname = `/${variant}/${url.pathname.replace(WIKIURL_REGEX, '')}`;
      searchParams.delete('variant'); // For things like /zh-cn/A?variant=zh-hk
    } else if (pathname.startsWith('/w/index.php')) {
      // HACK: workaround search box redirection not respecting `variant` URL param
      // This should be eventually fixed in MediaWiki itself
      //
      // Example url: https://zh.wikipedia.org/w/index.php?title=Special:Search&search=Foo&wprov=acrw1_0
      // It should be replaced by https://zh.wikipedia.org/<variant>/Foo.
      //
      // Note that the "search for pages containing XXX" link is not covered by this hack
      // since the `variant` URL param works there
      const searchQuery = searchParams.get('search');

      if (
        searchQuery !== null
        && searchParams.get('title')?.startsWith('Special:')
        && searchParams.get('fulltext') !== '1'
      ) {
        url.pathname = `/${variant}/${searchQuery}`;
        url.search = '';
      } else {
        searchParams.set('variant', variant);
      }
    }
  }

  const result = url.toString();
  output(() => ['rewriteLink', `${link} + ${variant} => ${result}`]);
  return result;
}

function redirect(variant: string): void {
  // Use replace() to prevent navigating back
  location.replace(rewriteLink(location.href, variant));
}

function checkThisPage(variant: string): void {
  const referrerHostname = new URL(document.referrer || DUMMY_REFERRER).hostname;
  if (isExperiencedUser()
    || referrerHostname === location.hostname
    || BLOCKED_REFERRER_HOST.test(referrerHostname)
  ) {
    // Assume this as user intention and do nothing
    output(() => ['checkThisPage', `Experienced or referrer in blocklist, do nothing.`]);
    return;
  }

  const pageVariant = getPageVariant();
  if (pageVariant === null) {
    output(() => ['checkThisPage', 'Non-wikitext page. Do nothing.']);
    return;
  }
  if (pageVariant !== variant) {
    output(() => ['checkThisPage', `Redirecting to ${variant}...`]);
    redirect(variant);
  } else {
    output(() => ['checkThisPage', 'Variant is correct :)']);
  }
}

function redirectAnchors(variant: string): void {
  ['click', 'auxclick', 'dragstart'].forEach((name) => {
    document.addEventListener(name, (ev) => {
      if (ev.target instanceof Element) {
        const anchor = ev.target.closest('a');
        if (anchor) {
          output(() => ['redirectAnchors', `Event ${ev.type} on ${anchor.href}`]);

          const newLink = rewriteLink(anchor.href, variant);
          if (ev instanceof DragEvent && ev.dataTransfer) {
            // Modify drag data directly because setting href has no effect in drag event
            for (const type of ev.dataTransfer.types) {
              ev.dataTransfer.setData(type, newLink);
            }
            output(() => ['redirectAnchors', 'drag-handler', `Drop data changed!`]);
          } else {
            // Avoid being overwritten by overlapped handler calls
            if (!anchor.dataset.origHref) {
              anchor.dataset.origHref = anchor.href;
            }
            anchor.href = newLink;
            output(() => [
              'redirectAnchors',
              'click-handler',
              `href ${anchor.href}, origHref ${anchor.dataset.origHref}`,
            ]);

            // HACK: workaround popups not working on modified links
            // Add handler to <a> directly so it was triggered before anything else
            ['mouseover', 'mouseleave', 'keyup'].forEach((innerName) => {
              anchor.addEventListener(innerName, (innerEv) => {
                output(() => [
                  'redirectAnchors',
                  'click-handler',
                  'restoration-handler',
                  `Event ${innerEv.type} on ${anchor.href}, origHref ${anchor.dataset.origHref}`,
                ]);

                if (anchor.dataset.origHref) {
                  anchor.href = anchor.dataset.origHref;
                  delete anchor.dataset.origHref;
                }
              }, { once: true });
            });
          }
        }
      }
    });
  });
}

export { redirect, checkThisPage, redirectAnchors };

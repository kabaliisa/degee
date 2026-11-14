import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * The HTML every page is rendered into. It runs on the build machine, not in the browser, so it holds
 * what has to be in the file before any JavaScript does: what installs the app to a home screen, what
 * the status bar should look like, and the worker that makes it work offline.
 *
 * headNodes and bodyNodes carry the bundles Expo built. Leave them out and the page is a photograph of
 * the app: it looks right and nothing works.
 */
export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover: the hero photo runs under the status bar once installed. */}
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0C0A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Deegee" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon-32.png" sizes="32x32" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: REGISTER_WORKER }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

const SHELL_CSS = `
/* Ink while the page loads, so an installed app opens dark rather than flashing white. */
html, body, #root { background-color: #0A0C0A; }
/* The app is a phone-shaped column; centre it rather than stretching it across a desktop. */
@media (min-width: 560px) {
  body { background-color: #050605; }
  #root { width: 100%; max-width: 460px; margin: 0 auto; box-shadow: 0 0 60px rgba(0,0,0,0.45); }
}
`;

const REGISTER_WORKER = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
`;

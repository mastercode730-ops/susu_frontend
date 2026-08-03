// theme-preload.js — must be <script>'d in <head>, BEFORE </head>.
// nav.js injects the Atlantis theme CSS from a <script> at the bottom of
// <body>, which means the browser paints the raw unstyled page first and
// only applies the sidebar/card styling once that CSS finishes loading —
// visible as a "jump"/flash on every page navigation. document.write here
// runs synchronously while the parser is still in <head>, so these <link>
// tags behave like normal render-blocking stylesheets and the sidebar is
// already correctly styled at first paint. nav.js's own _loadCss() checks
// for an existing <link href> before adding one, so this doesn't double-load.
(function () {
  var css = [
    '/vendor/assets/css/bootstrap.min.css',
    '/vendor/assets/css/atlantis.min.css',
    '/vendor/fonts/font-awesome-4.7.0/css/font-awesome.min.css',
    '/css/polish.css'  // readability layer — must come after the theme
  ];
  css.forEach(function (href) {
    document.write('<link rel="stylesheet" href="' + href + '">');
  });
})();

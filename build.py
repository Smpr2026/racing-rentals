#!/usr/bin/env python3
"""Build index.html from src/page.html.

src/page.html holds the site itself — <title>, <style>, the markup and the app
script — with no document wrapper, so the same source can be published as a
Claude artifact. This adds the wrapper plus the PWA layer (manifest, icons,
service worker, install prompt), which only make sense on a real origin.

    python3 build.py
"""
import pathlib

ROOT = pathlib.Path(__file__).parent
src = (ROOT / "src" / "page.html").read_text(encoding="utf-8")
cut = src.index("</style>") + len("</style>")
head, body = src[:cut], src[cut:]

HEAD_EXTRA = """<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Racing Rentals and Racing Sales — car hire and a used car yard in Sydney, under one roof.">
<meta name="theme-color" content="#2F6BFF">
<meta name="robots" content="noindex">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Racing">
<style>
  /* the artifact host supplies these; a standalone page needs them itself */
  :root{padding-top:env(safe-area-inset-top,0px); padding-bottom:env(safe-area-inset-bottom,0px)}
  html{color-scheme:light}
  [hidden]{display:none !important}
</style>
"""

PWA_SCRIPT = """<script>
(function(){
  "use strict";
  if ("serviceWorker" in navigator) {
    addEventListener("load", function(){
      navigator.serviceWorker.register("sw.js").catch(function(){});
    });
  }

  var strip = document.getElementById("installStrip");
  var btn   = document.getElementById("installBtn");
  var text  = document.getElementById("installText");
  if (!strip) return;

  // already installed: never nag
  if (matchMedia("(display-mode: standalone)").matches || navigator.standalone === true) return;

  var deferred = null;
  addEventListener("beforeinstallprompt", function(e){
    e.preventDefault();
    deferred = e;
    strip.hidden = false;
  });
  btn.addEventListener("click", function(){
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function(){ deferred = null; strip.hidden = true; });
  });
  addEventListener("appinstalled", function(){ strip.hidden = true; });

  // iOS never fires beforeinstallprompt — it has to go through the Share sheet
  var ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) {
    text.textContent = "Add Racing to your home screen \\u2014 tap Share, then Add to Home Screen.";
    btn.hidden = true;
    strip.hidden = false;
  }
})();
</script>"""

doc = ("<!doctype html>\n<html lang=\"en-AU\">\n<head>\n"
       + HEAD_EXTRA + head + "\n</head>\n<body>\n"
       + body.strip() + "\n" + PWA_SCRIPT + "\n</body>\n</html>\n")

out = ROOT / "index.html"
out.write_text(doc, encoding="utf-8")
print(f"built {out.name}  {len(doc) // 1024} KB")

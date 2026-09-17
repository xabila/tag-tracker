/* TagTrack site helpers: HTTPS, App Store attribution, GA4/PostHog, sticky CTA, pricing. */
(function () {
  "use strict";

  var APP_ID = "6754224455";
  var STORE_BASE = "https://apps.apple.com/app/id" + APP_ID;
  var LANGS = ["en", "fr", "es", "pt", "de"];
  var PH_KEY = "phc_7gvvmHvqWW1wJGn0tMw6lwS8GeXGPyEGrxyZ6UktyxW";
  var isSpa = !!document.querySelector('script[src*="assets/index-"]');

  if (location.protocol === "http:" && /^(www\.)?tag-track\.app$/i.test(location.hostname)) {
    location.replace("https://" + location.host + location.pathname + location.search + location.hash);
    return;
  }

  function currentLang() {
    try {
      var params = new URLSearchParams(location.search);
      var forced = (params.get("lang") || "").toLowerCase();
      if (LANGS.indexOf(forced) !== -1) return forced;
    } catch (e) {}
    var nav = (navigator.language || navigator.userLanguage || "en").toLowerCase();
    var short = nav.split("-")[0];
    return LANGS.indexOf(short) !== -1 ? short : "en";
  }

  var COPY = {
    en: {
      sticky: "Get the App",
      eyebrow: "Plans",
      title: "Start free. Go Pro when 3 habits are not enough.",
      freeTitle: "Free",
      freeBody: "Up to 3 habits, NFC, QR codes and widgets.",
      proTitle: "Pro",
      proBody: "Unlimited habits, advanced stats and themes.",
      note: "Pro is a yearly subscription billed by Apple. The price depends on your App Store country (Eurozone example: €9.99/year).",
      cta: "Download on the App Store",
      play: "Play tutorial"
    },
    fr: {
      sticky: "Télécharger",
      eyebrow: "Offres",
      title: "Gratuit pour commencer. Pro quand 3 habitudes ne suffisent plus.",
      freeTitle: "Gratuit",
      freeBody: "Jusqu’à 3 habitudes, NFC, QR codes et widgets.",
      proTitle: "Pro",
      proBody: "Habitudes illimitées, stats avancées et thèmes.",
      note: "Pro est un abonnement annuel facturé par Apple. Le prix dépend de votre pays App Store (exemple zone euro : 9,99 €/an).",
      cta: "Télécharger sur l’App Store",
      play: "Lire le tutoriel"
    },
    es: {
      sticky: "Descargar",
      eyebrow: "Planes",
      title: "Empieza gratis. Pasa a Pro cuando 3 hábitos no basten.",
      freeTitle: "Gratis",
      freeBody: "Hasta 3 hábitos, NFC, códigos QR y widgets.",
      proTitle: "Pro",
      proBody: "Hábitos ilimitados, estadísticas avanzadas y temas.",
      note: "Pro es una suscripción anual cobrada por Apple. El precio depende de tu país en App Store (ejemplo zona euro: 9,99 €/año).",
      cta: "Descargar en App Store",
      play: "Ver tutorial"
    },
    pt: {
      sticky: "Baixar",
      eyebrow: "Planos",
      title: "Comece grátis. Vá de Pro quando 3 hábitos não chegarem.",
      freeTitle: "Grátis",
      freeBody: "Até 3 hábitos, NFC, QR codes e widgets.",
      proTitle: "Pro",
      proBody: "Hábitos ilimitados, estatísticas avançadas e temas.",
      note: "Pro é uma assinatura anual cobrada pela Apple. O preço depende do seu país na App Store (exemplo zona euro: 9,99 €/ano).",
      cta: "Baixar na App Store",
      play: "Assistir ao tutorial"
    },
    de: {
      sticky: "Laden",
      eyebrow: "Pläne",
      title: "Kostenlos starten. Pro, wenn 3 Gewohnheiten nicht reichen.",
      freeTitle: "Kostenlos",
      freeBody: "Bis zu 3 Gewohnheiten, NFC, QR-Codes und Widgets.",
      proTitle: "Pro",
      proBody: "Unbegrenzte Gewohnheiten, erweiterte Statistiken und Themes.",
      note: "Pro ist ein Jahresabo über den App Store. Den Preis legt Apple für dein Land fest (Beispiel Eurozone: 9,99 €/Jahr).",
      cta: "Im App Store laden",
      play: "Tutorial abspielen"
    }
  };

  function t() {
    return COPY[currentLang()] || COPY.en;
  }

  function storeUrl(ct) {
    var campaign = encodeURIComponent(ct || "site");
    return STORE_BASE + "?mt=8&ct=" + campaign;
  }

  function inferCt(anchor) {
    if (anchor.getAttribute("data-ct")) return anchor.getAttribute("data-ct");
    var section = anchor.closest("section, header, footer, nav, aside");
    if (section && section.id) return "store_" + section.id;
    var path = (location.pathname || "/").replace(/^\//, "").replace(/\.html$/, "") || "home";
    return "store_" + path.replace(/[^\w]+/g, "_");
  }

  function trackStoreClick(ct) {
    if (typeof gtag === "function") {
      gtag("event", "select_content", {
        content_type: "app_store",
        item_id: ct,
        campaign: ct
      });
    }
    if (!isSpa && window.posthog && typeof window.posthog.capture === "function") {
      window.posthog.capture("cta_clicked", {
        button: "app_store",
        section: ct,
        language: currentLang()
      });
    }
  }

  function decorateStoreLinks(root) {
    var nodes = (root || document).querySelectorAll('a[href*="apps.apple.com"]');
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      if (a.dataset.ttStore === "1") continue;
      var ct = inferCt(a);
      a.dataset.ttStore = "1";
      if (!a.getAttribute("data-ct")) a.setAttribute("data-ct", ct);
      a.setAttribute("href", storeUrl(ct));
      a.setAttribute("rel", "noopener noreferrer");
      a.setAttribute("target", a.getAttribute("target") || "_blank");
    }
  }

  function initPostHogSecondary() {
    if (isSpa) return;
    if (window.posthog && window.posthog.__loaded) return;
    !function (t, e) {
      var o, n, p, r;
      if (e.__SV) return;
      window.posthog = e;
      e._i = [];
      e.init = function (i, s, a) {
        function g(t, e) {
          var o = e.split(".");
          2 === o.length && (t = t[o[0]], e = o[1]);
          t[e] = function () {
            t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
          };
        }
        p = t.createElement("script");
        p.type = "text/javascript";
        p.crossOrigin = "anonymous";
        p.async = true;
        p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
        r = t.getElementsByTagName("script")[0];
        r.parentNode.insertBefore(p, r);
        var u = e;
        void 0 !== a ? (u = e[a] = []) : (a = "posthog");
        u.people = u.people || [];
        u.toString = function (t) {
          var e = "posthog";
          return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e;
        };
        u.people.toString = function () {
          return u.toString(1) + ".people (stub)";
        };
        o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" ");
        for (n = 0; n < o.length; n++) g(u, o[n]);
        e._i.push([i, s, a]);
      };
      e.__SV = 1;
    }(document, window.posthog || []);
    window.posthog.init(PH_KEY, { api_host: "https://eu.i.posthog.com", defaults: "2026-01-30" });
  }

  function mountSticky() {
    if (document.getElementById("tt-sticky-cta")) return;
    var bar = document.createElement("div");
    bar.id = "tt-sticky-cta";
    bar.className = "tt-sticky";
    bar.innerHTML =
      '<a class="tt-sticky-btn" data-ct="sticky_mobile" href="' + storeUrl("sticky_mobile") + '" target="_blank" rel="noopener noreferrer">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>' +
      '<span class="tt-sticky-label">' + t().sticky + "</span></a>";
    document.body.appendChild(bar);
    document.body.classList.add("tt-has-sticky");
  }

  function mountPricing() {
    if (!isSpa || document.getElementById("pricing")) return;
    var faq = document.getElementById("faq");
    if (!faq) return;
    var copy = t();
    var section = document.createElement("section");
    section.id = "pricing";
    section.className = "tt-pricing";
    section.innerHTML =
      '<div class="tt-pricing-inner">' +
        '<p class="tt-pricing-eyebrow">' + copy.eyebrow + "</p>" +
        "<h2>" + copy.title + "</h2>" +
        '<div class="tt-pricing-grid">' +
          '<div class="tt-plan">' +
            "<h3>" + copy.freeTitle + "</h3>" +
            "<p>" + copy.freeBody + "</p>" +
          "</div>" +
          '<div class="tt-plan tt-plan-pro">' +
            "<h3>" + copy.proTitle + "</h3>" +
            "<p>" + copy.proBody + "</p>" +
          "</div>" +
        "</div>" +
        '<p class="tt-pricing-note">' + copy.note + "</p>" +
        '<a class="tt-pricing-cta" data-ct="pricing" href="' + storeUrl("pricing") + '" target="_blank" rel="noopener noreferrer">' + copy.cta + "</a>" +
      "</div>";
    faq.parentNode.insertBefore(section, faq);
  }

  function waitForFaq(tries) {
    if (!isSpa) return;
    if (document.getElementById("faq")) {
      mountPricing();
      decorateStoreLinks();
      return;
    }
    if (tries > 40) return;
    setTimeout(function () { waitForFaq(tries + 1); }, 150);
  }

  function syncHtmlLang() {
    var lang = currentLang();
    document.documentElement.lang = lang;
  }

  function onLangButtonClick(event) {
    var btn = event.target.closest("button");
    if (!btn) return;
    var label = (btn.textContent || "").trim().toLowerCase();
    if (LANGS.indexOf(label) === -1) return;
    try {
      var url = new URL(location.href);
      url.searchParams.set("lang", label);
      history.replaceState({}, "", url);
      document.documentElement.lang = label;
    } catch (e) {}
    setTimeout(function () {
      var stickyLabel = document.querySelector(".tt-sticky-label");
      if (stickyLabel) stickyLabel.textContent = t().sticky;
      var existing = document.getElementById("pricing");
      if (existing) existing.remove();
      mountPricing();
      decorateStoreLinks();
    }, 50);
  }

  document.addEventListener("click", function (event) {
    onLangButtonClick(event);
    var a = event.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.indexOf("apps.apple.com") === -1) return;
    var ct = inferCt(a);
    if (href.indexOf("ct=") === -1) a.setAttribute("href", storeUrl(ct));
    trackStoreClick(ct);
  }, true);

  function boot() {
    syncHtmlLang();
    initPostHogSecondary();
    mountSticky();
    waitForFaq(0);
    decorateStoreLinks();
    [400, 1200, 2500].forEach(function (ms) {
      setTimeout(decorateStoreLinks, ms);
    });
  }

  window.TagTrackSite = {
    storeUrl: storeUrl,
    currentLang: currentLang,
    copy: t,
    decorateStoreLinks: decorateStoreLinks
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

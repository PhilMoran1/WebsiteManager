/**
 * Website Manager - Lightweight Tracking Script
 * This script can be embedded on any website to track pageviews and sessions.
 * 
 * Usage:
 * <script src="https://your-server.com/tracker.js?siteId=YOUR_TRACKING_ID" async></script>
 * 
 * Or load dynamically:
 * <script>
 *   (function(w,d,s,e,n){w[n]=w[n]||function(){(w[n].q=w[n].q||[]).push(arguments)};
 *   var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=1;j.src=e;
 *   f.parentNode.insertBefore(j,f)})(window,document,'script','https://your-server.com/tracker.js?siteId=YOUR_ID','wm');
 * </script>
 */

(function() {
  'use strict';

  // Get site ID from script tag
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var src = currentScript.src;
  var siteIdMatch = src.match(/siteId=([^&]+)/);
  var siteId = siteIdMatch ? siteIdMatch[1] : '';

  // Get endpoint from script src
  var endpointMatch = src.match(/^(https?:\/\/[^\/]+)/);
  var endpoint = endpointMatch ? endpointMatch[1] + '/api/tracking/event' : '';

  if (!siteId || !endpoint) {
    console.warn('Website Manager: Missing siteId or invalid endpoint');
    return;
  }

  // Generate or retrieve session ID
  function getSessionId() {
    var sessionId = sessionStorage.getItem('wm_session');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      sessionStorage.setItem('wm_session', sessionId);
    }
    return sessionId;
  }

  // Get visitor ID (persistent across sessions)
  function getVisitorId() {
    var visitorId = localStorage.getItem('wm_visitor');
    if (!visitorId) {
      visitorId = 'vis_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('wm_visitor', visitorId);
    }
    return visitorId;
  }

  // Send tracking event
  function track(eventType, data) {
    var payload = {
      siteId: siteId,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      eventType: eventType,
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      data: data || {}
    };

    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(payload));
    } else {
      // Fallback to fetch
      var xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(payload));
    }
  }

  // Track page view
  function trackPageView() {
    track('pageview', {
      title: document.title,
      path: window.location.pathname,
      search: window.location.search,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      language: navigator.language,
      platform: navigator.platform
    });
  }

  // Track session end
  var sessionStart = Date.now();
  function trackSessionEnd() {
    track('session_end', {
      duration: Date.now() - sessionStart
    });
  }

  // Track on page load
  if (document.readyState === 'complete') {
    trackPageView();
  } else {
    window.addEventListener('load', trackPageView);
  }

  // Track session end on unload
  window.addEventListener('beforeunload', trackSessionEnd);

  // Handle SPA navigation (if using history API)
  var pushState = history.pushState;
  history.pushState = function() {
    pushState.apply(history, arguments);
    trackPageView();
  };

  var replaceState = history.replaceState;
  history.replaceState = function() {
    replaceState.apply(history, arguments);
    trackPageView();
  };

  window.addEventListener('popstate', function() {
    trackPageView();
  });

  // Expose tracking function globally for custom events
  window.WebsiteManagerTrack = function(eventType, data) {
    track(eventType, data);
  };

  // Also expose as 'wm' for shorter syntax
  window.wm = window.WebsiteManagerTrack;

})();

// KregKreates site script: mobile menu, newsletter signup, scroll reveal.
(function () {
  'use strict';

  var NL_ENDPOINT = 'https://formsubmit.co/ajax/kraigco@gmail.com';
  var OK_MSG = 'Thanks for subscribing!';
  var ERR_MSG = 'Something went wrong. Please try again.';

  function initMenu() {
    var header = document.querySelector('.site-header');
    var toggle = document.querySelector('.menu-toggle');
    if (!header || !toggle) return;
    function setOpen(open) {
      header.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    }
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    header.addEventListener('click', function (e) {
      if (e.target.closest('#site-nav a, .menu-extra a')) setOpen(false);
    });
  }

  function initNewsletter() {
    document.querySelectorAll('form.nl-form').forEach(function (form) {
      var input = form.querySelector('input[type=email]');
      var button = form.querySelector('[type=submit]');
      var status = form.querySelector('.nl-status');
      var busy = false;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (busy) return;
        busy = true;
        button.disabled = true;
        status.textContent = '';
        fetch(NL_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
          .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
          .then(function (data) {
            if (String(data.success) !== 'true') throw new Error('rejected');
            input.value = '';
            status.textContent = OK_MSG;
          })
          .catch(function () { status.textContent = ERR_MSG; })
          .finally(function () {
            busy = false;
            button.disabled = false;
          });
      });
    });
  }

  // Same reveal as the live site: blocks below the first screen fade up as they scroll in.
  function initReveal() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    if (vh < 200) return;
    var pending = new Map();
    document.querySelectorAll('[data-kk-r]').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.top < vh) return;
      var anim = el.animate(
        [{ opacity: 0, transform: 'translate3d(0,14px,0)' }, { opacity: 1, transform: 'none' }],
        { duration: 560, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }
      );
      anim.pause();
      pending.set(el, anim);
    });
    if (!pending.size) return;
    var io = new IntersectionObserver(function (entries) {
      entries
        .filter(function (e) { return e.isIntersecting && pending.has(e.target); })
        .sort(function (a, b) {
          return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left;
        })
        .forEach(function (e, i) {
          var anim = pending.get(e.target);
          pending.delete(e.target);
          io.unobserve(e.target);
          anim.effect.updateTiming({ delay: Math.min(i, 5) * 70 });
          anim.onfinish = function () { anim.cancel(); };
          anim.play();
        });
    }, { rootMargin: '0px 0px -8% 0px' });
    pending.forEach(function (_, el) { io.observe(el); });
  }

  initMenu();
  initNewsletter();
  initReveal();
})();

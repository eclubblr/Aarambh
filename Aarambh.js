// Aarambh.js - Canvas orb, particles, interactions, gallery marquee, counters
(function () {
  // Helper for DOM ready
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(() => {
    // Mobile menu toggle with ARIA and smooth offset scroll
    (function mobileMenu() {
      const menuToggle = document.getElementById('menuToggle');
      const navMenu = document.getElementById('navMenu');
      if (!menuToggle || !navMenu) return;

      // aria
      menuToggle.setAttribute('aria-expanded', 'false');

      function openMenu() {
        navMenu.classList.add('active');
        document.body.classList.add('nav-open');
        menuToggle.setAttribute('aria-expanded', 'true');
        // focus first link for keyboard users
        const first = navMenu.querySelector('a'); if (first) first.focus();
      }
      function closeMenu() {
        navMenu.classList.remove('active');
        document.body.classList.remove('nav-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        // return focus to toggle
        menuToggle.focus();
      }

      menuToggle.addEventListener('click', (e) => {
        if (navMenu.classList.contains('active') || document.body.classList.contains('nav-open')) closeMenu(); else openMenu();
      });

      // allow closing with Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && (navMenu.classList.contains('active') || document.body.classList.contains('nav-open'))) {
          closeMenu();
        }
      });

      // close when clicking outside the nav (backdrop click)
      document.addEventListener('click', (e) => {
        if (!(navMenu.classList.contains('active') || document.body.classList.contains('nav-open'))) return;
        // if click is on toggle or inside nav, ignore
        if (menuToggle.contains(e.target) || navMenu.contains(e.target)) return;
        closeMenu();
      });

      // smooth scroll helper that accounts for fixed header
      function scrollToHash(href) {
        if (!href || !href.startsWith('#')) return;
        const id = href.slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        const header = document.querySelector('.topbar');
        const headerHeight = header ? header.offsetHeight : 72;
        const rect = target.getBoundingClientRect();
        const absoluteY = window.scrollY + rect.top - headerHeight - 10; // small offset

        // If Lenis is present use it, otherwise native smooth scroll
        if (window._lenis && typeof window._lenis.scrollTo === 'function') {
          try { window._lenis.scrollTo(absoluteY); } catch (e) { window.scrollTo({ top: absoluteY, behavior: 'smooth' }); }
        } else {
          window.scrollTo({ top: absoluteY, behavior: 'smooth' });
        }
      }

      // handle nav links: smooth scroll and close menu on mobile
      navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (ev) => {
          const href = link.getAttribute('href') || '';
          if (href.startsWith('#')) {
            ev.preventDefault();
            closeMenu();
            scrollToHash(href);
          } else {
            // external/internal full page links: close menu on click but allow navigation
            closeMenu();
          }
        });
      });

      // close menu on resize to desktop
      window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeMenu();
      });
    })();

    // Fluid simulation is now handled by script.js which uses bgCanvas
    // The canvas background drawing code has been replaced with the fluid simulation

    // Water ripple effect on hover
    (function setupRippleEffect() {
      function createRipple(e) {
        const target = e.target.closest('.frost-card, .btn, .hero-logo');
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.transform = 'translate(-50%, -50%)';

        target.appendChild(ripple);

        // Remove ripple after animation completes
        setTimeout(() => ripple.remove(), 800);
      }

      document.addEventListener('mouseover', createRipple);
    })();

    // Ripples and waves removed: no pointer-driven water effect per user request.

    // Scroll-driven logo fade-out
    (function logoScroll() {
      const logo = document.getElementById('heroLogo');
      if (!logo) return;
      const heroSection = document.querySelector('.hero');
      if (!heroSection) return;

      function updateLogoOpacity() {
        const heroRect = heroSection.getBoundingClientRect();
        const fadeStart = window.innerHeight * 0.6; // start fading when hero is 60% up
        const fadeEnd = window.innerHeight * 0.1; // fully hidden when hero is 10% up

        const progress = Math.max(0, Math.min(1, (fadeStart - heroRect.bottom) / (fadeStart - fadeEnd)));
        logo.style.opacity = 1 - progress;

        // add scroll-fade class when fully faded
        if (progress > 0.95) logo.classList.add('scroll-fade');
        else logo.classList.remove('scroll-fade');
      }

      window.addEventListener('scroll', updateLogoOpacity, { passive: true });
      updateLogoOpacity(); // init
    })();

    // Old canvas drawing code removed - fluid simulation handles background now

    // NAV actions - simple keyboard support
    const focusable = document.querySelectorAll('.btn, a[href]'); focusable.forEach(el => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.click(); }));

    // Dropdowns (if any) and basic interactions already defined in HTML via buttons

    // --- Gallery marquee animation ---
    // We'll animate rows by translating their content continuously. Rows alternate direction.
    function initGallery() {
      const marquees = document.querySelectorAll('.marquee');
      marquees.forEach((m, idx) => {
        const track = m.querySelector('.marquee-track');
        if (!track) return;

        const baseSpeed = 40; // px per second
        const speed = baseSpeed + (idx * 15);
        const dir = (idx % 2 === 0) ? -1 : 1;

        let lastTimestamp = 0;
        let pos = 0;
        let halfWidth = 0;

        function startAnimation() {
          const images = track.querySelectorAll('img');
          if (images.length === 0) return;

          // Calculate precise half width by looking at the first 5 images if there are 10
          // Or just use scrollWidth / 2 if they are perfect duplicates
          halfWidth = track.scrollWidth / 2;

          // For seamless loop, we need to know the gap too if it's set in CSS
          // In CSS, gap is 14px. 
          const gap = parseFloat(window.getComputedStyle(track).gap) || 0;

          // The reset point should be half the total scrollable content
          // Since it's [Set A][Set A], moving by exactly Set A width is the reset.
          // Set A width = (scrollWidth - gap) / 2 + gap? No, simpler:
          // If we have 10 images with 14px gap. 
          // Total width = 10*W + 9*G
          // One set = 5*W + 4*G. 
          // Distance between start of img 1 and start of img 6 is 5*W + 5*G.

          const singleSetWidth = (track.scrollWidth + gap) / 2;

          pos = (dir === 1) ? -singleSetWidth : 0;

          function animate(timestamp) {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const delta = (timestamp - lastTimestamp) / 1000; // in seconds
            lastTimestamp = timestamp;

            pos += dir * speed * delta;

            if (dir === -1) {
              if (pos <= -singleSetWidth) pos += singleSetWidth;
            } else {
              if (pos >= 0) pos -= singleSetWidth;
            }

            track.style.transform = `translate3d(${pos}px, 0, 0)`;
            requestAnimationFrame(animate);
          }

          track.style.willChange = 'transform';
          requestAnimationFrame(animate);
        }

        // Ensure images are loaded to get correct scrollWidth
        let loadedCount = 0;
        const imgs = track.querySelectorAll('img');
        if (imgs.length === 0) return;

        imgs.forEach(img => {
          if (img.complete) {
            loadedCount++;
          } else {
            img.addEventListener('load', () => {
              loadedCount++;
              if (loadedCount === imgs.length) startAnimation();
            });
            img.addEventListener('error', () => {
              loadedCount++;
              if (loadedCount === imgs.length) startAnimation();
            });
          }
        });

        if (loadedCount === imgs.length) startAnimation();
      });
    }
    // Initialize gallery rows on DOM ready and after images loaded
    setTimeout(initGallery, 300);

    // --- Counters when visible (stats section) ---
    function animateCounter(el, to, suffix) {
      const dur = 1200;
      const start = performance.now();
      function run(now) {
        const progress = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const val = Math.floor(eased * to);
        el.textContent = val.toLocaleString() + (suffix || '');
        if (progress < 1) requestAnimationFrame(run);
      }
      requestAnimationFrame(run);
    }

    const statEls = document.querySelectorAll('#stats [data-to]');
    if (statEls.length) {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const el = e.target;
            const target = parseInt(el.dataset.to, 10) || 0;
            const suffix = el.dataset.suffix || '';
            animateCounter(el, target, suffix);
            obs.unobserve(el);
          }
        });
      }, { threshold: 0.4 });
      statEls.forEach(el => io.observe(el));
    }

    // --- Simple placeholders population (events, speakers, sponsors) ---
    // For demo, fill events/speakers/sponsors with sample cards if empty
    function populatePlaceholders() {
      const eventsGrid = document.querySelector('.events-grid');
      if (eventsGrid && eventsGrid.children.length === 0) { for (let i = 1; i <= 6; i++) { const c = document.createElement('div'); c.className = 'event-card'; c.innerHTML = `<strong>Event ${i}</strong><div style="color:var(--muted);margin-top:8px">Quick description of the event ${i}.</div>`; eventsGrid.appendChild(c); } }

      const speakersGrid = document.querySelector('.speakers-grid');
      if (speakersGrid && speakersGrid.children.length === 0) { for (let i = 1; i <= 6; i++) { const s = document.createElement('div'); s.className = 'speaker'; s.innerHTML = `<img src="https://dummyimage.com/400x300/222/ffd86b&text=S${i}" alt="Speaker ${i}"/><div style="margin-top:8px;font-weight:800">Speaker ${i}</div><div style="color:var(--muted)">Role / Company</div>`; speakersGrid.appendChild(s); } }

      const sponsors = document.querySelector('.sponsors');
      // Sponsors 3D Carousel
      const swiper = new Swiper('.sponsors-swiper', {
        effect: 'coverflow',
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: 'auto',
        speed: 1000, // Smoother transition (was default 300ms)
        coverflowEffect: {
          rotate: 0,
          stretch: 0,
          depth: 100,
          modifier: 2.5,
          slideShadows: true,
        },
        loop: true,
        loopedSlides: 6, // Ensure enough slides are prepared for the loop
        loopAdditionalSlides: 6, // Clone extra slides to fill the edges
        autoplay: {
          delay: 3000, // Slightly slower pause between slides
          disableOnInteraction: false,
        },
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        // Mobile adjustments
        breakpoints: {
          320: {
            coverflowEffect: {
              depth: 60,
              modifier: 2,
            },
          },
          768: {
            coverflowEffect: {
              depth: 100,
              modifier: 2.5,
            },
          }
        }
      });

    }
    populatePlaceholders();

    // Remove or hide Spline "Built with Spline" badge if injected by the viewer.
    (function removeSplineBadge() {
      // Try CSS-first: add a style (already in CSS), then aggressively remove nodes containing the text.
      function scanAndRemove(root) {
        try {
          // direct search for elements that include the exact text
          const walker = (root || document).querySelectorAll('div,span,a,button');
          walker.forEach(el => {
            if (!el) return;
            const txt = (el.textContent || '').trim();
            if (txt === 'Built with Spline' || txt === 'Built with spline') {
              el.setAttribute('data-spline-hidden', 'true');
              if (el.shadowRoot) {
                try { el.shadowRoot.querySelectorAll('*').forEach(s => s.remove()); } catch (e) { }
              }
            }
          });
          // also check inside spline-viewer shadow roots if present
          const viewers = document.querySelectorAll('spline-viewer');
          viewers.forEach(v => {
            try {
              const sr = v.shadowRoot;
              if (sr) {
                const candidates = sr.querySelectorAll('*');
                candidates.forEach(c => {
                  const t = (c.textContent || '').trim(); if (t === 'Built with Spline') { c.remove(); }
                });
              }
            } catch (e) { }
          });
        } catch (e) {/*ignore*/ }
      }

      // run several times to catch late injection
      let runs = 0; const maxRuns = 40; const id = setInterval(() => {
        scanAndRemove(document);
        runs++; if (runs > maxRuns) clearInterval(id);
      }, 200);
      // also run once after load
      window.addEventListener('load', () => setTimeout(() => scanAndRemove(document), 150));
    })();

    // Add subtle parallax / float to Spline viewer container
    (function splineParallax() {
      const wrap = document.querySelector('.spline-wrap');
      const embed = document.querySelector('.spline-embed');
      if (!wrap || !embed) return;
      let px = 0, py = 0, rx = 0, ry = 0;
      let targetX = 0, targetY = 0;
      function onMove(e) { const x = (e.touches ? e.touches[0].clientX : e.clientX); const y = (e.touches ? e.touches[0].clientY : e.clientY); const rect = wrap.getBoundingClientRect(); targetX = (x - (rect.left + rect.width / 2)) / rect.width * 12; targetY = (y - (rect.top + rect.height / 2)) / rect.height * 10; wrap.classList.add('hovered'); }
      function onLeave() { targetX = 0; targetY = 0; wrap.classList.remove('hovered'); }
      wrap.addEventListener('mousemove', onMove); wrap.addEventListener('touchmove', onMove, { passive: true });
      wrap.addEventListener('mouseleave', onLeave); wrap.addEventListener('touchend', onLeave);

      function animate() { px += (targetX - px) * 0.08; py += (targetY - py) * 0.08; rx = -py; ry = px; embed.style.transform = `translate3d(${px}px, ${py}px, 0) rotateX(${rx}deg) rotateY(${ry}deg)`; requestAnimationFrame(animate); }
      requestAnimationFrame(animate);
    })();

    // --- Event Card Flip on Tap (Mobile) ---
    (function setupCardFlip() {
      const cards = document.querySelectorAll('.event-card');
      cards.forEach(card => {
        card.addEventListener('click', (e) => {
          // If clicking a button/link, don't flip
          if (e.target.closest('a') || e.target.closest('button')) return;
          card.classList.toggle('is-flipped');
        });
      });
    })();

  }); // ready end
})();


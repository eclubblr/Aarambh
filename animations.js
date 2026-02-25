// animations.js — reveal-on-scroll and small helpers
(function(){
  // Initialize Lenis smooth scrolling if available (script should be loaded in HTML)
  function initLenis(){
    if(typeof Lenis === 'undefined') return;
    try{
      const lenis = new Lenis({
        duration: 1.2,
        easing: t => Math.min(1, 1 - Math.pow(1 - t, 3)),
        smooth: true,
        direction: 'vertical'
      });
      function raf(time){
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
      // expose for debug
      window._lenis = lenis;
    }catch(e){
      console.warn('Lenis init failed', e);
    }
  }
  function initReveal(){
    const elems = document.querySelectorAll('[data-reveal]');
    if(!elems || !elems.length) return;
    const obs = new IntersectionObserver((entries, observer)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          const el = entry.target;
          const delay = parseInt(el.datasetRevealDelay || el.dataset.revealDelay || 0, 10) || 0;
          if(delay){
            setTimeout(()=> el.classList.add('in-view'), delay);
          } else {
            el.classList.add('in-view');
          }
          observer.unobserve(el);
        }
      });
    },{threshold:0.12,rootMargin:'0px 0px -8% 0px'});

    elems.forEach((el,i)=>{
      // allow per-element delay via data-reveal-delay
      if(!el.dataset.revealDelay) el.dataset.revealDelay = i * 80; // small stagger
      obs.observe(el);
    });
  }

  // small helper to add 'hover-raise' class to interactive elements
  function initMicro(){
    document.querySelectorAll('.btn, .frost-card, .event-card').forEach(el=>el.classList.add('hover-raise'));
  }
  
    // Card flip handlers: toggle .is-flipped when user clicks the card (except on small screens or when clicking a link/button inside)
    function initCardFlips(){
      const cards = document.querySelectorAll('.event-card');
      if(!cards || !cards.length) return;
      function isSmall(){return window.matchMedia && window.matchMedia('(max-width:700px)').matches}
      cards.forEach(card=>{
        card.addEventListener('click', (e)=>{
          if(isSmall()) return; // on small screens we show back below
          // ignore clicks on actual links or buttons inside the card
          if(e.target.closest('a, button')) return;
          e.preventDefault();
          card.classList.toggle('is-flipped');
        });
        card.addEventListener('keydown', (e)=>{
          if(isSmall()) return;
          if(e.key === 'Enter' || e.key === ' '){
            e.preventDefault();
            card.classList.toggle('is-flipped');
          }
        });
      });
    }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ initReveal(); initMicro(); initCardFlips(); initLenis(); });
  } else {
    initReveal(); initMicro(); initCardFlips(); initLenis();
  }
})();

// gestures.js – pinch / double-tap zoom and swipe navigation for the image viewer

(function () {
  const state = {
    active: false,
    scale: 1,
    baseScale: 1,
    lastTapTime: 0,
    startDistance: 0,
    startMidpoint: { x: 0, y: 0 },
    panX: 0,
    panY: 0,
    lastPanX: 0,
    lastPanY: 0,
    touchStartX: null,
    touchStartY: null
  };

  let imgElement = null;
  let backdrop = null;
  let container = null;

  function distance(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function midpoint(t1, t2) {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
  }

  function applyTransform() {
    if (!imgElement) return;
    imgElement.style.transform =
      `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
  }

  function onTouchStart(event) {
    if (!state.active) return;
    if (event.touches.length === 1) {
      const now = Date.now();
      if (now - state.lastTapTime < 350) {
        // double tap toggle zoom
        state.scale = state.scale > 1 ? 1 : 2.2;
        state.panX = 0;
        state.panY = 0;
        state.baseScale = state.scale;
        applyTransform();
      }
      state.lastTapTime = now;

      state.touchStartX = event.touches[0].clientX;
      state.touchStartY = event.touches[0].clientY;
    } else if (event.touches.length === 2) {
      state.startDistance = distance(event.touches[0], event.touches[1]);
      state.startMidpoint = midpoint(event.touches[0], event.touches[1]);
      state.baseScale = state.scale;
    }
  }

  function onTouchMove(event) {
    if (!state.active) return;
    if (event.touches.length === 2 && state.startDistance > 0) {
      event.preventDefault();
      const newDistance = distance(event.touches[0], event.touches[1]);
      const factor = newDistance / state.startDistance;
      state.scale = Math.min(4, Math.max(1, state.baseScale * factor));
      applyTransform();
    } else if (event.touches.length === 1 && state.scale > 1) {
      event.preventDefault();
      const dx = event.touches[0].clientX - state.touchStartX;
      const dy = event.touches[0].clientY - state.touchStartY;
      state.panX = state.lastPanX + dx;
      state.panY = state.lastPanY + dy;
      applyTransform();
    }
  }

  function onTouchEnd(event) {
    if (!state.active) return;
    if (event.touches.length === 0 && state.scale > 1) {
      state.lastPanX = state.panX;
      state.lastPanY = state.panY;
    }

    // swipe navigation
    if (state.touchStartX != null && event.changedTouches.length === 1) {
      const dx = event.changedTouches[0].clientX - state.touchStartX;
      const dy = event.changedTouches[0].clientY - state.touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX > 60 && absX > absY) {
        const direction = dx > 0 ? 'right' : 'left';
        window.dispatchEvent(new CustomEvent('findit:imageSwipe', { detail: { direction } }));
      }
    }

    state.touchStartX = null;
    state.touchStartY = null;
  }

  function onWheel(event) {
    if (!state.active || !imgElement) return;
    event.preventDefault();
    const delta = event.deltaY;
    const factor = delta > 0 ? 0.92 : 1.08;
    state.scale = Math.min(4, Math.max(1, state.scale * factor));
    applyTransform();
  }

  function reset() {
    state.scale = 1;
    state.baseScale = 1;
    state.panX = 0;
    state.panY = 0;
    state.lastPanX = 0;
    state.lastPanY = 0;
    applyTransform();
  }

  function openViewer(src, alt) {
    const viewer = document.getElementById('image-viewer');
    imgElement = document.getElementById('image-viewer-img');
    backdrop = document.getElementById('image-viewer-backdrop');
    container = viewer.querySelector('.image-viewer-content');

    if (!viewer || !imgElement || !backdrop) return;

    imgElement.src = src;
    imgElement.alt = alt || '';
    viewer.classList.add('visible');
    viewer.setAttribute('aria-hidden', 'false');
    state.active = true;
    reset();
    imgElement.focus();
  }

  function closeViewer() {
    const viewer = document.getElementById('image-viewer');
    if (!viewer) return;
    viewer.classList.remove('visible');
    viewer.setAttribute('aria-hidden', 'true');
    state.active = false;
  }

  function init() {
    document.addEventListener('click', (event) => {
      const cardImg = event.target.closest('.catalog-card-image-wrapper img');
      if (cardImg) {
        openViewer(cardImg.src, cardImg.alt);
      }
    });

    const closeButton = document.getElementById('image-viewer-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => closeViewer());
    }

    const backdropEl = document.getElementById('image-viewer-backdrop');
    if (backdropEl) {
      backdropEl.addEventListener('click', () => closeViewer());
    }

    document.addEventListener('keydown', (event) => {
      const viewer = document.getElementById('image-viewer');
      if (!viewer || !viewer.classList.contains('visible')) return;
      if (event.key === 'Escape') {
        closeViewer();
      } else if (event.key === '+' || event.key === '=' || event.key === 'Add') {
        state.scale = Math.min(4, state.scale * 1.1);
        applyTransform();
      } else if (event.key === '-' || event.key === 'Subtract') {
        state.scale = Math.max(1, state.scale * 0.9);
        applyTransform();
      } else if (event.key === 'ArrowRight') {
        window.dispatchEvent(new CustomEvent('findit:imageSwipe', { detail: { direction: 'left' } }));
      } else if (event.key === 'ArrowLeft') {
        window.dispatchEvent(new CustomEvent('findit:imageSwipe', { detail: { direction: 'right' } }));
      }
    });

    window.addEventListener('findit:openImageViewer', (event) => {
      const { src, alt } = event.detail || {};
      if (src) openViewer(src, alt || '');
    });

    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: false });

    document.addEventListener('wheel', onWheel, { passive: false });
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  window.FindItGestures = { openViewer, closeViewer };
}());

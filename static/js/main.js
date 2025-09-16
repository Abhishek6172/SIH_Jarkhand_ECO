// tiny perf tweak: pause background animation when tab is hidden
(function () {
  const bodyBefore = document.documentElement;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      bodyBefore.style.setProperty('--bg-anim-pause', 'paused');
      // we implemented CSS animations using keyframes; we can't pause pseudo-element easily,
      // but this is left as placeholder if you later use CSS variables to control animation-play-state.
    } else {
      bodyBefore.style.removeProperty('--bg-anim-pause');
    }
  });
})();

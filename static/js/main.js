// tiny perf tweak: pause background animation when tab is hidden
(function () {
  const bodyBefore = document.documentElement;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      bodyBefore.style.setProperty('--bg-anim-pause', 'paused');
      // We implemented CSS animations using keyframes; we can't pause pseudo-element easily,
      // but this is left as placeholder if you later use CSS variables to control animation-play-state.
    } else {
      bodyBefore.style.removeProperty('--bg-anim-pause');
    }
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  // This is a placeholder for a real user ID. In a real app, this would come from a user session.
  const currentUserId = 103;

  // Fetch and display recommendations
  fetch(/api/recommendations/${currentUserId})
    .then(response => response.json())
    .then(recommendations => {
      const container = document.getElementById('recommendations-container');
      if (recommendations.length > 0) {
        container.innerHTML = '';
        recommendations.forEach(item => {
          const recCard = document.createElement('div');
          recCard.className = 'recommendation-card';
          recCard.style = "border: 1px solid #333; padding: 15px; border-radius: 8px; width: 300px; background-color: #1a1a1a;";
          recCard.innerHTML = `
            <h3>${item.title}</h3>
            <p>${item.desc || 'No description available.'}</p>
          `;
          container.appendChild(recCard);
        });
      } else {
        container.innerHTML = '<p>No new recommendations at this time.</p>';
      }
    })
    .catch(error => console.error('Error fetching recommendations:', error));
});

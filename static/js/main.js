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


// --- Code for Recommendations (Already Exists) ---
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
          recCard.className = 'recommendation-card'; // Add this class to your CSS for styling
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


// --- Code for Live Search Functionality (Add this) ---
const searchBar = document.getElementById('search-bar');
const searchResultsContainer = document.getElementById('search-results');

if (searchBar) {
  searchBar.addEventListener('input', () => {
      const query = searchBar.value;
      if (query.length > 2) {
          fetch(/api/search?q=${query})
              .then(response => response.json())
              .then(results => {
                  searchResultsContainer.innerHTML = '';
                  if (results.length > 0) {
                      results.forEach(item => {
                          const resultCard = document.createElement('div');
                          resultCard.innerHTML = `
                              <h3>${item.title || item.name}</h3>
                              <p>${item.desc || item.role || item.type || ''}</p>
                          `;
                          searchResultsContainer.appendChild(resultCard);
                      });
                  } else {
                      searchResultsContainer.innerHTML = '<p>No results found.</p>';
                  }
              });
      } else {
          searchResultsContainer.innerHTML = '';
      }
  });
}


// --- Code for Live Sentiment Analysis Form (Add this) ---
const reviewForm = document.getElementById('review-form');
const sentimentResultContainer = document.getElementById('sentiment-result');

if (reviewForm) {
    reviewForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const reviewText = document.getElementById('review-text').value;

        fetch('/api/analyze-sentiment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ review_text: reviewText })
        })
        .then(response => response.json())
        .then(result => {
            sentimentResultContainer.innerHTML = `
                <p>Sentiment: <strong>${result.sentiment}</strong></p>
                <p>Thank you for your feedback!</p>
            `;
        })
        .catch(error => console.error('Error analyzing sentiment:', error));
    });
}

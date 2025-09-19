import json
import os
from collections import defaultdict
from textblob import TextBlob # type: ignore

# --- Recommendation Engine Function ---
def get_recommendations(user_id):
    """
    Generates recommendations for a given user based on popular items.
    """
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'sample_data.json')
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    all_items = data['featured_experiences'] + data['events'] + data['trails']
    bookings = data['bookings']
    user_bookings = {booking['item_id'] for booking in bookings if booking['user_id'] == user_id}

    # Count the popularity of each item
    popularity = defaultdict(int)
    for booking in bookings:
        popularity[booking['item_id']] += 1

    # Sort all items by popularity in descending order
    sorted_items = sorted(all_items, key=lambda x: popularity[x.get('id', 0)], reverse=True)

    # Return the top 3 recommendations, excluding items the user has already booked
    recommendations = []
    for item in sorted_items:
        if item.get('id') and item['id'] not in user_bookings:
            recommendations.append(item)

    return recommendations[:3]

# --- Sentiment Analysis Function ---
def analyze_sentiment(text):
    """
    Analyzes the sentiment of a given text and returns 'positive', 'negative', or 'neutral'.
    """
    if not text:
        return 'neutral'
    
    analysis = TextBlob(text)
    if analysis.sentiment.polarity > 0.1:
        return 'positive'
    elif analysis.sentiment.polarity < -0.1:
        return 'negative'
    else:
        return 'neutral'

if __name__ == '_main_':
    # Example usage for recommendations
    user_id = 103
    recommendations = get_recommendations(user_id)
    print(f"Recommendations for user {user_id}:")
    for rec in recommendations:
        print(f"- {rec['title']} (ID: {rec.get('id')})")

    # Example usage for sentiment analysis
    review_text = "The sunrise was beautiful, but the road was a bit rough."
    sentiment = analyze_sentiment(review_text)
    print(f"\nText: '{review_text}'\nSentiment: {sentiment}") 
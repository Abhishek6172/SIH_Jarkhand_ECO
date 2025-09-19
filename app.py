# app.py
"""
Flask app that uses an existing JSON data file if available.
- If DATA_JSON_PATH env var is set, it will use that path.
- Otherwise it looks for ./data/sample_data.json.
- Creates a default file only if missing or corrupted (backs up corrupted).
- Provides review API endpoints:
  GET  /api/experiences/<id>/reviews
  POST /api/experiences/<id>/reviews  (body: {"text": "...", "rating": 4, "user_id": 123})
"""
import os
import json
import shutil
from datetime import datetime
from collections import defaultdict
from flask import Flask, render_template, jsonify, request, send_from_directory
from textblob import TextBlob

app = Flask(__name__, static_folder='static', template_folder='templates')

# Resolve data JSON path (respect env var if present)
ENV_PATH = os.environ.get('DATA_JSON_PATH')
if ENV_PATH:
    DATA_PATH = os.path.abspath(ENV_PATH)
else:
    DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(DATA_DIR, exist_ok=True)
    DATA_PATH = os.path.join(DATA_DIR, 'sample_data.json')

def _default_data_structure():
    # keep older key name 'featured_experiences' for backwards compatibility
    base = {
        "featured_experiences": [
            {"id": 1, "title": "Netarhat Sunrise Point", "desc": "Experience breathtaking sunrises, pine forests, and stargazing.", "price": "₹2,500", "type": "Eco Tourism", "image": "netarhat.jpg"},
            {"id": 2, "title": "Santhal Village Immersion", "desc": "Live with Santhal families, learn traditional crafts and ceremonies.", "price": "₹4,200", "type": "Cultural", "image": "jharkhand.jpg"},
            {"id": 3, "title": "Hundru Falls Adventure", "desc": "Trek to the majestic 320-foot waterfall and camp under the stars.", "price": "₹1,800", "type": "Adventure", "image": "Hundrufalls.jpg"}
        ],
        "events": [],
        "trails": [],
        "bookings": [],
        "reviews": {}
    }
    # Also provide experiences key for templates that expect it
    base['experiences'] = list(base['featured_experiences'])
    return base

def create_default_data():
    data = _default_data_structure()
    with open(DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return data

def backup_corrupt_file(path):
    ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    backup_path = f"{path}.corrupt.{ts}"
    try:
        shutil.copy2(path, backup_path)
        app.logger.warning("Backed up corrupt data file to %s", backup_path)
    except Exception as e:
        app.logger.error("Failed to backup corrupt file %s: %s", path, e)

def load_data():
    if not os.path.exists(DATA_PATH):
        app.logger.info("Data file not found at %s — creating default.", DATA_PATH)
        return create_default_data()
    try:
        with open(DATA_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data
    except json.JSONDecodeError:
        app.logger.error("Data file at %s is not valid JSON — backing up and recreating default.", DATA_PATH)
        try:
            backup_corrupt_file(DATA_PATH)
        except Exception:
            pass
        return create_default_data()
    except Exception as e:
        app.logger.error("Unexpected error reading data file %s: %s", DATA_PATH, e)
        return create_default_data()

def save_data(data):
    tmp_path = DATA_PATH + '.tmp'
    try:
        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, DATA_PATH)
    except Exception as e:
        app.logger.error("Failed to save data to %s: %s", DATA_PATH, e)
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass
        raise

# -----------------------
# Data normalization helper
# -----------------------
def normalize_data(data: dict) -> dict:
    """
    Ensure the data dict exposes the keys templates and API expect.
    - If 'experiences' missing, try 'featured_experiences'.
    - Ensure 'events', 'trails', 'reviews', 'bookings' exist.
    This is an in-memory normalization (does not persist unless save_data called).
    """
    if data is None:
        data = {}
    # experiences: prefer explicit 'experiences', else fallback to 'featured_experiences'
    if 'experiences' not in data or not isinstance(data.get('experiences'), list):
        fe = data.get('featured_experiences', [])
        data['experiences'] = list(fe) if isinstance(fe, list) else []

    # make sure featured_experiences exists (for older templates)
    if 'featured_experiences' not in data or not isinstance(data.get('featured_experiences'), list):
        data['featured_experiences'] = list(data.get('experiences', []))

    # ensure other collections exist
    if 'events' not in data or not isinstance(data.get('events'), list):
        data['events'] = []
    if 'trails' not in data or not isinstance(data.get('trails'), list):
        data['trails'] = []
    if 'bookings' not in data or not isinstance(data.get('bookings'), list):
        data['bookings'] = []
    if 'reviews' not in data or not isinstance(data.get('reviews'), dict):
        data['reviews'] = {}

    return data

# -----------------------
# Sentiment helper
# -----------------------
def analyze_sentiment(text: str) -> str:
    if not text or not text.strip():
        return 'neutral'
    analysis = TextBlob(text)
    polarity = analysis.sentiment.polarity
    if polarity > 0.1:
        return 'positive'
    elif polarity < -0.1:
        return 'negative'
    else:
        return 'neutral'

# -----------------------
# Template helpers
# -----------------------
@app.context_processor
def inject_now():
    return {'now': datetime.utcnow}

# -----------------------
# Frontend site routes
# -----------------------
@app.route('/')
def index():
    data = load_data()
    data = normalize_data(data)
    # optional hero_image key used in base.html
    return render_template('index.html', data=data, hero_image='images/jharkhand.jpg')

@app.route('/experiences')
def experiences():
    data = load_data()
    data = normalize_data(data)
    return render_template('experiences.html', data=data, hero_image='images/jharkhand.jpg')

@app.route('/community')
def community():
    data = load_data()
    data = normalize_data(data)
    return render_template('community.html', data=data)

@app.route('/trails')
def trails():
    data = load_data()
    data = normalize_data(data)
    return render_template('trails.html', data=data)

@app.route('/events')
def events():
    data = load_data()
    data = normalize_data(data)
    return render_template('events.html', data=data)

@app.route('/analytics')
def analytics():
    data = load_data()
    data = normalize_data(data)
    return render_template('analytics.html', data=data)

@app.route('/join')
def join():
    data = load_data()
    data = normalize_data(data)
    return render_template('join.html', data=data)

@app.route('/destinations')
def destinations():
    data = load_data()
    data = normalize_data(data)
    return render_template('destinations.html', data=data)

@app.route('/become_host')
def become_host():
    return render_template('become_host.html')

@app.route('/join_artisan')
def join_artisan():
    return render_template('join_artisan.html')

# serve static files (flask already does this, but route kept for safety)
@app.route('/static/<path:filename>')
def static_files(filename):
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    return send_from_directory(static_dir, filename)

# -----------------------
# Reviews API endpoints
# -----------------------
@app.route('/api/experiences/<int:exp_id>/reviews', methods=['GET'])
def get_reviews(exp_id):
    data = load_data()
    data = normalize_data(data)
    reviews = data.get('reviews', {}).get(str(exp_id), [])
    return jsonify({'reviews': reviews})

@app.route('/api/experiences/<int:exp_id>/reviews', methods=['POST'])
def add_review(exp_id):
    payload = request.get_json(silent=True) or {}
    text = (payload.get('text') or '').strip()
    rating = payload.get('rating')
    user_id = payload.get('user_id')

    if not text:
        return jsonify({'error': 'empty review text'}), 400

    sentiment = analyze_sentiment(text)

    data = load_data()
    data = normalize_data(data)

    if 'reviews' not in data:
        data['reviews'] = {}

    key = str(exp_id)
    exp_reviews = data['reviews'].get(key, [])
    new_review = {
        'user_id': user_id,
        'text': text,
        'rating': rating,
        'sentiment': sentiment
    }
    exp_reviews.insert(0, new_review)
    data['reviews'][key] = exp_reviews
    save_data(data)

    return jsonify({'success': True, 'review': new_review, 'reviews': exp_reviews}), 201

# -----------------------
# Recommendations (optional)
# -----------------------
@app.route('/api/recommendations/<int:user_id>', methods=['GET'])
def recommendations(user_id):
    data = load_data()
    data = normalize_data(data)
    all_items = data.get('featured_experiences', []) + data.get('events', []) + data.get('trails', [])
    bookings = data.get('bookings', [])
    user_bookings = {bk.get('item_id') for bk in bookings if bk.get('user_id') == user_id}
    popularity = defaultdict(int)
    for bk in bookings:
        popularity[bk.get('item_id')] += 1
    sorted_items = sorted(all_items, key=lambda x: popularity.get(x.get('id'), 0), reverse=True)
    recs = [it for it in sorted_items if it.get('id') and it.get('id') not in user_bookings][:3]
    return jsonify({'recommendations': recs})

# -----------------------
# Error handlers
# -----------------------
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

# -----------------------
# Run app
# -----------------------
if __name__ == '__main__':
    app.logger.info("Using data JSON at: %s", DATA_PATH)
    # warm-load and normalize on startup (creates file if missing)
    d = load_data()
    normalize_data(d)
    app.run(debug=True, host='127.0.0.1', port=5000)

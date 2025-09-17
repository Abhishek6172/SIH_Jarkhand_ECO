from flask import Flask, render_template, jsonify, request
import json, os
import recommendation_model import get_recommendadtion, analyze_sentiment
import re

app = Flask(__name__, static_folder="static", template_folder="templates")

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "sample_data.json")
with open(DATA_PATH, 'r', encoding='utf-8') as f:
    SAMPLE = json.load(f)

@app.route("/")
def home():
    return render_template("home.html", data=SAMPLE)

@app.route("/experiences")
def experiences():
    return render_template("experiences.html", data=SAMPLE)

@app.route("/community")
def community():
    return render_template("community.html", data=SAMPLE)

@app.route("/trails")
def trails():
    return render_template("trails.html", data=SAMPLE)

@app.route("/events")
def events():
    return render_template("events.html", data=SAMPLE)

@app.route("/analytics")
def analytics():
    return render_template("analytics.html", data=SAMPLE)

@app.route("/join")
def join():
    return render_template("join.html", data=SAMPLE)

@app.route("/api/data")
def api_data():
    return jsonify(SAMPLE)

@app.route("/api/recommendations/<int:user_id>")
def api_recommend(user_id):
    recommendations=get_recommendations(user_id)
    return jsonify(recommendations)

@app.route("/api/analyze-sentiment",methods=['POST'])
def api_analyze_sentiment():
    try:
        data=request.get_json()
        review_text=data.get('review_text')
        if not review_text:
            return jsonify({"error":"No review text provided"}),400)
        sentiment=analyze_sentiment(review_text)
        return jsonify({"sentiment":sentiment})

    except Exception as e:
        return jsonify({"error":str(e)}),500

@app.route("/api/search")
def search():
    query = request.args.get("q", "").lower()
    
    # Combined list of all searchable items
    searchable_items = (
        SAMPLE['featured_experiences'] +
        SAMPLE['community'] +
        SAMPLE['events'] +
        SAMPLE['trails']
    )

    # Filter items based on the search query
    results = [
        item for item in searchable_items
        if query in str(item.get("title", "")).lower() or
        query in str(item.get("name", "")).lower() or
        query in str(item.get("role", "")).lower() or
        query in str(item.get("type", "")).lower()
    ]
    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True)

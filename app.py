from flask import Flask, render_template, jsonify
import json, os

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

if __name__ == "__main__":
    app.run(debug=True)

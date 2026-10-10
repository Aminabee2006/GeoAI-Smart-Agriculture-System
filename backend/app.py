import sys
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from models.agri_model import ENGINE


app = Flask(__name__)
CORS(app)


def get_payload():
    return request.get_json(force=True)


@app.route("/predict_yield", methods=["POST"])
def predict_yield():
    return jsonify(ENGINE.predict_yield(get_payload()))


@app.route("/recommend_crop", methods=["POST"])
def recommend_crop():
    return jsonify(ENGINE.recommend_crop(get_payload()))


@app.route("/risk_analysis", methods=["POST"])
def risk_analysis():
    return jsonify(ENGINE.risk_analysis(get_payload()))


@app.route("/soil_analysis", methods=["POST"])
def soil_analysis():
    return jsonify(ENGINE.soil_analysis(get_payload()))


@app.route("/simulator", methods=["POST"])
def simulator():
    return jsonify(ENGINE.simulator(get_payload()))


@app.route("/alerts", methods=["POST"])
def alerts():
    return jsonify(ENGINE.alerts(get_payload()))


@app.route("/assistant", methods=["POST"])
def assistant():
    payload = get_payload()
    query = payload.pop("query", "")
    return jsonify(ENGINE.assistant_reply(query, payload))


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)

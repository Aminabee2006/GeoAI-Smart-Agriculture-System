from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "dummy_farm_data.csv"


SOIL_SCORES = {
    "Loamy": 0.92,
    "Clay": 0.86,
    "Black Soil": 0.88,
    "Alluvial": 0.9,
    "Red Soil": 0.76,
    "Sandy": 0.62,
}


PRICE_MAP = {
    "Rice": 24000,
    "Wheat": 22000,
    "Millet": 26000,
    "Maize": 23000,
    "Groundnut": 32000,
    "Sugarcane": 34000,
    "Cotton": 36000,
    "Vegetables": 30000,
    "Banana": 38000,
}


@dataclass
class AgriAIEngine:
    model: Pipeline
    dataset: pd.DataFrame

    @classmethod
    def build(cls) -> "AgriAIEngine":
        dataset = pd.read_csv(DATA_PATH)
        x = dataset[
            [
                "rainfall",
                "temperature",
                "humidity",
                "nitrogen",
                "phosphorus",
                "potassium",
                "soil_type",
            ]
        ]
        y = dataset["yield_tons"]

        preprocessor = ColumnTransformer(
            transformers=[
                (
                    "cat",
                    OneHotEncoder(handle_unknown="ignore"),
                    ["soil_type"],
                )
            ],
            remainder="passthrough",
        )

        model = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("regressor", RandomForestRegressor(n_estimators=120, random_state=42)),
            ]
        )
        model.fit(x, y)
        return cls(model=model, dataset=dataset)

    def predict_yield(self, payload: dict) -> dict:
        features = pd.DataFrame([payload])
        predicted_yield = float(self.model.predict(features)[0])
        rainfall = payload["rainfall"]
        temperature = payload["temperature"]
        humidity = payload["humidity"]
        soil_score = SOIL_SCORES.get(payload["soil_type"], 0.7)
        stability = 1 - (
            abs(rainfall - 220) / 700
            + abs(temperature - 27) / 25
            + abs(humidity - 65) / 100
        ) / 3
        confidence = max(0.55, min(0.96, round((soil_score * 0.5 + stability * 0.5), 2)))
        category = "Low" if predicted_yield < 4 else "Medium" if predicted_yield < 6.5 else "High"
        return {
            "predicted_yield": round(predicted_yield, 2),
            "confidence": confidence,
            "yield_category": category,
        }

    def recommend_crop(self, payload: dict) -> dict:
        rainfall = payload["rainfall"]
        temperature = payload["temperature"]
        soil_type = payload["soil_type"]
        nitrogen = payload["nitrogen"]
        phosphorus = payload["phosphorus"]
        potassium = payload["potassium"]

        if rainfall > 320 and soil_type in {"Clay", "Loamy", "Alluvial"}:
            crop = "Rice"
            reason = "High rainfall and moisture-retaining soil suit paddy cultivation."
        elif rainfall > 250 and potassium > 38:
            crop = "Sugarcane"
            reason = "Adequate rainfall and potassium support cane growth."
        elif rainfall < 130 and soil_type == "Sandy":
            crop = "Groundnut"
            reason = "Low rainfall sandy fields are better suited for drought-tolerant groundnut."
        elif 140 <= rainfall <= 210 and 24 <= temperature <= 31 and nitrogen >= 75:
            crop = "Maize"
            reason = "Balanced climate with stronger nitrogen favors maize productivity."
        elif 100 <= rainfall <= 180 and soil_type in {"Red Soil", "Black Soil"}:
            crop = "Cotton"
            reason = "Moderate rainfall and red/black soils are favorable for cotton."
        elif temperature >= 30:
            crop = "Millet"
            reason = "Hot conditions make millet a resilient choice."
        else:
            crop = "Vegetables"
            reason = "Current profile supports diversified vegetable cultivation."

        nutrient_status = "Balanced" if min(nitrogen, phosphorus, potassium) >= 30 else "Needs nutrient boost"
        return {"recommended_crop": crop, "reason": reason, "nutrient_status": nutrient_status}

    def risk_analysis(self, payload: dict) -> dict:
        rainfall = payload["rainfall"]
        humidity = payload["humidity"]
        temperature = payload["temperature"]

        drought = "High" if rainfall < 120 else "Medium" if rainfall < 180 else "Low"
        flood = "High" if rainfall > 360 else "Medium" if rainfall > 280 else "Low"
        pest = "High" if humidity > 78 and temperature > 27 else "Medium" if humidity > 65 else "Low"

        overall_score = {"Low": 1, "Medium": 2, "High": 3}
        highest = max([drought, flood, pest], key=lambda item: overall_score[item])
        suggestions = []
        if drought != "Low":
            suggestions.append("Adopt drip irrigation and mulch to retain moisture.")
        if flood != "Low":
            suggestions.append("Improve field drainage and stagger irrigation.")
        if pest != "Low":
            suggestions.append("Monitor leaves weekly and use integrated pest management.")
        if not suggestions:
            suggestions.append("Conditions look stable. Maintain routine monitoring.")

        return {
            "drought_risk": drought,
            "flood_risk": flood,
            "pest_risk": pest,
            "overall_risk": highest,
            "suggestions": suggestions,
        }

    def soil_analysis(self, payload: dict) -> dict:
        nitrogen = payload["nitrogen"]
        phosphorus = payload["phosphorus"]
        potassium = payload["potassium"]
        soil_type = payload["soil_type"]

        def nutrient_label(value: float) -> str:
            if value < 30:
                return "Low"
            if value < 60:
                return "Moderate"
            return "Rich"

        health_score = round(
            (
                nitrogen / 100 * 0.4
                + phosphorus / 60 * 0.25
                + potassium / 60 * 0.25
                + SOIL_SCORES.get(soil_type, 0.7) * 0.1
            )
            * 100,
            1,
        )

        recommendations = []
        if nitrogen < 40:
            recommendations.append("Add nitrogen-rich compost or urea in split doses.")
        if phosphorus < 25:
            recommendations.append("Apply phosphorus fertilizer before sowing.")
        if potassium < 25:
            recommendations.append("Use potash to improve root strength and stress tolerance.")
        if not recommendations:
            recommendations.append("Soil nutrients are in a healthy range. Maintain current practice.")

        return {
            "soil_type": soil_type,
            "soil_health_score": health_score,
            "nitrogen_status": nutrient_label(nitrogen),
            "phosphorus_status": nutrient_label(phosphorus),
            "potassium_status": nutrient_label(potassium),
            "recommendations": recommendations,
        }

    def simulator(self, payload: dict) -> dict:
        crop = payload["crop"]
        irrigation = payload["irrigation"]
        fertilizer = payload["fertilizer"]
        base_yield = {
            "Rice": 6.5,
            "Wheat": 4.5,
            "Millet": 3.6,
            "Maize": 5.2,
            "Groundnut": 3.2,
            "Sugarcane": 7.8,
            "Cotton": 4.0,
            "Vegetables": 5.9,
            "Banana": 8.8,
        }.get(crop, 4.5)

        irrigation_factor = {"Low": 0.8, "Medium": 1.0, "High": 1.15}[irrigation]
        fertilizer_factor = {"Low": 0.82, "Balanced": 1.0, "High": 1.12}[fertilizer]
        yield_value = round(base_yield * irrigation_factor * fertilizer_factor, 2)

        if irrigation == "Low":
            risk = "High"
        elif fertilizer == "Low":
            risk = "Medium"
        else:
            risk = "Low"

        revenue = yield_value * PRICE_MAP.get(crop, 24000)
        cost = {"Low": 18000, "Medium": 26000, "High": 34000}[irrigation] + {
            "Low": 9000,
            "Balanced": 14000,
            "High": 20000,
        }[fertilizer]
        profit = round(revenue - cost, 2)

        return {"yield": yield_value, "risk": risk, "profit": profit}

    def alerts(self, payload: dict) -> dict:
        risk = self.risk_analysis(payload)
        alerts = []
        if risk["pest_risk"] == "High":
            alerts.append("High pest risk")
        if risk["drought_risk"] in {"High", "Medium"}:
            alerts.append("Low rainfall warning")
        if risk["flood_risk"] == "High":
            alerts.append("Flood preparedness needed")
        if payload["nitrogen"] < 30:
            alerts.append("Nitrogen deficiency detected")
        if not alerts:
            alerts.append("Field conditions are stable today")
        return {"alerts": alerts}

    def assistant_reply(self, query: str, context: dict) -> dict:
        recommendation = self.recommend_crop(context)
        lower_query = query.lower()
        if "risk" in lower_query:
            risk = self.risk_analysis(context)
            answer = (
                f"Current overall risk is {risk['overall_risk']}. "
                f"Drought: {risk['drought_risk']}, Flood: {risk['flood_risk']}, Pest: {risk['pest_risk']}."
            )
        elif "soil" in lower_query:
            soil = self.soil_analysis(context)
            answer = (
                f"Your soil health score is {soil['soil_health_score']}. "
                f"Nitrogen is {soil['nitrogen_status']} and potassium is {soil['potassium_status']}."
            )
        else:
            answer = (
                f"You should consider growing {recommendation['recommended_crop']}. "
                f"{recommendation['reason']}"
            )
        return {"answer": answer}


ENGINE = AgriAIEngine.build()

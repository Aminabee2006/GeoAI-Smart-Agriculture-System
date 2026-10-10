from __future__ import annotations

import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import plotly.express as px
import requests
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from utils.ndvi import generate_ndvi_grid
from utils.translator import t
from utils.voice import speak_text


API_BASE = "http://127.0.0.1:5000"
SOIL_TYPES = ["Loamy", "Clay", "Black Soil", "Alluvial", "Red Soil", "Sandy"]
CROPS = ["Rice", "Wheat", "Millet", "Maize", "Groundnut", "Sugarcane", "Cotton", "Vegetables", "Banana"]


st.set_page_config(page_title="GeoAI Smart Agriculture System", layout="wide")


def inject_styles():
    st.markdown(
        """
        <style>
        html, body, [class*="css"]  {
            font-family: "Trebuchet MS", "Segoe UI Variable", "Gill Sans", sans-serif;
        }
        
        /* 2. FIX LAYERING ISSUE & 7. ENSURE VISIBILITY */
        /* Make all Streamlit UI backgrounds transparent, relying on cards for color */
        .stApp, [data-testid="stAppViewContainer"], [data-testid="stHeader"], .main {
            background: transparent !important;
        }
        
        /* Force the Three.js iframe container to span the entire screen behind everything */
        iframe {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: -999 !important;
            border: none !important;
            pointer-events: none !important; /* Important: Lets your mouse click through to the UI! */
        }
        .hero-card, .metric-card {
            background: rgba(255,255,255,0.82);
            border: 1px solid rgba(50, 120, 75, 0.12);
            border-radius: 20px;
            padding: 1.2rem;
            box-shadow: 0 12px 35px rgba(43, 94, 61, 0.10);
        }
        .tutorial-box {
            background: #173f2c;
            color: #f5ffea;
            border-radius: 18px;
            padding: 1rem 1.2rem;
        }
        .plant-stage {
            text-align: center;
            font-size: 90px;
            animation: floatPlant 2.2s ease-in-out infinite;
        }
        @keyframes floatPlant {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
        }
        .assistant-bubble {
            background: #f1f8ec;
            border-left: 6px solid #2f7a43;
            padding: 1rem;
            border-radius: 16px;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

def inject_threejs_background():
    import streamlit as st
    import streamlit.components.v1 as components

    # Find current sliders (rainfall, temperature, etc.)
    # Estimate a simple yield value logically matching <30, <70
    rainfall = 210
    temperature = 27
    for k, v in st.session_state.items():
        if "rainfall" in k: rainfall = v
        if "temperature" in k: temperature = v
    
    # Simple logic
    yield_val = (rainfall * 0.1) + temperature

    html_code = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ margin: 0; overflow: hidden; background: transparent; pointer-events: none; }}
            canvas {{ display: block; }}
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    </head>
    <body>
        <div id="three-container"></div>
        <script>
            // --- SCENE SETUP ---
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({{ alpha: true, antialias: true }});
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.getElementById('three-container').appendChild(renderer.domElement);

            // --- PREMIUM LIGHTING ---
            const ambient = new THREE.AmbientLight(0x404040, 2); 
            scene.add(ambient);
            const pointLight = new THREE.PointLight(0x00ff88, 1, 100);
            pointLight.position.set(5, 5, 5);
            scene.add(pointLight);
            const blueLight = new THREE.PointLight(0x0088ff, 1, 100);
            blueLight.position.set(-5, 0, 2);
            scene.add(blueLight);

            // --- ORGANIC PLANT SYSTEM ---
            const plantGroup = new THREE.Group();
            scene.add(plantGroup);

            // Create a procedural stem
            const stemPoints = [];
            for (let i = 0; i <= 10; i++) {{
                stemPoints.push(new THREE.Vector3(0, i * 0.2, 0));
            }}
            const stemCurve = new THREE.CatmullRomCurve3(stemPoints);
            const stemGeom = new THREE.TubeGeometry(stemCurve, 20, 0.08, 8, false);
            const stemMat = new THREE.MeshStandardMaterial({{ 
                color: 0x114422, 
                emissive: 0x002211,
                roughness: 0.3,
                metalness: 0.7 
            }});
            const stem = new THREE.Mesh(stemGeom, stemMat);
            plantGroup.add(stem);

            // Add leaves/branches
            const leafMat = new THREE.MeshStandardMaterial({{ 
                color: 0x00ff44, 
                emissive: 0x003311,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide 
            }});
            const leaves = [];
            
            for (let i = 0; i < 12; i++) {{
                const leafGroup = new THREE.Group();
                const leafGeom = new THREE.SphereGeometry(0.3, 16, 8);
                leafGeom.scale(1, 0.1, 2); // Flatten it into a leaf shape
                const leafMesh = new THREE.Mesh(leafGeom, leafMat);
                leafMesh.position.z = 0.3;
                leafGroup.add(leafMesh);
                
                leafGroup.position.y = (i * 0.15) + 0.2;
                leafGroup.rotation.y = (i * Math.PI * 0.6);
                leafGroup.rotation.z = 0.5;
                leafGroup.scale.set(0.1, 0.1, 0.1); // Start small
                
                plantGroup.add(leafGroup);
                leaves.push(leafGroup);
            }}

            // --- BIO-DUST PARTICLES ---
            const partGeom = new THREE.BufferGeometry();
            const partCount = 100;
            const posArray = new Float32Array(partCount * 3);
            for(let i=0; i < partCount * 3; i++) {{
                posArray[i] = (Math.random() - 0.5) * 10;
            }}
            partGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            const partMat = new THREE.PointsMaterial({{ size: 0.05, color: 0x00ffaa, transparent: true, opacity: 0.5 }});
            const particles = new THREE.Points(partGeom, partMat);
            scene.add(particles);

            plantGroup.position.set(4, -3, 0);
            camera.position.z = 8;
            camera.position.y = 1;

            // --- UI INTERACTION STATE ---
            let targetGrowth = 0.1;
            let currentGrowth = 0.1;
            let mouseX = 0, mouseY = 0;
            
            // Connect to Streamlit Logic
            let yieldValue = {yield_val};
            if (yieldValue < 30) targetGrowth = 0.4;
            else if (yieldValue < 70) targetGrowth = 1.2;
            else targetGrowth = 2.5;

            // --- ANIMATION INTERACTIVITY ---
            window.parent.addEventListener('mousemove', (e) => {{
                mouseX = (e.clientX / window.innerWidth) - 0.5;
                mouseY = (e.clientY / window.innerHeight) - 0.5;
            }});

            function animate() {{
                requestAnimationFrame(animate);
                const time = Date.now() * 0.001;

                // Easing Growth
                currentGrowth += (targetGrowth - currentGrowth) * 0.03;
                plantGroup.scale.set(currentGrowth, currentGrowth, currentGrowth);
                
                // Dynamic Sway (Organic feel)
                plantGroup.rotation.z = Math.sin(time) * 0.05 + (mouseX * 0.2);
                plantGroup.rotation.x = Math.cos(time * 0.5) * 0.02 + (mouseY * 0.1);
                
                // Breath-like leaf animation
                leaves.forEach((l, idx) => {{
                    const pulse = Math.sin(time + idx) * 0.1 + 0.9;
                    l.scale.set(pulse, pulse, pulse);
                    l.rotation.z = 0.5 + Math.sin(time * 0.8 + idx) * 0.1;
                }});

                // Particles drift
                particles.rotation.y += 0.001;
                particles.position.y = Math.sin(time * 0.2) * 0.5;

                // Dynamic Color Shifting
                if(currentGrowth > 1.5) {{
                    leafMat.emissive.setHex(0x004411);
                    pointLight.color.setHex(0x00ff88);
                }} else {{
                    leafMat.emissive.setHex(0x331100);
                    pointLight.color.setHex(0xffaa00);
                }}

                renderer.render(scene, camera);
            }}
            
            animate();

            window.addEventListener('resize', () => {{
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            }});
        </script>
    </body>
    </html>
    """
    components.html(html_code, height=0)


def api_post(endpoint: str, payload: dict) -> dict:
    response = requests.post(f"{API_BASE}{endpoint}", json=payload, timeout=20)
    response.raise_for_status()
    return response.json()


def base_inputs(language: str, key_prefix: str = "") -> dict:
    col1, col2, col3 = st.columns(3)
    rainfall = col1.slider("Rainfall (mm)", 50, 500, 210, key=f"{key_prefix}rainfall")
    temperature = col2.slider("Temperature (°C)", 15, 40, 27, key=f"{key_prefix}temperature")
    humidity = col3.slider("Humidity (%)", 30, 95, 68, key=f"{key_prefix}humidity")
    col4, col5, col6, col7 = st.columns(4)
    nitrogen = col4.slider("Nitrogen", 10, 100, 72, key=f"{key_prefix}nitrogen")
    phosphorus = col5.slider("Phosphorus", 10, 60, 34, key=f"{key_prefix}phosphorus")
    potassium = col6.slider("Potassium", 10, 60, 32, key=f"{key_prefix}potassium")
    soil_type = col7.selectbox("Soil Type", SOIL_TYPES, key=f"{key_prefix}soil_type")
    return {
        "rainfall": rainfall,
        "temperature": temperature,
        "humidity": humidity,
        "nitrogen": nitrogen,
        "phosphorus": phosphorus,
        "potassium": potassium,
        "soil_type": soil_type,
    }


def render_plant_growth(yield_value: float):
    import streamlit.components.v1 as components
    
    html_code = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ margin: 0; overflow: hidden; background-color: transparent; display: flex; justify-content: center; }}
            canvas {{ display: block; }}
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    </head>
    <body>
        <script>
            // 6. ENSURE RENDER WORKS
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({{ alpha: true, antialias: true }});
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(renderer.domElement);

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
            dirLight.position.set(10, 20, 10);
            scene.add(dirLight);

            // 2. ADD PLANT OBJECT
            const plant = new THREE.Group();
            
            // Stem -> CylinderGeometry
            const stemGeom = new THREE.CylinderGeometry(0.1, 0.1, 2, 32);
            const stemMat = new THREE.MeshLambertMaterial({{ color: 0x228B22 }});
            const stem = new THREE.Mesh(stemGeom, stemMat);
            stem.position.y = 1;
            plant.add(stem);
            
            // Leaves -> Sphere or Plane
            const leafGeom = new THREE.SphereGeometry(0.4, 16, 16);
            const leafMat = new THREE.MeshLambertMaterial({{ color: 0x32CD32 }});
            const leaf = new THREE.Mesh(leafGeom, leafMat);
            leaf.position.y = 2.2;
            plant.add(leaf);
            
            // Initial state:
            plant.scale.y = 0.1;
            scene.add(plant);

            camera.position.z = 4;
            camera.position.y = 1;

            // 3. ADD GROWTH CONTROL VARIABLE
            let targetGrowth = 0.1;

            // 5. CONNECT EXISTING BUTTON (Simulated via python string injection)
            let yieldVal = {yield_value};
            if (yieldVal < 10) yieldVal *= 1000; // Adjust tons to match user's expected scale (< 2000 etc.)
            
            if (yieldVal < 2000) targetGrowth = 0.5;
            else if (yieldVal < 4000) targetGrowth = 1.5;
            else targetGrowth = 3;

            // 7. OPTIONAL VISUAL IMPROVEMENT
            if (targetGrowth > 2) {{
                stemMat.color.set(0x00ff00);
                leafMat.color.set(0x00ff00);
            }} else {{
                stemMat.color.set(0x8B4513);
                leafMat.color.set(0x8B4513);
            }}

            window.addEventListener('resize', () => {{
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            }});

            // 1. FIX ANIMATION LOOP
            // 4. SMOOTH ANIMATION UPDATE
            function animate() {{
                requestAnimationFrame(animate);
                
                plant.scale.y += (targetGrowth - plant.scale.y) * 0.05;
                plant.rotation.y += 0.02; // Small spin
                
                renderer.render(scene, camera);
            }}
            animate();
        </script>
    </body>
    </html>
    """
    components.html(html_code, height=300)


def dashboard_page(language: str):
    st.markdown(f"<div class='hero-card'><h2>{t(language, 'dashboard')}</h2><p>Geospatial farm health, climate signals, and live alerts in one place.</p></div>", unsafe_allow_html=True)
    payload = base_inputs(language, "dashboard_")
    col1, col2 = st.columns([1.2, 1])

    with col1:
        ndvi = generate_ndvi_grid()
        fig, ax = plt.subplots(figsize=(7, 5))
        heatmap = ax.imshow(ndvi, cmap="RdYlGn", vmin=0, vmax=1)
        ax.set_title("Simulated NDVI Heatmap")
        ax.set_xlabel("Field Grid X")
        ax.set_ylabel("Field Grid Y")
        plt.colorbar(heatmap, ax=ax, label="NDVI")
        st.pyplot(fig, clear_figure=True)
        st.write(f"{t(language, 'healthy_zones')}: {(ndvi > 0.6).sum()} | {t(language, 'stress_zones')}: {(ndvi < 0.35).sum()}")

    with col2:
        alerts = api_post("/alerts", payload)["alerts"]
        st.subheader(t(language, "alerts"))
        for alert in alerts:
            st.warning(alert)
        avg_ndvi = float(np.mean(ndvi))
        st.metric("Average NDVI", round(avg_ndvi, 2))
        st.metric("Estimated Stress Area", f"{round((ndvi < 0.35).mean() * 100, 1)}%")


def yield_page(language: str):
    st.subheader(t(language, "yield_prediction"))
    payload = base_inputs(language, "yield_")
    if st.button(t(language, "predict"), use_container_width=True):
        result = api_post("/predict_yield", payload)
        col1, col2, col3 = st.columns(3)
        col1.metric(t(language, "yield"), f"{result['predicted_yield']} tons/ha")
        col2.metric(t(language, "confidence"), f"{int(result['confidence'] * 100)}%")
        col3.metric("Category", result["yield_category"])

        chart_df = pd.DataFrame(
            {
                "Metric": ["Rainfall", "Temperature", "Humidity", "Predicted Yield"],
                "Value": [
                    payload["rainfall"],
                    payload["temperature"],
                    payload["humidity"],
                    result["predicted_yield"],
                ],
            }
        )
        fig = px.bar(chart_df, x="Metric", y="Value", color="Metric", title="Yield Drivers Overview")
        st.plotly_chart(fig, use_container_width=True)
        render_plant_growth(result["predicted_yield"])


def crop_page(language: str):
    st.subheader(t(language, "crop_recommendation"))
    payload = base_inputs(language, "crop_")
    if st.button(t(language, "recommend"), use_container_width=True):
        result = api_post("/recommend_crop", payload)
        st.success(f"Recommended Crop: {result['recommended_crop']}")
        st.info(result["reason"])
        st.write(f"Nutrient Status: {result['nutrient_status']}")


def risk_page(language: str):
    st.subheader(t(language, "risk_analysis"))
    payload = base_inputs(language, "risk_")
    if st.button(t(language, "analyze"), key="risk_button", use_container_width=True):
        result = api_post("/risk_analysis", payload)
        df = pd.DataFrame(
            {
                "Risk": ["Drought", "Flood", "Pest"],
                "Level": [result["drought_risk"], result["flood_risk"], result["pest_risk"]],
                "Score": [
                    {"Low": 1, "Medium": 2, "High": 3}[result["drought_risk"]],
                    {"Low": 1, "Medium": 2, "High": 3}[result["flood_risk"]],
                    {"Low": 1, "Medium": 2, "High": 3}[result["pest_risk"]],
                ],
            }
        )
        fig = px.line_polar(df, r="Score", theta="Risk", line_close=True, range_r=[0, 3], title="Risk Radar")
        st.plotly_chart(fig, use_container_width=True)
        st.error(f"{t(language, 'risk_level')}: {result['overall_risk']}")
        for suggestion in result["suggestions"]:
            st.write(f"- {suggestion}")


def soil_page(language: str):
    st.subheader(t(language, "soil_analysis"))
    payload = base_inputs(language, "soil_")
    if st.button(t(language, "analyze"), key="soil_button", use_container_width=True):
        result = api_post("/soil_analysis", payload)
        col1, col2 = st.columns([1, 1.2])
        with col1:
            st.metric("Soil Health Score", result["soil_health_score"])
            nutrient_df = pd.DataFrame(
                {
                    "Nutrient": ["Nitrogen", "Phosphorus", "Potassium"],
                    "Value": [payload["nitrogen"], payload["phosphorus"], payload["potassium"]],
                }
            )
            fig = px.bar(nutrient_df, x="Nutrient", y="Value", color="Nutrient", title="Soil Nutrients")
            st.plotly_chart(fig, use_container_width=True)
        with col2:
            st.write(f"Nitrogen: {result['nitrogen_status']}")
            st.write(f"Phosphorus: {result['phosphorus_status']}")
            st.write(f"Potassium: {result['potassium_status']}")
            st.write("Recommendations:")
            for item in result["recommendations"]:
                st.write(f"- {item}")


def simulator_page(language: str):
    st.subheader(t(language, "farming_simulator"))
    col1, col2, col3 = st.columns(3)
    crop = col1.selectbox("Crop", CROPS, key="sim_crop")
    irrigation = col2.selectbox("Irrigation", ["Low", "Medium", "High"], key="sim_irrigation")
    fertilizer = col3.selectbox("Fertilizer", ["Low", "Balanced", "High"], key="sim_fertilizer")
    if st.button(t(language, "simulate"), use_container_width=True):
        result = api_post("/simulator", {"crop": crop, "irrigation": irrigation, "fertilizer": fertilizer})
        a, b, c = st.columns(3)
        a.metric(t(language, "yield"), f"{result['yield']} tons/ha")
        b.metric(t(language, "risk_level"), result["risk"])
        c.metric(t(language, "profit"), f"Rs. {result['profit']:,.0f}")
        sim_df = pd.DataFrame(
            {"Metric": ["Yield", "Profit"], "Value": [result["yield"], result["profit"] / 10000]}
        )
        fig = px.bar(sim_df, x="Metric", y="Value", color="Metric", title="Simulation Outcomes")
        st.plotly_chart(fig, use_container_width=True)
        render_plant_growth(result["yield"])


def tutorial_page(language: str):
    st.subheader(t(language, "guided_tutorial"))
    steps = [
        t(language, "enter_data"),
        t(language, "click_predict"),
        t(language, "view_results"),
    ]
    if "tutorial_step" not in st.session_state:
        st.session_state.tutorial_step = -1

    col1, col2 = st.columns(2)
    if col1.button(t(language, "start_tutorial"), use_container_width=True):
        st.session_state.tutorial_step = 0
    if col2.button(t(language, "reset_tutorial"), use_container_width=True):
        st.session_state.tutorial_step = -1

    step = st.session_state.tutorial_step
    if step >= 0:
        st.markdown(
            f"<div class='tutorial-box'><h4>Step {step + 1}</h4><p>{steps[step]}</p></div>",
            unsafe_allow_html=True,
        )
        if step < len(steps) - 1 and st.button(t(language, "next_step"), key="next_tutorial"):
            st.session_state.tutorial_step += 1
        elif step == len(steps) - 1:
            st.success("Tutorial completed. You can now use all prediction tools.")
    else:
        st.info("Use the tutorial to learn the flow quickly.")


def assistant_page(language: str):
    st.subheader(f"{t(language, 'assistant')} / Voice + Text")
    payload = base_inputs(language, "assistant_")
    query = st.text_input("Ask a farm question", value=t(language, "assistant_prompt"))
    if st.button(t(language, "assistant_button"), use_container_width=True):
        result = api_post("/assistant", {**payload, "query": query})
        st.markdown(f"<div class='assistant-bubble'>{result['answer']}</div>", unsafe_allow_html=True)
        if st.button(t(language, "speak_response"), key="speak_response"):
            if speak_text(result["answer"]):
                st.success(t(language, "voice_ready"))
            else:
                st.warning("Voice engine not available, but text assistant works.")


def main():
    inject_styles()
    language = st.sidebar.selectbox("Language / மொழி", ["English", "Tamil"])
    st.sidebar.title(t(language, "app_title"))
    page = st.sidebar.radio(
        "Navigation",
        [
            t(language, "dashboard"),
            t(language, "yield_prediction"),
            t(language, "crop_recommendation"),
            t(language, "risk_analysis"),
            t(language, "soil_analysis"),
            t(language, "farming_simulator"),
            t(language, "guided_tutorial"),
            t(language, "assistant"),
        ],
    )

    st.title(t(language, "app_title"))
    st.caption("AI + geospatial + climate + soil insights for hackathon-ready smart farming.")

    try:
        requests.get(f"{API_BASE}/health", timeout=5).raise_for_status()
    except Exception:
        st.error("Backend is not running. Start Flask server first: python backend/app.py")
        st.stop()

    if page == t(language, "dashboard"):
        dashboard_page(language)
    elif page == t(language, "yield_prediction"):
        yield_page(language)
    elif page == t(language, "crop_recommendation"):
        crop_page(language)
    elif page == t(language, "risk_analysis"):
        risk_page(language)
    elif page == t(language, "soil_analysis"):
        soil_page(language)
    elif page == t(language, "farming_simulator"):
        simulator_page(language)
    elif page == t(language, "guided_tutorial"):
        tutorial_page(language)
    else:
        assistant_page(language)

    # Inject the continuous Three.js full-screen animation globally
    inject_threejs_background()


if __name__ == "__main__":
    main()

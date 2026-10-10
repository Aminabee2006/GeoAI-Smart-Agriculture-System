import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  LucideThermometer, LucideCloudRain, LucideDroplets, LucideActivity, LucideShieldAlert, 
  LucideLeaf, LucideMap, LucideTestTube, LucideCpu, LucideMessageSquare,
  LucideHome, LucideCamera, LucideGlobe, LucideSun, LucideMoon,
  LucideTrendingUp, LucideHeart, LucideAlertTriangle, LucideSprout, LucideZap, LucideEye,
  LucideCheckCircle, LucideXCircle, LucideFlame, LucideSend
} from 'lucide-react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Scene3D from './components/Scene3D';

const API_BASE = "http://127.0.0.1:5000";

const translations = {
  en: {
    dashboard: "Dashboard", yield_prediction: "Yield Prediction", crop_rec: "Crop Rec",
    risk: "Risk Analysis", soil: "Soil Intel", simulator: "Simulator",
    assistant: "Assistant", disease: "Disease", run: "RUN ANALYSIS",
    results: "Live Results",
  },
  ta: {
    dashboard: "முகப்பு", yield_prediction: "மகசூல்", crop_rec: "பயிர்",
    risk: "ஆபத்து", soil: "மண்", simulator: "சிமுலேட்டர்",
    assistant: "உதவியாளர்", disease: "நோய்", run: "பகுப்பாய்வு",
    results: "முடிவுகள்",
  }
};

function generateNDVIGrid() {
  const grid = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 8; col++) {
      const centerDist = Math.sqrt(Math.pow(row - 2.5, 2) + Math.pow(col - 4, 2));
      const base = 0.7 - centerDist * 0.08;
      const noise = (Math.random() - 0.5) * 0.3;
      const ndvi = Math.max(0.1, Math.min(1.0, base + noise));
      grid.push({ row, col, ndvi });
    }
  }
  return grid;
}

function getNDVIColor(ndvi) {
  if (ndvi > 0.7) return `rgba(0, 255, 100, ${0.5 + ndvi * 0.4})`;
  if (ndvi > 0.5) return `rgba(170, 255, 0, ${0.4 + ndvi * 0.3})`;
  if (ndvi > 0.3) return `rgba(255, 200, 0, ${0.4 + ndvi * 0.3})`;
  return `rgba(255, 60, 40, ${0.4 + ndvi * 0.4})`;
}

function ResultCard({ label, value, color = 'var(--accent)' }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(0,255,150,0.08)' }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: '700', color, fontFamily: 'Outfit' }}>{value}</div>
    </div>
  );
}

function ResultsPanel({ tab, results }) {
  if (!results) return <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Run an analysis to see AI predictions here.</p>;

  if (tab === 'yield_prediction') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ResultCard label="Predicted Yield" value={`${results.predicted_yield} tons/ha`} color="#00ff9f" />
      <ResultCard label="Category" value={results.yield_category} color={results.yield_category === 'High' ? '#00ff9f' : results.yield_category === 'Medium' ? '#ffcc00' : '#ff4466'} />
      <ResultCard label="Confidence" value={`${Math.round(results.confidence * 100)}%`} />
    </div>
  );

  if (tab === 'crop_rec') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ResultCard label="Recommended Crop" value={results.recommended_crop} color="#00ff9f" />
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(0,255,150,0.08)' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>REASON</div>
        <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>{results.reason}</p>
      </div>
      <ResultCard label="Nutrient Status" value={results.nutrient_status} />
    </div>
  );

  if (tab === 'risk') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ResultCard label="Overall Risk" value={results.overall_risk} color={results.overall_risk === 'High' ? '#ff4466' : results.overall_risk === 'Medium' ? '#ffcc00' : '#00ff9f'} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        <ResultCard label="Drought" value={results.drought_risk} color={results.drought_risk === 'High' ? '#ff4466' : results.drought_risk === 'Medium' ? '#ffcc00' : '#00ff9f'} />
        <ResultCard label="Flood" value={results.flood_risk} color={results.flood_risk === 'High' ? '#ff4466' : results.flood_risk === 'Medium' ? '#ffcc00' : '#00ff9f'} />
        <ResultCard label="Pest" value={results.pest_risk} color={results.pest_risk === 'High' ? '#ff4466' : results.pest_risk === 'Medium' ? '#ffcc00' : '#00ff9f'} />
      </div>
      {results.suggestions?.map((s, i) => (
        <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.78rem', borderLeft: '3px solid var(--accent)' }}>{s}</div>
      ))}
    </div>
  );

  if (tab === 'soil') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ResultCard label="Soil Health Score" value={`${results.soil_health_score}/100`} color="#00ff9f" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        <ResultCard label="Nitrogen" value={results.nitrogen_status} />
        <ResultCard label="Phosphorus" value={results.phosphorus_status} />
        <ResultCard label="Potassium" value={results.potassium_status} />
      </div>
      {results.recommendations?.map((r, i) => (
        <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.78rem', borderLeft: '3px solid #00ccff' }}>{r}</div>
      ))}
    </div>
  );

  if (tab === 'simulator') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ResultCard label="Projected Yield" value={`${results.yield} tons/ha`} color="#00ff9f" />
      <ResultCard label="Estimated Profit" value={`₹${results.profit?.toLocaleString()}`} color="#00ccff" />
      <ResultCard label="Risk Level" value={results.risk} color={results.risk === 'High' ? '#ff4466' : results.risk === 'Medium' ? '#ffcc00' : '#00ff9f'} />
    </div>
  );

  if (tab === 'assistant') return (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(0,255,150,0.1)' }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--accent)', marginBottom: '8px' }}>AI RESPONSE</div>
      <p style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>{results.answer}</p>
    </div>
  );

  if (tab === 'disease') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ResultCard label="Detected Disease" value={results.disease} color="#ff4466" />
      <ResultCard label="Treatment" value={results.cure} color="#ffcc00" />
    </div>
  );

  return <pre style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{JSON.stringify(results, null, 2)}</pre>;
}

export default function App() {
  const [lang, setLang] = useState('en');
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inputs, setInputs] = useState({
    rainfall: 210, temperature: 27, humidity: 68,
    nitrogen: 72, phosphorus: 34, potassium: 32,
    soil_type: "Loamy", crop: "Rice", irrigation: "Medium", fertilizer: "Balanced", query: ""
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [targetHealth, setTargetHealth] = useState(0.8);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const ndviGrid = useMemo(() => generateNDVIGrid(), []);

  const dashboardData = useMemo(() => {
    const yieldEst = (inputs.rainfall * 0.012 + inputs.nitrogen * 0.03 + (100 - Math.abs(inputs.temperature - 28)) * 0.02).toFixed(1);
    const soilScore = Math.min(100, Math.round((inputs.nitrogen + inputs.phosphorus + inputs.potassium) / 1.5));
    const riskLevel = inputs.rainfall > 350 ? 'High' : inputs.rainfall < 80 ? 'High' : inputs.temperature > 35 ? 'Medium' : 'Low';
    const cropRec = inputs.rainfall > 200 ? 'Rice' : inputs.temperature > 30 ? 'Millet' : 'Wheat';
    return { yieldEst, soilScore, riskLevel, cropRec };
  }, [inputs]);

  const handleAction = async () => {
    setLoading(true);
    try {
      if (activeTab === 'disease') {
        setTimeout(() => {
          setResults({ disease: "Early Blight detected.", cure: "Apply copper-based fungicide every 7 days." });
          setTargetHealth(0.2);
          setLoading(false);
        }, 1200);
        return;
      }
      const endpoints = {
        yield_prediction: '/predict_yield', crop_rec: '/recommend_crop',
        risk: '/risk_analysis', soil: '/soil_analysis', simulator: '/simulator', assistant: '/assistant'
      };
      const endpoint = endpoints[activeTab];
      if (!endpoint) { setLoading(false); return; }

      const res = await axios.post(`${API_BASE}${endpoint}`, inputs);
      setResults(res.data);
      if (activeTab === 'yield_prediction') {
        const y = res.data.predicted_yield;
        setTargetHealth(y < 4 ? 0.2 : y < 6.5 ? 0.6 : 1.0);
      } else if (activeTab === 'simulator') {
        const y = res.data.yield;
        setTargetHealth(y < 4 ? 0.2 : y < 6.5 ? 0.6 : 1.0);
      } else if (activeTab === 'risk') {
        setTargetHealth(res.data.overall_risk === 'High' ? 0.2 : res.data.overall_risk === 'Medium' ? 0.6 : 0.9);
      }
    } catch (err) {
      console.error('API Error:', err);
      setResults({ error: 'Could not reach the backend. Is the Flask server running on port 5000?' });
    } finally { setLoading(false); }
  };

  const tabs = [
    { id: 'dashboard', icon: <LucideHome size={14}/>, label: t.dashboard },
    { id: 'yield_prediction', icon: <LucideLeaf size={14}/>, label: t.yield_prediction },
    { id: 'crop_rec', icon: <LucideSprout size={14}/>, label: t.crop_rec },
    { id: 'risk', icon: <LucideShieldAlert size={14}/>, label: t.risk },
    { id: 'soil', icon: <LucideTestTube size={14}/>, label: t.soil },
    { id: 'simulator', icon: <LucideCpu size={14}/>, label: t.simulator },
    { id: 'disease', icon: <LucideCamera size={14}/>, label: t.disease },
    { id: 'assistant', icon: <LucideMessageSquare size={14}/>, label: t.assistant },
  ];

  const soilTypes = ["Loamy", "Clay", "Black Soil", "Alluvial", "Red Soil", "Sandy"];
  const crops = ["Rice", "Wheat", "Millet", "Maize", "Groundnut", "Sugarcane", "Cotton", "Vegetables", "Banana"];

  const selectStyle = { padding: '6px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: 'var(--text-main)', border: '1px solid rgba(0,255,150,0.15)', width: '100%', fontSize: '0.8rem' };

  return (
    <div className={isDarkMode ? '' : 'light-mode'}>
      {/* 3D Background */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1, pointerEvents: 'none', background: 'var(--bg-color)' }}>
        <Scene3D targetHealth={targetHealth} isDarkMode={isDarkMode} rainfall={inputs.rainfall} temperature={inputs.temperature} humidity={inputs.humidity} />
      </div>

      {/* Top Bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 2rem', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'auto' }}>
          <h1 className="heading-tech" style={{ fontSize: '1.4rem' }}>GeoDFarm</h1>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', background: 'rgba(0,255,150,0.08)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(0,255,150,0.12)' }}>Digital Twin</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', pointerEvents: 'auto' }}>
          <button className="btn-primary" style={{ padding: '6px 12px', fontSize:'0.75rem', display:'flex', alignItems:'center', gap:'5px' }} onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <LucideSun size={12}/> : <LucideMoon size={12}/>} {isDarkMode ? 'Day' : 'Night'}
          </button>
          <button className="btn-primary" style={{ padding: '6px 12px', fontSize:'0.75rem', display:'flex', alignItems:'center', gap:'5px' }} onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}>
            <LucideGlobe size={12}/> {lang === 'en' ? 'தமிழ்' : 'EN'}
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="main-layout" style={{ marginTop: '30px' }}>
        {/* Sidebar */}
        <div className="sidebar">
          {tabs.slice(0, 5).map(tab => (
            <div key={tab.id} className={`sidebar-icon ${activeTab === tab.id ? 'active' : ''}`} title={tab.label} onClick={() => { setActiveTab(tab.id); setResults(null); }}>
              {tab.icon}
            </div>
          ))}
        </div>

        {/* Left Control Panel */}
        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)' }}>
          <h2 style={{ fontSize: '1rem', color: 'white', fontFamily: 'Outfit' }}>Farm Overview</h2>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div className="mini-stat"><LucideTrendingUp size={13}/> <span>{dashboardData.yieldEst}t</span></div>
            <div className="mini-stat"><LucideHeart size={13}/> <span>{dashboardData.soilScore}%</span></div>
            <div className="mini-stat"><LucideAlertTriangle size={13}/> <span>{dashboardData.riskLevel}</span></div>
            <div className="mini-stat"><LucideSprout size={13}/> <span>{dashboardData.cropRec}</span></div>
          </div>

          {/* Tab Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            {tabs.map(tab => (
              <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => { setActiveTab(tab.id); setResults(null); }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Input Controls per Tab */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
            
            {/* Always show environment sliders */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent)', marginBottom: '8px', letterSpacing: '1px' }}>ENVIRONMENT</div>
              <Slider label="Rainfall" min={50} max={500} val={inputs.rainfall} onChange={v => setInputs({...inputs, rainfall: v})} unit="mm" />
              <Slider label="Temp" min={15} max={40} val={inputs.temperature} onChange={v => setInputs({...inputs, temperature: v})} unit="°C" />
              <Slider label="Humidity" min={30} max={95} val={inputs.humidity} onChange={v => setInputs({...inputs, humidity: v})} unit="%" />
            </div>

            {/* Soil / Nutrient inputs for relevant tabs */}
            {(activeTab === 'yield_prediction' || activeTab === 'soil' || activeTab === 'crop_rec' || activeTab === 'risk') && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent)', marginBottom: '8px', letterSpacing: '1px' }}>SOIL & NUTRIENTS</div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Soil Type</label>
                  <select style={selectStyle} value={inputs.soil_type} onChange={e => setInputs({...inputs, soil_type: e.target.value})}>
                    {soilTypes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Slider label="Nitrogen (N)" min={0} max={120} val={inputs.nitrogen} onChange={v => setInputs({...inputs, nitrogen: v})} unit=" kg/ha" />
                <Slider label="Phosphorus (P)" min={0} max={80} val={inputs.phosphorus} onChange={v => setInputs({...inputs, phosphorus: v})} unit=" kg/ha" />
                <Slider label="Potassium (K)" min={0} max={80} val={inputs.potassium} onChange={v => setInputs({...inputs, potassium: v})} unit=" kg/ha" />
              </div>
            )}

            {/* Simulator inputs */}
            {activeTab === 'simulator' && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent)', marginBottom: '8px', letterSpacing: '1px' }}>STRATEGY</div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Crop</label>
                  <select style={selectStyle} value={inputs.crop} onChange={e => setInputs({...inputs, crop: e.target.value})}>
                    {crops.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Irrigation</label>
                  <select style={selectStyle} value={inputs.irrigation} onChange={e => setInputs({...inputs, irrigation: e.target.value})}>
                    {["Low","Medium","High"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fertilizer</label>
                  <select style={selectStyle} value={inputs.fertilizer} onChange={e => setInputs({...inputs, fertilizer: e.target.value})}>
                    {["Low","Balanced","High"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Assistant query input */}
            {activeTab === 'assistant' && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent)', marginBottom: '8px', letterSpacing: '1px' }}>ASK THE AI</div>
                <textarea 
                  style={{ ...selectStyle, resize: 'none', height: '70px', lineHeight: 1.5 }}
                  placeholder="e.g. What are the risks? What soil nutrients are needed?"
                  value={inputs.query}
                  onChange={e => setInputs({...inputs, query: e.target.value})}
                />
              </div>
            )}

            {/* Run Analysis button (not on dashboard tab) */}
            {activeTab !== 'dashboard' && (
              <button className="btn-primary" onClick={handleAction} disabled={loading} style={{ padding: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {loading ? <><LucideZap size={14} style={{ animation: 'pulse 1s infinite' }}/> PROCESSING...</> : <><LucideZap size={14}/> RUN ANALYSIS</>}
              </button>
            )}
          </div>
        </div>

        {/* Center - 3D Display */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="holographic-overlay" />
          <div className="scanline" />
          <div style={{ pointerEvents: 'none', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 0' }}>
            <div className="center-weather-bar">
              <div className="weather-item"><LucideThermometer size={12}/> {inputs.temperature}°C</div>
              <div className="weather-item"><LucideCloudRain size={12}/> {inputs.rainfall}mm</div>
              <div className="weather-item"><LucideDroplets size={12}/> {inputs.humidity}%</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '280px' }}>
              <div className="glass-panel" style={{ padding: '6px 18px', width: '100%', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>Health: {Math.round(targetHealth * 100)}%</span>
              </div>
              <div className="health-gauge">
                <div className="health-gauge-fill" style={{ width: `${targetHealth * 100}%`, background: targetHealth > 0.7 ? '#00ff9f' : targetHealth > 0.4 ? '#ffcc00' : '#ff4466' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Results Panel */}
        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          <div className="section-title"><LucideEye size={13}/> {t.results}</div>

          {activeTab === 'dashboard' ? (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="insight-section">
                <h3 style={{ fontSize: '0.8rem', marginBottom: '8px' }}>NDVI Health Grid</h3>
                <div className="ndvi-grid">
                  {ndviGrid.map((cell, i) => (
                    <div key={i} className="ndvi-cell" style={{ background: getNDVIColor(cell.ndvi) }} />
                  ))}
                </div>
              </div>
              <div className="insight-section" style={{ height: '180px' }}>
                <MapContainer center={[11.0168, 76.9558]} zoom={13} style={{ height: '100%', width: '100%', filter: 'sepia(1) hue-rotate(90deg) brightness(0.9)' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                </MapContainer>
              </div>
            </div>
          ) : (
            <div className="fade-in">
              <ResultsPanel tab={activeTab} results={results} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Slider({ label, min, max, val, onChange, unit = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: '600' }}>{val}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={val} onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

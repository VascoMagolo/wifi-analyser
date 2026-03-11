import { useState, useEffect } from "react";

const MATERIALS = {
  vidro: { name: "Vidro", factor: 10, color: "#bae6fd" }, // ~10 dB/m (ex: 10cm = 1 dB)
  pladur: { name: "Pladur / Gesso", factor: 15, color: "#cbd5e1" }, // ~15 dB/m (ex: 10cm = 1.5 dB)
  madeira: { name: "Madeira", factor: 20, color: "#fdba74" }, // ~20 dB/m (ex: 10cm = 2.0 dB)
  tijolo: { name: "Tijolo", factor: 35, color: "#f97316" }, // ~35 dB/m (ex: 10cm = 3.5 dB)
  betao: { name: "Betão Armado", factor: 60, color: "#6b7280" }, // ~60 dB/m (ex: 20cm = 12 dB)
};

export default function Simulator() {
  // Estados
  const [txPower, setTxPower] = useState(20);
  const [frequency, setFrequency] = useState(2.4);
  const [gamma, setGamma] = useState(2.5); // <-- Estado do Gamma

  const [routerPos, setRouterPos] = useState({ x: 2, y: 5 });
  const [receiverPos, setReceiverPos] = useState({ x: 8, y: 5 });

  const [attenuation, setAttenuation] = useState(3.5);
  const [numObstacles, setNumObstacles] = useState(2);

  const [walls, setWalls] = useState([
    { id: 1, material: "tijolo", thickness: 10 } 
  ]);

  const [results, setResults] = useState({
    distance: 0,
    rxPowerSimplified: 0,
    rxPowerMotleyKeenan: 0,
  });

  // Funções para gerir paredes
  const addWall = () => {
    const newId = walls.length > 0 ? Math.max(...walls.map(w => w.id)) + 1 : 1;
    setWalls([...walls, { id: newId, material: "pladur", thickness: 10 }]);
  };

  const removeWall = (id) => {
    setWalls(walls.filter(w => w.id !== id));
  };

  const updateWall = (id, field, value) => {
    setWalls(walls.map(w => w.id === id ? { ...w, [field]: value } : w));
  };
// Cálculo principal
  useEffect(() => {
    // 1. Distância
    const d = Math.sqrt(
      Math.pow(receiverPos.x - routerPos.x, 2) + Math.pow(receiverPos.y - routerPos.y, 2)
    );
    const distance = d < 1 ? 1 : d;

    // 2. Modelo Simplificado
    const c = 3e8;
    const f = frequency * 1e9;
    const wavelength = c / f;
    const pl_d0 = 20 * Math.log10((4 * Math.PI) / wavelength);

    const pl_simplified = pl_d0 + 10 * gamma * Math.log10(distance);
    const prx_simplified = txPower - pl_simplified;

    // 3. Atenuação Total das Paredes
    const totalAttenuation = walls.reduce((sum, wall) => {
      const thicknessInMeters = wall.thickness / 100;
      return sum + (MATERIALS[wall.material].factor * thicknessInMeters);
    }, 0);

    // 4. Modelo Motley-Keenan (com as paredes dinâmicas)
    const pl_motley = pl_simplified + totalAttenuation;
    const prx_motley = txPower - pl_motley;

    setResults({
      distance: distance.toFixed(2),
      totalWallAttenuation: totalAttenuation.toFixed(2),
      rxPowerSimplified: prx_simplified.toFixed(2),
      rxPowerMotleyKeenan: prx_motley.toFixed(2),
    });
  }, [txPower, frequency, gamma, routerPos, receiverPos, walls]);

  // Função para avaliar a qualidade do sinal (Wi-Fi)
  const getSignalQuality = (power) => {
    const p = parseFloat(power);
    if (p >= -60) return { label: "Excelente", color: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/50", dot: "bg-emerald-500" };
    if (p >= -75) return { label: "Bom", color: "bg-blue-100 text-blue-700 ring-1 ring-blue-300/50", dot: "bg-blue-500" };
    if (p >= -85) return { label: "Fraco", color: "bg-amber-100 text-amber-700 ring-1 ring-amber-300/50", dot: "bg-amber-500" };
    return { label: "Sem Sinal / Perdas", color: "bg-rose-100 text-rose-700 ring-1 ring-rose-300/50", dot: "bg-rose-500" };
  };

  const quality = getSignalQuality(results.rxPowerMotleyKeenan);

 return (
    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-100 font-sans">
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
            <svg className="w-6 h-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path></svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Painel de Controlo de Propagação</h2>
            <p className="text-blue-200/80 text-sm mt-1 font-medium">Ajusta os parâmetros e observa o impacto no sinal em tempo real.</p>
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        <div className="lg:col-span-7 space-y-8">
          
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Parâmetros do Emissor
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/60 shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-semibold text-slate-700">Potência (dBm)</label>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{txPower}</span>
                </div>
                <input type="range" min="0" max="30" step="1" value={txPower} onChange={e => setTxPower(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/60 shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-semibold text-slate-700">Frequência (GHz)</label>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{frequency}</span>
                </div>
                <input type="range" min="2.4" max="5.8" step="0.1" value={frequency} onChange={e => setFrequency(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-medium">
                  <span>Wi-Fi 4 (2.4GHz)</span>
                  <span>Wi-Fi 5 (5GHz)</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/60 shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-slate-700">Expoente de Propagação (γ)</label>
                <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">{gamma}</span>
              </div>
              <input type="range" min="1.6" max="4.0" step="0.1" value={gamma} onChange={e => setGamma(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
              <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-medium">
                <span>1.6 (Espaço Aberto / LOS)</span>
                <span>4.0 (Muitas Paredes / Obstruído)</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                Obstáculos no Caminho (Paredes)
              </h3>
              <button onClick={addWall} className="text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Adicionar Parede
              </button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {walls.length === 0 ? (
                <div className="text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm">
                  Nenhum obstáculo. Sinal em Linha de Vista (LOS).
                </div>
              ) : (
                walls.map((wall, index) => (
                  <div key={wall.id} className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60 relative group transition-all hover:border-indigo-300">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Material da Parede {index + 1}</label>
                      <select 
                        value={wall.material} 
                        onChange={(e) => updateWall(wall.id, "material", e.target.value)}
                        className="w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 bg-white text-sm"
                      >
                        {Object.entries(MATERIALS).map(([key, data]) => (
                          <option key={key} value={key}>{data.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="w-full sm:w-32">
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Espessura (cm)</label>
                      <input 
                        type="number" 
                        min="1"
                        value={wall.thickness} 
                        onChange={(e) => updateWall(wall.id, "thickness", Number(e.target.value))}
                        className="w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 bg-white text-sm"
                      />
                    </div>

                    <button 
                      onClick={() => removeWall(wall.id)}
                      className="absolute -top-2 -right-2 bg-rose-100 text-rose-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white shadow-sm"
                      title="Remover Parede"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {walls.length > 0 && (
              <div className="flex justify-end text-sm text-slate-500 mt-2 font-medium">
                Atenuação total calculada: <span className="text-rose-600 font-bold ml-1">{results.totalWallAttenuation} dB</span>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Coordenadas de Teste
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-3 text-center">Tx - Router (X, Y)</label>
                <div className="flex gap-3">
                  <input type="number" min="0" max="10" value={routerPos.x} onChange={e => setRouterPos({...routerPos, x: Number(e.target.value)})} className="w-full rounded-lg border-slate-200 shadow-sm p-2 text-center focus:ring-indigo-500 bg-slate-50" />
                  <input type="number" min="0" max="10" value={routerPos.y} onChange={e => setRouterPos({...routerPos, y: Number(e.target.value)})} className="w-full rounded-lg border-slate-200 shadow-sm p-2 text-center focus:ring-indigo-500 bg-slate-50" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-3 text-center">Rx - Recetor (X, Y)</label>
                <div className="flex gap-3">
                  <input type="number" min="0" max="10" value={receiverPos.x} onChange={e => setReceiverPos({...receiverPos, x: Number(e.target.value)})} className="w-full rounded-lg border-slate-200 shadow-sm p-2 text-center focus:ring-indigo-500 bg-slate-50" />
                  <input type="number" min="0" max="10" value={receiverPos.y} onChange={e => setReceiverPos({...receiverPos, y: Number(e.target.value)})} className="w-full rounded-lg border-slate-200 shadow-sm p-2 text-center focus:ring-indigo-500 bg-slate-50" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-8">
          
          <div className="bg-slate-900 text-white p-7 rounded-3xl shadow-xl relative overflow-hidden ring-1 ring-slate-800">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            
            <h3 className="text-sm font-semibold text-slate-400 mb-6 tracking-wider uppercase flex justify-between items-center">
              Análise do Sinal
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${quality.dot}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${quality.dot}`}></span>
              </span>
            </h3>
            
            <div className="space-y-6 relative z-10">
              <div className="bg-slate-800/50 p-5 rounded-2xl backdrop-blur-sm border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-2 font-medium">Modelo Motley-Keenan (Real)</p>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-5xl font-bold tracking-tighter text-white">{results.rxPowerMotleyKeenan}</p>
                  <span className="text-lg text-slate-400 font-medium">dBm</span>
                </div>
                <div className={`inline-flex px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${quality.color}`}>
                  {quality.label}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30">
                  <p className="text-xs text-slate-400 mb-1 font-medium">Distância (LOS)</p>
                  <p className="text-xl font-semibold text-slate-200">{results.distance} <span className="text-sm text-slate-500">m</span></p>
                </div>
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30">
                  <p className="text-xs text-slate-400 mb-1 font-medium">Espaço Livre (Simplificado)</p>
                  <p className="text-xl font-semibold text-slate-200">{results.rxPowerSimplified} <span className="text-sm text-slate-500">dBm</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex-grow flex flex-col">
            <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
              Planta do Laboratório (10x10m)
            </h4>
            
            <div className="relative w-full aspect-square bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden" 
                 style={{ 
                   backgroundImage: 'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)', 
                   backgroundSize: '10% 10%' 
                 }}>
              
              {/* O NOVO SVG QUE DESENHA AS PAREDES */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-0">
                
                {/* Linha Tracejada do Sinal */}
                <line 
                  x1={routerPos.x * 10} y1={routerPos.y * 10} 
                  x2={receiverPos.x * 10} y2={receiverPos.y * 10} 
                  stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2,2" 
                />

                {/* Renderização das Paredes */}
                {walls.map((wall, index) => {
                  const txX = routerPos.x * 10;
                  const txY = routerPos.y * 10;
                  const rxX = receiverPos.x * 10;
                  const rxY = receiverPos.y * 10;

                  // Calcula a posição fracionada da parede na linha (distribui uniformemente)
                  const f = (index + 1) / (walls.length + 1);
                  const cx = txX + (rxX - txX) * f;
                  const cy = txY + (rxY - txY) * f;

                  // Calcula a rotação para que fiquem perpendiculares ao sinal
                  const angle = Math.atan2(rxY - txY, rxX - txX) * (180 / Math.PI);

                  // Tamanho visual da parede (comprimento e espessura baseada na real)
                  const wallLength = 20; // 20% do mapa de comprimento
                  const wallThickness = Math.max(1, wall.thickness / 5); // Escala para ficar visível

                  return (
                    <g key={wall.id} transform={`translate(${cx} ${cy})`} className="drop-shadow-md">
                      <rect
                        x={-wallThickness / 2}
                        y={-wallLength / 2}
                        width={wallThickness}
                        height={wallLength}
                        fill={MATERIALS[wall.material].color}
                        opacity="0.9"
                        transform={`rotate(${angle})`}
                        rx="1"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Ponto do Router (Tx) */}
              <div className="absolute w-6 h-6 bg-indigo-500 rounded-full shadow-lg border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out z-10 flex items-center justify-center"
                   style={{ left: `${Math.min(100, (routerPos.x / 10) * 100)}%`, top: `${Math.min(100, (routerPos.y / 10) * 100)}%` }}>
                <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-50"></div>
                <span className="text-[10px] font-bold text-white relative z-20">Tx</span>
              </div>

              {/* Ponto do Recetor (Rx) */}
              <div className="absolute w-6 h-6 bg-rose-500 rounded-full shadow-lg border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out z-10 flex items-center justify-center"
                   style={{ left: `${Math.min(100, (receiverPos.x / 10) * 100)}%`, top: `${Math.min(100, (receiverPos.y / 10) * 100)}%` }}>
                <span className="text-[10px] font-bold text-white">Rx</span>
              </div>
            </div>
            
            <p className="text-[11px] text-center text-slate-400 mt-4 font-medium uppercase tracking-wider">Muda as coordenadas X e Y para mover os dispositivos</p>
          </div>

        </div>
      </div>
    </div>
  );
}
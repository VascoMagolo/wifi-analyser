import { useState, useEffect, useRef } from "react";

// Dicionário de Materiais
const MATERIALS = {
  vidro: { name: "Vidro", f2: 10, f5: 15, color: "#bae6fd" }, 
  pladur: { name: "Pladur / Gesso", f2: 15, f5: 22, color: "#cbd5e1" }, 
  madeira: { name: "Madeira", f2: 20, f5: 30, color: "#d97706" }, 
  tijolo: { name: "Tijolo", f2: 35, f5: 50, color: "#ea580c" }, 
  betao: { name: "Betão Armado", f2: 60, f5: 85, color: "#475569" }, 
};

// Algoritmo para verificar interseção de raios (Raycasting)
const checkIntersection = (x1, y1, x2, y2, x3, y3, x4, y4) => {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denom === 0) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  return t > 0 && t <= 1 && u >= 0 && u <= 1;
};

export default function Simulator() {
  const mapRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null); 

  // Estados - RF Parameters
  const [txPower, setTxPower] = useState(20);
  const [txGain, setTxGain] = useState(3); // Ganho da antena emissora (dBi)
  const [rxGain, setRxGain] = useState(0); // Ganho da antena recetora (dBi)
  const [frequency, setFrequency] = useState(2.4);
  const [gamma, setGamma] = useState(2.5);

  const [routerPos, setRouterPos] = useState({ x: 2, y: 5 });
  const [receiverPos, setReceiverPos] = useState({ x: 8, y: 5 });

  const [walls, setWalls] = useState([
    { id: 1, material: "tijolo", thickness: 10 },
    { id: 2, material: "vidro", thickness: 5 }
  ]);

  const [results, setResults] = useState({
    distance: 0,
    totalWallAttenuation: 0,
    rxPowerSimplified: 0,
    rxPowerMotleyKeenan: 0,
  });

  const addWall = () => {
    const newId = walls.length > 0 ? Math.max(...walls.map(w => w.id)) + 1 : 1;
    setWalls([...walls, { id: newId, material: "pladur", thickness: 10 }]);
  };
  const removeWall = (id) => setWalls(walls.filter(w => w.id !== id));
  const updateWall = (id, field, value) => setWalls(walls.map(w => w.id === id ? { ...w, [field]: value } : w));

  // Lógica de Drag & Drop (Agora com suporte Touch para Mobile!)
  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging || !mapRef.current) return;
      
      // Prevenir scroll da página no mobile enquanto arrastamos
      if (e.type === 'touchmove') e.preventDefault();

      let clientX = e.touches ? e.touches[0].clientX : e.clientX;
      let clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const rect = mapRef.current.getBoundingClientRect();
      let x = ((clientX - rect.left) / rect.width) * 10;
      let y = ((clientY - rect.top) / rect.height) * 10;

      x = Math.max(0, Math.min(10, x));
      y = Math.max(0, Math.min(10, y));

      if (isDragging === "tx") setRouterPos({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
      if (isDragging === "rx") setReceiverPos({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
    };

    const handleUp = () => setIsDragging(null);

    if (isDragging) {
      window.addEventListener("mousemove", handleMove, { passive: false });
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("touchend", handleUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isDragging]);

  // Cálculo Principal do Ponto a Ponto
  useEffect(() => {
    const d = Math.sqrt(Math.pow(receiverPos.x - routerPos.x, 2) + Math.pow(receiverPos.y - routerPos.y, 2));
    const distance = d < 1 ? 1 : d;

    const c = 3e8;
    const f = frequency * 1e9;
    const wavelength = c / f;
    const pl_d0 = 20 * Math.log10((4 * Math.PI) / wavelength);

    const pl_simplified = pl_d0 + 10 * gamma * Math.log10(distance);
    // Adicionados Ganhos de Antena
    const prx_simplified = txPower + txGain + rxGain - pl_simplified;

    const totalAttenuation = walls.reduce((sum, wall) => {
      const thicknessInMeters = wall.thickness / 100;
      const factor = frequency > 4 ? MATERIALS[wall.material].f5 : MATERIALS[wall.material].f2;
      return sum + (factor * thicknessInMeters);
    }, 0);

    const pl_motley = pl_simplified + totalAttenuation;
    // Adicionados Ganhos de Antena
    const prx_motley = txPower + txGain + rxGain - pl_motley;

    setResults({
      distance: distance.toFixed(2),
      totalWallAttenuation: totalAttenuation.toFixed(2),
      rxPowerSimplified: prx_simplified.toFixed(2),
      rxPowerMotleyKeenan: prx_motley.toFixed(2),
    });
  }, [txPower, txGain, rxGain, frequency, gamma, routerPos, receiverPos, walls]);

  // Cálculo do Mapa de Sinal (Canvas com Raytracing)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const c = 3e8;
    const f = frequency * 1e9;
    const wavelength = c / f;
    const pl_d0 = 20 * Math.log10((4 * Math.PI) / wavelength);

    let wallSegments = [];
    const dx = receiverPos.x - routerPos.x;
    const dy = receiverPos.y - routerPos.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len > 0) {
      const nx = -dy / len;
      const ny = dx / len;
      const wallHalfLen = 1.25; 
      
      walls.forEach((wall, index) => {
        const perc = (index + 1) / (walls.length + 1);
        const cx = routerPos.x + dx * perc;
        const cy = routerPos.y + dy * perc;
        
        const factor = frequency > 4 ? MATERIALS[wall.material].f5 : MATERIALS[wall.material].f2;
        const atten = factor * (wall.thickness / 100);
        
        wallSegments.push({
          x1: cx + nx * wallHalfLen, y1: cy + ny * wallHalfLen,
          x2: cx - nx * wallHalfLen, y2: cy - ny * wallHalfLen,
          attenuation: atten
        });
      });
    }

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const mx = (px / width) * 10;
        const my = (py / height) * 10;
        
        let d = Math.sqrt(Math.pow(mx - routerPos.x, 2) + Math.pow(my - routerPos.y, 2));
        d = d < 1 ? 1 : d;
        
        let pixelShadowAttenuation = 0;
        for (let i = 0; i < wallSegments.length; i++) {
          if (checkIntersection(routerPos.x, routerPos.y, mx, my, wallSegments[i].x1, wallSegments[i].y1, wallSegments[i].x2, wallSegments[i].y2)) {
            pixelShadowAttenuation += wallSegments[i].attenuation;
          }
        }

        const pl = pl_d0 + 10 * gamma * Math.log10(d) + pixelShadowAttenuation;
        const prx = txPower + txGain + rxGain - pl;

        let r, g, b, alpha = 60; 
        if (prx >= -60) { r = 16; g = 185; b = 129; } 
        else if (prx >= -75) { r = 59; g = 130; b = 246; } 
        else if (prx >= -85) { r = 245; g = 158; b = 11; } 
        else { r = 244; g = 63; b = 94; alpha = 80; } 

        const idx = (py * width + px) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = alpha;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [txPower, txGain, rxGain, frequency, gamma, routerPos, receiverPos, walls]);

  // Função para gerar Print/Download do Mapa em Alta Resolução
  const handleDownloadMap = () => {
    const size = 1000;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = size;
    exportCanvas.height = size;
    const ctx = exportCanvas.getContext("2d");

    // Fundo Branco
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, size, size);

    // Grelha
    ctx.strokeStyle = "rgba(203, 213, 225, 0.4)";
    ctx.lineWidth = 2;
    for(let i=0; i<size; i+=size/10) {
      ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(size,i); ctx.stroke();
    }

    // Desenhar o Heatmap por cima (esticando o canvas de 100x100)
    ctx.globalAlpha = 0.6;
    ctx.drawImage(canvasRef.current, 0, 0, size, size);
    ctx.globalAlpha = 1.0;

    // Desenhar Linha Tracejada
    ctx.beginPath();
    ctx.setLineDash([15, 15]);
    ctx.moveTo(routerPos.x * (size/10), routerPos.y * (size/10));
    ctx.lineTo(receiverPos.x * (size/10), receiverPos.y * (size/10));
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.setLineDash([]);

    // Desenhar Paredes
    const dx = receiverPos.x - routerPos.x;
    const dy = receiverPos.y - routerPos.y;
    walls.forEach((wall, index) => {
      const perc = (index + 1) / (walls.length + 1);
      const cx = (routerPos.x + dx * perc) * (size/10);
      const cy = (routerPos.y + dy * perc) * (size/10);
      const angle = Math.atan2(dy, dx);
      
      const wallLength = 2.5 * (size/10); 
      const wallThickness = Math.max(10, (wall.thickness / 5) * (size/100));

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = MATERIALS[wall.material].color;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 3;
      ctx.fillRect(-wallThickness/2, -wallLength/2, wallThickness, wallLength);
      ctx.strokeRect(-wallThickness/2, -wallLength/2, wallThickness, wallLength);
      ctx.restore();
    });

    // Desenhar Nó Tx
    const txX = routerPos.x * (size/10);
    const txY = routerPos.y * (size/10);
    ctx.beginPath(); ctx.arc(txX, txY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = "#4f46e5"; ctx.fill();
    ctx.strokeStyle = "white"; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = "white"; ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Tx", txX, txY);

    // Desenhar Nó Rx
    const rxX = receiverPos.x * (size/10);
    const rxY = receiverPos.y * (size/10);
    ctx.beginPath(); ctx.arc(rxX, rxY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = "#f43f5e"; ctx.fill(); ctx.stroke();
    ctx.fillStyle = "white"; ctx.fillText("Rx", rxX, rxY);

    // Descarregar
    const link = document.createElement("a");
    link.download = "simulacao-cobertura-wifi.png";
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

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
            <p className="text-blue-200/80 text-sm mt-1 font-medium">Arrasta os dispositivos no mapa e analisa o impacto no sinal.</p>
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-8">
          
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Parâmetros do Emissor e Antenas
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/60 shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-700">Potência (dBm)</label>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{txPower}</span>
                </div>
                <input type="range" min="0" max="30" step="1" value={txPower} onChange={e => setTxPower(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/60 shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-700">Frequência (GHz)</label>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{frequency}</span>
                </div>
                <input type="range" min="2.4" max="5.8" step="0.1" value={frequency} onChange={e => setFrequency(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/60 shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-700">Ganho Tx (dBi)</label>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{txGain}</span>
                </div>
                <input type="range" min="0" max="15" step="1" value={txGain} onChange={e => setTxGain(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/60 shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-700">Ganho Rx (dBi)</label>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{rxGain}</span>
                </div>
                <input type="range" min="0" max="15" step="1" value={rxGain} onChange={e => setRxGain(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
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
                <span>4.0 (Muitas Obstruções)</span>
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
                Parede
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
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
            {walls.length > 0 && (
              <div className="flex justify-end text-sm text-slate-500 mt-2 font-medium">
                Atenuação calculada: 
                <span className="text-rose-600 font-bold ml-1 tabular-nums w-12 inline-block text-right">{results.totalWallAttenuation}</span> dB
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-8">
          
          <div className="bg-slate-900 text-white p-7 rounded-3xl shadow-xl relative overflow-hidden ring-1 ring-slate-800">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            
            <h3 className="text-sm font-semibold text-slate-400 mb-6 tracking-wider uppercase flex justify-between items-center">
              Sinal no Recetor (Rx)
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${quality.dot}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${quality.dot}`}></span>
              </span>
            </h3>
            
            <div className="space-y-6 relative z-10">
              <div className="bg-slate-800/50 p-5 rounded-2xl backdrop-blur-sm border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-2 font-medium">Motley-Keenan (Modelo Real)</p>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-5xl font-bold tracking-tighter text-white tabular-nums w-[180px]">
                    {results.rxPowerMotleyKeenan}
                  </p>
                  <span className="text-lg text-slate-400 font-medium">dBm</span>
                </div>
                <div className={`inline-flex px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${quality.color}`}>
                  {quality.label}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30">
                  <p className="text-xs text-slate-400 mb-1 font-medium">Distância</p>
                  <p className="text-xl font-semibold text-slate-200 tabular-nums">
                    {results.distance} <span className="text-sm text-slate-500">m</span>
                  </p>
                </div>
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30">
                  <p className="text-xs text-slate-400 mb-1 font-medium">Path Loss Livre</p>
                  <p className="text-xl font-semibold text-slate-200 tabular-nums">
                    {results.rxPowerSimplified} <span className="text-sm text-slate-500">dBm</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex-grow flex flex-col relative group">
            
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                Planta (10x10m)
                </h4>

                {/* BOTÃO EXPORTAR (Print) */}
                <button 
                  onClick={handleDownloadMap}
                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Exportar Imagem para o Relatório"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  Exportar
                </button>
            </div>
            
            <div 
                ref={mapRef}
                className="relative w-full aspect-square bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden select-none cursor-crosshair touch-none" 
                style={{ 
                   backgroundImage: 'linear-gradient(to right, rgba(203, 213, 225, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(203, 213, 225, 0.4) 1px, transparent 1px)', 
                   backgroundSize: '10% 10%' 
                }}
            >
              
              <canvas 
                ref={canvasRef} 
                width={100} 
                height={100} 
                className="absolute inset-0 w-full h-full pointer-events-none opacity-60 mix-blend-multiply"
              />

              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <line 
                  x1={routerPos.x * 10} y1={routerPos.y * 10} 
                  x2={receiverPos.x * 10} y2={receiverPos.y * 10} 
                  stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2,2" 
                />
                {walls.map((wall, index) => {
                  const txX = routerPos.x * 10;
                  const txY = routerPos.y * 10;
                  const rxX = receiverPos.x * 10;
                  const rxY = receiverPos.y * 10;

                  const f = (index + 1) / (walls.length + 1);
                  const cx = txX + (rxX - txX) * f;
                  const cy = txY + (rxY - txY) * f;
                  const angle = Math.atan2(rxY - txY, rxX - txX) * (180 / Math.PI);

                  const wallLength = 25; 
                  const wallThickness = Math.max(1, wall.thickness / 5); 

                  return (
                    <g key={wall.id} transform={`translate(${cx} ${cy})`} className="drop-shadow-md">
                      <rect
                        x={-wallThickness / 2}
                        y={-wallLength / 2}
                        width={wallThickness}
                        height={wallLength}
                        fill={MATERIALS[wall.material].color}
                        stroke="#0f172a"
                        strokeWidth="0.5"
                        opacity="0.95"
                        transform={`rotate(${angle})`}
                        rx="1"
                      />
                    </g>
                  );
                })}
              </svg>

              <div 
                className={`absolute w-8 h-8 md:w-7 md:h-7 bg-indigo-600 rounded-full shadow-lg border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-transform ease-out z-10 flex items-center justify-center cursor-grab ${isDragging === 'tx' ? 'scale-125 cursor-grabbing ring-4 ring-indigo-200' : 'hover:scale-110'}`}
                style={{ left: `${Math.min(100, (routerPos.x / 10) * 100)}%`, top: `${Math.min(100, (routerPos.y / 10) * 100)}%` }}
                onMouseDown={(e) => { e.preventDefault(); setIsDragging("tx"); }}
                onTouchStart={() => setIsDragging("tx")}
              >
                <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-50 pointer-events-none"></div>
                <span className="text-[10px] font-bold text-white relative z-20 pointer-events-none">Tx</span>
              </div>

              <div 
                className={`absolute w-8 h-8 md:w-7 md:h-7 bg-rose-500 rounded-full shadow-lg border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-transform ease-out z-10 flex items-center justify-center cursor-grab ${isDragging === 'rx' ? 'scale-125 cursor-grabbing ring-4 ring-rose-200' : 'hover:scale-110'}`}
                style={{ left: `${Math.min(100, (receiverPos.x / 10) * 100)}%`, top: `${Math.min(100, (receiverPos.y / 10) * 100)}%` }}
                onMouseDown={(e) => { e.preventDefault(); setIsDragging("rx"); }}
                onTouchStart={() => setIsDragging("rx")}
              >
                <span className="text-[10px] font-bold text-white pointer-events-none">Rx</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50 p-6 sm:px-8 mt-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
            </svg>
            <span className="font-semibold text-slate-600">Redes de Comunicações Móveis</span>
          </div>
          
          <div className="flex items-center gap-4 text-center sm:text-right font-medium">
            <span>Desenvolvido por <span className="text-slate-700 font-bold">Vasco Magolo & Diogo Nogueira</span></span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
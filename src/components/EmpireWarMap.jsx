import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { RPG_CONFIG } from '../utils/rpg';

export default function EmpireWarMap() {
    // Initial state with 0 scores
    const [territories, setTerritories] = useState({
        logreia: { score: 0, percent: 33, label: '로그라이아', color: '#fbbf24' },   // Amber
        visiontium: { score: 0, percent: 33, label: '비전티움', color: '#c084fc' }, // Purple
        factoria: { score: 0, percent: 34, label: '팩토리아', color: '#22d3ee' },   // Cyan
    });

    const [winningEmpire, setWinningEmpire] = useState('logreia');

    useEffect(() => {
        // Real-time listener for ALL users to aggregate empire scores
        // Note: For large scale apps, use a dedicated 'stats' document updated via Cloud Functions
        const q = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newScores = {
                logreia: 0,
                visiontium: 0,
                factoria: 0
            };

            let totalServerXp = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.empireId && newScores[data.empireId] !== undefined) {
                    const xp = data.totalXp || 0;
                    newScores[data.empireId] += xp;
                    totalServerXp += xp;
                }
            });

            // Calculate percentages
            // If total is 0, give equal share for map visualization
            const safeTotal = totalServerXp || 1;

            setTerritories(prev => ({
                logreia: { ...prev.logreia, score: newScores.logreia, percent: totalServerXp ? Math.round((newScores.logreia / safeTotal) * 100) : 33 },
                visiontium: { ...prev.visiontium, score: newScores.visiontium, percent: totalServerXp ? Math.round((newScores.visiontium / safeTotal) * 100) : 33 },
                factoria: { ...prev.factoria, score: newScores.factoria, percent: totalServerXp ? Math.round((newScores.factoria / safeTotal) * 100) : 34 },
            }));
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Determine winner
        const winner = Object.keys(territories).reduce((a, b) =>
            territories[a].score > territories[b].score ? a : b
        );
        setWinningEmpire(winner);
    }, [territories]);

    return (
        <div className="bg-[#1a331d] rounded-[32px] p-1 border border-[#32673b] shadow-2xl relative overflow-hidden group">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>

            <div className="bg-[#0f1a12]/80 backdrop-blur-sm rounded-[28px] p-6 md:p-8 relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="font-bold text-gray-400 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] mb-1">
                            <span className="material-symbols-outlined text-xl text-red-500 animate-pulse">public</span>
                            제국 영토 전쟁 현황
                        </h3>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">전선 대치 중</h2>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">현재 우세</span>
                        <span className="text-xl font-black uppercase tracking-widest" style={{ color: territories[winningEmpire].color }}>
                            {territories[winningEmpire].label}
                        </span>
                    </div>
                </div>

                {/* Tactical Map Visual (SVG) */}
                <div className="relative w-full aspect-[16/9] mb-8 bg-[#0a150c] rounded-2xl border border-white/5 overflow-hidden shadow-inner flex items-center justify-center">
                    {/* 
                        Abstract Map Representation with SVG 
                        Divided into 3 Zones loosely based on Voronoi or just Polygons
                     */}
                    <svg viewBox="0 0 400 225" className="w-full h-full drop-shadow-2xl">
                        {/* Logreia Territory (Left) */}
                        <path
                            d="M0,0 L180,0 L220,100 L150,225 L0,225 Z"
                            fill={territories.logreia.color}
                            fillOpacity="0.2"
                            stroke={territories.logreia.color}
                            strokeWidth="2"
                            className="transition-all duration-1000 hover:fill-opacity-40 cursor-pointer"
                        />
                        {/* Visiontium Territory (Top Right) */}
                        <path
                            d="M180,0 L400,0 L400,140 L220,100 Z"
                            fill={territories.visiontium.color}
                            fillOpacity="0.2"
                            stroke={territories.visiontium.color}
                            strokeWidth="2"
                            className="transition-all duration-1000 hover:fill-opacity-40 cursor-pointer"
                        />
                        {/* Factoria Territory (Bottom Right) */}
                        <path
                            d="M150,225 L220,100 L400,140 L400,225 Z"
                            fill={territories.factoria.color}
                            fillOpacity="0.2"
                            stroke={territories.factoria.color}
                            strokeWidth="2"
                            className="transition-all duration-1000 hover:fill-opacity-40 cursor-pointer"
                        />

                        {/* Zone Markers - Centered roughly in each poly */}
                        {/* Logreia Marker */}
                        <g transform="translate(80, 110)">
                            <circle r="20" fill="#0f1a12" stroke={territories.logreia.color} strokeWidth="2" className="animate-pulse" />
                            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">L</text>
                            <text x="0" y="32" textAnchor="middle" fill={territories.logreia.color} fontSize="10" fontWeight="bold">{territories.logreia.percent}%</text>
                        </g>

                        {/* Visiontium Marker */}
                        <g transform="translate(300, 60)">
                            <circle r="20" fill="#0f1a12" stroke={territories.visiontium.color} strokeWidth="2" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
                            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">V</text>
                            <text x="0" y="32" textAnchor="middle" fill={territories.visiontium.color} fontSize="10" fontWeight="bold">{territories.visiontium.percent}%</text>
                        </g>

                        {/* Factoria Marker */}
                        <g transform="translate(280, 180)">
                            <circle r="20" fill="#0f1a12" stroke={territories.factoria.color} strokeWidth="2" className="animate-pulse" style={{ animationDelay: '1s' }} />
                            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">F</text>
                            <text x="0" y="32" textAnchor="middle" fill={territories.factoria.color} fontSize="10" fontWeight="bold">{territories.factoria.percent}%</text>
                        </g>
                    </svg>

                    {/* Battle Lines / Overlay Effects */}
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,#0a150c_120%)]"></div>
                    <div className="absolute bottom-4 right-4 text-[10px] text-gray-600 font-mono">
                        BATTLEFIELD_SEC_01 // ACTIVE
                    </div>
                </div>

                {/* Stats Ledger */}
                <div className="grid grid-cols-3 gap-3">
                    {Object.entries(territories).map(([key, data]) => (
                        <div key={key} className="bg-black/20 rounded-xl p-3 border border-white/5 text-center transition-all hover:bg-black/40">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: data.color }}>{data.label}</p>
                            <div className="flex flex-col items-center">
                                <p className="text-lg font-black text-white leading-none">
                                    {data.score.toLocaleString()}
                                    <span className="text-[10px] text-gray-500 font-medium ml-1">XP</span>
                                </p>
                                {data.score > 0 && <span className="text-[9px] text-[#2bee4b] mt-1">+실시간 기여 중</span>}
                            </div>
                            <div className="w-full bg-gray-800 h-1 rounded-full mt-2 overflow-hidden">
                                <div className="h-full" style={{ width: `${data.percent}%`, backgroundColor: data.color }}></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Call to Action */}
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={() => alert("⚔️ 전선으로 이동합니다! ⚔️\n\n이 페이지는 현재 우리 반과 제국들의 독서 기록을 한눈에 보는 '독서 현황판'입니다.\n\n지금 바로 '독서 타이머'를 실행하여 책을 읽으시면,\n여러분의 독서 시간이 실시간으로 제국의 영토 확장에 기여하게 됩니다!")}
                        className="px-6 py-3 bg-red-600/10 border border-red-500/50 text-red-400 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all shadow-lg hover:shadow-red-900/50 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        대치 현황 상세보기
                    </button>
                </div>
            </div>
        </div>
    );
}

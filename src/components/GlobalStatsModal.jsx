import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { RPG_CONFIG } from '../utils/rpg';

export default function GlobalStatsModal({ isOpen, onClose }) {
    const [personalTotal, setPersonalTotal] = useState(0);
    const [empireStats, setEmpireStats] = useState({
        logreia: 0,
        visiontium: 0,
        factoria: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !auth.currentUser) return;

        let unsubscribePersonal = () => { };

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Calculate Personal Total Time using onSnapshot
                const sessionsRef = collection(db, 'users', auth.currentUser.uid, 'sessions');
                unsubscribePersonal = onSnapshot(sessionsRef, (snapshot) => {
                    let pTotal = 0;
                    snapshot.forEach(doc => {
                        pTotal += (doc.data().elapsedTime || 0); // elapsedTime is in seconds
                    });
                    setPersonalTotal(pTotal);
                });

                // 2. Real Empire Stats based on totalXp of users
                const usersRef = collection(db, 'users');
                const userDocs = await getDocs(usersRef);
                let empireTotals = { logreia: 0, visiontium: 0, factoria: 0 };

                userDocs.forEach(d => {
                    const data = d.data();
                    if (data.empireId && empireTotals[data.empireId] !== undefined) {
                        // totalXp is (minutes * 10). So (totalXp / 10) = minutes.
                        // (totalXp / 10) * 60 = seconds = totalXp * 6
                        empireTotals[data.empireId] += (data.totalXp || 0) * 6;
                    }
                });

                setEmpireStats({
                    logreia: empireTotals.logreia,
                    visiontium: empireTotals.visiontium,
                    factoria: empireTotals.factoria
                });

            } catch (err) {
                console.error("Stats fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        return () => {
            unsubscribePersonal();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}시간 ${m}분`;
    };

    return (
        <div className="fixed inset-0 bg-[#0a150c]/95 z-[300] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-[#1a331d] border border-[#32673b] rounded-[32px] p-8 relative shadow-[0_0_50px_rgba(43,238,75,0.2)]">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                <div className="text-center mb-10">
                    <span className="material-symbols-outlined text-5xl text-[#2bee4b] mb-4 drop-shadow-[0_0_15px_rgba(43,238,75,0.5)]">timelapse</span>
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest">시간의 기록</h2>
                    <p className="text-[#92c99b] text-xs font-medium mt-2">"흐르는 시간 속에 지혜가 쌓입니다."</p>
                </div>

                <div className="space-y-6">
                    {/* Personal Stats */}
                    <div className="bg-black/30 rounded-2xl p-6 border border-white/10 text-center">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">나의 누적 독서 시간</p>
                        {loading ? (
                            <div className="h-8 w-24 bg-white/10 rounded animate-pulse mx-auto"></div>
                        ) : (
                            <p className="text-4xl font-black text-white">{formatTime(personalTotal)}</p>
                        )}
                    </div>

                    {/* Empire Stats */}
                    <div className="space-y-3">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center mb-2">제국별 누적 시간</p>
                        {Object.entries(RPG_CONFIG.EMPIRES).map(([key, empire]) => (
                            <div key={key} className="flex items-center justify-between bg-[#0f1a12] p-4 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="size-2 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: empire.color }}></div>
                                    <span className="font-bold text-gray-300 text-sm">{empire.label}</span>
                                </div>
                                <span className="font-mono font-bold text-[#2bee4b]">
                                    {Math.floor(empireStats[key] / 3600).toLocaleString()}시간
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { RPG_CONFIG } from '../utils/rpg';

/**
 * 제국 대결 이벤트 컴포넌트
 * 이번 주 제국별 총 독서 시간(분) 집계 및 순위 표시
 */
export default function EmpireBattle() {
    const [empireStats, setEmpireStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalMinutes, setTotalMinutes] = useState(0);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchWeeklyStats = async () => {
        setLoading(true);
        try {
            // 이번 주 월요일 00:00 계산
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0=일, 1=월, ...
            const monday = new Date(now);
            monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            monday.setHours(0, 0, 0, 0);
            const mondayTs = Timestamp.fromDate(monday);

            // 이번 주 피드 가져오기
            const feedRef = collection(db, 'public_feed');
            const q = query(feedRef, where('timestamp', '>=', mondayTs), where('isChat', '==', false));
            const snap = await getDocs(q);

            // 유저별 제국 정보 캐시
            const userEmpireCache = {};
            const usersRef = collection(db, 'users');
            const usersSnap = await getDocs(usersRef);
            usersSnap.forEach(d => { userEmpireCache[d.id] = d.data().empireId; });

            // 제국별 집계
            const stats = {};
            Object.keys(RPG_CONFIG.EMPIRES).forEach(id => {
                stats[id] = { sessions: 0, minutes: 0, members: new Set() };
            });

            snap.forEach(d => {
                const data = d.data();
                const empireId = userEmpireCache[data.uid];
                if (empireId && stats[empireId]) {
                    stats[empireId].sessions += 1;
                    stats[empireId].minutes += Math.floor((data.elapsedTime || 0) / 60);
                    stats[empireId].members.add(data.uid);
                }
            });

            const total = Object.values(stats).reduce((s, e) => s + e.minutes, 0);
            setTotalMinutes(total);

            const sorted = Object.entries(stats)
                .map(([id, s]) => ({
                    id,
                    ...RPG_CONFIG.EMPIRES[id],
                    sessions: s.sessions,
                    minutes: s.minutes,
                    members: s.members.size,
                    pct: total > 0 ? Math.round((s.minutes / total) * 100) : 0,
                }))
                .sort((a, b) => b.minutes - a.minutes);

            setEmpireStats(sorted);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('EmpireBattle fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeeklyStats();
        // 5분마다 새로고침
        const id = setInterval(fetchWeeklyStats, 300000);
        return () => clearInterval(id);
    }, []);

    const MEDALS = ['🥇', '🥈', '🥉'];
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;

    return (
        <div className="rounded-3xl bg-white dark:bg-[#1a331d] border border-stone-100 dark:border-[#32673b] overflow-hidden shadow-sm mb-6">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-[#102213] to-[#1a331d] px-5 py-4 flex justify-between items-center">
                <div>
                    <p className="text-[10px] text-[#2bee4b] font-black uppercase tracking-[0.4em] mb-0.5">⚔️ Empire Battle</p>
                    <h3 className="text-white font-black text-lg">이번 주 제국 대결</h3>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">총 독서</p>
                    <p className="text-white font-black">{totalHours}시간 {totalMins}분</p>
                </div>
            </div>

            {loading ? (
                <div className="p-8 flex justify-center">
                    <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="size-2 bg-[#2bee4b] rounded-full animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="p-4 space-y-3">
                    {empireStats.map((empire, idx) => (
                        <div key={empire.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{MEDALS[idx] || '🏳️'}</span>
                                    <span className="font-black" style={{ color: empire.color }}>{empire.label}</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-600">
                                        {empire.members}명 · {empire.sessions}회
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                                        {Math.floor(empire.minutes / 60)}h {empire.minutes % 60}m
                                    </span>
                                    <span className="text-[10px] text-gray-400 ml-1">({empire.pct}%)</span>
                                </div>
                            </div>
                            {/* 진행 바 */}
                            <div className="h-2.5 bg-stone-100 dark:bg-black/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000"
                                    style={{
                                        width: `${empire.pct}%`,
                                        background: empire.color,
                                        boxShadow: `0 0 8px ${empire.color}80`,
                                    }}
                                />
                            </div>
                        </div>
                    ))}

                    <p className="text-[10px] text-gray-500 dark:text-gray-600 text-right pt-2 border-t border-stone-100 dark:border-white/5">
                        {lastUpdated ? `${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준` : '집계 중...'}
                        <button onClick={fetchWeeklyStats} className="ml-2 underline hover:text-[#2bee4b] transition-colors">새로고침</button>
                    </p>
                </div>
            )}
        </div>
    );
}

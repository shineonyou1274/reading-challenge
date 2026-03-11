import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { RPG_CONFIG, getLevelFromXP, getTitleForLevel } from '../utils/rpg';

export default function RankingBoard({ type, empireFilter }) {
    const [topUsers, setTopUsers] = useState([]);
    const [topEmpires, setTopEmpires] = useState([]);
    const [empireMembers, setEmpireMembers] = useState([]); // 내 제국 멤버
    const [loading, setLoading] = useState(true);
    const currentUid = auth.currentUser?.uid;

    useEffect(() => {
        const fetchRankings = async () => {
            setLoading(true);
            try {
                const usersRef = collection(db, 'users');
                const allUserSnap = await getDocs(usersRef);

                const allUsers = [];
                let empireTotals = { logreia: 0, visiontium: 0, factoria: 0 };

                allUserSnap.forEach(doc => {
                    const data = doc.data();
                    const { level } = getLevelFromXP(data.totalXp || 0);
                    allUsers.push({ id: doc.id, ...data, computedLevel: level });
                    if (data.empireId && empireTotals[data.empireId] !== undefined) {
                        empireTotals[data.empireId] += (data.totalXp || 0);
                    }
                });

                // 전체 순위 Top 10
                const sorted = [...allUsers].sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));
                setTopUsers(sorted.slice(0, 10));

                // 제국별 멤버 (내 제국 필터)
                if (empireFilter) {
                    const members = sorted.filter(u => u.empireId === empireFilter);
                    setEmpireMembers(members.slice(0, 10));
                }

                // 제국 순위
                const empireArray = Object.entries(RPG_CONFIG.EMPIRES).map(([id, emp]) => ({
                    id,
                    ...emp,
                    totalXp: empireTotals[id]
                })).sort((a, b) => b.totalXp - a.totalXp);

                setTopEmpires(empireArray);
            } catch (error) {
                console.error("Error fetching rankings", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();
    }, [type, empireFilter]);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <span className="material-symbols-outlined text-[#2bee4b] animate-spin text-4xl">progress_activity</span>
            </div>
        );
    }

    const UserRow = ({ user, idx, showEmpireBadge = false }) => {
        const isMe = user.id === currentUid;
        return (
            <div className={`flex items-center gap-4 p-4 rounded-2xl border relative group transition-colors
                ${isMe
                    ? 'bg-[#2bee4b]/10 border-[#2bee4b]/40 dark:border-[#2bee4b]/40'
                    : 'bg-stone-50 dark:bg-black/40 border-stone-100 dark:border-white/5 hover:bg-[#2bee4b]/5'
                }`}>
                <div className="w-8 text-center text-xl font-black" style={{
                    color: idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : idx === 2 ? '#b45309' : '#6b7280'
                }}>
                    {idx === 0 ? '👑' : idx + 1}
                </div>
                <div className="size-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0 border border-stone-200 dark:border-white/10 overflow-hidden">
                    <span className="material-symbols-outlined text-slate-400 dark:text-gray-400">person</span>
                </div>
                <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold truncate text-sm flex items-center gap-2 text-slate-800 dark:text-white">
                        {user.displayName || '이름 없음'}
                        {isMe && <span className="text-[9px] bg-[#2bee4b] text-[#102213] px-1.5 py-0.5 rounded-full font-black uppercase">나</span>}
                    </h4>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-400 dark:text-gray-400 uppercase font-bold truncate">
                            {getTitleForLevel(user.computedLevel || 1)}
                        </p>
                        {showEmpireBadge && user.empireId && (
                            <span
                                className="text-[8px] font-black px-1 py-0.5 rounded border uppercase"
                                style={{
                                    color: RPG_CONFIG.EMPIRES[user.empireId]?.color,
                                    borderColor: RPG_CONFIG.EMPIRES[user.empireId]?.color + '50',
                                    backgroundColor: RPG_CONFIG.EMPIRES[user.empireId]?.color + '15',
                                }}
                            >
                                {RPG_CONFIG.EMPIRES[user.empireId]?.label}
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[#057a1b] dark:text-[#2bee4b] font-bold font-mono text-sm">{user.computedLevel || 1} LV</p>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">{(user.totalXp || 0).toLocaleString()} XP</p>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 제국 전쟁 탭: 제국 순위 + 내 제국 멤버 */}
            {type === 'empire' && (
                <>
                    {/* 제국별 XP 순위 */}
                    <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-[32px] p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-5">
                            <span className="material-symbols-outlined text-8xl text-slate-200 dark:text-white">military_tech</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#057a1b] dark:text-[#2bee4b]">account_balance</span>
                            제국별 총 XP 순위
                        </h3>
                        <div className="space-y-3 relative z-10">
                            {topEmpires.map((emp, idx) => (
                                <div key={emp.id} className={`flex items-center gap-4 p-4 rounded-2xl border relative overflow-hidden transition-all
                                    ${empireFilter === emp.id ? 'border-2' : 'border-stone-100 dark:border-white/5 bg-stone-50 dark:bg-black/40'}`}
                                    style={empireFilter === emp.id ? {
                                        borderColor: emp.color + '80',
                                        backgroundColor: emp.color + '12',
                                    } : {}}>
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl" style={{ backgroundColor: emp.color }}></div>
                                    <div className="w-8 text-center text-xl font-black pl-2" style={{ color: idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : '#b45309' }}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            {emp.label}
                                            {empireFilter === emp.id && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase"
                                                    style={{ backgroundColor: emp.color + '30', color: emp.color }}>
                                                    내 제국
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-bold tracking-widest">{emp.desc}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold font-mono" style={{ color: emp.color }}>{(emp.totalXp * 6 / 3600).toFixed(1)} <span className="text-xs">시간</span></p>
                                        <p className="text-[10px] text-slate-400 dark:text-gray-500">{emp.totalXp.toLocaleString()} XP</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 내 제국 학자 순위 */}
                    {empireFilter && (
                        <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-[32px] p-6 shadow-xl relative overflow-hidden">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-orange-500">crown</span>
                                {RPG_CONFIG.EMPIRES[empireFilter]?.label} 학자 순위
                            </h3>
                            <div className="space-y-3 relative z-10">
                                {empireMembers.length > 0 ? empireMembers.map((user, idx) => (
                                    <UserRow key={user.id} user={user} idx={idx} showEmpireBadge={false} />
                                )) : (
                                    <div className="text-center py-6 text-slate-400 dark:text-gray-500 text-xs">
                                        아직 이 제국에 학자가 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* 명예의 전당: 전체 통합 순위 */}
            {type === 'global' && (
                <>
                    {/* 제국 순위 요약 */}
                    <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-[32px] p-6 shadow-xl relative overflow-hidden">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#057a1b] dark:text-[#2bee4b]">account_balance</span>
                            제국 전력 현황
                        </h3>
                        <div className="space-y-2 relative z-10">
                            {topEmpires.map((emp, idx) => {
                                const maxXp = topEmpires[0]?.totalXp || 1;
                                const pct = Math.round((emp.totalXp / maxXp) * 100);
                                return (
                                    <div key={emp.id} className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span style={{ color: emp.color }}>{emp.label}</span>
                                            <span className="text-slate-400 dark:text-gray-500">{(emp.totalXp * 6 / 3600).toFixed(1)}h</span>
                                        </div>
                                        <div className="h-2 bg-stone-100 dark:bg-black/40 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${pct}%`, backgroundColor: emp.color }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 전체 학자 Top 10 */}
                    <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-[32px] p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-5">
                            <span className="material-symbols-outlined text-8xl text-slate-200 dark:text-white">local_fire_department</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">crown</span>
                            전체 학자 TOP 10
                        </h3>
                        <div className="space-y-3 relative z-10">
                            {topUsers.length > 0 ? topUsers.map((user, idx) => (
                                <UserRow key={user.id} user={user} idx={idx} showEmpireBadge={true} />
                            )) : (
                                <div className="text-center py-6 text-slate-400 dark:text-gray-500 text-xs">데이터가 없습니다.</div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * BookRoulette → 출석 보상 시스템 (Daily Attendance Reward)
 *
 * 변경 사유:
 * 기존 룰렛은 "완료" 버튼만 누르면 보상이 지급되어 실제 독서 없이도 XP 획득 가능.
 * → 앱을 하루 한 번 열기만 해도 받을 수 있는 "출석 보상"으로 재설계.
 * → 룰렛 스핀은 보상 연출(재미)용. 보상 금액은 연속 출석 일수로 미리 결정됨.
 * → 연속 출석 7일마다 특별 보상 + 새 사이클 시작.
 */
import React, { useState, useEffect } from 'react';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { soundManager } from '../utils/soundManager';

// ─── 출석 보상 테이블 (연속 일수 기준) ──────────────────────────
const ATTENDANCE_REWARDS = [
    { day: 1, xp: 50,  gold: 10, icon: '🌱', label: '1일차',  color: '#22c55e' },
    { day: 2, xp: 80,  gold: 15, icon: '⭐', label: '2일차',  color: '#eab308' },
    { day: 3, xp: 120, gold: 20, icon: '🔥', label: '3일차',  color: '#f97316' },
    { day: 4, xp: 150, gold: 25, icon: '💫', label: '4일차',  color: '#a855f7' },
    { day: 5, xp: 200, gold: 30, icon: '💎', label: '5일차',  color: '#06b6d4' },
    { day: 6, xp: 280, gold: 45, icon: '🌟', label: '6일차',  color: '#c084fc' },
    { day: 7, xp: 500, gold: 100, icon: '👑', label: '7일 완주!', color: '#fbbf24', isSpecial: true },
];

const STREAK_MILESTONES = [
    { day: 14, xpBonus: 300, goldBonus: 50, label: '2주 연속!', icon: '🏅' },
    { day: 21, xpBonus: 600, goldBonus: 100, label: '3주 연속!', icon: '🏆' },
    { day: 30, xpBonus: 1000, goldBonus: 200, label: '한 달 연속!', icon: '👑' },
];

function getRewardForStreak(streak) {
    const idx = ((streak - 1) % 7);
    const baseReward = ATTENDANCE_REWARDS[idx];
    const milestone = STREAK_MILESTONES.find(m => m.day === streak);
    if (milestone) {
        return {
            ...baseReward,
            xp: baseReward.xp + milestone.xpBonus,
            gold: baseReward.gold + milestone.goldBonus,
            label: milestone.label,
            icon: milestone.icon,
            color: '#fbbf24',
            isMilestone: true,
        };
    }
    return baseReward;
}

function getTodayDateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getLocalAttendance() {
    try { return JSON.parse(localStorage.getItem('rrq_attendance') || '{}'); } catch { return {}; }
}
function setLocalAttendance(data) {
    localStorage.setItem('rrq_attendance', JSON.stringify(data));
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
export default function BookRoulette() {
    const todayKey = getTodayDateKey();
    const local = getLocalAttendance();
    const alreadyClaimed = local.lastDate === todayKey;

    const [phase, setPhase] = useState(alreadyClaimed ? 'claimed' : 'idle');
    const [spinning, setSpinning] = useState(false);
    const [spinIdx, setSpinIdx] = useState(0);
    const [attendanceStreak, setAttendanceStreak] = useState(local.streak || 1);
    const [loading, setLoading] = useState(false);

    // Firestore에서 실제 streak 동기화
    useEffect(() => {
        if (!auth.currentUser || alreadyClaimed) return;
        getDoc(doc(db, 'users', auth.currentUser.uid)).then(snap => {
            if (snap.exists()) {
                const data = snap.data();
                setAttendanceStreak(data.attendanceStreak || 1);
            }
        });
    }, []);

    const todayReward = getRewardForStreak(attendanceStreak);
    const nextReward = getRewardForStreak(attendanceStreak + 1);

    const handleSpin = async () => {
        if (spinning || phase !== 'idle' || !auth.currentUser) return;
        setSpinning(true);
        soundManager.resume();
        soundManager.playDice?.();

        // 슬롯 연출 (결과는 이미 결정됨)
        let count = 0;
        const totalFrames = 22 + Math.floor(Math.random() * 8);
        const anim = setInterval(() => {
            setSpinIdx(p => (p + 1) % ATTENDANCE_REWARDS.length);
            count++;
            if (count >= totalFrames) {
                clearInterval(anim);
                // 최종 결과를 오늘 보상으로 고정
                const targetIdx = ATTENDANCE_REWARDS.findIndex(r => r.day === todayReward.day);
                setSpinIdx(targetIdx >= 0 ? targetIdx : 0);
                setSpinning(false);
                setPhase('result');
            }
        }, 55 + count * 3);
    };

    const handleClaim = async () => {
        if (!auth.currentUser || loading) return;
        setLoading(true);
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const snap = await getDoc(userRef);
            const data = snap.data() || {};

            // 서버 측 중복 방지: lastAttendanceDate 확인
            if (data.lastAttendanceDate === todayKey) {
                setPhase('claimed');
                setLocalAttendance({ lastDate: todayKey, streak: attendanceStreak });
                return;
            }

            // 연속 출석 계산
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
            const isConsecutive = data.lastAttendanceDate === yKey;
            const newStreak = isConsecutive ? (data.attendanceStreak || 0) + 1 : 1;
            const reward = getRewardForStreak(newStreak);

            await updateDoc(userRef, {
                totalXp: increment(reward.xp),
                gold: increment(reward.gold),
                attendanceStreak: newStreak,
                lastAttendanceDate: todayKey,
            });

            soundManager.playCoin?.() || soundManager.playSuccess?.();
            setAttendanceStreak(newStreak);
            setLocalAttendance({ lastDate: todayKey, streak: newStreak });
            setPhase('claimed');
        } catch (err) {
            console.error('출석 보상 실패:', err);
        } finally {
            setLoading(false);
        }
    };

    const displayReward = spinning ? ATTENDANCE_REWARDS[spinIdx] : todayReward;
    const cycleDay = ((attendanceStreak - 1) % 7) + 1;

    return (
        <div className="rounded-3xl bg-white dark:bg-[#1a331d] border border-stone-100 dark:border-[#32673b] overflow-hidden shadow-sm mb-5">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-amber-900/40 to-[#1a331d] px-5 py-3.5 flex items-center gap-3">
                <span className="text-2xl">🗓️</span>
                <div>
                    <p className="text-[9px] text-amber-300 font-black uppercase tracking-[0.4em]">Daily Attendance</p>
                    <h3 className="text-white font-black">출석 보상</h3>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-orange-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                    <span className="text-orange-400 font-black text-sm">{attendanceStreak}일 연속</span>
                </div>
            </div>

            <div className="p-5 space-y-4">
                {/* 7일 사이클 진행 바 */}
                <div className="flex gap-1.5">
                    {ATTENDANCE_REWARDS.map((r, i) => {
                        const dayNum = i + 1;
                        const isPast = dayNum < cycleDay;
                        const isToday = dayNum === cycleDay;
                        const isFuture = dayNum > cycleDay;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div className={`w-full h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                                    isToday
                                        ? 'bg-amber-400 shadow-lg shadow-amber-400/40 scale-110'
                                        : isPast
                                        ? 'bg-[#2bee4b]/30 border border-[#2bee4b]/40'
                                        : 'bg-stone-100 dark:bg-black/20'
                                }`}>
                                    {isPast ? '✅' : isToday ? r.icon : r.icon}
                                </div>
                                <span className={`text-[8px] font-bold ${
                                    isToday ? 'text-amber-400' : isPast ? 'text-[#2bee4b]' : 'text-gray-500'
                                }`}>
                                    {r.day}일
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* 보상 디스플레이 */}
                <div
                    className="relative rounded-2xl border-2 p-4 text-center overflow-hidden transition-all duration-300"
                    style={{
                        borderColor: displayReward.color + '60',
                        background: displayReward.color + '10',
                    }}
                >
                    {spinning && (
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse" />
                    )}
                    <div className={`text-5xl mb-2 transition-all duration-75 ${spinning ? 'scale-75 opacity-50' : 'scale-100'}`}>
                        {displayReward.icon}
                    </div>
                    <p className="font-black text-sm mb-1" style={{ color: displayReward.color }}>
                        {phase === 'idle' ? '오늘의 출석 보상' : displayReward.label}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-[#2bee4b] font-black">+{displayReward.xp} XP</span>
                        <span className="text-amber-400 font-black">+{displayReward.gold} 골드</span>
                    </div>
                    {displayReward.isSpecial && (
                        <div className="mt-2 inline-block bg-amber-400/20 border border-amber-400/40 text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            🎉 7일 완주 특별 보상!
                        </div>
                    )}
                </div>

                {/* 내일 미리보기 */}
                {phase !== 'idle' && (
                    <div className="flex items-center gap-2 bg-black/10 dark:bg-black/20 rounded-xl px-3 py-2">
                        <span className="text-lg">{nextReward.icon}</span>
                        <div>
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider">내일 보상 미리보기</p>
                            <p className="text-xs font-bold text-white">+{nextReward.xp} XP · +{nextReward.gold} 골드</p>
                        </div>
                        <span className="ml-auto text-[10px] text-gray-500">→ 내일</span>
                    </div>
                )}

                {/* 버튼 */}
                {phase === 'idle' && (
                    <button
                        onClick={handleSpin}
                        disabled={spinning || !auth.currentUser}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95
                        bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30
                        hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {spinning ? 'progress_activity' : 'celebration'}
                        </span>
                        {spinning ? '오늘의 보상 확인 중...' : '오늘 출석 체크!'}
                    </button>
                )}

                {phase === 'result' && (
                    <button
                        onClick={handleClaim}
                        disabled={loading}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95
                        bg-[#2bee4b] text-[#102213] shadow-lg shadow-[#2bee4b]/30 disabled:opacity-50
                        flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>redeem</span>
                        {loading ? '지급 중...' : '보상 받기! 🎁'}
                    </button>
                )}

                {phase === 'claimed' && (
                    <div className="text-center py-2 space-y-1">
                        <p className="text-[#2bee4b] font-black text-sm">✅ 오늘 출석 완료!</p>
                        <p className="text-gray-500 text-xs">내일도 접속하면 더 큰 보상이 기다립니다 🔥</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── 컴팩트 버전 (QuestBoard 그리드용) ──────────────────────────
export function AttendanceCompact({ stats }) {
    const todayKey = getTodayDateKey();
    const local = getLocalAttendance();
    const alreadyClaimed = local.lastDate === todayKey;

    const [phase, setPhase] = useState(alreadyClaimed ? 'claimed' : 'idle');
    const [spinning, setSpinning] = useState(false);
    const [loading, setLoading] = useState(false);
    const streak = stats?.attendanceStreak || local.streak || 1;
    const cycleDay = ((streak - 1) % 7) + 1;
    const todayReward = getRewardForStreak(streak);

    const handleAttendance = async () => {
        if (!auth.currentUser || loading || spinning) return;
        setSpinning(true);
        soundManager.resume();

        setTimeout(async () => {
            setLoading(true);
            try {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                const snap = await getDoc(userRef);
                const data = snap.data() || {};
                if (data.lastAttendanceDate === todayKey) {
                    setPhase('claimed');
                    setLocalAttendance({ lastDate: todayKey, streak });
                    return;
                }
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
                const isConsecutive = data.lastAttendanceDate === yKey;
                const newStreak = isConsecutive ? (data.attendanceStreak || 0) + 1 : 1;
                const reward = getRewardForStreak(newStreak);
                await updateDoc(userRef, {
                    totalXp: increment(reward.xp),
                    gold: increment(reward.gold),
                    attendanceStreak: newStreak,
                    lastAttendanceDate: todayKey,
                });
                soundManager.playSuccess?.();
                setLocalAttendance({ lastDate: todayKey, streak: newStreak });
                setPhase('claimed');
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
                setSpinning(false);
            }
        }, 800);
    };

    return (
        <div
            className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-3xl p-4 flex flex-col shadow-sm min-h-[180px] overflow-hidden"
            style={{ borderColor: phase === 'claimed' ? '#2bee4b40' : undefined }}
        >
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-600 mb-2">
                🗓️ 출석 보상
            </p>

            {/* 7일 미니 진행 */}
            <div className="flex gap-0.5 mb-2">
                {ATTENDANCE_REWARDS.map((r, i) => (
                    <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-all ${
                            i + 1 < cycleDay ? 'bg-[#2bee4b]' :
                            i + 1 === cycleDay ? 'bg-amber-400' :
                            'bg-stone-200 dark:bg-white/10'
                        }`}
                    />
                ))}
            </div>

            {/* 중앙 */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className={`text-3xl mb-1 transition-all ${spinning ? 'animate-bounce' : ''}`}>
                    {phase === 'claimed' ? '✅' : todayReward.icon}
                </div>
                {phase === 'claimed' ? (
                    <>
                        <p className="text-[10px] font-black text-[#2bee4b]">출석 완료!</p>
                        <p className="text-[9px] text-gray-500">{streak}일 연속 🔥</p>
                    </>
                ) : (
                    <>
                        <p className="text-[10px] font-black" style={{ color: todayReward.color }}>{todayReward.label}</p>
                        <p className="text-[9px] text-[#2bee4b]">+{todayReward.xp} XP · +{todayReward.gold}G</p>
                    </>
                )}
            </div>

            {/* 버튼 */}
            {phase === 'idle' && (
                <button
                    onClick={handleAttendance}
                    disabled={spinning}
                    className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 text-white active:scale-95 transition-all disabled:opacity-50"
                >
                    {spinning ? '...' : '출석!'}
                </button>
            )}
            {phase === 'claimed' && (
                <p className="text-center text-[9px] text-gray-500">내일 또 만나요!</p>
            )}
        </div>
    );
}

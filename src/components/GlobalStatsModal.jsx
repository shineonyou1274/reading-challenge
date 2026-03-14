import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { RPG_CONFIG } from '../utils/rpg';

// 탑 레벨 정의: 완독 권수 → 탑 단계
const TOWER_LEVELS = [
    { min: 0,  label: '초석',       emoji: '🪨', height: '10%' },
    { min: 3,  label: '목조 서재',  emoji: '🏚️', height: '20%' },
    { min: 7,  label: '석조 탑',    emoji: '🏠', height: '35%' },
    { min: 15, label: '기사의 탑',  emoji: '🏰', height: '50%' },
    { min: 25, label: '왕실 도서관', emoji: '🏛️', height: '65%' },
    { min: 40, label: '학자의 성',  emoji: '🏯', height: '80%' },
    { min: 60, label: '지혜의 대성', emoji: '👑', height: '100%' },
];

function getTowerLevel(bookCount) {
    const levels = [...TOWER_LEVELS].reverse();
    return levels.find(l => bookCount >= l.min) || TOWER_LEVELS[0];
}

function getNextTowerLevel(bookCount) {
    return TOWER_LEVELS.find(l => l.min > bookCount) || null;
}

export default function GlobalStatsModal({ isOpen, onClose }) {
    const [personalTotal, setPersonalTotal] = useState(0);
    const [totalBooks, setTotalBooks] = useState(0);
    const [totalSessions, setTotalSessions] = useState(0);
    const [empireStats, setEmpireStats] = useState({
        logreia: 0,
        visiontium: 0,
        factoria: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !auth.currentUser) return;

        let unsubPersonal = () => {};
        let unsubEmpire = () => {};

        setLoading(true);

        // 개인 누적 시간 + 책 수: 세션 서브컬렉션 실시간 구독
        const sessionsRef = collection(db, 'users', auth.currentUser.uid, 'sessions');
        unsubPersonal = onSnapshot(sessionsRef, (snapshot) => {
            let pTotal = 0;
            const bookSet = new Set();
            snapshot.forEach(d => {
                const data = d.data();
                pTotal += (data.elapsedTime || 0);
                if (data.bookTitle) bookSet.add(data.bookTitle);
            });
            setPersonalTotal(pTotal);
            setTotalBooks(bookSet.size);
            setTotalSessions(snapshot.size);
            setLoading(false);
        });

        // 제국 통계: 집계 문서 1개 읽기 (전체 users 읽기 제거)
        unsubEmpire = onSnapshot(doc(db, 'stats', 'empire_totals'), (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            setEmpireStats({
                logreia: (data.logreia?.xp || 0) * 6,
                visiontium: (data.visiontium?.xp || 0) * 6,
                factoria: (data.factoria?.xp || 0) * 6,
            });
        });

        return () => {
            unsubPersonal();
            unsubEmpire();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}시간 ${m}분`;
    };

    return (
        <div className="fixed inset-0 bg-stone-900/40 dark:bg-[#0a150c]/95 z-[300] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-[32px] p-8 relative shadow-2xl dark:shadow-[0_0_50px_rgba(43,238,75,0.2)]">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                <div className="text-center mb-8">
                    <span className="material-symbols-outlined text-4xl text-[#057a1b] dark:text-[#2bee4b] mb-3 drop-shadow-[0_0_15px_rgba(43,238,75,0.3)]">timelapse</span>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">시간의 기록</h2>
                    <p className="text-[#057a1b] dark:text-[#92c99b] text-xs font-medium mt-1">"흐르는 시간 속에 지혜가 쌓입니다."</p>
                </div>

                <div className="space-y-5">
                    {/* Personal Stats */}
                    <div className="bg-stone-50 dark:bg-black/30 rounded-2xl p-5 border border-stone-200 dark:border-white/10 text-center">
                        <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-widest mb-2">나의 누적 독서 시간</p>
                        {loading ? (
                            <div className="h-8 w-24 bg-stone-200 dark:bg-white/10 rounded animate-pulse mx-auto"></div>
                        ) : (
                            <p className="text-3xl font-black text-slate-900 dark:text-white">{formatTime(personalTotal)}</p>
                        )}
                    </div>

                    {/* 지혜의 탑 시각화 */}
                    {!loading && (() => {
                        const tower = getTowerLevel(totalBooks);
                        const next = getNextTowerLevel(totalBooks);
                        const avgSession = totalSessions > 0 ? Math.floor(personalTotal / totalSessions / 60) : 0;
                        // 문장형 인사이트
                        const insights = [];
                        if (totalSessions >= 10) insights.push(`총 ${totalSessions}번의 독서 세션을 기록했습니다`);
                        if (avgSession >= 30) insights.push(`평균 세션이 ${avgSession}분 — 깊은 몰입의 독서가!`);
                        else if (avgSession >= 15) insights.push(`평균 세션 ${avgSession}분 — 꾸준한 독서 습관!`);
                        if (totalBooks >= 10) insights.push(`${totalBooks}권의 책과 만났습니다`);
                        const totalHours = Math.floor(personalTotal / 3600);
                        if (totalHours >= 50) insights.push(`누적 ${totalHours}시간 — 진정한 독서 장인!`);
                        else if (totalHours >= 10) insights.push(`${totalHours}시간의 독서 여정이 쌓이는 중`);

                        return (
                            <div className="bg-gradient-to-b from-stone-50 to-stone-100 dark:from-[#0f1a12] dark:to-black/30 rounded-2xl p-5 border border-stone-200 dark:border-white/10">
                                <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-widest text-center mb-3">지혜의 탑</p>
                                {/* 탑 시각화 */}
                                <div className="flex items-end justify-center gap-4 h-32 mb-3">
                                    <div className="relative w-20 h-full bg-stone-200/50 dark:bg-white/5 rounded-xl overflow-hidden border border-stone-200 dark:border-white/10">
                                        <div
                                            className="absolute bottom-0 w-full bg-gradient-to-t from-[#2bee4b] to-[#2bee4b]/40 rounded-b-xl transition-all duration-1000 ease-out"
                                            style={{ height: tower.height }}
                                        />
                                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                                            <span className="text-2xl drop-shadow-lg">{tower.emoji}</span>
                                        </div>
                                    </div>
                                    <div className="text-left pb-2">
                                        <p className="text-lg font-black text-slate-900 dark:text-white">{tower.label}</p>
                                        <p className="text-xs text-[#057a1b] dark:text-[#2bee4b] font-bold">{totalBooks}권 완독</p>
                                        {next && (
                                            <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
                                                다음: {next.emoji} {next.label} ({next.min}권)
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* 문장형 인사이트 */}
                                {insights.length > 0 && (
                                    <div className="space-y-1.5 mt-3 pt-3 border-t border-stone-200/50 dark:border-white/5">
                                        {insights.map((text, i) => (
                                            <p key={i} className="text-[11px] text-slate-500 dark:text-gray-400 flex items-start gap-2">
                                                <span className="text-[#2bee4b] shrink-0">•</span>
                                                {text}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Empire Stats */}
                    <div className="space-y-2">
                        <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-widest text-center mb-2">제국별 누적 시간</p>
                        {Object.entries(RPG_CONFIG.EMPIRES).map(([key, empire]) => (
                            <div key={key} className="flex items-center justify-between bg-stone-50 dark:bg-[#0f1a12] p-3.5 rounded-xl border border-stone-200 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="size-2 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: empire.color }}></div>
                                    <span className="font-bold text-slate-700 dark:text-gray-300 text-sm">{empire.label}</span>
                                </div>
                                <span className="font-mono font-bold text-[#057a1b] dark:text-[#2bee4b]">
                                    {Math.floor(empireStats[key] / 3600).toLocaleString()}시간
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * DailyQuests — 오늘의 임무 / 장기 임무 위젯
 * questType="daily" → 일일 퀘스트만, "long" → 주간/월간만
 */
import { useMemo } from 'react';
import { getTodayKey, getTodayQuests, getWeekKey, getWeeklyQuests, getMonthKey, getMonthlyQuest } from '../utils/dailyQuests';

export default function DailyQuests({ stats, todaySeconds, questType = 'daily' }) {
    if (questType === 'long') {
        return <WeeklyMonthlyQuests stats={stats} />;
    }

    const todayKey = getTodayKey();
    const quests = useMemo(() => getTodayQuests(), [todayKey]);
    const completedToday = stats?.dailyQuestProgress?.[todayKey] || {};
    const todayMinutes = Math.floor((todaySeconds || 0) / 60);

    // 누적 미션 성공률 계산
    const allProgress = stats?.dailyQuestProgress || {};
    const allDays = Object.keys(allProgress);
    const totalPossible = allDays.length * 3;
    const totalCompleted = allDays.reduce((sum, d) => sum + Object.keys(allProgress[d]).length, 0);
    const successRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    // 퀘스트별 진행도 계산
    const getProgress = (quest) => {
        switch (quest.id) {
            case 'read_30min':  return Math.min(100, (todayMinutes / 30) * 100);
            case 'read_1hour':  return Math.min(100, (todayMinutes / 60) * 100);
            case 'study_mode':  return Math.min(100, (todayMinutes / 30) * 100);
            default: return completedToday[quest.id] ? 100 : 0;
        }
    };

    const completedCount = quests.filter(q => completedToday[q.id]).length;
    const allDone = completedCount === quests.length;

    // 날짜 포맷
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}월 ${today.getDate()}일`;

    return (
        <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-3xl p-4 shadow-sm">
            {/* 누적 미션 성공률 배너 */}
            {allDays.length > 0 && (
                <div className="flex items-center justify-between mb-4 px-1 py-2 bg-stone-50 dark:bg-black/20 rounded-2xl">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">누적 미션 성공률</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{successRate}%</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-slate-400 dark:text-gray-600">{totalCompleted} / {totalPossible} 완료</p>
                        <p className="text-[9px] text-slate-400 dark:text-gray-600">{allDays.length}일간의 기록</p>
                    </div>
                    <div className="w-12 h-12">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-stone-100 dark:stroke-black/40" />
                            <circle cx="18" cy="18" r="15" fill="none" stroke="#2bee4b" strokeWidth="3"
                                strokeDasharray={`${successRate * 0.94} 94`} strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            )}

            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#92c99b]">
                        {dateStr} · 오늘의 임무
                    </p>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {allDone ? '🎉 임무 완수!' : `${completedCount} / ${quests.length} 완료`}
                    </h3>
                </div>
                {/* 전체 진행 원형 */}
                <div className="relative w-10 h-10">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#1a331d" strokeWidth="3" className="dark:stroke-black/40 stroke-stone-100" />
                        <circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke="#2bee4b" strokeWidth="3"
                            strokeDasharray={`${(completedCount / quests.length) * 94} 94`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-[#2bee4b]">
                        {completedCount}/{quests.length}
                    </span>
                </div>
            </div>

            {/* 퀘스트 목록 */}
            <div className="space-y-2">
                {quests.map((quest) => {
                    const done = !!completedToday[quest.id];
                    const progress = getProgress(quest);

                    return (
                        <div
                            key={quest.id}
                            className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all ${
                                done
                                    ? 'bg-[#2bee4b]/10 border border-[#2bee4b]/30'
                                    : 'bg-stone-50 dark:bg-black/20 border border-transparent'
                            }`}
                        >
                            {/* 아이콘 */}
                            <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-base transition-all ${
                                done ? 'bg-[#2bee4b]/20' : 'bg-stone-100 dark:bg-black/30'
                            }`}>
                                {done ? '✅' : quest.icon}
                            </div>

                            {/* 내용 */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <span className={`text-xs font-bold truncate ${
                                        done ? 'line-through text-slate-400 dark:text-gray-500' : 'text-slate-800 dark:text-white'
                                    }`}>
                                        {quest.name}
                                    </span>
                                    <span className={`text-[9px] font-black shrink-0 ${done ? 'text-[#2bee4b]' : 'text-amber-400'}`}>
                                        {done ? '획득!' : `+${quest.xpReward} XP`}
                                    </span>
                                </div>

                                {/* 진행 바 (시간 기반 퀘스트만) */}
                                {!done && progress > 0 && (
                                    <div className="mt-1 h-1 bg-stone-200 dark:bg-black/30 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#2bee4b] rounded-full transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}

                                {/* 조건 텍스트 (미완료 + 진행 없을 때) */}
                                {!done && progress === 0 && (
                                    <p className="text-[9px] text-slate-400 dark:text-gray-600 mt-0.5 truncate">{quest.desc}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 전체 완료 보너스 메시지 */}
            {allDone && (
                <div className="mt-3 bg-[#2bee4b]/10 border border-[#2bee4b]/40 rounded-2xl p-3 text-center">
                    <p className="text-xs font-black text-[#2bee4b]">🏆 오늘의 모든 임무를 완수했습니다!</p>
                    <p className="text-[10px] text-[#2bee4b]/70 mt-0.5">내일 새로운 임무가 기다립니다</p>
                </div>
            )}
        </div>
    );
}

/* ── 주간/월간 퀘스트 서브 컴포넌트 ── */
function WeeklyMonthlyQuests({ stats }) {
    const weekKey = getWeekKey();
    const monthKey = getMonthKey();
    const weeklyQuests = useMemo(() => getWeeklyQuests(), [weekKey]);
    const monthlyQuest = useMemo(() => getMonthlyQuest(), [monthKey]);

    const weeklyProgress = stats?.weeklyQuestProgress?.[weekKey] || {};
    const monthlyProgress = stats?.monthlyQuestProgress?.[monthKey] || {};

    const allQuests = [
        ...weeklyQuests.map(q => ({ ...q, type: 'weekly', done: !!weeklyProgress[q.id] })),
        { ...monthlyQuest, type: 'monthly', done: !!monthlyProgress[monthlyQuest.id] },
    ];

    return (
        <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-3xl p-4 shadow-sm space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#92c99b] mb-2">
                장기 임무 · 주간 & 월간
            </p>
            {allQuests.map(quest => (
                <div
                    key={quest.id}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all ${
                        quest.done
                            ? 'bg-[#2bee4b]/10 border border-[#2bee4b]/30'
                            : 'bg-stone-50 dark:bg-black/20 border border-transparent'
                    }`}
                >
                    <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-base transition-all ${
                        quest.done ? 'bg-[#2bee4b]/20' : 'bg-stone-100 dark:bg-black/30'
                    }`}>
                        {quest.done ? '✅' : quest.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                                    quest.type === 'monthly'
                                        ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                        : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                }`}>
                                    {quest.type === 'monthly' ? '월간' : '주간'}
                                </span>
                                <span className={`text-xs font-bold truncate ${
                                    quest.done ? 'line-through text-slate-400 dark:text-gray-500' : 'text-slate-800 dark:text-white'
                                }`}>
                                    {quest.name}
                                </span>
                            </div>
                            <span className={`text-[9px] font-black shrink-0 ${quest.done ? 'text-[#2bee4b]' : 'text-amber-400'}`}>
                                {quest.done ? '획득!' : `+${quest.xpReward} XP`}
                            </span>
                        </div>
                        {!quest.done && (
                            <p className="text-[9px] text-slate-400 dark:text-gray-600 mt-0.5 truncate">{quest.desc}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

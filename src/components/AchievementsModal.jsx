import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../utils/achievements';

/**
 * 업적 컬렉션 모달
 * - 달성/미달성 업적을 카테고리별로 표시
 * - earnedIds: string[] — 유저가 달성한 업적 ID 목록
 */
export default function AchievementsModal({ isOpen, onClose, earnedIds = [] }) {
    if (!isOpen) return null;

    const categories = Object.entries(ACHIEVEMENT_CATEGORIES);
    const totalEarned = earnedIds.length;
    const totalPossible = ACHIEVEMENTS.length;
    const totalBonusXp = ACHIEVEMENTS
        .filter(a => earnedIds.includes(a.id))
        .reduce((sum, a) => sum + (a.xpBonus || 0), 0);

    return (
        <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#F9F8F4] dark:bg-[#102213] border border-stone-200 dark:border-[#32673b] w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-stone-100 dark:border-white/5 shrink-0">
                    <div className="w-10 h-1 bg-stone-200 dark:bg-white/10 rounded-full mx-auto mb-5 sm:hidden" />
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                                업적 컬렉션
                            </h2>
                            <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                                {totalEarned} / {totalPossible} 달성 · 보너스 XP +{totalBonusXp.toLocaleString()}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 h-2 bg-stone-100 dark:bg-black/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.round((totalEarned / totalPossible) * 100)}%` }}
                        />
                    </div>
                    <p className="text-right text-[10px] text-slate-400 dark:text-gray-600 mt-1 font-bold uppercase">
                        {Math.round((totalEarned / totalPossible) * 100)}% 완료
                    </p>
                </div>

                {/* Achievement List — 카테고리별 3열 그리드 */}
                <div className="overflow-y-auto flex-1 p-4 space-y-6">
                    {categories.map(([catKey, cat]) => {
                        const catAchievements = ACHIEVEMENTS.filter(a => a.category === catKey);
                        const catEarned = catAchievements.filter(a => earnedIds.includes(a.id)).length;

                        return (
                            <section key={catKey}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-slate-400 dark:text-gray-500 text-sm"
                                        style={{ fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                                    <h3 className="text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest">
                                        {cat.label}
                                    </h3>
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-gray-600">
                                        {catEarned}/{catAchievements.length}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {catAchievements.map(ach => {
                                        const isEarned = earnedIds.includes(ach.id);
                                        return (
                                            <div
                                                key={ach.id}
                                                title={`${ach.name}: ${ach.desc}`}
                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all text-center ${isEarned
                                                    ? 'bg-white dark:bg-[#1a331d] border-amber-200 dark:border-amber-500/20 shadow-sm'
                                                    : 'bg-stone-50 dark:bg-black/20 border-stone-100 dark:border-white/5 opacity-40'
                                                    }`}
                                            >
                                                {/* 이모지 아이콘 */}
                                                <div className={`size-10 rounded-xl flex items-center justify-center text-xl ${isEarned ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-stone-100 dark:bg-white/5 grayscale'}`}>
                                                    {isEarned ? ach.icon : '🔒'}
                                                </div>
                                                {/* 이름 */}
                                                <p className={`text-[10px] font-bold leading-tight ${isEarned ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-gray-600'}`}>
                                                    {ach.name}
                                                </p>
                                                {/* XP */}
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isEarned ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'text-slate-300 dark:text-gray-700'}`}>
                                                    +{ach.xpBonus} XP
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

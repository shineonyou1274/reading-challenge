import { useState } from 'react';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../utils/achievements';
import { AttendanceCompact } from './BookRoulette';

/**
 * 업적 컬렉션 모달
 * - 아코디언 카테고리, 컴팩트 그리드
 */
export default function AchievementsModal({ isOpen, onClose, earnedIds = [], stats = {} }) {
    const [openCat, setOpenCat] = useState(null);

    if (!isOpen) return null;

    const categories = Object.entries(ACHIEVEMENT_CATEGORIES);
    const totalEarned = earnedIds.length;
    const totalPossible = ACHIEVEMENTS.length;
    const totalBonusXp = ACHIEVEMENTS
        .filter(a => earnedIds.includes(a.id))
        .reduce((sum, a) => sum + (a.xpBonus || 0), 0);

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#F9F8F4] dark:bg-[#102213] border border-stone-200 dark:border-[#32673b] w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 pb-3 border-b border-stone-100 dark:border-white/5 shrink-0">
                    <div className="w-10 h-1 bg-stone-200 dark:bg-white/10 rounded-full mx-auto mb-4 sm:hidden" />
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                                업적 컬렉션
                            </h2>
                            <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
                                {totalEarned}/{totalPossible} 달성 · +{totalBonusXp.toLocaleString()} XP
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 transition-colors">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                    <div className="mt-3 h-1.5 bg-stone-100 dark:bg-black/30 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{ width: `${Math.round((totalEarned / totalPossible) * 100)}%` }} />
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {/* 출석 보상 아코디언 */}
                    <button
                        onClick={() => setOpenCat(openCat === '_attendance' ? null : '_attendance')}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-slate-400 dark:text-gray-500" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
                            <span className="text-xs font-black text-slate-600 dark:text-gray-300 uppercase tracking-widest">출석 보상</span>
                        </div>
                        <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform ${openCat === '_attendance' ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    {openCat === '_attendance' && (
                        <div className="px-1 pb-2 animate-in slide-in-from-top-2 duration-200">
                            <AttendanceCompact stats={stats} />
                        </div>
                    )}

                    {/* 카테고리별 아코디언 */}
                    {categories.map(([catKey, cat]) => {
                        const catAchievements = ACHIEVEMENTS.filter(a => a.category === catKey);
                        const catEarned = catAchievements.filter(a => earnedIds.includes(a.id)).length;
                        const isOpen_ = openCat === catKey;

                        return (
                            <div key={catKey}>
                                <button
                                    onClick={() => setOpenCat(isOpen_ ? null : catKey)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-slate-400 dark:text-gray-500" style={{ fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                                        <span className="text-xs font-black text-slate-600 dark:text-gray-300 uppercase tracking-widest">{cat.label}</span>
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-gray-600">{catEarned}/{catAchievements.length}</span>
                                    </div>
                                    <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform ${isOpen_ ? 'rotate-180' : ''}`}>expand_more</span>
                                </button>

                                {isOpen_ && (
                                    <div className="grid grid-cols-4 gap-1.5 p-2 animate-in slide-in-from-top-2 duration-200">
                                        {catAchievements.map(ach => {
                                            const isEarned = earnedIds.includes(ach.id);
                                            return (
                                                <div
                                                    key={ach.id}
                                                    title={`${ach.name}: ${ach.desc}`}
                                                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center ${isEarned
                                                        ? 'bg-white dark:bg-[#1a331d] border-amber-200 dark:border-amber-500/20'
                                                        : 'bg-stone-50 dark:bg-black/20 border-stone-100 dark:border-white/5 opacity-40'
                                                    }`}
                                                >
                                                    <div className={`size-8 rounded-lg flex items-center justify-center text-base ${isEarned ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-stone-100 dark:bg-white/5 grayscale'}`}>
                                                        {isEarned ? ach.icon : '🔒'}
                                                    </div>
                                                    <p className={`text-[8px] font-bold leading-tight ${isEarned ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-gray-600'}`}>
                                                        {ach.name}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

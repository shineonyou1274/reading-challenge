import { useState } from 'react';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../utils/achievements';
import { AttendanceCompact } from './BookRoulette';

/**
 * 업적 컬렉션 모달 — 세련된 UX/UI
 */
export default function AchievementsModal({ isOpen, onClose, earnedIds = [], stats = {} }) {
    const [openCat, setOpenCat] = useState(null);
    const [selectedAch, setSelectedAch] = useState(null);

    if (!isOpen) return null;

    const categories = Object.entries(ACHIEVEMENT_CATEGORIES);
    const totalEarned = earnedIds.length;
    const totalPossible = ACHIEVEMENTS.length;
    const totalBonusXp = ACHIEVEMENTS
        .filter(a => earnedIds.includes(a.id))
        .reduce((sum, a) => sum + (a.xpBonus || 0), 0);
    const progressPct = Math.round((totalEarned / totalPossible) * 100);

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#F9F8F4] dark:bg-[#102213] border border-stone-200 dark:border-[#32673b] w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 pb-4 border-b border-stone-100 dark:border-white/5 shrink-0">
                    <div className="w-10 h-1 bg-stone-200 dark:bg-white/10 rounded-full mx-auto mb-4 sm:hidden" />
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                                업적 컬렉션
                            </h2>
                            <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
                                {totalEarned}/{totalPossible} 달성 · +{totalBonusXp.toLocaleString()} XP 획득
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 transition-colors">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>

                    {/* 전체 진행률 바 + 퍼센트 */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-stone-100 dark:bg-black/30 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="text-[11px] font-black text-amber-500 tabular-nums w-10 text-right">{progressPct}%</span>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 p-4 space-y-2.5">
                    {/* 출석 보상 */}
                    <CategoryAccordion
                        icon="event_available"
                        label="출석 보상"
                        count={null}
                        isOpen={openCat === '_attendance'}
                        onToggle={() => setOpenCat(openCat === '_attendance' ? null : '_attendance')}
                    >
                        <AttendanceCompact stats={stats} />
                    </CategoryAccordion>

                    {/* 카테고리별 */}
                    {categories.map(([catKey, cat]) => {
                        const catAchievements = ACHIEVEMENTS.filter(a => a.category === catKey);
                        const catEarned = catAchievements.filter(a => earnedIds.includes(a.id)).length;
                        const isOpen_ = openCat === catKey;

                        return (
                            <CategoryAccordion
                                key={catKey}
                                icon={cat.icon}
                                label={cat.label}
                                count={`${catEarned}/${catAchievements.length}`}
                                earned={catEarned}
                                total={catAchievements.length}
                                isOpen={isOpen_}
                                onToggle={() => setOpenCat(isOpen_ ? null : catKey)}
                            >
                                <div className="grid grid-cols-4 gap-2">
                                    {catAchievements.map(ach => {
                                        const isEarned = earnedIds.includes(ach.id);
                                        return (
                                            <button
                                                key={ach.id}
                                                onClick={() => setSelectedAch(selectedAch?.id === ach.id ? null : ach)}
                                                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all ${isEarned
                                                    ? 'bg-white dark:bg-[#1a331d] border-amber-200 dark:border-amber-500/20 shadow-sm'
                                                    : 'bg-stone-50 dark:bg-black/20 border-stone-100 dark:border-white/5 opacity-40'
                                                } ${selectedAch?.id === ach.id ? 'ring-2 ring-amber-400 scale-[1.02]' : ''}`}
                                            >
                                                <div className={`size-9 rounded-xl flex items-center justify-center text-lg ${isEarned ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-stone-100 dark:bg-white/5 grayscale'}`}>
                                                    {isEarned ? ach.icon : '🔒'}
                                                </div>
                                                <p className={`text-[8px] font-bold leading-tight ${isEarned ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-gray-600'}`}>
                                                    {ach.name}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* 선택된 업적 상세 */}
                                {selectedAch && catAchievements.some(a => a.id === selectedAch.id) && (
                                    <div className="mt-2.5 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 animate-in fade-in duration-200">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{selectedAch.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-900 dark:text-white">{selectedAch.name}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">{selectedAch.desc}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <span className="text-[10px] font-black text-amber-500">+{selectedAch.xpBonus} XP</span>
                                                {earnedIds.includes(selectedAch.id) && (
                                                    <p className="text-[8px] font-bold text-[#2bee4b] mt-0.5">달성!</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CategoryAccordion>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ── 카테고리 아코디언 ── */
function CategoryAccordion({ icon, label, count, earned, total, isOpen, onToggle, children }) {
    return (
        <div>
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] transition-all hover:shadow-sm"
            >
                <span className="material-symbols-outlined text-base text-slate-400 dark:text-gray-500" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                <span className="text-xs font-black text-slate-700 dark:text-gray-200 uppercase tracking-widest flex-1 text-left">{label}</span>
                {count && (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500">{count}</span>
                        {earned !== undefined && total !== undefined && (
                            <div className="w-8 h-1.5 bg-stone-100 dark:bg-black/30 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(earned / total) * 100}%` }} />
                            </div>
                        )}
                    </div>
                )}
                <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {isOpen && (
                <div className="pt-2.5 pb-1 px-1 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}

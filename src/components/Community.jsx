import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { RPG_CONFIG } from '../utils/rpg';
import EmpireWarMap from './EmpireWarMap';
import RankingBoard from './RankingBoard';
import ScholarBanner from './ScholarBanner';
import EmpireBattle from './EmpireBattle';

export default function Community({ darkMode, stats, onShopPurchase }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('empire');
    const [currentUserEmpire, setCurrentUserEmpire] = useState(null);
    const [visibleCount, setVisibleCount] = useState(10);
    const [expandedNotes, setExpandedNotes] = useState({});

    // 현재 유저의 제국 정보 가져오기
    useEffect(() => {
        if (auth.currentUser) {
            getDoc(doc(db, 'users', auth.currentUser.uid)).then(snap => {
                if (snap.exists()) {
                    setCurrentUserEmpire(snap.data().empireId || null);
                }
            });
        }
    }, []);

    useEffect(() => {
        if (!auth.currentUser) {
            setActivities([
                { id: '1', userName: '실비아', userTitle: '왕실 기록관', bookTitle: '지혜의 서', elapsedTime: 5400, note: '지혜란 경험의 축적이다.', timestamp: { seconds: Date.now() / 1000 - 300 }, bookImage: null },
                { id: '2', userName: '카이', userTitle: '입문 학자', bookTitle: '디지털 요새', elapsedTime: 1800, note: '', timestamp: { seconds: Date.now() / 1000 - 3600 }, bookImage: null },
            ]);
            setLoading(false);
            return;
        }

        const feedRef = collection(db, 'public_feed');
        const q = query(feedRef, orderBy('timestamp', 'desc'), limit(50));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setActivities(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const timeAgo = (timestamp) => {
        if (!timestamp) return '방금 전';
        const seconds = Math.floor((new Date() - new Date(timestamp.seconds * 1000)) / 1000);
        let interval = seconds / 3600;
        if (interval > 24) return Math.floor(interval / 24) + "일 전";
        if (interval > 1) return Math.floor(interval) + "시간 전";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "분 전";
        return "방금 전";
    };

    const toggleNote = (id) => {
        setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const tabs = [
        { id: 'empire', label: '제국 전쟁', icon: 'flag' },
        { id: 'latest', label: '독서 기록', icon: 'schedule' },
        { id: 'global', label: '명예의 전당', icon: 'military_tech' },
    ];

    const visibleActivities = activities.filter(act => !act.isChat).slice(0, visibleCount);
    const hasMore = activities.filter(act => !act.isChat).length > visibleCount;

    return (
        <div className="min-h-screen bg-[#F9F8F4] dark:bg-[#102213] text-slate-800 dark:text-gray-200 font-sans pb-28 transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#F9F8F4]/95 dark:bg-[#102213]/95 backdrop-blur-md pt-6 pb-2 px-6 flex items-center justify-between border-b border-stone-200/50 dark:border-white/5 transition-colors">
                <h2 className="text-slate-900 dark:text-white text-2xl font-bold leading-tight tracking-tight flex-1">독서 피드</h2>
                {currentUserEmpire && (
                    <div
                        className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border"
                        style={{
                            color: RPG_CONFIG.EMPIRES[currentUserEmpire]?.color,
                            borderColor: RPG_CONFIG.EMPIRES[currentUserEmpire]?.color + '60',
                            backgroundColor: RPG_CONFIG.EMPIRES[currentUserEmpire]?.color + '15',
                        }}
                    >
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">flag</span>
                            {RPG_CONFIG.EMPIRES[currentUserEmpire]?.label}
                        </span>
                    </div>
                )}
            </header>

            {/* Filter Tabs */}
            <div className="sticky top-[72px] z-30 bg-[#F9F8F4]/95 dark:bg-[#102213]/95 backdrop-blur-md pb-4 pt-2 border-b border-stone-200/50 dark:border-white/5 transition-colors">
                <div className="flex gap-3 px-6 overflow-x-auto no-scrollbar scroll-smooth">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex shrink-0 items-center justify-center gap-x-2 rounded-full px-5 py-2.5 transition-transform active:scale-95 shadow-sm ${activeTab === tab.id
                                ? 'bg-[#2bee4b] shadow-[0_4px_12px_rgba(43,238,75,0.3)] border-none'
                                : 'bg-white dark:bg-black/20 border border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-white/5'}`}
                        >
                            <span className={`material-symbols-outlined text-sm ${activeTab === tab.id ? 'text-[#102213] font-bold' : 'text-slate-600 dark:text-gray-400'}`}>{tab.icon}</span>
                            <span className={`text-sm leading-normal ${activeTab === tab.id ? 'text-[#102213] font-bold' : 'text-slate-600 dark:text-gray-400 font-medium'}`}>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <main className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto">
                {activeTab === 'empire' ? (
                    <div className="space-y-4">
                        <EmpireBattle />
                        <div className="mb-4">
                            <EmpireWarMap />
                        </div>
                        <RankingBoard type="empire" empireFilter={currentUserEmpire} />
                    </div>
                ) : activeTab === 'global' ? (
                    <RankingBoard type="global" empireFilter={null} />
                ) : (
                    <>
                        <ScholarBanner />
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-2xl bg-white dark:bg-[#1a331d] border border-stone-100 dark:border-[#32673b] p-4 flex gap-3">
                                        <div className="w-11 h-14 shrink-0 rounded-xl bg-stone-200 dark:bg-white/5 animate-pulse" />
                                        <div className="flex-1 space-y-2 pt-1">
                                            <div className="h-3 bg-stone-200 dark:bg-white/5 rounded-full animate-pulse w-2/5" />
                                            <div className="h-2.5 bg-stone-100 dark:bg-white/5 rounded-full animate-pulse w-3/5" />
                                            <div className="h-2 bg-stone-100 dark:bg-white/5 rounded-full animate-pulse w-4/5" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activities.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-500">
                                <p>아직 등록된 활동이 없습니다.</p>
                                <p className="text-sm mt-2">첫 독서 기록을 남겨보세요!</p>
                            </div>
                        ) : (
                            <>
                                {visibleActivities.map((act) => (
                                    <article
                                        key={act.id}
                                        className="rounded-2xl bg-white dark:bg-[#1a331d] border border-stone-100 dark:border-[#32673b] overflow-hidden transition-all hover:border-stone-200 dark:hover:border-[#2bee4b]/40 shadow-sm"
                                    >
                                        <div className="flex items-start gap-3 p-4">
                                            {/* 책 표지 */}
                                            <div className="w-11 h-14 shrink-0 rounded-xl overflow-hidden bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/5 shadow-sm">
                                                {act.bookImage ? (
                                                    <img src={act.bookImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-stone-300 dark:text-gray-600 text-xl">book_2</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                {/* 이름 + 시간 */}
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{act.userName || '알 수 없음'}</span>
                                                        <span className="text-[9px] bg-stone-100 dark:bg-black/30 text-slate-500 dark:text-gray-500 px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">{act.userTitle || '학자'}</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 dark:text-gray-600 shrink-0">{timeAgo(act.timestamp)}</span>
                                                </div>

                                                {/* 책 제목 */}
                                                {act.bookTitle && (
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <span className="material-symbols-outlined text-[#057a1b] dark:text-[#2bee4b] text-xs">menu_book</span>
                                                        <span className="text-xs font-bold text-[#057a1b] dark:text-[#2bee4b] truncate">{act.bookTitle}</span>
                                                    </div>
                                                )}

                                                {/* 통계 */}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#057a1b] dark:text-[#2bee4b] bg-[#2bee4b]/10 px-2 py-0.5 rounded-full">
                                                        <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                                                        {Math.floor((act.elapsedTime || 0) / 60)}분
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 dark:text-gray-500 font-bold">
                                                        +{act.rewards?.xp || Math.floor((act.elapsedTime || 0) / 60) * 10} XP
                                                    </span>

                                                    {/* 메모 아코디언 토글 */}
                                                    {act.note && (
                                                        <button
                                                            onClick={() => toggleNote(act.id)}
                                                            className="ml-auto flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-xs">
                                                                {expandedNotes[act.id] ? 'expand_less' : 'expand_more'}
                                                            </span>
                                                            메모
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 메모 아코디언 영역 */}
                                        {act.note && expandedNotes[act.id] && (
                                            <div className="px-4 pb-4">
                                                <p className="text-xs text-slate-500 dark:text-gray-400 italic bg-stone-50 dark:bg-black/20 p-3 rounded-xl border-l-2 border-[#2bee4b]/40">
                                                    "{act.note}"
                                                </p>
                                            </div>
                                        )}
                                    </article>
                                ))}

                                {/* 더 보기 버튼 */}
                                {hasMore && (
                                    <button
                                        onClick={() => setVisibleCount(c => c + 10)}
                                        className="w-full py-3 rounded-2xl border border-stone-200 dark:border-white/10 text-sm font-bold text-slate-500 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        더 보기 ({activities.filter(a => !a.isChat).length - visibleCount}개 남음)
                                    </button>
                                )}

                                {!hasMore && activities.length > 0 && (
                                    <p className="text-center text-[10px] text-slate-300 dark:text-gray-700 font-bold uppercase tracking-widest pb-4">— 모든 기록을 불러왔습니다 —</p>
                                )}
                            </>
                        )}
                    </>
                )}
            </main>

            {/* FAB: Scroll to Top */}
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-24 right-5 h-14 w-14 rounded-full bg-[#2bee4b] text-[#102213] shadow-[0_4px_20px_rgba(43,238,75,0.4)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-40 border-2 border-white dark:border-[#102213]">
                <span className="material-symbols-outlined text-2xl">arrow_upward</span>
            </button>
        </div>
    );
}

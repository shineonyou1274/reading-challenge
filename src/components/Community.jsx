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
    const [userPopup, setUserPopup] = useState(null); // { userId, userName, userTitle, records }

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

    const tabs = [
        { id: 'empire', label: '제국 전쟁', icon: 'flag' },
        { id: 'latest', label: '독서 기록', icon: 'schedule' },
        { id: 'global', label: '명예의 전당', icon: 'military_tech' },
    ];

    // 유저별 그룹화
    const userGroups = (() => {
        const map = {};
        activities.filter(a => !a.isChat).forEach(a => {
            const key = a.userId || a.userName || 'unknown';
            if (!map[key]) map[key] = { userId: a.userId, userName: a.userName || '알 수 없음', userTitle: a.userTitle || '학자', empireId: a.empireId, records: [] };
            map[key].records.push(a);
        });
        // 가장 최근 기록 기준 정렬
        return Object.values(map).sort((a, b) => {
            const ta = a.records[0]?.timestamp?.seconds || 0;
            const tb = b.records[0]?.timestamp?.seconds || 0;
            return tb - ta;
        });
    })();

    const visibleUsers = userGroups.slice(0, visibleCount);
    const hasMore = userGroups.length > visibleCount;

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
                                {visibleUsers.map((user) => {
                                    const latest = user.records[0];
                                    const totalMins = Math.floor(user.records.reduce((a, r) => a + (r.elapsedTime || 0), 0) / 60);
                                    const totalXp = user.records.reduce((a, r) => a + (r.rewards?.xp || 0), 0);
                                    const empireColor = RPG_CONFIG.EMPIRES[user.empireId]?.color;
                                    return (
                                        <article
                                            key={user.userId || user.userName}
                                            className="rounded-2xl bg-white dark:bg-[#1a331d] border border-stone-100 dark:border-[#32673b] overflow-hidden transition-all hover:border-stone-200 dark:hover:border-[#2bee4b]/40 shadow-sm cursor-pointer active:scale-[0.99]"
                                            onClick={() => setUserPopup(user)}
                                        >
                                            <div className="flex items-center gap-3 p-4">
                                                {/* 유저 아바타 */}
                                                <div className="size-12 shrink-0 rounded-2xl flex items-center justify-center text-xl font-black"
                                                    style={{ backgroundColor: (empireColor || '#2bee4b') + '20', border: `1.5px solid ${(empireColor || '#2bee4b')}40` }}>
                                                    {(user.userName || '?')[0]}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    {/* 이름 + 작위 */}
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{user.userName}</span>
                                                        <span className="text-[9px] bg-stone-100 dark:bg-black/30 text-slate-500 dark:text-gray-500 px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">{user.userTitle}</span>
                                                    </div>
                                                    {/* 최근 책 */}
                                                    {latest?.bookTitle && (
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <span className="material-symbols-outlined text-[#057a1b] dark:text-[#2bee4b] text-xs">menu_book</span>
                                                            <span className="text-xs text-[#057a1b] dark:text-[#2bee4b] truncate">{latest.bookTitle}</span>
                                                        </div>
                                                    )}
                                                    {/* 통계 */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-[#057a1b] dark:text-[#2bee4b] bg-[#2bee4b]/10 px-2 py-0.5 rounded-full">{totalMins}분</span>
                                                        <span className="text-[10px] text-slate-400 dark:text-gray-500">+{totalXp} XP</span>
                                                        <span className="text-[10px] text-slate-400 dark:text-gray-600 ml-auto">{timeAgo(latest?.timestamp)}</span>
                                                    </div>
                                                </div>

                                                <span className="material-symbols-outlined text-slate-300 dark:text-gray-600 text-sm shrink-0">chevron_right</span>
                                            </div>
                                        </article>
                                    );
                                })}

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

            {/* 유저 팝업 (바텀시트) */}
            {userPopup && (
                <div className="fixed inset-0 z-[500] flex flex-col justify-end" onClick={() => setUserPopup(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative bg-white dark:bg-[#0d1f0f] rounded-t-[32px] shadow-2xl border-t border-stone-200 dark:border-[#2a5530] max-h-[80vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-10 h-1 bg-stone-300 dark:bg-white/20 rounded-full" />
                        </div>
                        {/* 헤더 */}
                        <div className="px-5 py-3 border-b border-stone-100 dark:border-white/5 shrink-0 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-2xl flex items-center justify-center text-lg font-black bg-[#2bee4b]/20 border border-[#2bee4b]/30">
                                    {(userPopup.userName || '?')[0]}
                                </div>
                                <div>
                                    <p className="font-black text-slate-900 dark:text-white text-base">{userPopup.userName}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">{userPopup.userTitle} · {userPopup.records.length}회 기록</p>
                                </div>
                            </div>
                            <button onClick={() => setUserPopup(null)}
                                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-sm text-slate-500 dark:text-gray-400">close</span>
                            </button>
                        </div>
                        {/* 기록 목록 */}
                        <div className="overflow-y-auto flex-1 p-4 space-y-2">
                            {userPopup.records.map(r => {
                                const mins = Math.floor((r.elapsedTime || 0) / 60);
                                const dateStr = r.timestamp
                                    ? new Date(r.timestamp.seconds * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                                    : '';
                                return (
                                    <div key={r.id} className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-black/20 rounded-2xl border border-stone-100 dark:border-white/5">
                                        <div className="size-9 shrink-0 rounded-xl overflow-hidden bg-stone-200 dark:bg-black/40 border border-stone-200 dark:border-white/5">
                                            {r.bookImage
                                                ? <img src={r.bookImage} alt="" className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-stone-400 dark:text-gray-600 text-sm">book_2</span>
                                                </div>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{r.bookTitle || '제목 없음'}</p>
                                            {r.note && <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate italic">"{r.note}"</p>}
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-[#2bee4b] font-bold">{mins}분</span>
                                                <span className="text-[10px] text-slate-400 dark:text-gray-600">+{r.rewards?.xp || 0} XP</span>
                                                <span className="text-[10px] text-slate-400 dark:text-gray-600 ml-auto">{dateStr}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

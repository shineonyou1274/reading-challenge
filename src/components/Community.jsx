import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, updateDoc, arrayUnion, deleteField, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { RPG_CONFIG } from '../utils/rpg';
import EmpireWarMap from './EmpireWarMap';
import RankingBoard from './RankingBoard';
import ScholarBanner from './ScholarBanner';
import EmpireBattle from './EmpireBattle';
import ContextTip from './ContextTip';

const REPORT_REASONS = [
    '부적절한 내용',
    '욕설/비방',
    '스팸/광고',
    '개인정보 노출',
    '기타',
];

export default function Community({ darkMode, stats, onShopPurchase }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('empire');
    const [currentUserEmpire, setCurrentUserEmpire] = useState(null);
    const [visibleCount, setVisibleCount] = useState(10);
    const [userPopup, setUserPopup] = useState(null);
    const [showEmpireDetail, setShowEmpireDetail] = useState(false);
    const [reportTarget, setReportTarget] = useState(null); // { id, userName }
    const [reportReason, setReportReason] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState(() => {
        try { return JSON.parse(localStorage.getItem('rrq_blocked') || '[]'); } catch { return []; }
    });

    // 현재 유저의 제국 정보 가져오기
    useEffect(() => {
        if (auth.currentUser) {
            getDoc(doc(db, 'users', auth.currentUser.uid)).then(snap => {
                if (snap.exists()) {
                    setCurrentUserEmpire(snap.data().empireId || null);
                }
            }).catch(e => console.warn('Empire fetch failed:', e));
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

    // 신고 제출
    const handleReport = async () => {
        if (!reportTarget || !reportReason || !auth.currentUser) return;
        setReportSubmitting(true);
        try {
            const feedDocRef = doc(db, 'public_feed', reportTarget.id);
            await updateDoc(feedDocRef, {
                reports: arrayUnion({
                    uid: auth.currentUser.uid,
                    reason: reportReason,
                    timestamp: Date.now(),
                }),
            });
            setReportTarget(null);
            setReportReason('');
            alert('신고가 접수되었습니다.');
        } catch (e) {
            console.error('Report failed:', e);
            alert('신고 처리에 실패했습니다.');
        } finally {
            setReportSubmitting(false);
        }
    };

    // 사용자 차단 (로컬)
    const handleBlock = (uid) => {
        if (!uid || uid === auth.currentUser?.uid) return;
        const updated = [...new Set([...blockedUsers, uid])];
        setBlockedUsers(updated);
        localStorage.setItem('rrq_blocked', JSON.stringify(updated));
        setUserPopup(null);
    };

    // 차단 해제
    const handleUnblock = (uid) => {
        const updated = blockedUsers.filter(id => id !== uid);
        setBlockedUsers(updated);
        localStorage.setItem('rrq_blocked', JSON.stringify(updated));
    };

    // 리액션 (깃펜 흔들기) 토글
    const handleReaction = async (feedId) => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const feedItem = activities.find(a => a.id === feedId);
        const hasReacted = feedItem?.reactions?.[uid];
        const feedDocRef = doc(db, 'public_feed', feedId);
        try {
            if (hasReacted) {
                await updateDoc(feedDocRef, { [`reactions.${uid}`]: deleteField() });
            } else {
                await updateDoc(feedDocRef, { [`reactions.${uid}`]: true });
                // 본인 글이 아닐 때만 알림 전송
                if (feedItem?.uid && feedItem.uid !== uid) {
                    const notifRef = collection(db, 'users', feedItem.uid, 'notifications');
                    addDoc(notifRef, {
                        type: 'reaction',
                        fromUid: uid,
                        fromName: stats?.displayName || '익명의 학자',
                        bookTitle: feedItem.bookTitle || '',
                        feedId,
                        read: false,
                        timestamp: serverTimestamp(),
                    }).catch(e => console.warn('Notification write failed:', e));
                }
            }
        } catch (e) {
            console.error('Reaction failed:', e);
        }
    };

    // 유저별 그룹화
    const userGroups = (() => {
        const map = {};
        activities.filter(a => !a.isChat && !blockedUsers.includes(a.uid)).forEach(a => {
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
                <ContextTip
                    tipKey="feed"
                    icon="📜"
                    title="수석 기록관의 안내"
                    message="이곳은 황실 독서 피드입니다. 다른 학자들의 기록을 살피고 ✍️ 깃펜을 흔들어 응원할 수 있습니다. 제국 전쟁 탭에서 소속 제국의 전력도 확인해보세요!"
                />
                {activeTab === 'empire' ? (
                    <div className="space-y-4">
                        <EmpireBattle />
                        <div className="mb-4">
                            <EmpireWarMap />
                        </div>
                        <button
                            onClick={() => setShowEmpireDetail(v => !v)}
                            className="w-full py-3 rounded-2xl border border-stone-200 dark:border-white/10 text-sm font-bold text-slate-600 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2 bg-white dark:bg-[#1a331d] shadow-sm"
                        >
                            <span className="material-symbols-outlined text-base">{showEmpireDetail ? 'expand_less' : 'leaderboard'}</span>
                            {showEmpireDetail ? '접기' : '제국 상세 순위 보기'}
                        </button>
                        {showEmpireDetail && (
                            <RankingBoard type="empire" empireFilter={currentUserEmpire} compact={true} />
                        )}
                    </div>
                ) : activeTab === 'global' ? (
                    <div className="space-y-4">
                        <ScholarBanner />
                        <RankingBoard type="global" empireFilter={null} compact={true} />
                    </div>
                ) : (
                    <>
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-xl bg-white dark:bg-[#1a331d] border border-stone-100 dark:border-[#32673b] p-3 flex gap-3">
                                        <div className="h-3 bg-stone-200 dark:bg-white/5 rounded-full animate-pulse w-1/4" />
                                        <div className="h-3 bg-stone-100 dark:bg-white/5 rounded-full animate-pulse w-2/5" />
                                        <div className="h-3 bg-stone-100 dark:bg-white/5 rounded-full animate-pulse w-1/6 ml-auto" />
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
                                    const empireColor = RPG_CONFIG.EMPIRES[user.empireId]?.color;
                                    return (
                                        <article
                                            key={user.userId || user.userName}
                                            className="rounded-xl bg-white dark:bg-[#1a331d] border border-stone-100 dark:border-[#32673b] overflow-hidden transition-all hover:border-stone-200 dark:hover:border-[#2bee4b]/40 shadow-sm cursor-pointer active:scale-[0.99]"
                                            onClick={() => setUserPopup(user)}
                                        >
                                            <div className="flex items-center gap-3 px-4 py-3">
                                                {/* 유저 아바타 */}
                                                <div className="size-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-black"
                                                    style={{ backgroundColor: (empireColor || '#2bee4b') + '20', border: `1.5px solid ${(empireColor || '#2bee4b')}40` }}>
                                                    {(user.userName || '?')[0]}
                                                </div>

                                                {/* 유저명 */}
                                                <span className="font-bold text-sm text-slate-900 dark:text-white truncate shrink-0">{user.userName}</span>

                                                {/* 최근 책 제목 */}
                                                {latest?.bookTitle && (
                                                    <span className="text-xs text-[#057a1b] dark:text-[#2bee4b] truncate flex-1 min-w-0">{latest.bookTitle}</span>
                                                )}

                                                {/* 시간 */}
                                                <span className="text-[10px] text-slate-400 dark:text-gray-600 shrink-0 ml-auto">{timeAgo(latest?.timestamp)}</span>

                                                {/* 리액션 버튼 */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReaction(latest.id); }}
                                                    className="shrink-0 flex items-center gap-0.5 px-2 py-1 rounded-full hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
                                                    title="깃펜 흔들기"
                                                >
                                                    <span className={`text-sm ${latest?.reactions?.[auth.currentUser?.uid] ? '' : 'grayscale opacity-40'}`}>✍️</span>
                                                    {Object.keys(latest?.reactions || {}).length > 0 && (
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500">
                                                            {Object.keys(latest.reactions).length}
                                                        </span>
                                                    )}
                                                </button>

                                                <span className="material-symbols-outlined text-slate-300 dark:text-gray-600 text-sm shrink-0">chevron_right</span>

                                                {/* 신고 버튼 */}
                                                {latest?.uid !== auth.currentUser?.uid && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setReportTarget({ id: latest.id, userName: user.userName }); }}
                                                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
                                                        title="신고"
                                                    >
                                                        <span className="material-symbols-outlined text-stone-300 dark:text-gray-600 text-sm">flag</span>
                                                    </button>
                                                )}
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

            {/* 신고 모달 */}
            {reportTarget && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" onClick={() => setReportTarget(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white dark:bg-[#0d1f0f] rounded-[24px] shadow-2xl border border-stone-200 dark:border-[#2a5530] max-w-sm w-full p-6"
                        onClick={e => e.stopPropagation()}>
                        <h3 className="font-black text-slate-900 dark:text-white text-base mb-1">게시물 신고</h3>
                        <p className="text-xs text-slate-400 dark:text-gray-500 mb-4">{reportTarget.userName}님의 게시물을 신고합니다.</p>

                        <div className="space-y-2 mb-4">
                            {REPORT_REASONS.map(reason => (
                                <button
                                    key={reason}
                                    onClick={() => setReportReason(reason)}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                                        reportReason === reason
                                            ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400'
                                            : 'bg-stone-50 dark:bg-black/20 border-stone-100 dark:border-white/5 text-slate-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-white/5'
                                    }`}
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => { setReportTarget(null); setReportReason(''); }}
                                className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 text-sm font-bold text-slate-500 dark:text-gray-400">
                                취소
                            </button>
                            <button onClick={handleReport}
                                disabled={!reportReason || reportSubmitting}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-40 transition-opacity">
                                {reportSubmitting ? '처리 중...' : '신고하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 유저 팝업 (바텀시트) */}
            {userPopup && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" onClick={() => setUserPopup(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative bg-white dark:bg-[#0d1f0f] rounded-[28px] shadow-2xl border border-stone-200 dark:border-[#2a5530] max-h-[80vh] max-w-md w-full flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
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
                            <div className="flex items-center gap-2">
                                {userPopup.userId && userPopup.userId !== auth.currentUser?.uid && (
                                    blockedUsers.includes(userPopup.userId) ? (
                                        <button onClick={() => handleUnblock(userPopup.userId)}
                                            className="text-[10px] px-2.5 py-1 rounded-full border border-stone-200 dark:border-white/10 text-slate-400 dark:text-gray-500 font-bold hover:bg-stone-50 dark:hover:bg-white/5">
                                            차단 해제
                                        </button>
                                    ) : (
                                        <button onClick={() => { if (confirm(`${userPopup.userName}님을 차단하시겠습니까?\n차단하면 이 사용자의 글이 보이지 않습니다.`)) handleBlock(userPopup.userId); }}
                                            className="text-[10px] px-2.5 py-1 rounded-full border border-red-200 dark:border-red-500/20 text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-500/10">
                                            차단
                                        </button>
                                    )
                                )}
                                <button onClick={() => setUserPopup(null)}
                                    className="w-8 h-8 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-sm text-slate-500 dark:text-gray-400">close</span>
                                </button>
                            </div>
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
                                                {Object.keys(r.reactions || {}).length > 0 && (
                                                    <span className="text-[10px] text-slate-400 dark:text-gray-600 flex items-center gap-0.5">✍️{Object.keys(r.reactions).length}</span>
                                                )}
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

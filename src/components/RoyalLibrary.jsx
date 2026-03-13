import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import CalendarWidget from './CalendarWidget';

export default function RoyalLibrary() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [datePopup, setDatePopup] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showAllRecords, setShowAllRecords] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!auth.currentUser) { setLoading(false); return; }
        const sessionRef = collection(db, 'users', auth.currentUser.uid, 'sessions');
        const q = query(sessionRef, orderBy('timestamp', 'desc'), limit(200));
        const unsub = onSnapshot(q, (snapshot) => {
            setSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, []);

    const handleDateSelect = (date) => {
        if (!date) { setSelectedDate(null); setDatePopup(null); return; }
        const daySessions = sessions.filter(s => {
            if (!s.timestamp) return false;
            const d = new Date(s.timestamp.seconds * 1000);
            return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
        });
        setSelectedDate(date);
        setDatePopup({ date, sessions: daySessions });
    };

    const handleDelete = async (act) => {
        if (!window.confirm('이 기록을 소각하시겠습니까? XP와 골드도 차감됩니다.')) return;
        try {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'sessions', act.id));
            await deleteDoc(doc(db, 'public_feed', act.id));
            const qSnap = await getDocs(query(collection(db, 'users', auth.currentUser.uid, 'sessions')));
            let xp = 0, gold = 0;
            qSnap.forEach(d => { xp += d.data().rewards?.xp || 0; gold += d.data().rewards?.gold || 0; });
            await updateDoc(doc(db, 'users', auth.currentUser.uid), { totalXp: xp, gold });
            if (datePopup) {
                setDatePopup(prev => ({ ...prev, sessions: prev.sessions.filter(s => s.id !== act.id) }));
            }
        } catch (err) { alert('소각 실패: ' + err.message); }
    };

    const totalMins = Math.floor(sessions.reduce((a, s) => a + (s.elapsedTime || 0), 0) / 60);
    const totalXp = sessions.reduce((a, s) => a + (s.rewards?.xp || 0), 0);
    const uniqueBooks = new Set(sessions.map(s => s.bookTitle).filter(Boolean)).size;

    // 검색 필터
    const filteredSessions = searchQuery.trim()
        ? sessions.filter(s => (s.bookTitle || '').toLowerCase().includes(searchQuery.toLowerCase()))
        : sessions;

    if (loading) return (
        <div className="text-center py-20 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-4xl animate-spin text-[#2bee4b]">progress_activity</span>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">서고를 여는 중...</p>
        </div>
    );

    return (
        <div className="p-4 space-y-5 animate-book max-w-2xl mx-auto pb-24">
            {/* 헤더 배너 */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1f0c] to-[#102213] border border-[#32673b]/60 p-5">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #2bee4b 0%, transparent 60%)' }} />
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-lg text-[#2bee4b]">library_books</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2bee4b]/70">Royal Archive</span>
                        </div>
                        <h2 className="text-2xl font-black text-white">왕실 서고</h2>
                        <p className="text-xs text-white/40 mt-0.5">나의 독서 여정이 새겨진 곳</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black text-white">{sessions.length}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">기록</p>
                    </div>
                </div>
                <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
                    {[
                        { label: '총 독서', value: totalMins >= 60 ? `${Math.floor(totalMins/60)}h ${totalMins%60}m` : `${totalMins}m`, icon: 'schedule' },
                        { label: '획득 XP', value: totalXp.toLocaleString(), icon: 'bolt' },
                        { label: '서적 종류', value: uniqueBooks, icon: 'menu_book' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white/5 rounded-2xl p-2.5 text-center border border-white/10">
                            <span className="material-symbols-outlined text-sm text-[#2bee4b]">{stat.icon}</span>
                            <p className="text-sm font-black text-white mt-0.5">{stat.value}</p>
                            <p className="text-[9px] text-white/40 uppercase tracking-wider">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Calendar Widget */}
            <CalendarWidget sessions={sessions} selectedDate={selectedDate} onDateSelect={handleDateSelect} />

            {/* 전체 기록 토글 버튼 */}
            <button
                onClick={() => setShowAllRecords(!showAllRecords)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-stone-200 dark:border-[#32673b] bg-white dark:bg-[#1a331d] text-sm font-bold text-slate-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-[#254528] transition-all active:scale-[0.98]"
            >
                <span className="material-symbols-outlined text-sm text-[#2bee4b]">
                    {showAllRecords ? 'expand_less' : 'history'}
                </span>
                {showAllRecords ? '전체 기록 접기' : `전체 기록 보기 (${sessions.length}개)`}
            </button>

            {/* 전체 기록 (토글) */}
            {showAllRecords && (
                <div className="space-y-3">
                    {/* 검색 필터 */}
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-gray-500">search</span>
                        <input
                            type="text"
                            placeholder="책 제목으로 검색..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 dark:border-[#32673b] bg-white dark:bg-[#1a331d] text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 outline-none focus:ring-1 ring-[#2bee4b] transition-all"
                        />
                    </div>

                    {filteredSessions.length === 0 ? (
                        <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-3xl p-8 text-center">
                            <p className="text-slate-400 dark:text-gray-500 text-sm">검색 결과가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredSessions.map(act => {
                                const isExpanded = expandedId === act.id;
                                const dateStr = act.timestamp
                                    ? new Date(act.timestamp.seconds * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                                    : '';
                                const mins = Math.floor((act.elapsedTime || 0) / 60);
                                return (
                                    <SessionCard key={act.id} act={act} isExpanded={isExpanded} dateStr={dateStr} mins={mins}
                                        onToggle={() => setExpandedId(isExpanded ? null : act.id)} onDelete={handleDelete} />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* 날짜 팝업 (상단 배치) */}
            {datePopup && (
                <DatePopup datePopup={datePopup} onClose={() => { setDatePopup(null); setSelectedDate(null); }} onDelete={handleDelete} />
            )}
        </div>
    );
}

/* ── 세션 카드 ─────────────────────────────────────── */
function SessionCard({ act, isExpanded, dateStr, mins, onToggle, onDelete }) {
    return (
        <div className={`bg-white dark:bg-[#1a331d] border rounded-2xl overflow-hidden transition-all duration-300 ${
            isExpanded ? 'border-[#2bee4b]/40 shadow-md dark:shadow-[#2bee4b]/10' : 'border-stone-200 dark:border-[#2a5530] hover:border-stone-300 dark:hover:border-[#2bee4b]/30'
        }`}>
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle}>
                <div className="size-10 shrink-0 rounded-xl overflow-hidden bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/5">
                    {act.bookImage
                        ? <img src={act.bookImage} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-300 dark:text-gray-600 text-base">book_2</span>
                        </div>
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{act.bookTitle || '제목 없는 기록'}</p>
                    {act.bookAuthor && <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate">{act.bookAuthor}</p>}
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#057a1b] dark:text-[#2bee4b] font-bold bg-[#2bee4b]/10 px-1.5 py-0.5 rounded-md">{mins}분</span>
                        <span className="text-[10px] text-slate-400 dark:text-gray-500">+{act.rewards?.xp || 0} XP</span>
                        {dateStr && <span className="text-[10px] text-slate-400 dark:text-gray-500 ml-auto">{dateStr}</span>}
                    </div>
                </div>
                <span className={`material-symbols-outlined text-slate-400 dark:text-gray-600 text-sm shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
            </div>
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-stone-100 dark:border-white/5 pt-3">
                    {act.pages > 0 && <p className="text-[10px] text-slate-400 dark:text-gray-500 mb-2">📖 {act.pages}페이지</p>}
                    {act.note && <p className="text-xs text-slate-500 dark:text-gray-400 italic border-l-2 border-[#2bee4b]/40 pl-3 py-1 leading-relaxed mb-3">"{act.note}"</p>}
                    <div className="flex justify-end">
                        <button onClick={() => onDelete(act)}
                            className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-bold uppercase tracking-widest">
                            <span className="material-symbols-outlined text-xs">delete</span>기록 소각
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── 날짜 팝업 (상단 배치) ────────────────────────────── */
function DatePopup({ datePopup, onClose, onDelete }) {
    const { date, sessions } = datePopup;
    const [expandedId, setExpandedId] = useState(null);
    const dateLabel = `${date.getMonth() + 1}월 ${date.getDate()}일`;
    const totalMins = Math.floor(sessions.reduce((a, s) => a + (s.elapsedTime || 0), 0) / 60);
    const totalXp = sessions.reduce((a, s) => a + (s.rewards?.xp || 0), 0);

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white dark:bg-[#0d1f0f] rounded-[28px] shadow-2xl border border-stone-200 dark:border-[#2a5530] max-h-[70vh] max-w-md w-full flex flex-col"
                onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="px-5 py-3 border-b border-stone-100 dark:border-white/5 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#2bee4b]/70">독서 기록</p>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">{dateLabel}</h3>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm text-slate-500 dark:text-gray-400">close</span>
                        </button>
                    </div>
                    <div className="flex gap-3 mt-2">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-xs text-[#2bee4b]">schedule</span>총 {totalMins}분
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-xs text-amber-400">bolt</span>+{totalXp} XP
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-xs text-[#2bee4b]">bookmark</span>{sessions.length}회
                        </div>
                    </div>
                </div>
                {/* 세션 리스트 */}
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {sessions.length === 0 ? (
                        <div className="text-center py-8">
                            <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-gray-600">auto_stories</span>
                            <p className="text-slate-400 dark:text-gray-500 text-sm mt-2">이날 기록이 없습니다.</p>
                        </div>
                    ) : sessions.map(act => {
                        const mins = Math.floor((act.elapsedTime || 0) / 60);
                        const isExpanded = expandedId === act.id;
                        return <SessionCard key={act.id} act={act} isExpanded={isExpanded} dateStr="" mins={mins}
                            onToggle={() => setExpandedId(isExpanded ? null : act.id)} onDelete={async (a) => { await onDelete(a); }} />;
                    })}
                </div>
            </div>
        </div>
    );
}

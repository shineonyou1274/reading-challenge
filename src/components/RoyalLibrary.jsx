import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import CalendarWidget from './CalendarWidget';
import ContextTip from './ContextTip';

const BOOK_STATUS_TABS = [
    { id: 'all', label: '전체', icon: 'apps' },
    { id: 'reading', label: '읽는 중', icon: 'auto_stories' },
    { id: 'to_read', label: '읽을 책', icon: 'bookmark_add' },
    { id: 'completed', label: '완독', icon: 'check_circle' },
];

const BOOKS_PER_PAGE = 12;
const SESSIONS_PER_PAGE = 20;

export default function RoyalLibrary() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [datePopup, setDatePopup] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showAllRecords, setShowAllRecords] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [bookStatusFilter, setBookStatusFilter] = useState('all');
    const [bookStatuses, setBookStatuses] = useState(() => {
        try { return JSON.parse(localStorage.getItem('rrq_book_statuses') || '{}'); } catch { return {}; }
    });
    const [bookPage, setBookPage] = useState(1);
    const [sessionPage, setSessionPage] = useState(1);
    const [readingGoal, setReadingGoal] = useState(() => {
        try { return parseInt(localStorage.getItem('rrq_reading_goal')) || 3; } catch { return 3; }
    });
    const [editingGoal, setEditingGoal] = useState(false);

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

    // 필터/검색 변경 시 페이지 리셋
    useEffect(() => { setBookPage(1); }, [bookStatusFilter, searchQuery]);
    useEffect(() => { setSessionPage(1); }, [searchQuery]);

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

    const updateBookStatus = (bookTitle, status) => {
        const updated = { ...bookStatuses, [bookTitle]: status };
        setBookStatuses(updated);
        localStorage.setItem('rrq_book_statuses', JSON.stringify(updated));
    };

    const updateReadingGoal = (val) => {
        const g = Math.max(1, Math.min(99, parseInt(val) || 3));
        setReadingGoal(g);
        localStorage.setItem('rrq_reading_goal', g.toString());
        setEditingGoal(false);
    };

    // 고유 책 목록 추출
    const uniqueBooksList = useMemo(() => {
        const map = new Map();
        sessions.forEach(s => {
            if (!s.bookTitle) return;
            if (!map.has(s.bookTitle)) {
                map.set(s.bookTitle, {
                    title: s.bookTitle,
                    author: s.bookAuthor || '',
                    image: s.bookImage || null,
                    lastRead: s.timestamp,
                    sessionCount: 1,
                    totalTime: s.elapsedTime || 0,
                });
            } else {
                const existing = map.get(s.bookTitle);
                existing.sessionCount += 1;
                existing.totalTime += (s.elapsedTime || 0);
            }
        });
        return Array.from(map.values());
    }, [sessions]);

    // 이번 달 완독 수
    const monthlyCompleted = useMemo(() => {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;
        return uniqueBooksList.filter(b => {
            if ((bookStatuses[b.title] || 'reading') !== 'completed') return false;
            if (!b.lastRead) return false;
            const d = new Date(b.lastRead.seconds * 1000);
            return `${d.getFullYear()}-${d.getMonth()}` === thisMonth;
        }).length;
    }, [uniqueBooksList, bookStatuses]);

    // 상태별 필터된 책 목록
    const filteredBooks = useMemo(() => {
        let books = uniqueBooksList;
        if (bookStatusFilter !== 'all') {
            books = books.filter(b => (bookStatuses[b.title] || 'reading') === bookStatusFilter);
        }
        if (searchQuery.trim()) {
            books = books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return books;
    }, [uniqueBooksList, bookStatusFilter, bookStatuses, searchQuery]);

    const paginatedBooks = filteredBooks.slice(0, bookPage * BOOKS_PER_PAGE);
    const hasMoreBooks = paginatedBooks.length < filteredBooks.length;

    const totalMins = Math.floor(sessions.reduce((a, s) => a + (s.elapsedTime || 0), 0) / 60);
    const totalXp = sessions.reduce((a, s) => a + (s.rewards?.xp || 0), 0);
    const uniqueBooks = new Set(sessions.map(s => s.bookTitle).filter(Boolean)).size;

    const filteredSessions = searchQuery.trim()
        ? sessions.filter(s => (s.bookTitle || '').toLowerCase().includes(searchQuery.toLowerCase()))
        : sessions;
    const paginatedSessions = filteredSessions.slice(0, sessionPage * SESSIONS_PER_PAGE);
    const hasMoreSessions = paginatedSessions.length < filteredSessions.length;

    if (loading) return (
        <div className="text-center py-20 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-4xl animate-spin text-[#2bee4b]">progress_activity</span>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">서고를 여는 중...</p>
        </div>
    );

    const goalPct = Math.min(100, Math.round((monthlyCompleted / readingGoal) * 100));

    return (
        <div className="p-4 space-y-4 animate-book max-w-2xl mx-auto pb-24">
            <ContextTip
                tipKey="library"
                icon="📚"
                title="수석 기록관의 안내"
                message="왕실 서고에 오신 것을 환영합니다. 읽은 책과 독서 기록을 관리할 수 있습니다. 책을 추가하고, 독서 상태를 변경해보세요!"
            />
            {/* 헤더 배너 — 벤토 그리드 */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1f0c] to-[#102213] border border-[#32673b]/60 p-5">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #2bee4b 0%, transparent 60%)' }} />
                <div className="relative z-10 flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="material-symbols-outlined text-base text-[#2bee4b]">library_books</span>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#2bee4b]/70">Royal Archive</span>
                        </div>
                        <h2 className="text-xl font-black text-white">왕실 서고</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-white">{sessions.length}</p>
                        <p className="text-[9px] text-white/40 uppercase tracking-widest">기록</p>
                    </div>
                </div>
                <div className="relative z-10 grid grid-cols-3 gap-2">
                    {[
                        { label: '총 독서', value: totalMins >= 60 ? `${Math.floor(totalMins/60)}h ${totalMins%60}m` : `${totalMins}m`, icon: 'schedule' },
                        { label: '획득 XP', value: totalXp.toLocaleString(), icon: 'bolt' },
                        { label: '서적 종류', value: uniqueBooks, icon: 'menu_book' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white/5 rounded-xl p-2 text-center border border-white/10">
                            <span className="material-symbols-outlined text-xs text-[#2bee4b]">{stat.icon}</span>
                            <p className="text-sm font-black text-white mt-0.5">{stat.value}</p>
                            <p className="text-[8px] text-white/40 uppercase tracking-wider">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* 읽기 목표 프로그레스 */}
            <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-2xl p-3.5 flex items-center gap-3">
                <div className="relative size-11 shrink-0">
                    <svg className="size-11 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-stone-100 dark:stroke-black/40" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#2bee4b" strokeWidth="3"
                            strokeDasharray={`${goalPct * 0.94} 94`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-[#2bee4b]">
                        {monthlyCompleted}/{readingGoal}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white">이번 달 완독 목표</p>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500">
                        {monthlyCompleted >= readingGoal ? '목표 달성! 축하합니다' : `${readingGoal - monthlyCompleted}권 더 읽으면 달성`}
                    </p>
                </div>
                {editingGoal ? (
                    <input
                        type="number"
                        autoFocus
                        defaultValue={readingGoal}
                        min={1} max={99}
                        onBlur={e => updateReadingGoal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && updateReadingGoal(e.target.value)}
                        className="w-12 text-center bg-stone-100 dark:bg-black/30 border border-[#2bee4b] rounded-lg py-1 text-sm font-bold text-slate-900 dark:text-white outline-none"
                    />
                ) : (
                    <button
                        onClick={() => setEditingGoal(true)}
                        className="text-[9px] font-bold text-[#2bee4b] bg-[#2bee4b]/10 px-2.5 py-1.5 rounded-lg border border-[#2bee4b]/20 shrink-0"
                    >
                        목표 {readingGoal}권
                    </button>
                )}
            </div>

            {/* Calendar Widget */}
            <CalendarWidget sessions={sessions} selectedDate={selectedDate} onDateSelect={handleDateSelect} />

            {/* 📚 나의 서재 */}
            <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-3xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#2bee4b] text-base">shelves</span>
                        나의 서재
                    </h3>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500 font-bold">{uniqueBooksList.length}권</span>
                </div>

                {/* 상태 탭 */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {BOOK_STATUS_TABS.map(tab => {
                        const count = tab.id === 'all'
                            ? uniqueBooksList.length
                            : uniqueBooksList.filter(b => (bookStatuses[b.title] || 'reading') === tab.id).length;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setBookStatusFilter(tab.id)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                                    bookStatusFilter === tab.id
                                        ? 'bg-[#2bee4b] text-[#102213]'
                                        : 'bg-stone-100 dark:bg-black/30 text-slate-500 dark:text-gray-400'
                                }`}
                            >
                                <span className="material-symbols-outlined text-xs">{tab.icon}</span>
                                {tab.label}
                                <span className={`text-[9px] px-1 rounded-full ${
                                    bookStatusFilter === tab.id ? 'bg-[#102213]/20' : 'bg-black/10 dark:bg-white/10'
                                }`}>{count}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 검색 (책이 6권 이상일 때만 표시) */}
                {uniqueBooksList.length >= 6 && (
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-gray-500">search</span>
                        <input
                            type="text"
                            placeholder="책 제목 검색..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 dark:border-[#32673b] bg-stone-50 dark:bg-black/20 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 outline-none focus:ring-1 ring-[#2bee4b] transition-all"
                        />
                    </div>
                )}

                {/* 책 그리드 */}
                {filteredBooks.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 dark:text-gray-500 text-xs">
                        {bookStatusFilter === 'all' ? '아직 등록된 책이 없습니다.' : '해당 상태의 책이 없습니다.'}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-2.5">
                            {paginatedBooks.map(book => {
                                const status = bookStatuses[book.title] || 'reading';
                                const statusLabel = BOOK_STATUS_TABS.find(t => t.id === status);
                                const mins = Math.floor(book.totalTime / 60);
                                return (
                                    <div key={book.title} className="group relative">
                                        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/5 mb-1 relative">
                                            {book.image ? (
                                                <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-2xl text-stone-300 dark:text-gray-600">book_2</span>
                                                </div>
                                            )}
                                            <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase backdrop-blur-md ${
                                                status === 'completed' ? 'bg-[#2bee4b]/90 text-[#102213]' :
                                                status === 'to_read' ? 'bg-amber-400/90 text-amber-900' :
                                                'bg-white/80 dark:bg-black/60 text-slate-600 dark:text-gray-300'
                                            }`}>
                                                {statusLabel?.label}
                                            </div>
                                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                {['to_read', 'reading', 'completed'].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => updateBookStatus(book.title, s)}
                                                        className={`p-1 rounded-lg transition-all ${status === s ? 'bg-[#2bee4b] text-[#102213]' : 'bg-white/20 text-white hover:bg-white/40'}`}
                                                        title={BOOK_STATUS_TABS.find(t => t.id === s)?.label}
                                                    >
                                                        <span className="material-symbols-outlined text-xs">
                                                            {s === 'to_read' ? 'bookmark_add' : s === 'reading' ? 'auto_stories' : 'check_circle'}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-800 dark:text-white truncate leading-tight">{book.title}</p>
                                        <p className="text-[9px] text-slate-400 dark:text-gray-500">{book.sessionCount}회 · {mins}분</p>
                                    </div>
                                );
                            })}
                        </div>
                        {hasMoreBooks && (
                            <button
                                onClick={() => setBookPage(p => p + 1)}
                                className="w-full py-2.5 text-xs font-bold text-[#2bee4b] bg-[#2bee4b]/5 border border-[#2bee4b]/20 rounded-xl hover:bg-[#2bee4b]/10 transition-all"
                            >
                                더보기 ({filteredBooks.length - paginatedBooks.length}권 남음)
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* 전체 기록 토글 버튼 */}
            <button
                onClick={() => setShowAllRecords(!showAllRecords)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-stone-200 dark:border-[#32673b] bg-white dark:bg-[#1a331d] text-xs font-bold text-slate-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-[#254528] transition-all active:scale-[0.98]"
            >
                <span className="material-symbols-outlined text-sm text-[#2bee4b]">
                    {showAllRecords ? 'expand_less' : 'history'}
                </span>
                {showAllRecords ? '전체 기록 접기' : `전체 기록 보기 (${sessions.length}개)`}
            </button>

            {/* 전체 기록 (토글) */}
            {showAllRecords && (
                <div className="space-y-2">
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

                    {paginatedSessions.length === 0 ? (
                        <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-3xl p-8 text-center">
                            <p className="text-slate-400 dark:text-gray-500 text-sm">검색 결과가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {paginatedSessions.map(act => {
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
                            {hasMoreSessions && (
                                <button
                                    onClick={() => setSessionPage(p => p + 1)}
                                    className="w-full py-2.5 text-xs font-bold text-[#2bee4b] bg-[#2bee4b]/5 border border-[#2bee4b]/20 rounded-xl hover:bg-[#2bee4b]/10 transition-all"
                                >
                                    더보기 ({filteredSessions.length - paginatedSessions.length}개 남음)
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 날짜 팝업 */}
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
            <div className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer" onClick={onToggle}>
                <div className="size-9 shrink-0 rounded-lg overflow-hidden bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/5">
                    {act.bookImage
                        ? <img src={act.bookImage} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-300 dark:text-gray-600 text-sm">book_2</span>
                        </div>
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{act.bookTitle || '제목 없는 기록'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#057a1b] dark:text-[#2bee4b] font-bold bg-[#2bee4b]/10 px-1.5 py-0.5 rounded-md">{mins}분</span>
                        <span className="text-[10px] text-slate-400 dark:text-gray-500">+{act.rewards?.xp || 0} XP</span>
                        {dateStr && <span className="text-[10px] text-slate-400 dark:text-gray-500 ml-auto">{dateStr}</span>}
                    </div>
                </div>
                <span className={`material-symbols-outlined text-slate-400 dark:text-gray-600 text-sm shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
            </div>
            {isExpanded && (
                <div className="px-3.5 pb-3 border-t border-stone-100 dark:border-white/5 pt-2.5">
                    {act.bookAuthor && <p className="text-[10px] text-slate-400 dark:text-gray-500 mb-1.5">저자: {act.bookAuthor}</p>}
                    {act.pages > 0 && <p className="text-[10px] text-slate-400 dark:text-gray-500 mb-1.5">📖 {act.pages}페이지</p>}
                    {act.note && <p className="text-[11px] text-slate-500 dark:text-gray-400 italic border-l-2 border-[#2bee4b]/40 pl-3 py-1 leading-relaxed mb-2">"{act.note}"</p>}
                    <div className="flex justify-end">
                        <button onClick={() => onDelete(act)}
                            className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-50 dark:bg-red-500/10 px-2.5 py-1.5 rounded-lg border border-red-100 dark:border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-bold uppercase tracking-widest">
                            <span className="material-symbols-outlined text-xs">delete</span>소각
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── 날짜 팝업 ────────────────────────────── */
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

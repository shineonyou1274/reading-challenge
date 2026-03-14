import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useReadingSession } from '../hooks/useReadingSession';
import { searchBook } from '../utils/bookApi';
import { RPG_CONFIG, getTitleForLevel, getRankForLevel } from '../utils/rpg';
import ActivityHeatmap from './ActivityHeatmap';

import { getDailyQuote } from '../utils/quotes';
import DailyQuests from './DailyQuests';
import FocusTimer from './FocusTimer';
import ContextTip from './ContextTip';


export default function QuestBoard({ stats, onSaveSession, onGoToLibrary, onModalChange }) {
    const {
        isRunning,
        elapsedTime,
        mode,
        setMode,
        startSession,
        pauseSession,
        resetSession,
        calculateRewards
    } = useReadingSession();

    const [isModalOpen, _setIsModalOpen] = useState(false);
    const setIsModalOpen = (v) => { _setIsModalOpen(v); onModalChange?.(v); };
    const [isbn, setIsbn] = useState('');
    const [bookTitle, setBookTitle] = useState('');
    const [bookAuthor, setBookAuthor] = useState('');
    const [bookImage, setBookImage] = useState('');
    const [note, setNote] = useState('');
    const [summary, setSummary] = useState('');
    const [pagesRead, setPagesRead] = useState('');
    const [localRecentBooks, setLocalRecentBooks] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('rrq_recent_books')) || [];
        } catch (e) {
            return [];
        }
    });
    const [todayTotalSeconds, setTodayTotalSeconds] = useState(0);
    const [saveToast, setSaveToast] = useState(null); // { xp, gold } | null
    const [timerMode, setTimerMode] = useState('free'); // 'free' | 'goal'
    const [goalMinutes, setGoalMinutes] = useState(25);
    const [mood, setMood] = useState('');
    const [showDailyQuest, setShowDailyQuest] = useState(false);
    const [showLongQuest, setShowLongQuest] = useState(false);

    // Books Search State
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Reading Recently State
    const [recentBooks, setRecentBooks] = useState([]);

    // 1. Calculate today's total reading time
    useEffect(() => {
        if (!auth.currentUser) return;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const sessionsRef = collection(db, 'users', auth.currentUser.uid, 'sessions');
        const qToday = query(
            sessionsRef,
            where('timestamp', '>=', Timestamp.fromDate(startOfToday))
        );

        const unsubscribeToday = onSnapshot(qToday, (snapshot) => {
            let total = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                total += (data.elapsedTime || 0);
            });
            setTodayTotalSeconds(total);
        });

        // 2. Fetch unique recent books for "Reading Now" carousel
        // Note: Firestore doesn't support 'distinct' easily, so we fetch last 20 sessions and deduplicate client-side
        const qRecent = query(sessionsRef, orderBy('timestamp', 'desc'), limit(20));
        const unsubscribeRecent = onSnapshot(qRecent, (snapshot) => {
            const booksMap = new Map();
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.bookTitle && !booksMap.has(data.bookTitle)) {
                    booksMap.set(data.bookTitle, {
                        title: data.bookTitle,
                        author: data.bookAuthor || '저자 미상',
                        image: data.bookImage || null,
                        lastRead: data.timestamp
                    });
                }
            });
            setRecentBooks(Array.from(booksMap.values()).slice(0, 5));
        });

        return () => {
            unsubscribeToday();
            unsubscribeRecent();
        };
    }, []);

    const handleSearch = async () => {
        if (!bookTitle) return;
        setIsSearching(true);
        const results = await searchBook(bookTitle);
        setSearchResults(results);
        setIsSearching(false);
    };

    const selectBook = (book) => {
        setBookTitle(book.title);
        setBookAuthor(book.author || '');
        setBookImage(book.image);
        setSearchResults([]);
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} `;
    };

    const formatTotalTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}시간 ${m} 분`;
        return `${m} 분`;
    };

    const progressPercent = stats?.xpLimit ? (stats.currentXp / stats.xpLimit) * 100 : 70;

    // 타이머 오버레이: 독서 시작 시 항상 표시
    const showFocusTimer = isRunning;
    const goalSeconds = timerMode === 'goal' ? goalMinutes * 60 : 0;

    return (
        <>
        {/* 집중 모드 전체화면 타이머 */}
        {showFocusTimer && (
            <FocusTimer
                elapsedTime={elapsedTime}
                bookTitle={bookTitle}
                mode={mode}
                isRunning={isRunning}
                goalSeconds={goalSeconds}
                onPause={() => isRunning ? pauseSession() : startSession(mode)}
                onStop={() => { pauseSession(); setIsModalOpen(true); }}
            />
        )}
        <div className="animate-book space-y-5 pb-10">
            <ContextTip
                tipKey="dashboard"
                icon="🏰"
                title="수석 기록관의 안내"
                message="여기는 황실 기록소의 본관입니다. 아래에서 책을 선택하고 독서를 시작하면 경험치와 골드를 획득할 수 있습니다. 매일 독서하면 연속 기록 보너스도 받아요!"
            />
            {/* 벤토 그리드: 명언 + 통계 통합 */}
            <section className="px-4 pt-4">
                <div className="grid grid-cols-2 gap-2.5">
                    {/* 왼쪽: 명언 (2행 높이) */}
                    {(() => {
                        const quote = getDailyQuote();
                        return (
                            <div className="row-span-2 rounded-2xl bg-gradient-to-br from-[#0d1f10] to-[#1a331d] border border-[#2bee4b]/20 p-4 flex flex-col justify-between relative overflow-hidden">
                                <div className="absolute top-2 right-2 text-xl opacity-20">📜</div>
                                <p className="text-white/90 text-[11px] font-medium leading-relaxed italic flex-1">"{quote.text}"</p>
                                <p className="text-[#2bee4b] text-[9px] font-bold mt-2">— {quote.author}</p>
                            </div>
                        );
                    })()}
                    {/* 오른쪽 상단: 오늘 독서 */}
                    <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-2xl p-3 flex items-center gap-2.5 shadow-sm">
                        <span className="material-symbols-outlined text-lg text-[#2bee4b] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                        <div>
                            <p className="text-base font-black text-slate-900 dark:text-white tabular-nums leading-tight">{formatTotalTime(todayTotalSeconds)}</p>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#92c99b]">오늘 독서</p>
                        </div>
                    </div>
                    {/* 오른쪽 하단: 스트릭 + XP 2열 */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-2xl p-2.5 text-center shadow-sm">
                            <span className="material-symbols-outlined text-sm text-orange-400" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums leading-tight">{stats?.streak || 0}일</p>
                            <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#92c99b]">스트릭</p>
                        </div>
                        <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-2xl p-2.5 text-center shadow-sm">
                            <span className="material-symbols-outlined text-sm text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums leading-tight">{stats?.totalXp?.toLocaleString() || 0}</p>
                            <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#92c99b]">누적 XP</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 📖 독서 타이머 카드 */}
            <section className="px-4">
                <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-3xl p-5 shadow-sm">

                    {/* 타이머 모드 선택 */}
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setTimerMode('free')}
                            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${timerMode === 'free' ? 'bg-[#2bee4b] text-[#102213]' : 'bg-stone-100 dark:bg-black/30 text-slate-500 dark:text-gray-400'}`}
                        >
                            ▶ 자유 기록
                        </button>
                        <button
                            onClick={() => setTimerMode('goal')}
                            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${timerMode === 'goal' ? 'bg-[#2bee4b] text-[#102213]' : 'bg-stone-100 dark:bg-black/30 text-slate-500 dark:text-gray-400'}`}
                        >
                            🍅 목표 설정
                        </button>
                    </div>

                    {/* 목표 시간 선택 (goal 모드일 때) */}
                    {timerMode === 'goal' && (
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {[15, 25, 30, 45, 60].map(min => (
                                <button
                                    key={min}
                                    onClick={() => setGoalMinutes(min)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${goalMinutes === min ? 'bg-slate-800 dark:bg-white text-white dark:text-[#102213]' : 'bg-stone-100 dark:bg-black/30 text-slate-500 dark:text-gray-400'}`}
                                >
                                    {min}분
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 시작 버튼 */}
                    <button
                        onClick={() => startSession(mode)}
                        className="w-full bg-[#2bee4b] text-[#102213] font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-[0_4px_16px_rgba(43,238,75,0.3)] active:scale-[0.98] transition-all"
                    >
                        <span className="material-symbols-outlined">play_arrow</span>
                        {timerMode === 'goal' ? `${goalMinutes}분 독서 시작` : '독서 시작'}
                    </button>
                </div>

            </section>

            {/* Reading Now Carousel (Real Data) */}
            <section className="pl-6 mb-6">
                <div className="flex items-center justify-between pr-6 mb-4">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white/90">최근 읽은 서적</h2>
                </div>
                {
                    recentBooks.length === 0 && todayTotalSeconds === 0 ? (
                        /* 스켈레톤 로딩 */
                        <div className="flex gap-5 overflow-x-auto pb-8 pr-6 no-scrollbar">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="shrink-0 w-[140px] flex flex-col gap-3">
                                    <div className="w-full aspect-[2/3] rounded-2xl bg-stone-200 dark:bg-white/5 animate-pulse" />
                                    <div className="space-y-1.5 px-1">
                                        <div className="h-3 bg-stone-200 dark:bg-white/5 rounded-full animate-pulse w-4/5" />
                                        <div className="h-2 bg-stone-100 dark:bg-white/5 rounded-full animate-pulse w-3/5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : recentBooks.length > 0 ? (
                        <div className="flex gap-5 overflow-x-auto pb-8 pr-6 no-scrollbar snap-x snap-mandatory">
                            {recentBooks.map((book, i) => (
                                <div key={i} className="snap-start shrink-0 w-[140px] flex flex-col gap-3 group cursor-pointer" onClick={() => {
                                    setBookTitle(book.title);
                                    setBookImage(book.image);
                                    setIsModalOpen(true); // Allow quick adding
                                }}>
                                    <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl group-hover:scale-[0.98] transition-all duration-300 border border-white/5 bg-[#102213]">
                                        {book.image ? (
                                            <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                <span className="material-symbols-outlined text-4xl text-white/20">book_5</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-1">
                                        <h3 className="font-bold text-sm leading-tight truncate text-slate-800 dark:text-white/90">{book.title}</h3>
                                        <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider truncate">{book.author}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="pr-6">
                            <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-white/5 rounded-2xl p-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                                아직 읽은 책이 없습니다.<br />타이머를 시작하고 독서를 기록해보세요!
                            </div>
                        </div>
                    )
                }
            </section>

            {/* 독서 잔디 히트맵 */}
            <ActivityHeatmap createdAt={stats?.createdAt} onGoToLibrary={onGoToLibrary} />

            {/* 📋 임무 토글 버튼 */}
            <section className="px-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => { setShowDailyQuest(v => !v); setShowLongQuest(false); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${
                            showDailyQuest
                                ? 'bg-[#2bee4b] text-[#102213] border-[#2bee4b] shadow-[0_2px_12px_rgba(43,238,75,0.25)]'
                                : 'bg-white dark:bg-[#1a331d] text-slate-600 dark:text-gray-400 border-stone-200 dark:border-[#32673b]'
                        }`}
                    >
                        <span className="text-base">📋</span>
                        오늘의 임무
                    </button>
                    <button
                        onClick={() => { setShowLongQuest(v => !v); setShowDailyQuest(false); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${
                            showLongQuest
                                ? 'bg-[#2bee4b] text-[#102213] border-[#2bee4b] shadow-[0_2px_12px_rgba(43,238,75,0.25)]'
                                : 'bg-white dark:bg-[#1a331d] text-slate-600 dark:text-gray-400 border-stone-200 dark:border-[#32673b]'
                        }`}
                    >
                        <span className="text-base">🗓️</span>
                        장기 임무
                    </button>
                </div>

                {/* 오늘의 임무 패널 */}
                {showDailyQuest && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <DailyQuests stats={stats} todaySeconds={todayTotalSeconds} questType="daily" />
                    </div>
                )}

                {/* 장기 임무 패널 */}
                {showLongQuest && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <DailyQuests stats={stats} todaySeconds={todayTotalSeconds} questType="long" />
                    </div>
                )}
            </section>

            {/* Verification Modal with Search */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-stone-900/40 dark:bg-[#0a150c]/90 flex items-center justify-center p-4 z-[200] backdrop-blur-md">
                        <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-[32px] p-6 max-w-sm w-full shadow-2xl animate-book max-h-[90vh] overflow-y-auto relative">
                            {/* X 닫기 버튼 */}
                            <button
                                onClick={() => { setIsModalOpen(false); }}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-white/20 transition-colors z-10"
                            >
                                <span className="material-symbols-outlined text-sm text-slate-500 dark:text-gray-400">close</span>
                            </button>
                            <div className="w-16 h-1 w-full bg-[#2bee4b]/20 rounded-full mb-4 mx-auto"></div>
                            <h2 className="text-xl font-bold text-center mb-4 text-slate-900 dark:text-white tracking-tight">지식 기록</h2>

                            <div className="space-y-4 mb-8">
                                {/* Stats Summary */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-stone-100 dark:bg-black/30 p-4 rounded-2xl text-center border border-stone-200 dark:border-white/5">
                                        <p className="text-[9px] uppercase font-bold text-[#057a1b] dark:text-[#92c99b] mb-1">획득 XP</p>
                                        <p className="text-xl font-bold text-[#2bee4b]">+{calculateRewards(elapsedTime).xp}</p>
                                    </div>
                                    <div className="bg-stone-100 dark:bg-black/30 p-4 rounded-2xl text-center border border-stone-200 dark:border-white/5">
                                        <p className="text-[9px] uppercase font-bold text-[#057a1b] dark:text-[#92c99b] mb-1">독서 시간</p>
                                        <p className="text-xl font-bold text-[#2bee4b]">{Math.floor(elapsedTime / 60)}분</p>
                                    </div>
                                </div>

                                {/* Quick Actions: Recent History */}
                                {localRecentBooks.length > 0 && !bookTitle && (
                                    <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                                        <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">최근 읽던 책 이어하기</p>
                                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                            {localRecentBooks.slice(0, 3).map((book, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        setBookTitle(book.title);
                                                        setBookImage(book.image);
                                                    }}
                                                    className="min-w-[80%] bg-[#1a331d] border border-[#32673b] p-3 rounded-xl flex items-center gap-4 hover:bg-[#254528] transition-all group text-left shrink-0"
                                                >
                                                    {book.image ? (
                                                        <img src={book.image} alt="" className="w-10 h-14 object-cover rounded shadow-md group-hover:scale-105 transition-transform" />
                                                    ) : (
                                                        <div className="w-10 h-14 bg-black/40 rounded flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-gray-600">book</span>
                                                        </div>
                                                    )}
                                                    <div className="overflow-hidden">
                                                        <p className="font-bold text-white text-sm truncate">{book.title}</p>
                                                        <p className="text-[10px] text-[#2bee4b]">터치하여 선택</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative my-4">
                                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                <div className="w-full border-t border-stone-200 dark:border-gray-700"></div>
                                            </div>
                                            <div className="relative flex justify-center">
                                                <span className="bg-white dark:bg-[#102213] px-2 text-[10px] text-gray-500 font-medium">또는 새로운 책 검색</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Book Search Input */}
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="책 제목 검색..."
                                            value={bookTitle}
                                            onChange={(e) => setBookTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            className="w-full bg-stone-100 dark:bg-black/40 border border-stone-300 dark:border-[#32673b] rounded-xl p-3 pr-10 text-sm focus:ring-1 ring-[#2bee4b] outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600"
                                        />
                                        <button
                                            onClick={handleSearch}
                                            disabled={isSearching}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2bee4b]"
                                        >
                                            <span className="material-symbols-outlined text-lg">{isSearching ? 'progress_activity' : 'search'}</span>
                                        </button>
                                    </div>

                                    {/* Pages Read Input (WPM Check) */}
                                    <div>
                                        <label className="text-[10px] font-bold text-[#2bee4b] uppercase ml-1 mb-1 block">읽은 페이지 수</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={pagesRead}
                                            onChange={(e) => setPagesRead(e.target.value)}
                                            className="w-full bg-stone-100 dark:bg-black/40 border border-stone-300 dark:border-[#32673b] rounded-xl p-3 text-sm focus:ring-1 ring-[#2bee4b] outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1.5 ml-1 leading-relaxed">
                                            ⚠️ 분당 3페이지 초과 시 페이지 XP 자동 제한 <span className="text-gray-600">(시간 XP는 정상 지급)</span>
                                        </p>
                                    </div>

                                    {/* Search Results Dropdown */}
                                    {searchResults.length > 0 && (
                                        <div className="bg-[#0f1a12] border border-[#32673b] rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                                            {searchResults.map((book, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => selectBook(book)}
                                                    className="p-2 hover:bg-[#2bee4b]/20 flex items-center gap-3 cursor-pointer border-b border-white/5 last:border-0"
                                                >
                                                    {book.image && (
                                                        <img
                                                            src={book.image}
                                                            alt=""
                                                            className="h-8 w-6 object-cover rounded bg-white/10"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextElementSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    )}
                                                    <div
                                                        className="h-8 w-6 rounded bg-white/10 flex items-center justify-center"
                                                        style={{ display: book.image ? 'none' : 'flex' }}
                                                    >
                                                        <span className="material-symbols-outlined text-[10px] text-gray-400">book</span>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-xs font-bold text-white truncate">{book.title}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{book.author}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {bookImage && (
                                        <div className="flex items-center gap-3 py-2">
                                            <div className="relative group shrink-0">
                                                <div className="w-14 h-20 rounded shadow-lg overflow-hidden border border-white/10">
                                                    <img src={bookImage} alt="Selected Cover" className="w-full h-full object-cover" />
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setBookTitle(''); setBookAuthor(''); setBookImage(''); }}
                                                    className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                                                >
                                                    <span className="material-symbols-outlined text-xs">close</span>
                                                </button>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{bookTitle}</p>
                                                {bookAuthor && <p className="text-[11px] text-[#92c99b] truncate mt-0.5">{bookAuthor}</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <textarea
                                    placeholder="오늘의 깨달음을 기록하세요..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full bg-stone-100 dark:bg-black/40 border border-stone-300 dark:border-[#32673b] rounded-xl p-3 text-sm h-24 resize-none outline-none focus:ring-1 ring-[#2bee4b] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600"
                                />

                                {/* 📝 한 줄 요약 (선택, +60 XP) */}
                                <div className="bg-stone-100 dark:bg-black/30 rounded-xl p-3 border border-[#2bee4b]/20">
                                    <p className="text-[10px] font-bold text-[#2bee4b] uppercase tracking-wider mb-1.5">
                                        📝 한 줄 요약 <span className="text-green-600 normal-case">(선택 · +60 XP)</span>
                                    </p>
                                    <input
                                        type="text"
                                        value={summary}
                                        onChange={(e) => setSummary(e.target.value)}
                                        maxLength={80}
                                        placeholder="오늘 읽은 내용을 한 문장으로..."
                                        className="w-full bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-gray-600"
                                    />
                                    {summary.length > 0 && (
                                        <p className="text-[9px] text-[#2bee4b]/60 mt-1 text-right">{summary.length}/80</p>
                                    )}
                                </div>

                                {/* 독서 감정 태그 */}
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2 ml-1">오늘의 독서 감정</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            { id: 'immersed',    label: '몰입',   emoji: '🔥' },
                                            { id: 'calm',        label: '잔잔',   emoji: '🌊' },
                                            { id: 'inspired',    label: '영감',   emoji: '💡' },
                                            { id: 'emotional',   label: '감동',   emoji: '🥹' },
                                            { id: 'challenged',  label: '도전적', emoji: '🧗' },
                                            { id: 'relaxed',     label: '편안',   emoji: '☕' },
                                        ].map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setMood(mood === m.id ? '' : m.id)}
                                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                    mood === m.id
                                                        ? 'bg-[#2bee4b] text-[#102213] shadow-sm'
                                                        : 'bg-stone-100 dark:bg-black/30 text-slate-500 dark:text-gray-400'
                                                }`}
                                            >
                                                <span className="text-sm">{m.emoji}</span>
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        const pRead = parseInt(pagesRead) || 0;
                                        const rewards = calculateRewards(elapsedTime, pRead);

                                        if (!rewards.isVerified) {
                                            if (!window.confirm(`[경고: WPM 검증 실패]\n\n읽은 속도(${rewards.ppm} PPM)가 물리적 한계를 초과했습니다.\n검증되지 않은 기록은 보상이 제한됩니다.\n\n그래도 저장하시겠습니까 ? `)) {
                                                return;
                                            }
                                        }

                                        // Save to localStorage for "Continue Reading" (History Limit: 5)
                                        const newHistory = [
                                            { title: bookTitle, image: bookImage },
                                            ...localRecentBooks.filter(b => b.title !== bookTitle)
                                        ].slice(0, 5);

                                        localStorage.setItem('rrq_recent_books', JSON.stringify(newHistory));
                                        setLocalRecentBooks(newHistory);

                                        onSaveSession({
                                            elapsedTime,
                                            mode: mode.id,
                                            isbn,
                                            bookTitle,
                                            bookAuthor,
                                            bookImage,
                                            note,
                                            summary,
                                            mood: mood || null,
                                            pagesRead: pRead,
                                            isVerified: rewards.isVerified,
                                            rewards
                                        });
                                        // ✅ 저장 완료 토스트 표시
                                        setSaveToast({ xp: rewards.xp, gold: Math.round(rewards.gold) });
                                        setTimeout(() => setSaveToast(null), 3500);
                                        setIsModalOpen(false);
                                        setBookTitle('');
                                        setBookAuthor('');
                                        setBookImage('');
                                        setNote('');
                                        setSummary('');
                                        setMood('');
                                        setPagesRead('');
                                        setSearchResults([]);
                                        resetSession();
                                    }}
                                    className="w-full bg-[#2bee4b] text-[#102213] font-bold py-4 rounded-xl shadow-lg hover:shadow-[#2bee4b]/20 active:scale-95 transition-all uppercase tracking-widest text-sm"
                                >
                                    기록 저장 완료
                                </button>
                                <button
                                    onClick={() => {
                                        // ✅ 계속 읽기: 타이머 재개
                                        setIsModalOpen(false);
                                        startSession(mode);
                                    }}
                                    className="w-full py-3 text-xs text-gray-500 font-bold hover:text-white transition-colors uppercase tracking-widest"
                                >
                                    계속 읽기
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ✅ 저장 완료 토스트 */}
            {saveToast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[400] animate-in slide-in-from-top-4 duration-300 drop-shadow-2xl">
                    <div className="bg-[#2bee4b] text-[#102213] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 font-black">
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <div>
                            <p className="text-sm uppercase tracking-widest">기록 완료!</p>
                            <p className="text-xs opacity-80">+{saveToast.xp} XP · +{saveToast.gold} 골드 획득</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
}

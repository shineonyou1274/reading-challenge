import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function ActivityHeatmap({ createdAt }) {
    const [heatmapData, setHeatmapData] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);
    const [dailySessions, setDailySessions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 가입일 기준 시작일 계산 (최대 90일)
    const today = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 89);
    let startDate = ninetyDaysAgo;
    if (createdAt) {
        const joinDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        joinDate.setHours(0, 0, 0, 0);
        if (joinDate > ninetyDaysAgo) startDate = joinDate;
    }

    // 시작일부터 오늘까지 날짜 배열 생성
    const days = [];
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= today) {
        days.push({
            dateStr: cursor.toISOString().split('T')[0],
            dayObj: new Date(cursor),
        });
        cursor.setDate(cursor.getDate() + 1);
    }

    // Fetch session data
    useEffect(() => {
        if (!auth.currentUser) return;

        const fetchHistory = async () => {
            const sessionsRef = collection(db, 'users', auth.currentUser.uid, 'sessions');
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            const q = query(sessionsRef, where('timestamp', '>=', Timestamp.fromDate(threeMonthsAgo)));
            const snapshot = await getDocs(q);

            const dataMap = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.timestamp) {
                    const date = data.timestamp.toDate().toISOString().split('T')[0];
                    if (!dataMap[date]) dataMap[date] = { count: 0, totalTime: 0, books: [] };

                    dataMap[date].count += 1;
                    dataMap[date].totalTime += (data.elapsedTime || 0);
                    dataMap[date].books.push(data);
                }
            });
            setHeatmapData(dataMap);
        };

        fetchHistory();
    }, []);

    const handleDayClick = (dateStr) => {
        const data = heatmapData[dateStr];
        if (data) {
            setSelectedDate(dateStr);
            setDailySessions(data.books);
            setIsModalOpen(true);
        }
    };

    const getColorClass = (dateStr) => {
        const data = heatmapData[dateStr];
        if (!data) return 'bg-stone-50 dark:bg-[#1a331d] border-stone-100 dark:border-white/5';

        const minutes = data.totalTime / 60;
        if (minutes >= 60) return 'bg-[#2bee4b] shadow-[0_0_8px_#2bee4b] border-transparent';
        if (minutes >= 30) return 'bg-[#2bee4b]/70 border-transparent';
        if (minutes >= 10) return 'bg-[#2bee4b]/40 border-transparent';
        return 'bg-[#2bee4b]/20 border-transparent';
    };

    return (
        <section className="px-6 mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white/90">독서 잔디</h2>
                <div className="flex gap-1 text-[10px] items-center text-slate-400 dark:text-gray-500">
                    <span>Less</span>
                    <div className="size-2 bg-[#1a331d] rounded-[2px]"></div>
                    <div className="size-2 bg-[#2bee4b]/20 rounded-[2px]"></div>
                    <div className="size-2 bg-[#2bee4b]/70 rounded-[2px]"></div>
                    <div className="size-2 bg-[#2bee4b] rounded-[2px]"></div>
                    <span>More</span>
                </div>
            </div>

            <div className="bg-white dark:bg-[#0f1a12] border border-stone-200 dark:border-[#32673b] p-6 rounded-[2.5rem] overflow-x-auto shadow-inner relative">
                {/* Garden Background Decor */}
                <div className="absolute top-2 right-4 opacity-20 pointer-events-none">
                    <span className="material-symbols-outlined text-[#2bee4b] text-4xl">local_florist</span>
                </div>

                <div className="flex flex-wrap gap-1.5 justify-center min-w-[300px] relative z-10">
                    {days.map((day) => {
                        const data = heatmapData[day.dateStr];
                        const minutes = data ? data.totalTime / 60 : 0;
                        const isBlooming = minutes >= 60;
                        const isLightBloom = minutes >= 30;

                        return (
                            <div
                                key={day.dateStr}
                                onClick={() => handleDayClick(day.dateStr)}
                                title={`${day.dateStr}: ${data ? Math.floor(minutes) + '분' : '기록 없음'}`}
                                className={`size-4 rounded-[4px] border cursor-pointer hover:scale-150 transition-all duration-300 flex items-center justify-center relative group ${getColorClass(day.dateStr)}`}
                            >
                                {isBlooming && (
                                    <span className="text-[10px] animate-bounce-slow">🌸</span>
                                )}
                                {isLightBloom && !isBlooming && (
                                    <span className="text-[8px] opacity-80">🌱</span>
                                )}

                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 pointer-events-none">
                                    <div className="bg-black/90 text-[10px] text-white px-2 py-1 rounded-md whitespace-nowrap border border-white/10 shadow-xl">
                                        {day.dateStr}: {Math.floor(minutes)}분
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 flex justify-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🌱</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">새싹 (30분+)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🌸</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">개화 (60분+)</span>
                    </div>
                </div>
            </div>

            {/* Daily History Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[300] bg-stone-900/40 dark:bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-0" onClick={() => setIsModalOpen(false)}>
                    <div
                        className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 sm:hidden"></div>

                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedDate}</h3>
                                <p className="text-xs text-slate-500 dark:text-[#92c99b] uppercase font-bold tracking-wider">
                                    총 독서: {Math.floor((heatmapData[selectedDate]?.totalTime || 0) / 60)}분
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            {dailySessions.map((session, idx) => (
                                <div key={idx} className="flex gap-4 p-3 bg-stone-50 dark:bg-black/20 rounded-xl border border-stone-100 dark:border-white/5">
                                    <div className="size-12 shrink-0 bg-stone-100 dark:bg-[#0f1a12] rounded-lg overflow-hidden border border-stone-200 dark:border-white/10">
                                        {session.bookImage ? (
                                            <img src={session.bookImage} className="w-full h-full object-cover" alt="cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                <span className="material-symbols-outlined text-sm">book</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1">{session.bookTitle || '제목 없는 기록'}</p>
                                        <div className="flex gap-2 text-[10px] text-gray-400 mt-1 uppercase font-bold">
                                            <span className="text-[#2bee4b]">{Math.floor(session.elapsedTime / 60)}분</span>
                                            <span>•</span>
                                            <span>+{session.rewards?.xp || 0} XP</span>
                                        </div>
                                        {/* ✅ 버그 수정: 문자열 리터럴이 아닌 JSX 표현식으로 렌더링 */}
                                        {session.note && (
                                            <p className="text-xs text-gray-400 mt-2 italic bg-white/5 dark:bg-black/20 p-2 rounded border-l-2 border-[#2bee4b]/30">
                                                {session.note}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

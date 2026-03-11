import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import CalendarWidget from './CalendarWidget';

export default function RoyalLibrary() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [expandedId, setExpandedId] = useState(null); // 확장된 카드 ID

    useEffect(() => {
        if (!auth.currentUser) { setLoading(false); return; }
        const sessionRef = collection(db, 'users', auth.currentUser.uid, 'sessions');
        const q = query(sessionRef, orderBy('timestamp', 'desc'), limit(100));
        const unsub = onSnapshot(q, (snapshot) => {
            setSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, []);

    const filteredSessions = selectedDate
        ? sessions.filter(s => {
            if (!s.timestamp) return false;
            const d = new Date(s.timestamp.seconds * 1000);
            return d.getDate() === selectedDate.getDate() &&
                d.getMonth() === selectedDate.getMonth() &&
                d.getFullYear() === selectedDate.getFullYear();
        })
        : sessions;

    const handleDelete = async (act) => {
        if (!window.confirm('이 기록을 소각하시겠습니까? XP와 골드도 차감됩니다.')) return;
        try {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'sessions', act.id));
            await deleteDoc(doc(db, 'public_feed', act.id));
            const qSnap = await getDocs(query(collection(db, 'users', auth.currentUser.uid, 'sessions')));
            let xp = 0, gold = 0;
            qSnap.forEach(d => { xp += d.data().rewards?.xp || 0; gold += d.data().rewards?.gold || 0; });
            await updateDoc(doc(db, 'users', auth.currentUser.uid), { totalXp: xp, gold });
        } catch (err) { alert('소각 실패: ' + err.message); }
    };

    if (loading) return (
        <div className="text-center py-20 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-4xl animate-spin text-[#2bee4b]">progress_activity</span>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">서고를 여는 중...</p>
        </div>
    );

    return (
        <div className="p-5 space-y-6 animate-book max-w-2xl mx-auto">
            {/* 헤더 */}
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-[#2bee4b]">library_books</span>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">왕실 서고</h2>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-widest">{sessions.length}개의 기록</p>
                </div>
            </div>

            {/* Calendar Widget */}
            <CalendarWidget sessions={sessions} selectedDate={selectedDate} onDateSelect={setSelectedDate} />

            {/* 리스트 헤더 */}
            <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-600 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-[#2bee4b]">history</span>
                    {selectedDate
                        ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 기록`
                        : '최근 전체 기록'}
                </p>
                {selectedDate && (
                    <button onClick={() => setSelectedDate(null)}
                        className="text-[10px] text-[#2bee4b] font-bold uppercase tracking-widest hover:underline">
                        전체 보기
                    </button>
                )}
            </div>

            {/* 기록 카드 리스트 - 컴팩트 형태 */}
            {filteredSessions.length === 0 ? (
                <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-3xl p-8 text-center">
                    <p className="text-slate-400 dark:text-gray-500 text-sm">
                        {selectedDate ? '선택한 날짜에 기록이 없습니다.' : '아직 기록이 없습니다.'}
                    </p>
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
                            <div key={act.id}
                                className={`bg-white dark:bg-[#1a331d] border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded
                                    ? 'border-[#2bee4b]/40 shadow-md dark:shadow-[#2bee4b]/10'
                                    : 'border-stone-200 dark:border-[#32673b] hover:border-stone-300 dark:hover:border-[#2bee4b]/30'}`}
                            >
                                {/* 기본 행 (컴팩트) */}
                                <div
                                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : act.id)}
                                >
                                    {/* 책 표지 썸네일 */}
                                    <div className="size-10 shrink-0 rounded-xl overflow-hidden bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/5">
                                        {act.bookImage
                                            ? <img src={act.bookImage} alt="" className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-slate-300 dark:text-gray-600 text-base">book_2</span>
                                            </div>
                                        }
                                    </div>

                                    {/* 제목 + 날짜 */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                            {act.bookTitle || '제목 없는 기록'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-[#057a1b] dark:text-[#2bee4b] font-bold bg-[#2bee4b]/10 px-1.5 py-0.5 rounded-md">
                                                {mins}분
                                            </span>
                                            <span className="text-[10px] text-slate-400 dark:text-gray-500">+{act.rewards?.xp || 0} XP</span>
                                            <span className="text-[10px] text-slate-400 dark:text-gray-500 ml-auto">{dateStr}</span>
                                        </div>
                                    </div>

                                    {/* 펼치기 화살표 */}
                                    <span className={`material-symbols-outlined text-slate-400 dark:text-gray-600 text-sm shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </div>

                                {/* 확장 영역: 노트 + 삭제 버튼 */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-stone-100 dark:border-white/5 pt-3 animate-in slide-in-from-top-2 duration-200">
                                        {act.note && (
                                            <p className="text-xs text-slate-500 dark:text-gray-400 italic border-l-2 border-[#2bee4b]/40 pl-3 py-1 leading-relaxed mb-3">
                                                "{act.note}"
                                            </p>
                                        )}
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => handleDelete(act)}
                                                className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-bold uppercase tracking-widest"
                                            >
                                                <span className="material-symbols-outlined text-xs">delete</span>
                                                기록 소각
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

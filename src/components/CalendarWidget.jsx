import React, { useState } from 'react';

export default function CalendarWidget({ sessions, onDateSelect, selectedDate }) {
    // Get current month details
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    // Create an array of days for the month
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Map sessions to dates (Set of days where reading occurred)
    const readingDays = new Set(sessions.map(s => {
        if (!s.timestamp) return null;
        const date = new Date(s.timestamp.seconds * 1000);
        return (date.getMonth() === currentMonth && date.getFullYear() === currentYear) ? date.getDate() : null;
    }).filter(d => d !== null));

    return (
        <div className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-[32px] p-6 shadow-xl mb-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-slate-400 dark:text-gray-400 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
                        <span className="material-symbols-outlined text-xl text-[#057a1b] dark:text-[#2bee4b]">calendar_month</span>
                        {currentYear}. {currentMonth + 1} 월간 현황
                    </h3>
                    <div className="flex items-center gap-1 bg-stone-100 dark:bg-black/30 rounded-lg p-1">
                        <button onClick={handlePrevMonth} className="px-2 py-1 flex items-center justify-center text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 rounded transition-colors duration-200">
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <button onClick={handleNextMonth} className="px-2 py-1 flex items-center justify-center text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 rounded transition-colors duration-200">
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🌱</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">인증 완료</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🌸</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">개화 완료</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-slate-400 dark:text-gray-600 mb-2">
                        {day}
                    </div>
                ))}

                {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square"></div>
                ))}

                {days.map(day => {
                    const isRead = readingDays.has(day);
                    const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth;
                    // ✅ 버그 수정: 월과 연도도 함께 비교
                    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                    // Specific logic for flowers in calendar
                    const daySessions = sessions.filter(s => {
                        if (!s.timestamp) return false;
                        const d = new Date(s.timestamp.seconds * 1000);
                        return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    });
                    const totalTime = daySessions.reduce((acc, s) => acc + (s.elapsedTime || 0), 0);
                    const isBlooming = totalTime >= 3600; // 1 hour+

                    return (
                        <div key={day} className="aspect-square flex items-center justify-center relative cursor-pointer group"
                            onClick={() => {
                                const newDate = new Date(currentYear, currentMonth, day);
                                onDateSelect(isSelected ? null : newDate);
                            }}
                        >
                            <div
                                className={`size-9 md:size-11 rounded-2xl flex items-center justify-center text-xs font-bold transition-all relative
                                    ${isSelected
                                        ? 'bg-[#2bee4b] dark:bg-[#2bee4b] text-[#102213] ring-2 ring-stone-200 dark:ring-white scale-110 z-10 shadow-lg'
                                        : isRead
                                            ? 'bg-stone-50 dark:bg-[#1a331d] text-[#057a1b] dark:text-[#2bee4b] border border-[#2bee4b]/40 shadow-[0_0_15px_rgba(43,238,75,0.15)] overflow-hidden'
                                            : 'bg-stone-50 dark:bg-black/20 text-slate-400 dark:text-gray-700 border border-stone-100 dark:border-white/5 hover:bg-stone-100 dark:hover:bg-white/10 shadow-sm'
                                    }
                                    ${isToday && !isRead && !isSelected ? 'border-[#057a1b] dark:border-[#2bee4b] text-[#057a1b] dark:text-[#2bee4b]' : ''}
                                `}
                            >
                                <span className="relative z-10">{day}</span>

                                {isRead && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                                        <span className={`text-[12px] ${isBlooming ? 'animate-bounce-slow' : ''}`}>
                                            {isBlooming ? '🌸' : '🌱'}
                                        </span>
                                    </div>
                                )}

                                {isRead && isSelected && (
                                    <span className="absolute -top-1 -right-1 material-symbols-outlined text-[10px] text-[#102213] bg-white rounded-full p-0.5 z-20">verified</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 dark:border-white/5 text-center">
                <p className="text-xs text-slate-400 dark:text-gray-400">
                    {selectedDate
                        ? <span className="text-slate-900 dark:text-white font-bold">{selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일의 기록을 조회합니다.</span>
                        : <span>이번 달 <span className="text-[#057a1b] dark:text-[#2bee4b] font-bold text-lg mx-1">{readingDays.size}일</span> 동안 왕실 서고를 방문하셨습니다.</span>
                    }
                </p>
            </div>
        </div>
    );
}

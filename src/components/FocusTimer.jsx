/**
 * FocusTimer — 전체화면 집중 독서 모드
 * 독서 중 전체화면 오버레이. 원형 진행 타이머 + 책 제목 표시.
 * QuestBoard에서 "집중 모드" 선택 + 독서 시작 시 활성화.
 */
import React, { useState } from 'react';

const GOAL_SECONDS = 30 * 60; // 기본 목표: 30분

export default function FocusTimer({ elapsedTime, bookTitle, mode, onPause, onStop, isRunning }) {
    const [goalSeconds] = useState(GOAL_SECONDS);

    const progress = Math.min(elapsedTime / goalSeconds, 1);
    const radius = 110;
    const circumference = 2 * Math.PI * radius;
    const dash = circumference * progress;

    const formatTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const remaining = Math.max(goalSeconds - elapsedTime, 0);
    const goalReached = elapsedTime >= goalSeconds;

    const modeLabel = mode?.label || '독서 중';
    const modeColor = mode?.id === 'focus' ? '#2bee4b' : mode?.id === 'study' ? '#22d3ee' : '#c084fc';

    return (
        <div className="fixed inset-0 z-[450] bg-[#080f09] flex flex-col items-center justify-center select-none">
            {/* 배경 글로우 */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at center, ${modeColor}08 0%, transparent 70%)`,
                }}
            />

            {/* 상단: 모드 + 책 제목 */}
            <div className="text-center mb-10 px-8">
                <div
                    className="inline-block text-[10px] font-black uppercase tracking-[0.4em] px-4 py-1.5 rounded-full mb-3"
                    style={{ color: modeColor, backgroundColor: modeColor + '20', border: `1px solid ${modeColor}40` }}
                >
                    {modeLabel}
                </div>
                <h2 className="text-white font-bold text-xl leading-tight max-w-xs truncate">
                    {bookTitle || '황실 기록소'}
                </h2>
            </div>

            {/* 원형 타이머 */}
            <div className="relative flex items-center justify-center mb-10">
                <svg width="280" height="280" viewBox="0 0 280 280">
                    {/* 배경 원 */}
                    <circle
                        cx="140" cy="140" r={radius}
                        fill="none" stroke="#1a331d" strokeWidth="10"
                    />
                    {/* 진행 원 */}
                    <circle
                        cx="140" cy="140" r={radius}
                        fill="none"
                        stroke={modeColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${circumference}`}
                        transform="rotate(-90 140 140)"
                        style={{ transition: 'stroke-dasharray 1s linear', filter: `drop-shadow(0 0 12px ${modeColor}80)` }}
                    />
                </svg>

                {/* 중앙 텍스트 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-white tabular-nums tracking-tight">
                        {formatTime(elapsedTime)}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 uppercase tracking-widest">
                        {goalReached ? '🎉 목표 달성!' : `목표 ${formatTime(remaining)} 남음`}
                    </span>
                    {goalReached && (
                        <span className="mt-2 text-[10px]" style={{ color: modeColor }}>계속 읽어도 됩니다</span>
                    )}
                </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex gap-4">
                <button
                    onClick={onPause}
                    className="flex flex-col items-center gap-1.5 w-16"
                >
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-2xl text-gray-400">
                            {isRunning ? 'pause' : 'play_arrow'}
                        </span>
                    </div>
                    <span className="text-[9px] text-gray-600 uppercase tracking-wider">
                        {isRunning ? '일시정지' : '재개'}
                    </span>
                </button>

                <button
                    onClick={onStop}
                    className="flex flex-col items-center gap-1.5 w-16"
                >
                    <div
                        className="w-14 h-14 rounded-2xl border flex items-center justify-center active:scale-95 transition-all"
                        style={{ backgroundColor: modeColor + '20', borderColor: modeColor + '60' }}
                    >
                        <span className="material-symbols-outlined text-2xl" style={{ color: modeColor }}>stop_circle</span>
                    </div>
                    <span className="text-[9px] text-gray-600 uppercase tracking-wider">기록 저장</span>
                </button>
            </div>

            {/* 힌트 */}
            <p className="absolute bottom-8 text-[10px] text-gray-700 uppercase tracking-widest">
                집중 모드 · 방해 금지
            </p>
        </div>
    );
}

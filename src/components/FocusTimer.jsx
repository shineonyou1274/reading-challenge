/**
 * FocusTimer — 전체화면 뽀모도로 타이머
 * goalSeconds=0: 자유 기록 (카운트업)
 * goalSeconds>0: 목표 기록 (카운트다운 + 진행 링)
 */

export default function FocusTimer({ elapsedTime, bookTitle, mode, onPause, onStop, isRunning, goalSeconds = 0 }) {
    const isGoalMode = goalSeconds > 0;
    const radius = 110;
    const circumference = 2 * Math.PI * radius;

    // 진행률: goal 모드면 elapsed/goal, 자유면 항상 채워진 상태
    const progress = isGoalMode ? Math.min(elapsedTime / goalSeconds, 1) : 1;
    const dash = circumference * progress;
    const remaining = isGoalMode ? Math.max(goalSeconds - elapsedTime, 0) : 0;
    const goalReached = isGoalMode && elapsedTime >= goalSeconds;

    const formatTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const modeColor = goalReached ? '#fbbf24' : '#2bee4b';

    return (
        <div className="fixed inset-0 z-[450] bg-[#080f09] flex flex-col items-center justify-center select-none">
            {/* 배경 글로우 */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(circle at center, ${modeColor}12 0%, transparent 65%)` }}
            />

            {/* 책 제목 */}
            <div className="text-center mb-8 px-8 z-10">
                <div
                    className="inline-block text-[10px] font-black uppercase tracking-[0.4em] px-4 py-1.5 rounded-full mb-3"
                    style={{ color: modeColor, backgroundColor: modeColor + '20', border: `1px solid ${modeColor}40` }}
                >
                    {isGoalMode ? `목표 ${Math.floor(goalSeconds / 60)}분` : '자유 기록'}
                </div>
                <h2 className="text-white/80 font-bold text-lg leading-tight max-w-xs truncate">
                    {bookTitle || '황실 기록소'}
                </h2>
            </div>

            {/* 원형 타이머 */}
            <div className="relative flex items-center justify-center mb-10 z-10">
                <svg width="280" height="280" viewBox="0 0 280 280">
                    {/* 배경 링 */}
                    <circle cx="140" cy="140" r={radius} fill="none" stroke="#1a331d" strokeWidth="12" />
                    {/* 진행 링 */}
                    <circle
                        cx="140" cy="140" r={radius}
                        fill="none"
                        stroke={modeColor}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${circumference}`}
                        transform="rotate(-90 140 140)"
                        style={{
                            transition: 'stroke-dasharray 1s linear',
                            filter: `drop-shadow(0 0 14px ${modeColor}90)`
                        }}
                    />
                    {/* 틱 마커 (목표 모드) */}
                    {isGoalMode && [0, 25, 50, 75].map(pct => {
                        const angle = (pct / 100) * 360 - 90;
                        const rad = (angle * Math.PI) / 180;
                        const x = 140 + (radius + 18) * Math.cos(rad);
                        const y = 140 + (radius + 18) * Math.sin(rad);
                        return <circle key={pct} cx={x} cy={y} r="2.5" fill="#1a331d" />;
                    })}
                </svg>

                {/* 중앙 텍스트 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    {/* 메인 시간 표시 */}
                    <span className="text-5xl font-black text-white tabular-nums tracking-tight leading-none">
                        {isGoalMode ? formatTime(remaining) : formatTime(elapsedTime)}
                    </span>
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest">
                        {isGoalMode
                            ? (goalReached ? '🎉 목표 달성!' : '남은 시간')
                            : `경과 ${formatTime(elapsedTime)}`
                        }
                    </span>
                    {/* 목표 모드: 경과 시간도 표시 */}
                    {isGoalMode && !goalReached && (
                        <span className="text-xs text-gray-700 tabular-nums">{formatTime(elapsedTime)} 경과</span>
                    )}
                    {goalReached && (
                        <span className="text-xs text-yellow-400 animate-pulse mt-1">계속 읽어도 됩니다 ✨</span>
                    )}
                </div>
            </div>

            {/* 진행률 바 (목표 모드) */}
            {isGoalMode && (
                <div className="w-48 mb-8 z-10">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${progress * 100}%`, backgroundColor: modeColor }}
                        />
                    </div>
                    <p className="text-center text-[10px] text-gray-600 mt-1">
                        {Math.round(progress * 100)}%
                    </p>
                </div>
            )}

            {/* 하단 버튼 */}
            <div className="flex gap-6 z-10">
                <button onClick={onPause} className="flex flex-col items-center gap-1.5">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-2xl text-gray-400">
                            {isRunning ? 'pause' : 'play_arrow'}
                        </span>
                    </div>
                    <span className="text-[9px] text-gray-600 uppercase tracking-wider">
                        {isRunning ? '일시정지' : '재개'}
                    </span>
                </button>

                <button onClick={onStop} className="flex flex-col items-center gap-1.5">
                    <div
                        className="w-14 h-14 rounded-2xl border flex items-center justify-center active:scale-95 transition-all"
                        style={{ backgroundColor: modeColor + '20', borderColor: modeColor + '60' }}
                    >
                        <span className="material-symbols-outlined text-2xl" style={{ color: modeColor }}>stop_circle</span>
                    </div>
                    <span className="text-[9px] text-gray-600 uppercase tracking-wider">기록 저장</span>
                </button>
            </div>

            <p className="absolute bottom-8 text-[10px] text-gray-800 uppercase tracking-widest z-10">
                {isGoalMode ? '🍅 뽀모도로 모드' : '📖 자유 기록 모드'}
            </p>
        </div>
    );
}

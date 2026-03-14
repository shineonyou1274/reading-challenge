import React, { useState, useEffect } from 'react';
import { getTitleForLevel } from '../utils/rpg';
import { soundManager } from '../utils/soundManager';

/**
 * 게임 이벤트 팝업 큐 렌더러
 * queue: [{ type: 'levelup'|'streak'|'chest'|'achievement', data: any }]
 * onNext: () => void — 현재 팝업 닫기
 */
export default function GamePopups({ queue, onNext, stats }) {
    const current = queue[0];

    // 팝업 등장 시 사운드 재생
    useEffect(() => {
        if (!current) return;
        soundManager.resume();
        if (current.type === 'levelup') soundManager.playLevelUp();
        else if (current.type === 'streak') soundManager.playStreak();
        else if (current.type === 'achievement') soundManager.playAchievement();
        else if (current.type === 'relic') soundManager.playAchievement();
        else if (current.type === 'dailyquest') soundManager.playSuccess?.();
        // chest는 클릭해서 열 때 재생
    }, [current?.type]);

    if (!current) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[500] flex items-center justify-center cursor-pointer select-none"
            onClick={onNext}
        >
            {/* 배경 */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />

            {/* 컨페티 파티클 (레벨업/업적 시) */}
            {(current.type === 'levelup' || current.type === 'achievement') && <Confetti />}

            {current.type === 'levelup' && <LevelUpPopup data={current.data} />}
            {current.type === 'streak' && <StreakPopup data={current.data} stats={stats} />}
            {current.type === 'chest' && <ChestPopup data={current.data} />}
            {current.type === 'relic' && <RelicPopup data={current.data} />}
            {current.type === 'achievement' && <AchievementPopup data={current.data} />}
            {current.type === 'dailyquest' && <DailyQuestPopup data={current.data} />}
            {current.type === 'shield' && <ShieldPopup data={current.data} />}

            <p className="absolute bottom-10 text-gray-400 text-xs animate-pulse tracking-widest uppercase">
                화면을 터치하면 계속
            </p>
        </div>
    );
}

// ─── 컨페티 파티클 효과 ────────────────────────────────────────────
function Confetti() {
    const colors = ['#2bee4b', '#fbbf24', '#a855f7', '#ec4899', '#06b6d4'];
    const particles = Array.from({ length: 28 }, (_, i) => ({
        id: i,
        color: colors[i % colors.length],
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.8}s`,
        duration: `${0.8 + Math.random() * 0.8}s`,
        size: `${6 + Math.random() * 8}px`,
        rotate: `${Math.random() * 360}deg`,
    }));

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute top-0 animate-confetti"
                    style={{
                        left: p.left,
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                        transform: `rotate(${p.rotate})`,
                    }}
                />
            ))}
        </div>
    );
}

// ─── 레벨업 팝업 ──────────────────────────────────────────────────
function LevelUpPopup({ data }) {
    const { oldLevel, newLevel } = data;
    const title = getTitleForLevel(newLevel);
    return (
        <div className="relative text-center px-8 animate-in zoom-in-90 duration-400">
            {/* 빛나는 배경 효과 */}
            <div className="absolute -inset-32 bg-[#2bee4b]/15 rounded-full blur-3xl animate-pulse" />

            <div className="relative">
                <div className="text-8xl mb-5 animate-bounce drop-shadow-[0_0_48px_rgba(43,238,75,0.9)]">👑</div>
                <p className="text-[#2bee4b] text-[10px] font-black uppercase tracking-[0.6em] mb-3">
                    Level Up!
                </p>
                <h2 className="text-7xl font-black text-white mb-2 tabular-nums">
                    LV.{newLevel}
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                    {oldLevel} → <span className="text-[#2bee4b] font-black">{newLevel}</span> 달성!
                </p>
                {title && (
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#2bee4b] text-[#102213] rounded-full font-black uppercase tracking-widest text-sm shadow-lg shadow-[#2bee4b]/30">
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                        {title}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── 스트릭 팝업 ──────────────────────────────────────────────────
function StreakPopup({ data, stats }) {
    const { streak } = data;
    return (
        <div className="relative text-center px-8 animate-in zoom-in-90 duration-400">
            <div className="absolute -inset-32 bg-orange-500/15 rounded-full blur-3xl animate-pulse" />
            <div className="relative">
                <div className="text-8xl mb-5 animate-bounce">🔥</div>
                <p className="text-orange-400 text-[10px] font-black uppercase tracking-[0.5em] mb-3">Streak Milestone!</p>
                <h2 className="text-6xl font-black text-white mb-3">{streak}일 연속!</h2>
                <p className="text-gray-400 text-sm">
                    불굴의 독서 정신을 칭송합니다,{' '}
                    <span className="text-orange-400 font-bold">{stats?.displayName || '학자'}!</span>
                </p>
            </div>
        </div>
    );
}

// ─── 보물상자 팝업 ────────────────────────────────────────────────
function ChestPopup({ data }) {
    const [opened, setOpened] = useState(false);
    const rarityGlow = {
        common: 'shadow-gray-400/30 bg-gray-400/10',
        uncommon: 'shadow-green-400/40 bg-[#2bee4b]/10',
        rare: 'shadow-purple-500/50 bg-purple-500/10',
    };
    const rarityTextColor = {
        common: 'text-gray-400',
        uncommon: 'text-[#2bee4b]',
        rare: 'text-purple-400',
    };

    const handleOpen = (e) => {
        e.stopPropagation();
        if (!opened) {
            setOpened(true);
            soundManager.resume();
            soundManager.playChestOpen();
        }
    };

    return (
        <div className="relative text-center px-8 animate-in zoom-in-90 duration-400" onClick={handleOpen}>
            <div className={`absolute -inset-32 rounded-full blur-3xl animate-pulse ${rarityGlow[data.rarity]}`} />

            <div className="relative">
                {!opened ? (
                    <>
                        <div className="text-8xl mb-5 animate-bounce cursor-pointer drop-shadow-2xl">📦</div>
                        <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Treasure Chest!</p>
                        <h2 className="text-2xl font-black text-white mb-2">30분 독서 달성!</h2>
                        <p className="text-gray-400 text-sm mb-6">보물상자를 열어 보상을 확인하세요</p>
                        <button
                            className="px-8 py-4 bg-amber-400 text-[#102213] rounded-full font-black uppercase tracking-widest text-sm shadow-lg shadow-amber-400/30 hover:bg-amber-300 transition-colors"
                            onClick={handleOpen}
                        >
                            🔓 상자 열기
                        </button>
                        <p className="text-gray-400 text-xs mt-4">버튼을 눌러 열거나, 화면을 터치하면 넘어갑니다</p>
                    </>
                ) : (
                    <div className="animate-in zoom-in-90 duration-300">
                        <div className="text-8xl mb-4 drop-shadow-2xl">{data.icon}</div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.5em] mb-2 ${rarityTextColor[data.rarity]}`}>
                            {data.rarityLabel} 보상!
                        </p>
                        <h2 className="text-3xl font-black text-white mb-3">{data.label}</h2>
                        <div className="flex items-center justify-center gap-4">
                            {data.xp > 0 && (
                                <div className="px-5 py-2 bg-[#2bee4b]/20 border border-[#2bee4b]/30 rounded-full">
                                    <p className="text-[#2bee4b] font-black text-lg">+{data.xp} XP</p>
                                </div>
                            )}
                            {data.gold > 0 && (
                                <div className="px-5 py-2 bg-amber-400/20 border border-amber-400/30 rounded-full">
                                    <p className="text-amber-400 font-black text-lg">+{data.gold} Gold</p>
                                </div>
                            )}
                        </div>
                        <Confetti />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── 데일리 퀘스트 완료 팝업 ──────────────────────────────────────
function DailyQuestPopup({ data }) {
    return (
        <div className="relative text-center px-8 animate-in zoom-in-90 duration-400">
            <div className="absolute -inset-32 bg-cyan-400/15 rounded-full blur-3xl animate-pulse" />
            <div className="relative">
                <div className="text-8xl mb-4 drop-shadow-2xl">{data.icon}</div>
                <p className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Mission Complete!</p>
                <h2 className="text-3xl font-black text-white mb-2">{data.name}</h2>
                <p className="text-gray-400 text-sm mb-5">{data.desc}</p>
                <div className="flex items-center justify-center gap-3">
                    <div className="inline-flex items-center gap-2 px-5 py-2 bg-[#2bee4b]/20 border border-[#2bee4b]/30 rounded-full">
                        <span className="text-[#2bee4b] font-black">+{data.xpReward} XP</span>
                    </div>
                    {data.goldReward > 0 && (
                        <div className="inline-flex items-center gap-2 px-5 py-2 bg-amber-400/20 border border-amber-400/30 rounded-full">
                            <span className="text-amber-400 font-black">+{data.goldReward} 골드</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── 스트릭 방패 발동 팝업 ────────────────────────────────────────
function ShieldPopup({ data }) {
    return (
        <div className="relative text-center px-8 animate-in zoom-in-90 duration-400">
            <div className="absolute -inset-32 bg-blue-400/15 rounded-full blur-3xl animate-pulse" />
            <div className="relative">
                <div className="text-8xl mb-4 drop-shadow-2xl">🛡️</div>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Shield Activated!</p>
                <h2 className="text-3xl font-black text-white mb-2">연속 방패 발동!</h2>
                <p className="text-gray-400 text-sm mb-5">
                    연속 기록이 끊길 위기였지만<br />방패가 기록을 지켰습니다!
                </p>
                <div className="inline-flex items-center gap-2 px-5 py-2 bg-blue-400/20 border border-blue-400/30 rounded-full">
                    <span className="text-blue-400 font-black">🔥 {data.streak}일 연속 유지!</span>
                </div>
            </div>
        </div>
    );
}

// ─── 황실 유물 드롭 팝업 ──────────────────────────────────────────
function RelicPopup({ data }) {
    const { relic, rarityInfo, rarityLabel } = data;
    return (
        <div className="relative text-center px-8 animate-in zoom-in-90 duration-400">
            <div className="absolute -inset-32 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: rarityInfo.color + '20' }} />
            <div className="relative">
                <div className="text-8xl mb-4 drop-shadow-2xl animate-bounce">{relic.icon}</div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-2" style={{ color: rarityInfo.color }}>
                    Relic Discovered!
                </p>
                <div className="inline-block px-3 py-1 rounded-full text-[10px] font-black mb-3" style={{ color: rarityInfo.color, backgroundColor: rarityInfo.color + '20', border: `1px solid ${rarityInfo.color}40` }}>
                    {rarityLabel}
                </div>
                <h2 className="text-3xl font-black text-white mb-2">{relic.name}</h2>
                <p className="text-gray-400 text-sm mb-5 max-w-xs mx-auto">{relic.desc}</p>
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full" style={{ backgroundColor: rarityInfo.color + '20', border: `1px solid ${rarityInfo.color}30` }}>
                    <span style={{ color: rarityInfo.color }} className="font-black text-sm">유물 컬렉션에 추가됨!</span>
                </div>
            </div>
        </div>
    );
}

// ─── 업적 달성 팝업 ───────────────────────────────────────────────
function AchievementPopup({ data }) {
    return (
        <div className="relative text-center px-8 animate-in zoom-in-90 duration-400">
            <div className="absolute -inset-32 bg-amber-400/15 rounded-full blur-3xl animate-pulse" />
            <div className="relative">
                <div className="text-8xl mb-4 drop-shadow-2xl">{data.icon}</div>
                <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Achievement Unlocked!</p>
                <h2 className="text-3xl font-black text-white mb-2">{data.name}</h2>
                <p className="text-gray-400 text-sm mb-5">{data.desc}</p>
                <div className="inline-flex items-center gap-2 px-5 py-2 bg-amber-400/20 border border-amber-400/30 rounded-full">
                    <span className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                    <span className="text-amber-400 font-black">+{data.xpBonus} XP 보너스</span>
                </div>
            </div>
        </div>
    );
}

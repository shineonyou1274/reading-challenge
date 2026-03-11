import { useState, useEffect, useCallback } from 'react';
import { RPG_CONFIG } from '../utils/rpg';

export function useReadingSession() {
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0); // in seconds
    const [startTime, setStartTime] = useState(null);
    const [mode, setMode] = useState(RPG_CONFIG.MODES.LIGHT);
    const [lastCheckTime, setLastCheckTime] = useState(null);

    useEffect(() => {
        let interval;
        if (isRunning) {
            interval = setInterval(() => {
                const now = Date.now();
                const rawDelta = Math.floor((now - (lastCheckTime || now)) / 1000);

                // Anti-cheat: 탭 전환/백그라운드/시계 조작 감지
                // 5초 이상 차이나면 실제 디바이스 실행 시간으로 간주하지 않고 클램핑
                const MAX_TICK_DELTA = 5;
                const delta = rawDelta > MAX_TICK_DELTA ? 1 : rawDelta;

                if (rawDelta > MAX_TICK_DELTA) {
                    console.warn(`[Anti-Cheat] Suspicious timer delta: ${rawDelta}s → clamped to ${delta}s`);
                }

                setElapsedTime(prev => prev + delta);
                setLastCheckTime(now);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, lastCheckTime]);

    const startSession = useCallback((initialMode = RPG_CONFIG.MODES.LIGHT) => {
        setMode(initialMode);
        setIsRunning(true);
        setLastCheckTime(Date.now());
        if (!startTime) setStartTime(Date.now());
    }, [startTime]);

    const pauseSession = useCallback(() => {
        setIsRunning(false);
        setLastCheckTime(null);
    }, []);

    const resetSession = useCallback(() => {
        setIsRunning(false);
        setElapsedTime(0);
        setStartTime(null);
        setLastCheckTime(null);
    }, []);

    const calculateRewards = useCallback((seconds, pagesRead = 0) => {
        const minutes = Math.max(seconds / 60, 0.1); // Avoid zero division

        // WPM / PPM (Pages Per Minute) Check
        // If pagesRead is provided, check if it exceeds physical limits
        const ppm = pagesRead / minutes;
        const isVerified = ppm <= RPG_CONFIG.MAX_PPM;

        // Calculate XP
        // 1. Time-based XP (Stability)
        const timeXp = minutes * RPG_CONFIG.XP_PER_MINUTE;

        // 2. Volume-based XP (Quantitative)
        // If speed is suspicious, cap the readable pages to the max theoretical limit
        const effectivePages = isVerified ? pagesRead : Math.floor(minutes * RPG_CONFIG.MAX_PPM);
        const volumeXp = effectivePages * RPG_CONFIG.XP_PER_PAGE;

        // Total
        let baseXp = timeXp + volumeXp;
        let totalXp = baseXp * mode.xpBonus;
        let gold = totalXp * RPG_CONFIG.GOLD_PER_XP * mode.goldBonus;

        return {
            xp: Math.round(totalXp),
            gold: Math.round(gold),
            minutes: Math.floor(minutes),
            isVerified,
            ppm: ppm.toFixed(1),
            effectivePages
        };
    }, [mode]);

    return {
        isRunning,
        elapsedTime,
        mode,
        setMode,
        startSession,
        pauseSession,
        resetSession,
        calculateRewards
    };
}

/**
 * Daily Quest System — 황실 일일 임무
 * 매일 날짜 시드(seed)를 기반으로 동일한 3가지 퀘스트를 결정.
 */
import { RPG_CONFIG } from './rpg';

/** 오늘 날짜 키 반환 (YYYY-MM-DD) */
export function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 날짜 시드 기반 deterministic shuffle로 오늘의 퀘스트 3개 선택.
 * 같은 날 모든 사용자가 동일한 퀘스트를 받음.
 */
export function getTodayQuests() {
    const templates = RPG_CONFIG.DAILY_QUEST_TEMPLATES;
    const seed = parseInt(getTodayKey().replace(/-/g, ''), 10);

    // LCG(선형합동법) 기반 시드 셔플
    const shuffled = [...templates];
    let s = seed;
    for (let i = shuffled.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        const j = Math.abs(s) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 3);
}

/**
 * 세션 데이터 + 오늘 누적 통계로 각 퀘스트 완료 여부 판정.
 * @param {object} quest - DAILY_QUEST_TEMPLATES 항목
 * @param {object} sessionData - 저장된 세션 데이터
 * @param {object} todayStats - { totalMinutes, notes, summary, mode, isNewBook }
 * @returns {boolean}
 */
export function checkQuestCompletion(quest, sessionData, todayStats) {
    const { totalMinutes = 0, note = '', summary = '', mode = '', isNewBook = false } = todayStats;

    switch (quest.id) {
        case 'read_30min':
            return totalMinutes >= 30;
        case 'read_1hour':
            return totalMinutes >= 60;
        case 'write_note':
            return (note || '').trim().length >= 10;
        case 'write_summary':
            return (summary || '').trim().length >= 5;
        case 'focus_mode':
            return mode === 'focus' && (sessionData?.elapsedTime || 0) >= 1200; // 20분
        case 'new_book':
            return !!isNewBook;
        case 'study_mode':
            return mode === 'study' && totalMinutes >= 30;
        default:
            return false;
    }
}

/**
 * Firestore의 dailyQuestProgress 필드에서 오늘 완료된 퀘스트 ID 목록 반환.
 * @param {object} userStats - Firestore users 문서 데이터
 * @returns {string[]}
 */
export function getCompletedQuestIds(userStats) {
    const progress = userStats?.dailyQuestProgress || {};
    return Object.keys(progress[getTodayKey()] || {});
}

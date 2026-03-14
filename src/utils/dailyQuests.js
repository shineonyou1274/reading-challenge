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

// ─── 주간 퀘스트 시스템 ──────────────────────────────

const WEEKLY_QUEST_TEMPLATES = [
    { id: 'week_3days',     name: '3일 독서',       desc: '이번 주 3일 이상 독서하기',           xpReward: 200, goldReward: 25, icon: '📅' },
    { id: 'week_5days',     name: '5일 독서',       desc: '이번 주 5일 이상 독서하기',           xpReward: 400, goldReward: 50, icon: '🔥' },
    { id: 'week_3hours',    name: '주간 3시간',     desc: '이번 주 총 3시간 이상 독서하기',       xpReward: 300, goldReward: 35, icon: '⏳' },
    { id: 'week_new_genre', name: '새 장르 도전',   desc: '이번 주 새로운 책 2권 이상 시작',       xpReward: 250, goldReward: 30, icon: '🌟' },
    { id: 'week_notes',     name: '기록의 주',      desc: '이번 주 독후감 3회 이상 작성',          xpReward: 200, goldReward: 25, icon: '✍️' },
    { id: 'week_focus',     name: '집중의 주',      desc: '이번 주 집중모드 3회 이상 사용',        xpReward: 250, goldReward: 30, icon: '🎯' },
];

const MONTHLY_QUEST_TEMPLATES = [
    { id: 'month_10days',   name: '월간 10일 독서', desc: '이번 달 10일 이상 독서하기',           xpReward: 600,  goldReward: 80,  icon: '📆' },
    { id: 'month_10hours',  name: '월간 10시간',    desc: '이번 달 총 10시간 이상 독서하기',      xpReward: 800,  goldReward: 100, icon: '🏰' },
    { id: 'month_5books',   name: '월간 5권 완독',  desc: '이번 달 5권 이상 완독하기',            xpReward: 1000, goldReward: 120, icon: '👑' },
];

/** 현재 주의 시작일 키 (월요일 기준, YYYY-MM-DD) */
export function getWeekKey() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일
    const mon = new Date(d.setDate(diff));
    return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
}

/** 현재 월 키 (YYYY-MM) */
export function getMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 주간 시드 기반으로 이번 주 퀘스트 2개 선택
 */
export function getWeeklyQuests() {
    const seed = parseInt(getWeekKey().replace(/-/g, ''), 10);
    const shuffled = [...WEEKLY_QUEST_TEMPLATES];
    let s = seed;
    for (let i = shuffled.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        const j = Math.abs(s) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 2);
}

/**
 * 월간 퀘스트 1개 선택 (월 시드 기반)
 */
export function getMonthlyQuest() {
    const seed = parseInt(getMonthKey().replace(/-/g, ''), 10);
    const idx = Math.abs((seed * 1664525 + 1013904223) & 0xffffffff) % MONTHLY_QUEST_TEMPLATES.length;
    return MONTHLY_QUEST_TEMPLATES[idx];
}

/**
 * 주간/월간 퀘스트 완료 여부 판정
 * @param {object} quest - 퀘스트 템플릿
 * @param {object} weeklyStats - { readDays, totalMinutes, newBooks, noteCount, focusCount }
 */
export function checkWeeklyQuestCompletion(quest, weeklyStats) {
    const { readDays = 0, totalMinutes = 0, newBooks = 0, noteCount = 0, focusCount = 0, completedBooks = 0 } = weeklyStats;
    switch (quest.id) {
        case 'week_3days':     return readDays >= 3;
        case 'week_5days':     return readDays >= 5;
        case 'week_3hours':    return totalMinutes >= 180;
        case 'week_new_genre': return newBooks >= 2;
        case 'week_notes':     return noteCount >= 3;
        case 'week_focus':     return focusCount >= 3;
        case 'month_10days':   return readDays >= 10;
        case 'month_10hours':  return totalMinutes >= 600;
        case 'month_5books':   return completedBooks >= 5;
        default: return false;
    }
}

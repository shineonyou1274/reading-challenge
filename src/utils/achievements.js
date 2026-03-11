// ===================================================================
// 업적(Achievement) 정의 및 체크 로직
// ===================================================================

export const ACHIEVEMENT_CATEGORIES = {
    record: { label: '독서 기록', icon: 'book' },
    time: { label: '독서 시간', icon: 'schedule' },
    streak: { label: '연속 독서', icon: 'local_fire_department' },
    level: { label: '성장', icon: 'star' },
    special: { label: '특별', icon: 'auto_awesome' },
};

export const ACHIEVEMENTS = [
    // ─── 독서 기록 ─────────────────────────────────────────
    { id: 'first_session', name: '첫 발걸음', desc: '첫 번째 독서 세션을 완료했습니다', icon: '🌱', xpBonus: 50, category: 'record' },
    { id: 'sessions_5', name: '꾸준한 독서가', desc: '독서 세션 5회 완료', icon: '📖', xpBonus: 100, category: 'record' },
    { id: 'sessions_20', name: '열정의 학자', desc: '독서 세션 20회 완료', icon: '📚', xpBonus: 300, category: 'record' },
    { id: 'sessions_50', name: '독서의 달인', desc: '독서 세션 50회 완료', icon: '🎓', xpBonus: 800, category: 'record' },
    { id: 'sessions_100', name: '전설의 학자', desc: '독서 세션 100회 완료', icon: '🏛️', xpBonus: 2000, category: 'record' },

    // ─── 독서 시간 ─────────────────────────────────────────
    { id: 'time_1h', name: '한 시간의 지혜', desc: '누적 1시간 독서 달성', icon: '⏰', xpBonus: 100, category: 'time' },
    { id: 'time_5h', name: '불꽃 학자', desc: '누적 5시간 독서 달성', icon: '🕯️', xpBonus: 250, category: 'time' },
    { id: 'time_10h', name: '불야성 학자', desc: '누적 10시간 독서 달성', icon: '🔆', xpBonus: 500, category: 'time' },
    { id: 'time_50h', name: '왕실 기록관', desc: '누적 50시간 독서 달성', icon: '📜', xpBonus: 2000, category: 'time' },
    { id: 'time_100h', name: '독서 황제', desc: '누적 100시간 독서 달성', icon: '🌟', xpBonus: 5000, category: 'time' },

    // ─── 연속 독서 ─────────────────────────────────────────
    { id: 'streak_3', name: '3일의 약속', desc: '3일 연속 독서', icon: '🔥', xpBonus: 100, category: 'streak' },
    { id: 'streak_7', name: '일주일 독서왕', desc: '7일 연속 독서', icon: '💪', xpBonus: 350, category: 'streak' },
    { id: 'streak_14', name: '2주의 열정', desc: '14일 연속 독서', icon: '🌊', xpBonus: 600, category: 'streak' },
    { id: 'streak_30', name: '황금 독서인', desc: '30일 연속 독서', icon: '⚡', xpBonus: 1500, category: 'streak' },

    // ─── 레벨 ──────────────────────────────────────────────
    { id: 'level_5', name: '성장하는 학자', desc: '레벨 5 달성', icon: '⭐', xpBonus: 200, category: 'level' },
    { id: 'level_10', name: '기사 학자', desc: '레벨 10 달성', icon: '🛡️', xpBonus: 500, category: 'level' },
    { id: 'level_20', name: '왕의 학자', desc: '레벨 20 달성', icon: '👑', xpBonus: 1200, category: 'level' },
    { id: 'level_30', name: '현자의 경지', desc: '레벨 30 달성', icon: '🌙', xpBonus: 3000, category: 'level' },

    // ─── 특별 ──────────────────────────────────────────────
    { id: 'night_owl', name: '밤의 부엉이', desc: '밤 10시 이후 독서 완료', icon: '🦉', xpBonus: 150, category: 'special' },
    { id: 'early_bird', name: '새벽의 학자', desc: '오전 7시 이전 독서 완료', icon: '🌅', xpBonus: 150, category: 'special' },
    { id: 'long_session', name: '집중력의 왕', desc: '한 세션에 2시간 이상 독서', icon: '🧠', xpBonus: 300, category: 'special' },
    { id: 'thoughtful', name: '독서 에세이스트', desc: '50자 이상의 독서 메모 작성', icon: '✍️', xpBonus: 100, category: 'special' },
    { id: 'book_hunter', name: '책 사냥꾼', desc: '책 검색으로 도서 선택 후 독서', icon: '🔍', xpBonus: 80, category: 'special' },
];

/**
 * 새로 달성된 업적 목록을 반환합니다.
 * @param {object} sessionData - 방금 저장된 세션 데이터
 * @param {object} newStats - 업데이트 후 예상 통계 { totalSessions, totalMinutes, streak, level }
 * @param {string[]} alreadyEarnedIds - 이미 달성한 업적 ID 목록
 */
export function checkNewAchievements(sessionData, newStats, alreadyEarnedIds) {
    const { totalSessions, totalMinutes, streak, level } = newStats;
    const hour = new Date().getHours();

    const conditions = {
        first_session: totalSessions >= 1,
        sessions_5: totalSessions >= 5,
        sessions_20: totalSessions >= 20,
        sessions_50: totalSessions >= 50,
        sessions_100: totalSessions >= 100,

        time_1h: totalMinutes >= 60,
        time_5h: totalMinutes >= 300,
        time_10h: totalMinutes >= 600,
        time_50h: totalMinutes >= 3000,
        time_100h: totalMinutes >= 6000,

        streak_3: streak >= 3,
        streak_7: streak >= 7,
        streak_14: streak >= 14,
        streak_30: streak >= 30,

        level_5: level >= 5,
        level_10: level >= 10,
        level_20: level >= 20,
        level_30: level >= 30,

        night_owl: hour >= 22,
        early_bird: hour < 7,
        long_session: (sessionData.elapsedTime || 0) >= 7200,
        thoughtful: (sessionData.note || '').length >= 50,
        book_hunter: !!sessionData.bookTitle && !!sessionData.bookImage,
    };

    return ACHIEVEMENTS.filter(
        a => conditions[a.id] === true && !alreadyEarnedIds.includes(a.id)
    );
}

// ───────────────────────────────────────────────────────────────────
// 보물상자 보상 정의
// ───────────────────────────────────────────────────────────────────

const CHEST_REWARDS = [
    // common (60%)
    { xp: 30, gold: 0, label: '보너스 경험치', icon: '⭐', rarity: 'common', color: '#9ca3af' },
    { xp: 50, gold: 0, label: '행운의 경험치', icon: '💫', rarity: 'common', color: '#9ca3af' },
    { xp: 0, gold: 20, label: '황금 동전', icon: '🪙', rarity: 'common', color: '#9ca3af' },
    // uncommon (30%)
    { xp: 0, gold: 45, label: '황금 주머니', icon: '💰', rarity: 'uncommon', color: '#22c55e' },
    { xp: 80, gold: 0, label: '고귀한 경험치', icon: '✨', rarity: 'uncommon', color: '#22c55e' },
    { xp: 50, gold: 25, label: '황금 복주머니', icon: '🎁', rarity: 'uncommon', color: '#22c55e' },
    // rare (10%)
    { xp: 120, gold: 60, label: '전설의 보물', icon: '💎', rarity: 'rare', color: '#a855f7' },
    { xp: 0, gold: 120, label: '왕의 보물창고', icon: '👑', rarity: 'rare', color: '#f59e0b' },
];

const RARITY_LABELS = { common: '일반', uncommon: '희귀', rare: '전설' };

export function getRandomChestReward() {
    const roll = Math.random();
    let pool;
    if (roll < 0.6) pool = CHEST_REWARDS.filter(r => r.rarity === 'common');
    else if (roll < 0.9) pool = CHEST_REWARDS.filter(r => r.rarity === 'uncommon');
    else pool = CHEST_REWARDS.filter(r => r.rarity === 'rare');

    const reward = pool[Math.floor(Math.random() * pool.length)];
    return { ...reward, rarityLabel: RARITY_LABELS[reward.rarity] };
}

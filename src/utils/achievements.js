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
// 보물상자 보상 정의 (레거시 — 호환용 유지)
// ───────────────────────────────────────────────────────────────────

const CHEST_REWARDS = [
    { xp: 30, gold: 0, label: '보너스 경험치', icon: '⭐', rarity: 'common', color: '#9ca3af' },
    { xp: 50, gold: 0, label: '행운의 경험치', icon: '💫', rarity: 'common', color: '#9ca3af' },
    { xp: 0, gold: 20, label: '황금 동전', icon: '🪙', rarity: 'common', color: '#9ca3af' },
    { xp: 0, gold: 45, label: '황금 주머니', icon: '💰', rarity: 'uncommon', color: '#22c55e' },
    { xp: 80, gold: 0, label: '고귀한 경험치', icon: '✨', rarity: 'uncommon', color: '#22c55e' },
    { xp: 50, gold: 25, label: '황금 복주머니', icon: '🎁', rarity: 'uncommon', color: '#22c55e' },
    { xp: 120, gold: 60, label: '전설의 보물', icon: '💎', rarity: 'rare', color: '#a855f7' },
    { xp: 0, gold: 120, label: '왕의 보물창고', icon: '👑', rarity: 'rare', color: '#f59e0b' },
];

const RARITY_LABELS = { common: '일반', uncommon: '희귀', rare: '전설', legendary: '신화' };

export function getRandomChestReward() {
    const roll = Math.random();
    let pool;
    if (roll < 0.6) pool = CHEST_REWARDS.filter(r => r.rarity === 'common');
    else if (roll < 0.9) pool = CHEST_REWARDS.filter(r => r.rarity === 'uncommon');
    else pool = CHEST_REWARDS.filter(r => r.rarity === 'rare');
    const reward = pool[Math.floor(Math.random() * pool.length)];
    return { ...reward, rarityLabel: RARITY_LABELS[reward.rarity] };
}

// ───────────────────────────────────────────────────────────────────
// 황실 유물 수집 시스템 (Collectible Relics)
// ───────────────────────────────────────────────────────────────────

export const RELIC_RARITY = {
    common:    { label: '일반',   color: '#9ca3af', chance: 0.15 },   // 15% per session
    uncommon:  { label: '희귀',   color: '#22c55e', chance: 0.06 },   // 6%
    rare:      { label: '전설',   color: '#a855f7', chance: 0.02 },   // 2%
    legendary: { label: '신화',   color: '#f59e0b', chance: 0.005 },  // 0.5%
};

export const RELICS = [
    // ─── 일반 (Common) ──────────────────────────────────────
    { id: 'quill_pen',       name: '황실 깃펜',       icon: '🪶', rarity: 'common',    desc: '황제가 칙령을 내릴 때 사용한 깃펜' },
    { id: 'ink_bottle',      name: '고대 잉크병',     icon: '🫙', rarity: 'common',    desc: '1000년 된 잉크가 담긴 유리병' },
    { id: 'old_bookmark',    name: '비단 책갈피',     icon: '🔖', rarity: 'common',    desc: '황실 서고에서 발견된 비단 책갈피' },
    { id: 'reading_stone',   name: '독서석',          icon: '🪨', rarity: 'common',    desc: '집중력을 높여준다는 신비한 돌' },
    { id: 'candle_wax',      name: '촛농 인장',       icon: '🕯️', rarity: 'common',    desc: '황실 서신에 사용된 밀랍 인장' },
    { id: 'old_coin',        name: '고대 동전',       icon: '🪙', rarity: 'common',    desc: '로그라이아 초대 황제의 동전' },

    // ─── 희귀 (Uncommon) ─────────────────────────────────────
    { id: 'crystal_lens',    name: '수정 돋보기',     icon: '🔍', rarity: 'uncommon',  desc: '숨겨진 문자를 읽을 수 있는 마법 렌즈' },
    { id: 'star_compass',    name: '별자리 나침반',   icon: '🧭', rarity: 'uncommon',  desc: '지혜의 길을 안내하는 나침반' },
    { id: 'phoenix_feather', name: '불사조 깃털',     icon: '🪶', rarity: 'uncommon',  desc: '전설의 불사조에서 떨어진 황금 깃털' },
    { id: 'time_hourglass',  name: '시간의 모래시계', icon: '⏳', rarity: 'uncommon',  desc: '독서 시간을 되돌릴 수 있다는 전설의 모래시계' },
    { id: 'wisdom_scroll',   name: '지혜의 두루마리', icon: '📜', rarity: 'uncommon',  desc: '고대 현자의 가르침이 적힌 두루마리' },

    // ─── 전설 (Rare) ─────────────────────────────────────────
    { id: 'dragon_seal',     name: '용의 인장',       icon: '🐉', rarity: 'rare',      desc: '황실의 최고 비밀 문서에만 찍힌 용의 인장' },
    { id: 'moonstone_ring',  name: '달빛 반지',       icon: '💍', rarity: 'rare',      desc: '달빛 아래서만 빛나는 마법의 반지' },
    { id: 'ancient_map',     name: '고대 지도',       icon: '🗺️', rarity: 'rare',      desc: '잊혀진 황실 도서관의 위치가 표시된 지도' },

    // ─── 신화 (Legendary) ────────────────────────────────────
    { id: 'emperor_crown',   name: '황제의 왕관',     icon: '👑', rarity: 'legendary',  desc: '전설 속 초대 황제가 쓴 왕관. 모든 지혜가 깃들어 있다' },
    { id: 'book_of_eternity',name: '영원의 서',       icon: '📕', rarity: 'legendary',  desc: '읽는 자에게 영원한 지혜를 부여한다는 금서' },
];

/**
 * 독서 기록 후 랜덤 유물 드롭 판정
 * @param {number} elapsedTime - 독서 시간(초)
 * @returns {{ relic: object, rarity: object } | null}
 */
export function rollRelicDrop(elapsedTime) {
    // 최소 5분 이상 독서해야 드롭 가능
    if (elapsedTime < 300) return null;

    // 독서 시간 보너스: 30분 이상이면 확률 1.5배, 60분 이상이면 2배
    let bonusMultiplier = 1;
    if (elapsedTime >= 3600) bonusMultiplier = 2;
    else if (elapsedTime >= 1800) bonusMultiplier = 1.5;

    // 높은 등급부터 판정 (legendary → rare → uncommon → common)
    const rarities = ['legendary', 'rare', 'uncommon', 'common'];
    for (const rarityKey of rarities) {
        const chance = RELIC_RARITY[rarityKey].chance * bonusMultiplier;
        if (Math.random() < chance) {
            const pool = RELICS.filter(r => r.rarity === rarityKey);
            const relic = pool[Math.floor(Math.random() * pool.length)];
            return {
                relic,
                rarityInfo: RELIC_RARITY[rarityKey],
                rarityLabel: RARITY_LABELS[rarityKey],
            };
        }
    }
    return null;
}

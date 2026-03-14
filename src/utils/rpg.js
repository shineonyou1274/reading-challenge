/**
 * Royal Reading Quest - RPG Constants & Logic
 */

export const RPG_CONFIG = {
    XP_PER_MINUTE: 7,
    BASE_XP_TO_LEVEL: 1000,
    LEVEL_MULTIPLIER: 1.4, // Level 2 needs 1400, Level 3 needs 1960...
    GOLD_PER_XP: 0.1, // 100 XP = 10 Gold

    MODES: {
        FOCUS: { id: 'focus', label: '깊은 몰입', xpBonus: 1.5, goldBonus: 1.2 },
        LIGHT: { id: 'light', label: '가벼운 독서', xpBonus: 1.0, goldBonus: 1.0 },
        STUDY: { id: 'study', label: '학습 및 연구', xpBonus: 1.2, goldBonus: 1.5 },
    },

    // Reading Logic Constants
    XP_PER_PAGE: 5,         // 정량적 성장 (Volume XP)
    MAX_PPM: 3.0,           // Physical Limit: Max 3 Pages Per Minute (WPM Check)
    MIN_SESSION_SEC: 60,    // Minimum session time to count

    // 2. Persistent Rank System (누적 경험치 기반 작위) — 12단계
    RANKS: [
        { minLevel: 1,  id: 'commoner',      label: '평민 (Commoner)',        icon: 'person' },
        { minLevel: 3,  id: 'squire',         label: '시종 (Squire)',          icon: 'handshake' },
        { minLevel: 5,  id: 'knight',         label: '기사 (Knight)',          icon: 'shield' },
        { minLevel: 8,  id: 'knight_captain', label: '기사단장 (Captain)',     icon: 'security' },
        { minLevel: 10, id: 'baron',          label: '남작 (Baron)',           icon: 'fort' },
        { minLevel: 15, id: 'baronet',        label: '준남작 (Baronet)',       icon: 'assured_workload' },
        { minLevel: 20, id: 'viscount',       label: '자작 (Viscount)',        icon: 'castle' },
        { minLevel: 28, id: 'earl',           label: '伯 (Earl)',              icon: 'account_balance' },
        { minLevel: 35, id: 'count',          label: '백작 (Count)',           icon: 'domain' },
        { minLevel: 45, id: 'marquis',        label: '후작 (Marquis)',         icon: 'crown' },
        { minLevel: 60, id: 'duke',           label: '공작 (Duke)',            icon: 'workspace_premium' },
        { minLevel: 80, id: 'archduke',       label: '대공 (Archduke)',        icon: 'diamond' },
    ],

    // 3. New Empire Definitions
    EMPIRES: {
        logreia: { id: 'logreia', label: '로그라이아', desc: '지혜와 기록의 제국', color: '#fbbf24' }, // Amber
        visiontium: { id: 'visiontium', label: '비전티움', desc: '상상과 창의의 제국', color: '#c084fc' }, // Purple
        factoria: { id: 'factoria', label: '팩토리아', desc: '논리와 사실의 제국', color: '#22d3ee' }, // Cyan
    },

    // 4. League Tiers (For future use)
    LEAGUE_TIERS: [
        'Bronze', 'Silver', 'Gold', 'Sapphire', 'Ruby',
        'Emerald', 'Amethyst', 'Pearl', 'Obsidian', 'Diamond'
    ],

    // 5. 황실 상회 — 골드 상점 아이템
    SHOP_ITEMS: {
        streak_shield: {
            id: 'streak_shield', name: '연속 방패', price: 500, icon: '🛡️',
            desc: '연속 독서 기록이 끊길 때 1회 자동 보호', type: 'consumable'
        },
        xp_booster: {
            id: 'xp_booster', name: 'XP 부스터', price: 300, icon: '⚡',
            desc: '다음 독서 시 경험치 1.5배 (1회)', type: 'consumable'
        },
        relic_radar: {
            id: 'relic_radar', name: '유물 탐지기', price: 200, icon: '📡',
            desc: '다음 독서 시 유물 획득 확률 2배 (1회)', type: 'consumable'
        },
        theme_aurora: {
            id: 'theme_aurora', name: '오로라 테마', price: 1000, icon: '🌌',
            desc: '오로라 배경 테마 잠금 해제', type: 'permanent'
        },
        title_sage: {
            id: 'title_sage', name: '현자 칭호', price: 2000, icon: '🔮',
            desc: '이름 옆에 ✦현자✦ 칭호 표시', type: 'permanent'
        },
        title_knight: {
            id: 'title_knight', name: '기사 칭호', price: 1500, icon: '⚔️',
            desc: '이름 옆에 ⚔️기사⚔️ 칭호 표시', type: 'permanent'
        },
        title_archmage: {
            id: 'title_archmage', name: '대마법사 칭호', price: 3000, icon: '🌟',
            desc: '이름 옆에 🌟대마법사🌟 칭호 표시', type: 'permanent'
        },
        theme_midnight: {
            id: 'theme_midnight', name: '심야 테마', price: 1200, icon: '🌙',
            desc: '심야의 보랏빛 배경 테마', type: 'permanent'
        },
        theme_forest: {
            id: 'theme_forest', name: '고대숲 테마', price: 1200, icon: '🌲',
            desc: '깊은 숲의 초록빛 배경 테마', type: 'permanent'
        },
        frame_gold: {
            id: 'frame_gold', name: '황금 프레임', price: 800, icon: '🖼️',
            desc: '프로필 아바타에 황금 테두리 적용', type: 'permanent'
        },
        frame_crystal: {
            id: 'frame_crystal', name: '수정 프레임', price: 1500, icon: '💎',
            desc: '프로필 아바타에 수정 테두리 적용', type: 'permanent'
        },
    },

    // 6. 데일리 퀘스트 템플릿
    DAILY_QUEST_TEMPLATES: [
        { id: 'read_30min',    name: '30분 독서',    desc: '오늘 30분 이상 독서하기',           xpReward: 80,  goldReward: 8,  icon: '📖' },
        { id: 'read_1hour',    name: '1시간 독서',   desc: '오늘 누적 1시간 이상 독서하기',       xpReward: 180, goldReward: 18, icon: '⏰' },
        { id: 'write_note',    name: '독후감 작성',  desc: '독서 기록에 노트 남기기 (10자 이상)', xpReward: 50,  goldReward: 5,  icon: '✍️' },
        { id: 'write_summary', name: '한 줄 요약',   desc: '세션 후 한 줄 요약 작성하기',         xpReward: 40,  goldReward: 4,  icon: '📝' },
        { id: 'focus_mode',    name: '집중 독서',    desc: '집중 모드로 20분 이상 독서',          xpReward: 120, goldReward: 12, icon: '🎯' },
        { id: 'new_book',      name: '새 책 시작',   desc: '새로운 책으로 독서 세션 시작',         xpReward: 60,  goldReward: 6,  icon: '📚' },
        { id: 'study_mode',    name: '학습 독서',    desc: '학습 모드로 30분 이상 독서',          xpReward: 100, goldReward: 15, icon: '🧠' },
    ],
};

/**
 * Calculate total XP required for a specific level
 */
export const getXpForLevel = (level) => {
    return Math.floor(RPG_CONFIG.BASE_XP_TO_LEVEL * Math.pow(RPG_CONFIG.LEVEL_MULTIPLIER, level - 1));
};

/**
 * Calculate level from total XP
 */
export const getLevelFromXP = (totalXp) => {
    let level = 1;
    let xpLimit = getXpForLevel(level);
    while (totalXp >= xpLimit) {
        totalXp -= xpLimit;
        level++;
        xpLimit = getXpForLevel(level);
    }
    return { level, currentXp: Math.floor(totalXp), xpLimit };
};

/**
 * Get display title considering purchased titles (priority: archmage > knight > sage > rank-based)
 */
export const getDisplayTitle = (inventory, defaultTitle) => {
    if ((inventory?.title_archmage || 0) > 0) return '🌟대마법사🌟';
    if ((inventory?.title_knight || 0) > 0) return '⚔️기사⚔️';
    if ((inventory?.title_sage || 0) > 0) return '✦현자✦';
    return defaultTitle || '학자';
};

/**
 * Get display title based on level (Now uses RANKS)
 */
export const getTitleForLevel = (level) => {
    // Reverse to find the highest matching rank
    const ranks = [...RPG_CONFIG.RANKS].reverse();
    const rank = ranks.find(r => level >= r.minLevel);
    // Return full label or fallback
    return rank ? rank.label : RPG_CONFIG.RANKS[0].label;
};

/**
 * Get Rank object for icon display
 */
export const getRankForLevel = (level) => {
    const ranks = [...RPG_CONFIG.RANKS].reverse();
    return ranks.find(r => level >= r.minLevel) || RPG_CONFIG.RANKS[0];
};

/**
 * League Tier definitions with level ranges
 */
const LEAGUE_TIER_DETAILS = [
    { minLevel: 1,  id: 'bronze',    label: '브론즈',       color: '#cd7f32', icon: '🥉' },
    { minLevel: 5,  id: 'silver',    label: '실버',         color: '#c0c0c0', icon: '🥈' },
    { minLevel: 10, id: 'gold',      label: '골드',         color: '#ffd700', icon: '🥇' },
    { minLevel: 15, id: 'sapphire',  label: '사파이어',     color: '#0f52ba', icon: '💎' },
    { minLevel: 20, id: 'ruby',      label: '루비',         color: '#e0115f', icon: '❤️‍🔥' },
    { minLevel: 30, id: 'emerald',   label: '에메랄드',     color: '#50c878', icon: '💚' },
    { minLevel: 40, id: 'amethyst',  label: '아메시스트',   color: '#9966cc', icon: '🔮' },
    { minLevel: 50, id: 'pearl',     label: '펄',           color: '#eae0c8', icon: '🤍' },
    { minLevel: 60, id: 'obsidian',  label: '옵시디언',     color: '#3d3635', icon: '🖤' },
    { minLevel: 75, id: 'diamond',   label: '다이아몬드',   color: '#b9f2ff', icon: '💠' },
];

/**
 * Get league tier info based on level
 * Returns { id, label, color, icon, minLevel, nextMinLevel }
 */
export const getLeagueTier = (level) => {
    const tiers = [...LEAGUE_TIER_DETAILS].reverse();
    const tier = tiers.find(t => level >= t.minLevel) || LEAGUE_TIER_DETAILS[0];
    const currentIndex = LEAGUE_TIER_DETAILS.indexOf(tier);
    const nextTier = LEAGUE_TIER_DETAILS[currentIndex + 1] || null;
    return {
        ...tier,
        nextMinLevel: nextTier ? nextTier.minLevel : null,
        nextLabel: nextTier ? nextTier.label : null,
    };
};

import { useState } from 'react';
import { RPG_CONFIG } from '../utils/rpg';

/* ── 벤토 카드 데이터 ── */
const CARDS = [
    {
        id: 'empire',
        span: 'col-span-2',
        emoji: '🏰',
        title: '3대 제국',
        desc: '가입 시 성향 분석으로 배정',
        detail: (
            <div className="flex gap-2 mt-2">
                {[
                    { label: '로그라이아', emoji: '📜', color: '#fbbf24', sub: '지혜·기록' },
                    { label: '비전티움', emoji: '🌌', color: '#c084fc', sub: '상상·창의' },
                    { label: '팩토리아', emoji: '⚙️', color: '#22d3ee', sub: '논리·사실' },
                ].map(e => (
                    <div key={e.label} className="flex-1 bg-black/20 rounded-xl p-2 text-center border border-white/5">
                        <span className="text-lg">{e.emoji}</span>
                        <p className="text-[10px] font-black mt-0.5" style={{ color: e.color }}>{e.label}</p>
                        <p className="text-[8px] text-gray-500">{e.sub}</p>
                    </div>
                ))}
            </div>
        ),
    },
    {
        id: 'xp',
        span: 'col-span-1',
        emoji: '⭐',
        title: 'XP & 레벨',
        desc: '독서 1분 = 10 XP',
        detail: (
            <div className="mt-2 space-y-1">
                {[
                    ['집중 모드', '×1.5 XP'],
                    ['30분 달성', '보물상자 🎁'],
                    ['독후감 작성', '+40 XP'],
                    ['한줄 요약', '+60 XP'],
                ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[10px]">
                        <span className="text-gray-400">{k}</span>
                        <span className="text-[#2bee4b] font-bold">{v}</span>
                    </div>
                ))}
            </div>
        ),
    },
    {
        id: 'rank',
        span: 'col-span-1',
        emoji: '👑',
        title: '작위 체계',
        desc: `${RPG_CONFIG.RANKS.length}단계 승급`,
        detail: (
            <div className="mt-2 grid grid-cols-2 gap-1 max-h-[100px] overflow-y-auto">
                {RPG_CONFIG.RANKS.map(r => (
                    <div key={r.id} className="flex justify-between text-[9px] bg-white/5 rounded-md px-1.5 py-1">
                        <span className="text-gray-300 font-bold">{r.label}</span>
                        <span className="text-[#2bee4b] font-mono">Lv{r.minLevel}</span>
                    </div>
                ))}
            </div>
        ),
    },
    {
        id: 'quest',
        span: 'col-span-1',
        emoji: '📋',
        title: '일일 임무',
        desc: '매일 3개 퀘스트 자동 배정',
        detail: (
            <div className="mt-2 space-y-1 text-[10px] text-gray-400">
                <p>• 30분/1시간 독서, 독후감, 집중모드 등</p>
                <p>• 완료 시 <span className="text-[#2bee4b] font-bold">XP + 골드</span> 보상</p>
                <p>• 전체 완수 시 보너스!</p>
            </div>
        ),
    },
    {
        id: 'longquest',
        span: 'col-span-1',
        emoji: '🗓️',
        title: '장기 임무',
        desc: '주간 2개 + 월간 1개',
        detail: (
            <div className="mt-2 space-y-1 text-[10px] text-gray-400">
                <p>• <span className="text-blue-400 font-bold">주간:</span> 3일 독서, 3시간 달성 등</p>
                <p>• <span className="text-purple-400 font-bold">월간:</span> 10일 독서, 5권 완독 등</p>
                <p>• 큰 보상 획득 기회!</p>
            </div>
        ),
    },
    {
        id: 'relic',
        span: 'col-span-2',
        emoji: '🏺',
        title: '유물 시스템',
        desc: '독서 기록 시 랜덤 발견! 30분+ → 확률 1.5배, 60분+ → 2배',
        detail: (
            <div className="mt-2 flex gap-2">
                {[
                    { label: '일반', color: '#9ca3af', pct: '60%' },
                    { label: '희귀', color: '#60a5fa', pct: '25%' },
                    { label: '영웅', color: '#a78bfa', pct: '12%' },
                    { label: '전설', color: '#fbbf24', pct: '3%' },
                ].map(r => (
                    <div key={r.label} className="flex-1 text-center bg-black/20 rounded-lg py-1.5 border border-white/5">
                        <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: r.color }} />
                        <p className="text-[9px] font-bold" style={{ color: r.color }}>{r.label}</p>
                        <p className="text-[8px] text-gray-500">{r.pct}</p>
                    </div>
                ))}
            </div>
        ),
    },
    {
        id: 'shop',
        span: 'col-span-1',
        emoji: '🛒',
        title: '황실 상회',
        desc: '골드로 아이템 구매',
        detail: (
            <div className="mt-2 space-y-1">
                {Object.values(RPG_CONFIG.SHOP_ITEMS).slice(0, 3).map(item => (
                    <div key={item.id} className="flex items-center gap-1.5 text-[9px]">
                        <span>{item.icon}</span>
                        <span className="text-gray-300 truncate flex-1">{item.name}</span>
                        <span className="text-amber-400 font-bold">💰{item.price}</span>
                    </div>
                ))}
                {Object.values(RPG_CONFIG.SHOP_ITEMS).length > 3 && (
                    <p className="text-[8px] text-gray-600 text-center">외 {Object.values(RPG_CONFIG.SHOP_ITEMS).length - 3}개</p>
                )}
            </div>
        ),
    },
    {
        id: 'tower',
        span: 'col-span-1',
        emoji: '🗼',
        title: '지혜의 탑',
        desc: '완독 수에 따라 성장',
        detail: (
            <div className="mt-2 space-y-0.5 text-[9px] text-gray-400">
                <p>🪨 초석(0권) → 🏚️ 목조(3권)</p>
                <p>🏠 석조(7권) → 🏰 기사(15권)</p>
                <p>🏛️ 왕실(25권) → 👑 지혜(60권)</p>
            </div>
        ),
    },
    {
        id: 'features',
        span: 'col-span-2',
        emoji: '✨',
        title: '독서 기능',
        desc: null,
        detail: (
            <div className="grid grid-cols-3 gap-2 mt-1">
                {[
                    { emoji: '🎭', label: '감정 태그', sub: '독서 후 기분 기록' },
                    { emoji: '📚', label: '책장 관리', sub: '읽을/읽는중/완독' },
                    { emoji: '🟩', label: '독서 잔디', sub: '활동 히트맵' },
                    { emoji: '⚔️', label: '제국 전쟁', sub: '주간 랭킹 대전' },
                    { emoji: '🔥', label: '연속 기록', sub: '스트릭 보너스' },
                    { emoji: '🔒', label: '프로필 공개', sub: '피드 노출 설정' },
                ].map(f => (
                    <div key={f.label} className="bg-black/20 rounded-lg p-2 text-center border border-white/5">
                        <span className="text-base">{f.emoji}</span>
                        <p className="text-[9px] font-bold text-white mt-0.5">{f.label}</p>
                        <p className="text-[7px] text-gray-500 leading-tight">{f.sub}</p>
                    </div>
                ))}
            </div>
        ),
    },
];

/* ── 펼쳐지는 벤토 카드 ── */
function BentoCard({ card, isExpanded, onToggle }) {
    return (
        <button
            onClick={onToggle}
            className={`${card.span} bg-[#0f1a12] border border-white/10 rounded-2xl p-3.5 text-left transition-all hover:border-[#2bee4b]/30 hover:bg-[#132417] ${isExpanded ? 'ring-1 ring-[#2bee4b]/40' : ''}`}
        >
            <div className="flex items-start gap-2">
                <span className="text-xl shrink-0">{card.emoji}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                        <h3 className="text-xs font-black text-white">{card.title}</h3>
                        <span className={`material-symbols-outlined text-[14px] text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                        </span>
                    </div>
                    {card.desc && <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{card.desc}</p>}
                </div>
            </div>
            {isExpanded && (
                <div className="mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {card.detail}
                </div>
            )}
        </button>
    );
}

export default function GuideModal({ onClose }) {
    const [expanded, setExpanded] = useState(new Set());

    const toggle = (id) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-[#050b06]/95 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-[#1a331d] border border-[#32673b] rounded-[28px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">

                {/* 헤더 */}
                <div className="px-5 py-4 border-b border-[#32673b] flex justify-between items-center bg-[#0f1a12] shrink-0">
                    <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#2bee4b] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>help</span>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest">황실 가이드</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* 벤토 그리드 */}
                <div className="flex-1 overflow-y-auto p-4">
                    <p className="text-[10px] text-gray-500 mb-3 text-center">카드를 터치하면 상세 정보가 펼쳐집니다</p>
                    <div className="grid grid-cols-2 gap-2.5">
                        {CARDS.map(card => (
                            <BentoCard
                                key={card.id}
                                card={card}
                                isExpanded={expanded.has(card.id)}
                                onToggle={() => toggle(card.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* 하단 */}
                <div className="px-5 py-3 border-t border-[#32673b] bg-[#0f1a12] shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full bg-[#2bee4b] text-[#102213] py-2.5 rounded-xl font-black text-xs uppercase tracking-widest"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}

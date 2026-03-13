import { useState } from 'react';
import { RPG_CONFIG } from '../utils/rpg';

const SECTIONS = [
    {
        id: 'empire',
        icon: 'public',
        emoji: '🏰',
        title: '제국 & 성장',
        color: '#fb923c',
        content: (
            <div className="space-y-4">
                <p className="text-gray-300 text-sm leading-relaxed">
                    가입 시 성향 분석을 통해 3개 제국 중 하나에 배정됩니다. 독서 활동이 제국의 힘이 됩니다.
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'logreia', label: '로그라이아', desc: '지혜와 기록의 제국', color: '#fbbf24', emoji: '📜' },
                        { id: 'visiontium', label: '비전티움', desc: '상상과 창의의 제국', color: '#c084fc', emoji: '🌌' },
                        { id: 'factoria', label: '팩토리아', desc: '논리와 사실의 제국', color: '#22d3ee', emoji: '⚙️' },
                    ].map(e => (
                        <div key={e.id} className="flex flex-col items-center text-center bg-black/20 p-2 rounded-xl border border-white/5">
                            <span className="text-3xl mb-1">{e.emoji}</span>
                            <p className="font-black text-[11px]" style={{ color: e.color }}>{e.label}</p>
                            <p className="text-gray-400 text-[10px] mt-0.5 leading-snug">{e.desc}</p>
                        </div>
                    ))}
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mt-2">
                    <p className="text-[11px] text-orange-300">
                        📊 피드 탭 → '제국 전쟁'에서 이번 주 제국 순위를 확인하세요. 독서 시간이 많을수록 제국이 강해집니다!
                    </p>
                </div>
            </div>
        ),
    },
    {
        id: 'growth',
        icon: 'auto_stories',
        emoji: '⭐',
        title: '성장 시스템',
        color: '#fbbf24',
        content: (
            <div className="space-y-4">
                <p className="text-gray-300 text-sm leading-relaxed">
                    독서 기록마다 XP와 골드를 획득하고 레벨업·작위 승급으로 성장합니다.
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: '독서 1분', reward: '+10 XP' },
                        { label: '1페이지 정독', reward: '+5 XP' },
                        { label: '집중 모드', reward: '×1.5 XP' },
                        { label: '30분 달성', reward: '보물상자 🎁' },
                        { label: '연속 기록', reward: '스트릭 🔥' },
                        { label: '업적 달성', reward: '보너스 XP 🏆' },
                    ].map(r => (
                        <div key={r.label} className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <p className="text-gray-400 text-[10px] uppercase mb-0.5">{r.label}</p>
                            <p className="text-[#fbbf24] font-bold text-sm">{r.reward}</p>
                        </div>
                    ))}
                </div>
                <div className="space-y-1.5 mt-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">작위 체계</p>
                    {RPG_CONFIG.RANKS.map(rank => (
                        <div key={rank.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                            <span className="text-gray-200 text-xs font-bold">{rank.label}</span>
                            <span className="text-[10px] font-mono text-[#2bee4b]">Lv.{rank.minLevel}+</span>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'pwa',
        icon: 'install_mobile',
        emoji: '📲',
        title: '앱 설치 & 문의',
        color: '#38bdf8',
        content: (
            <div className="space-y-4">
                <p className="text-gray-300 text-sm leading-relaxed">
                    이 앱은 홈 화면에 설치해서 앱처럼 사용할 수 있습니다.
                </p>
                <div className="space-y-2">
                    {[
                        { icon: '🍎', title: 'iPhone / iPad', desc: 'Safari → 하단 공유 버튼 (□↑) → "홈 화면에 추가"' },
                        { icon: '🤖', title: 'Android', desc: 'Chrome → 우측 상단 ⋮ → "앱 설치" 또는 "홈 화면에 추가"' },
                        { icon: '💻', title: 'PC (Chrome/Edge)', desc: '주소창 우측 설치 아이콘 클릭 → 설치' },
                    ].map(i => (
                        <div key={i.title} className="flex gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                            <span className="text-xl shrink-0">{i.icon}</span>
                            <div>
                                <p className="text-white text-xs font-bold mb-0.5">{i.title}</p>
                                <p className="text-gray-400 text-[11px] leading-relaxed">{i.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3">
                    <p className="text-[11px] text-sky-300 font-bold mb-1">📬 문의사항</p>
                    <p className="text-[11px] text-sky-200">
                        <a href="mailto:shineonyou1274@gmail.com" className="underline underline-offset-2">
                            shineonyou1274@gmail.com
                        </a>
                    </p>
                </div>
            </div>
        ),
    },
];

export default function GuideModal({ onClose }) {
    const [activeSection, setActiveSection] = useState('empire');
    const current = SECTIONS.find(s => s.id === activeSection);

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-[#050b06]/95 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="max-w-lg w-full bg-[#1a331d] border border-[#32673b] rounded-[28px] overflow-hidden flex flex-col max-h-[92vh] shadow-2xl">

                {/* ── 헤더 */}
                <div className="px-6 py-4 border-b border-[#32673b] flex justify-between items-center bg-[#0f1a12] shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#2bee4b] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>help</span>
                        <h2 className="text-base font-black text-white uppercase tracking-widest">황실 가이드</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* ── 탭 바 */}
                <div className="flex gap-1 px-4 py-3 border-b border-[#32673b] shrink-0 bg-[#0f1a12]/50">
                    {SECTIONS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(s.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all ${activeSection === s.id
                                ? 'bg-[#2bee4b] text-[#102213]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <span>{s.emoji}</span>
                            <span className="hidden sm:inline">{s.title.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>

                {/* ── 본문 */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <h3 className="text-white font-black text-base flex items-center gap-2">
                        <span className="text-xl">{current?.emoji}</span>
                        {current?.title}
                    </h3>
                    {current?.content}
                </div>

                {/* ── 하단 */}
                <div className="px-5 py-4 border-t border-[#32673b] bg-[#0f1a12] flex items-center justify-between shrink-0">
                    <button
                        onClick={() => {
                            const idx = SECTIONS.findIndex(s => s.id === activeSection);
                            if (idx > 0) setActiveSection(SECTIONS[idx - 1].id);
                        }}
                        disabled={SECTIONS.findIndex(s => s.id === activeSection) === 0}
                        className="text-gray-500 hover:text-white disabled:opacity-30 transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wide"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        이전
                    </button>
                    <span className="text-[10px] text-gray-600 font-bold">
                        {SECTIONS.findIndex(s => s.id === activeSection) + 1} / {SECTIONS.length}
                    </span>
                    {SECTIONS.findIndex(s => s.id === activeSection) < SECTIONS.length - 1 ? (
                        <button
                            onClick={() => {
                                const idx = SECTIONS.findIndex(s => s.id === activeSection);
                                setActiveSection(SECTIONS[idx + 1].id);
                            }}
                            className="text-[#2bee4b] hover:text-white transition-colors flex items-center gap-1 text-xs font-black uppercase tracking-wide"
                        >
                            다음
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="bg-[#2bee4b] text-[#102213] px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest"
                        >
                            완료 ✓
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

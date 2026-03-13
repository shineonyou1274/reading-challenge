/**
 * GoldShop — 황실 상회
 * 골드로 아이템을 구매하는 상점 컴포넌트
 */
import React, { useState } from 'react';
import { RPG_CONFIG } from '../utils/rpg';

const ITEMS = Object.values(RPG_CONFIG.SHOP_ITEMS);

const RARITY_BADGE = {
    consumable: { label: '소모품', color: '#22d3ee' },
    permanent:  { label: '영구',   color: '#c084fc' },
};

export default function GoldShop({ stats, onPurchase }) {
    const [toast, setToast] = useState(null);
    const [confirmItem, setConfirmItem] = useState(null);

    const gold = stats?.gold || 0;
    const inventory = stats?.inventory || {};

    const handleBuy = (item) => {
        if (gold < item.price) return;
        setConfirmItem(item);
    };

    const confirmPurchase = async () => {
        if (!confirmItem) return;
        await onPurchase(confirmItem.id);
        setToast(`${confirmItem.icon} ${confirmItem.name} 구매 완료!`);
        setTimeout(() => setToast(null), 2500);
        setConfirmItem(null);
    };

    return (
        <div className="space-y-4 pb-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">황실 상회</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Royal Merchant</p>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/30 rounded-xl px-3 py-1.5">
                    <span className="text-amber-400 text-base">💰</span>
                    <span className="text-amber-400 font-black text-sm">{gold.toLocaleString()}</span>
                    <span className="text-amber-400/60 text-[10px]">골드</span>
                </div>
            </div>

            {/* 아이템 그리드 — 컴팩트 */}
            <div className="grid grid-cols-2 gap-2">
                {ITEMS.map((item) => {
                    const owned = inventory[item.id] || 0;
                    const canBuy = gold >= item.price;
                    const badge = RARITY_BADGE[item.type] || RARITY_BADGE.consumable;

                    return (
                        <button
                            key={item.id}
                            onClick={() => handleBuy(item)}
                            disabled={!canBuy || (item.type === 'permanent' && owned > 0)}
                            className={`bg-[#1a331d] border rounded-xl p-2.5 flex items-center gap-2.5 transition-all text-left active:scale-[0.98] ${
                                canBuy ? 'border-[#32673b]' : 'border-[#32673b]/40 opacity-60'
                            }`}
                        >
                            {/* 아이콘 */}
                            <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-xl border border-white/5 relative shrink-0">
                                {item.icon}
                                {owned > 0 && item.type === 'consumable' && (
                                    <span className="absolute -top-1 -right-1 bg-[#2bee4b] text-[#102213] text-[7px] font-black px-1 rounded-full border border-[#102213]">×{owned}</span>
                                )}
                                {item.type === 'permanent' && owned > 0 && (
                                    <span className="absolute -top-1 -right-1 text-[10px]">✅</span>
                                )}
                            </div>

                            {/* 이름 + 가격 */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-white text-[11px] truncate">{item.name}</span>
                                    <span className="text-[8px] font-bold px-1 py-0.5 rounded-full shrink-0" style={{ color: badge.color, backgroundColor: badge.color + '20' }}>{badge.label}</span>
                                </div>
                                <p className="text-[9px] text-gray-500 leading-tight truncate mt-0.5">{item.desc}</p>
                                <div className="mt-1">
                                    {item.type === 'permanent' && owned > 0 ? (
                                        <span className="text-[9px] font-bold text-purple-400">획득됨</span>
                                    ) : (
                                        <span className="text-[10px] font-black text-amber-400">💰 {item.price.toLocaleString()}</span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* 인벤토리 요약 */}
            {Object.keys(inventory).length > 0 && (
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">보유 아이템</p>
                    <div className="flex flex-wrap gap-2">
                        {ITEMS.filter(i => (inventory[i.id] || 0) > 0).map(item => (
                            <div key={item.id} className="flex items-center gap-1.5 bg-[#1a331d] border border-[#32673b] rounded-xl px-2 py-1">
                                <span className="text-sm">{item.icon}</span>
                                <span className="text-[11px] text-white font-medium">{item.name}</span>
                                {item.type === 'consumable' && (
                                    <span className="text-[10px] text-[#2bee4b] font-bold">×{inventory[item.id]}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 구매 확인 모달 */}
            {confirmItem && (
                <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/70 flex items-center justify-center z-[300] p-6 backdrop-blur-sm">
                    <div className="bg-[#1a331d] border border-[#32673b] rounded-3xl p-6 max-w-xs w-full text-center animate-book">
                        <div className="text-5xl mb-3">{confirmItem.icon}</div>
                        <h3 className="text-lg font-black text-white mb-1">{confirmItem.name}</h3>
                        <p className="text-sm text-gray-400 mb-4">{confirmItem.desc}</p>
                        <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl py-2 mb-5">
                            <span className="text-amber-400 font-black">💰 {confirmItem.price.toLocaleString()} 골드</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setConfirmItem(null)}
                                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmPurchase}
                                className="flex-1 py-3 rounded-xl bg-amber-400 text-[#102213] font-black text-sm"
                            >
                                구매!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 구매 완료 토스트 */}
            {toast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[400] animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-amber-400 text-[#102213] px-5 py-3 rounded-2xl shadow-xl font-black text-sm">
                        {toast}
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { RPG_CONFIG, getLevelFromXP } from '../utils/rpg';

/**
 * 이주의 학자 배너 컴포넌트
 * Firestore /system/scholar 에서 데이터 실시간 구독
 */
export default function ScholarBanner() {
    const [scholar, setScholar] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'system', 'scholar'), (snap) => {
            if (snap.exists()) setScholar(snap.data());
            else setScholar(null);
        });
        return () => unsub();
    }, []);

    if (!scholar) return null;

    const empireColor = RPG_CONFIG.EMPIRES[scholar.empireId]?.color || '#2bee4b';
    const empireLabel = RPG_CONFIG.EMPIRES[scholar.empireId]?.label || '';
    const { level } = getLevelFromXP(scholar.totalXp || 0);

    // 이번 주 월요일 날짜 가져오기
    const weekStart = scholar.weekStart?.seconds
        ? new Date(scholar.weekStart.seconds * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
        : null;

    return (
        <div
            className="rounded-3xl border p-5 mb-6 overflow-hidden relative"
            style={{
                borderColor: empireColor + '40',
                background: `linear-gradient(135deg, ${empireColor}18 0%, transparent 60%)`,
            }}
        >
            {/* 배경 왕관 장식 */}
            <div className="absolute top-3 right-4 text-6xl opacity-10 select-none pointer-events-none">👑</div>

            <div className="flex items-start gap-4">
                {/* 아바타 */}
                <div
                    className="size-14 rounded-2xl overflow-hidden border-2 shrink-0 shadow-lg"
                    style={{ borderColor: empireColor + '60' }}
                >
                    <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${scholar.uid}`}
                        alt={scholar.displayName}
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="flex-1 min-w-0">
                    {/* 배너 제목 */}
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="text-[9px] font-black uppercase tracking-[0.4em] px-2 py-0.5 rounded-full"
                            style={{ background: empireColor + '25', color: empireColor }}
                        >
                            👑 이주의 학자
                        </span>
                        {weekStart && (
                            <span className="text-[9px] text-gray-500 dark:text-gray-600">{weekStart}주</span>
                        )}
                    </div>

                    {/* 이름 */}
                    <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">{scholar.displayName}</h3>

                    {/* 제국 + 레벨 */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold" style={{ color: empireColor }}>
                            {empireLabel} · LV.{level}
                        </span>
                    </div>

                    {/* 선정 이유 */}
                    {scholar.reason && (
                        <p className="text-xs text-slate-600 dark:text-gray-400 italic border-l-2 pl-2 leading-relaxed"
                            style={{ borderColor: empireColor + '60' }}>
                            "{scholar.reason}"
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

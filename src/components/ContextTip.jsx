import { useState, useEffect } from 'react';

/**
 * 섹션별 첫 방문 안내 팁
 * - localStorage로 한 번만 표시
 * - 5초 후 자동 사라짐 또는 탭으로 닫기
 */
export default function ContextTip({ tipKey, icon, title, message, delay = 300 }) {
    const storageKey = `rrq_tip_${tipKey}`;
    const [visible, setVisible] = useState(false);
    const [hiding, setHiding] = useState(false);

    useEffect(() => {
        if (localStorage.getItem(storageKey)) return;
        const showTimer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(showTimer);
    }, [storageKey, delay]);

    useEffect(() => {
        if (!visible) return;
        const autoHide = setTimeout(() => dismiss(), 6000);
        return () => clearTimeout(autoHide);
    }, [visible]);

    const dismiss = () => {
        setHiding(true);
        localStorage.setItem(storageKey, '1');
        setTimeout(() => setVisible(false), 300);
    };

    if (!visible) return null;

    return (
        <div
            onClick={dismiss}
            className={`mx-4 mb-4 p-4 rounded-2xl border border-[#2bee4b]/30 bg-[#2bee4b]/5 dark:bg-[#2bee4b]/10 backdrop-blur-sm cursor-pointer transition-all duration-300 ${hiding ? 'opacity-0 translate-y-2' : 'opacity-100 animate-in fade-in slide-in-from-top-2'}`}
        >
            <div className="flex items-start gap-3">
                <div className="size-9 shrink-0 rounded-xl bg-[#2bee4b]/20 border border-[#2bee4b]/30 flex items-center justify-center">
                    <span className="text-lg">{icon || '📜'}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-[#057a1b] dark:text-[#2bee4b] uppercase tracking-wider mb-0.5">{title}</p>
                    <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">{message}</p>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-gray-600 shrink-0 mt-0.5">탭하여 닫기</span>
            </div>
        </div>
    );
}

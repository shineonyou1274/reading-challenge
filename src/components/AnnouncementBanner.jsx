import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * 공지사항 배너 컴포넌트
 * - Firestore /announcements 에서 활성 공지를 실시간으로 가져와 표시
 */
export default function AnnouncementBanner() {
    const [announcements, setAnnouncements] = useState([]);
    const [dismissed, setDismissed] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('rrq_dismissed_announcements') || '[]');
        } catch { return []; }
    });

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    const handleDismiss = (id) => {
        const newDismissed = [...dismissed, id];
        setDismissed(newDismissed);
        localStorage.setItem('rrq_dismissed_announcements', JSON.stringify(newDismissed));
    };

    const visible = announcements.filter(a => a.isActive && !dismissed.includes(a.id));
    if (visible.length === 0) return null;

    const TYPE_STYLES = {
        info: { border: 'border-blue-400/40', bg: 'bg-blue-400/10', text: 'text-blue-400', icon: 'info', dot: 'bg-blue-400' },
        event: { border: 'border-[#2bee4b]/40', bg: 'bg-[#2bee4b]/10', text: 'text-[#2bee4b]', icon: 'celebration', dot: 'bg-[#2bee4b]' },
        warning: { border: 'border-amber-400/40', bg: 'bg-amber-400/10', text: 'text-amber-400', icon: 'warning', dot: 'bg-amber-400' },
    };

    return (
        <div className="px-4 pt-3 space-y-2">
            {visible.slice(0, 2).map(ann => {
                const style = TYPE_STYLES[ann.type] || TYPE_STYLES.info;
                return (
                    <div key={ann.id} className={`flex items-start gap-3 rounded-2xl border ${style.border} ${style.bg} px-4 py-3 animate-in slide-in-from-top-2 duration-300`}>
                        <span className={`material-symbols-outlined text-sm mt-0.5 ${style.text}`} style={{ fontVariationSettings: "'FILL' 1" }}>{style.icon}</span>
                        <div className="flex-1 min-w-0">
                            {ann.title && <p className={`text-xs font-black uppercase tracking-wide ${style.text} mb-0.5`}>{ann.title}</p>}
                            <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">{ann.content}</p>
                        </div>
                        <button
                            onClick={() => handleDismiss(ann.id)}
                            className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-white mt-0.5 transition-colors shrink-0"
                        >
                            <span className="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

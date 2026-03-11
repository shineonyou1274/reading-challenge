/**
 * ShareCard — 성과 공유 카드 생성기
 * Canvas API로 독서 성과 이미지를 생성하여 클립보드/공유.
 * GamePopups의 레벨업·스트릭 팝업에서 "공유하기" 버튼으로 호출.
 */
import React, { useRef, useState } from 'react';
import { RPG_CONFIG } from '../utils/rpg';

export default function ShareCard({ stats, onClose }) {
    const canvasRef = useRef(null);
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);

    const empireInfo = stats?.empireId ? RPG_CONFIG.EMPIRES[stats.empireId] : null;

    const generateCard = async () => {
        setGenerating(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 450;

        // 배경 그라디언트
        const grad = ctx.createLinearGradient(0, 0, 800, 450);
        grad.addColorStop(0, '#0d1f10');
        grad.addColorStop(1, '#1a331d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 800, 450);

        // 장식 원
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#2bee4b';
        ctx.beginPath();
        ctx.arc(700, -50, 300, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 상단 라벨
        ctx.fillStyle = '#2bee4b';
        ctx.font = 'bold 13px sans-serif';
        ctx.letterSpacing = '4px';
        ctx.fillText('ROYAL READING QUEST · 황실 기록소', 48, 52);

        // 이름
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 42px sans-serif';
        ctx.fillText(stats?.displayName || '학자', 48, 120);

        // 칭호
        ctx.fillStyle = '#92c99b';
        ctx.font = '18px sans-serif';
        ctx.fillText(stats?.title || '입문 학자', 48, 155);

        // 레벨
        ctx.fillStyle = '#2bee4b';
        ctx.font = 'bold 96px sans-serif';
        ctx.fillText(`LV.${stats?.level || 1}`, 48, 280);

        // 제국
        if (empireInfo) {
            ctx.fillStyle = empireInfo.color;
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(`⚑ ${empireInfo.label}`, 48, 320);
        }

        // 통계 박스들
        const stats2 = [
            { label: '총 독서', value: `${Math.floor((stats?.totalMinutes || 0) / 60)}시간` },
            { label: '연속', value: `${stats?.streak || 0}일` },
            { label: '세션', value: `${stats?.totalSessions || 0}회` },
        ];
        stats2.forEach((s, i) => {
            const x = 48 + i * 180;
            const y = 360;
            ctx.fillStyle = 'rgba(43,238,75,0.08)';
            ctx.beginPath();
            ctx.roundRect(x, y, 160, 60, 12);
            ctx.fill();
            ctx.fillStyle = '#2bee4b';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText(s.value, x + 14, y + 32);
            ctx.fillStyle = '#92c99b';
            ctx.font = '12px sans-serif';
            ctx.fillText(s.label, x + 14, y + 50);
        });

        // 워터마크
        ctx.fillStyle = 'rgba(146,201,155,0.3)';
        ctx.font = '13px sans-serif';
        ctx.fillText('황실 기록소에서 함께 읽어요', 48, 430);

        setGenerating(false);

        // 클립보드 복사 시도
        try {
            canvas.toBlob(async (blob) => {
                if (blob && navigator.clipboard?.write) {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                } else {
                    // fallback: 다운로드
                    const url = canvas.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = '황실기록소_성과카드.png';
                    a.click();
                }
            });
        } catch {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = '황실기록소_성과카드.png';
            a.click();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[600] p-6 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#1a331d] border border-[#32673b] rounded-3xl p-6 max-w-sm w-full animate-book"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-black text-white mb-1">성과 카드 공유</h3>
                <p className="text-xs text-gray-500 mb-4">나의 독서 성과를 이미지로 저장하세요</p>

                {/* 미리보기 캔버스 */}
                <div className="rounded-2xl overflow-hidden mb-4 border border-white/10">
                    <canvas ref={canvasRef} className="w-full" style={{ aspectRatio: '16/9' }} />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm"
                    >
                        닫기
                    </button>
                    <button
                        onClick={generateCard}
                        disabled={generating}
                        className="flex-1 py-3 rounded-xl bg-[#2bee4b] text-[#102213] font-black text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {generating ? (
                            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined text-base">share</span>
                        )}
                        {copied ? '복사됨! ✅' : '저장/복사'}
                    </button>
                </div>
            </div>
        </div>
    );
}

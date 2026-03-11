import React, { useState, useEffect } from 'react';

export default function TutorialModal({ onClose }) {
    const [step, setStep] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const slides = [
        {
            title: "황실 기록소에 오신 것을 환영합니다",
            desc: "RRQ(Royal Reading Quest)는 위대한 지혜를 쌓아 제국을 승리로 이끄는 여정입니다.",
            icon: "castle",
            color: "text-[#2bee4b]"
        },
        {
            title: "제국 영토 전쟁",
            desc: "당신의 독서 기록은 소속 제국(로그라이아, 비전티움, 팩토리아)의 영토 확장 기여도로 환산됩니다. 매주 열리는 전쟁에서 승리하세요.",
            icon: "public",
            color: "text-amber-400"
        },
        {
            title: "하이브리드 동기화 (Hybrid Sync)",
            desc: "이곳에 기록된 독서 에너지는 현실 교실의 '에테르 병(Physical Jar)'과 실시간으로 공명합니다. 앱과 현실이 하나로 연결됩니다.",
            icon: "dataset_linked",
            color: "text-cyan-400"
        },
        {
            title: "엄격한 기록 검증",
            desc: "모든 기록은 '왕실 검증 프로토콜(WPM 분석)'을 거칩니다. 물리적으로 불가능한 속독은 인정되지 않으니 정직하게 기록하십시오.",
            icon: "gavel",
            color: "text-red-400"
        }
    ];

    const handleNext = () => {
        if (step < slides.length - 1) {
            setStep(step + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem('rrq_tutorial_seen', 'true');
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[400] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-[#1a331d] border border-[#32673b] rounded-[32px] overflow-hidden relative shadow-[0_0_50px_rgba(43,238,75,0.2)]">
                {/* Progress Bar */}
                <div className="flex">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 transition-colors ${i <= step ? 'bg-[#2bee4b]' : 'bg-[#102213]'}`}
                        />
                    ))}
                </div>

                <div className="p-8 pt-10 text-center min-h-[400px] flex flex-col items-center justify-center relative">
                    {/* Slide Content */}
                    <div key={step} className="animate-in slide-in-from-right-8 fade-in duration-300 absolute inset-0 p-8 flex flex-col items-center justify-center">
                        <div className={`size-24 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center mb-8 shadow-2xl ${slides[step].color}`}>
                            <span className="material-symbols-outlined text-5xl">{slides[step].icon}</span>
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4 leading-tight">
                            {slides[step].title}
                        </h2>
                        <p className="text-gray-400 text-sm leading-relaxed font-medium">
                            {slides[step].desc}
                        </p>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-[#102213] p-6 border-t border-[#32673b] flex flex-col gap-4">
                    <button
                        onClick={handleNext}
                        className="w-full py-4 bg-[#2bee4b] text-[#102213] font-black rounded-xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                    >
                        {step === slides.length - 1 ? '여정 시작하기' : '다음'}
                    </button>

                    <div className="flex items-center justify-between px-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`size-4 rounded border flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-[#2bee4b] border-[#2bee4b]' : 'border-gray-500'}`}>
                                {dontShowAgain && <span className="material-symbols-outlined text-[10px] text-[#102213] font-bold">check</span>}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                            />
                            <span className="text-[10px] text-gray-500 group-hover:text-gray-300 transition-colors font-bold uppercase tracking-tighter">다시 보지 않기</span>
                        </label>

                        {step < slides.length - 1 && (
                            <button
                                onClick={handleClose}
                                className="text-[10px] text-gray-500 hover:text-white font-bold uppercase tracking-widest"
                            >
                                건너뛰기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

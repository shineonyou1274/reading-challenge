import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const QUIZ = [
    {
        id: 'genre',
        question: '평소 어떤 책을 즐겨 읽으시나요?',
        options: [
            { label: '역사·철학·인문학', empire: 'logreia' },
            { label: '소설·판타지·예술', empire: 'visiontium' },
            { label: '과학·기술·경제', empire: 'factoria' },
        ],
    },
    {
        id: 'note',
        question: '독서 후 메모를 남긴다면 어떤 방식인가요?',
        options: [
            { label: '꼼꼼히 핵심 내용 필기', empire: 'logreia' },
            { label: '느낀 감상·감정 위주', empire: 'visiontium' },
            { label: '요점만 간단히 정리', empire: 'factoria' },
        ],
    },
    {
        id: 'motive',
        question: '독서를 하는 가장 큰 이유는?',
        options: [
            { label: '지식을 기록하고 쌓기 위해', empire: 'logreia' },
            { label: '상상력과 감수성을 키우기 위해', empire: 'visiontium' },
            { label: '실질적인 문제를 해결하기 위해', empire: 'factoria' },
        ],
    },
];

const EMPIRE_INFO = {
    logreia: { label: '로그라이아', desc: '인문학과 역사의 보고. 위대한 사서들의 제국입니다.', color: '#fbbf24', emoji: '📜' },
    visiontium: { label: '비전티움', desc: '상상과 창의의 바다. 몽상가들의 제국입니다.', color: '#c084fc', emoji: '🌌' },
    factoria: { label: '팩토리아', desc: '과학과 논리의 정점. 분석가들의 제국입니다.', color: '#22d3ee', emoji: '⚙️' },
};

function calcEmpire(answers) {
    const tally = { logreia: 0, visiontium: 0, factoria: 0 };
    Object.values(answers).forEach(empire => { tally[empire] = (tally[empire] || 0) + 1; });
    const max = Math.max(...Object.values(tally));
    const winners = Object.keys(tally).filter(k => tally[k] === max);
    return winners[Math.floor(Math.random() * winners.length)];
}

export default function Onboarding({ user, onComplete }) {
    const [step, setStep] = useState(1);        // 1=퀴즈, 2=결과, 3=목표, 4=완료
    const [quizIndex, setQuizIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [selectedEmpire, setSelectedEmpire] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [goal, setGoal] = useState('habit');

    const handleAnswer = (empire) => {
        const q = QUIZ[quizIndex];
        const newAnswers = { ...answers, [q.id]: empire };
        setAnswers(newAnswers);

        if (quizIndex < QUIZ.length - 1) {
            setQuizIndex(quizIndex + 1);
        } else {
            // 마지막 문항 → 분석
            setIsAnalyzing(true);
            setTimeout(() => {
                setSelectedEmpire(calcEmpire(newAnswers));
                setIsAnalyzing(false);
                setStep(2);
            }, 2000);
        }
    };

    const handleFinish = async () => {
        if (!user || user.uid === 'demo') { onComplete(); return; }
        const userRef = doc(db, 'users', user.uid);
        try {
            await setDoc(userRef, {
                empireId: selectedEmpire || 'logreia',
                rank: 'commoner',
                tier: 'bronze',
                onboardingCompleted: true,
                lastRead: serverTimestamp(),
                goals: { type: goal }
            }, { merge: true });
        } catch (err) {
            console.error('Onboarding create failed:', err);
        }
        onComplete();
    };

    const empire = selectedEmpire ? EMPIRE_INFO[selectedEmpire] : null;

    return (
        <div className="fixed inset-0 bg-[#050b06] z-[200] flex flex-col p-6 overflow-y-auto bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a2e1d] to-[#000000]">
            <div className="max-w-2xl mx-auto w-full pt-10 md:pt-20 space-y-12">
                {/* 진행 표시 */}
                <div className="flex justify-center gap-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${step >= i ? 'w-14 bg-[#2bee4b] shadow-[0_0_12px_#2bee4b]' : 'w-4 bg-[#2bee4b]/10'}`} />
                    ))}
                </div>

                {/* Step 1: 성향 퀴즈 */}
                {step === 1 && !isAnalyzing && (
                    <div className="space-y-8 animate-book text-center">
                        <div className="space-y-3">
                            <span className="material-symbols-outlined text-5xl text-[#2bee4b] opacity-60">psychology</span>
                            <h2 className="text-3xl font-black text-white tracking-[0.15em] uppercase">제국 성향 분석</h2>
                            <p className="text-[#92c99b] font-medium italic text-sm">
                                "질문에 솔직하게 답하면, 당신에게 가장 잘 맞는 제국을 찾아드립니다."
                            </p>
                        </div>

                        {/* 문항 진행 표시 */}
                        <div className="flex justify-center gap-2">
                            {QUIZ.map((_, i) => (
                                <div key={i} className={`size-2 rounded-full transition-all ${i < quizIndex ? 'bg-[#2bee4b]' : i === quizIndex ? 'bg-[#2bee4b] scale-150' : 'bg-white/10'}`} />
                            ))}
                        </div>

                        <div className="space-y-4 text-left">
                            <p className="text-white font-black text-lg text-center leading-snug">
                                Q{quizIndex + 1}. {QUIZ[quizIndex].question}
                            </p>
                            {QUIZ[quizIndex].options.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAnswer(opt.empire)}
                                    className="w-full p-5 bg-black/20 border-2 border-[#32673b] rounded-2xl text-left transition-all hover:border-[#2bee4b] hover:bg-[#2bee4b]/5 active:scale-95 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="size-6 rounded-full border-2 border-[#32673b] group-hover:border-[#2bee4b] flex items-center justify-center shrink-0 transition-colors">
                                            <span className="text-[10px] font-black text-[#2bee4b]">{['A', 'B', 'C'][i]}</span>
                                        </div>
                                        <p className="text-white font-bold text-sm">{opt.label}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 분석 중 */}
                {step === 1 && isAnalyzing && (
                    <div className="text-center space-y-8 animate-book">
                        <div className="size-40 mx-auto border-t-4 border-[#2bee4b] rounded-full animate-spin"></div>
                        <h3 className="text-2xl font-bold text-white animate-pulse">성향을 분석하고 있습니다...</h3>
                        <p className="text-[#92c99b] font-mono text-sm">Analyzing your reading personality...</p>
                    </div>
                )}

                {/* Step 2: 배정 결과 */}
                {step === 2 && empire && (
                    <div className="space-y-8 animate-book text-center">
                        <div>
                            <p className="text-[#92c99b] font-black uppercase tracking-widest text-sm mb-2">분석 완료 · 당신의 제국은</p>
                            <div className="text-6xl mb-4">{empire.emoji}</div>
                            <h2 className="text-5xl font-black text-white uppercase tracking-[0.2em] mb-3" style={{ color: empire.color }}>
                                {empire.label}
                            </h2>
                            <p className="text-gray-300 text-sm max-w-md mx-auto leading-relaxed">{empire.desc}</p>
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold" style={{ borderColor: empire.color, color: empire.color, background: empire.color + '15' }}>
                            <span className="material-symbols-outlined text-base">check_circle</span>
                            성향 분석 기반 배정
                        </div>
                        <button
                            onClick={() => setStep(3)}
                            className="mt-4 px-10 py-4 bg-white text-black font-black rounded-xl uppercase tracking-widest hover:scale-105 transition-transform shadow-xl w-full"
                        >
                            다음 관문으로
                        </button>
                    </div>
                )}

                {/* Step 3: 목표 선택 */}
                {step === 3 && (
                    <div className="space-y-10 animate-book">
                        <div className="text-center space-y-3">
                            <span className="material-symbols-outlined text-5xl text-[#2bee4b] opacity-50">target</span>
                            <h2 className="text-4xl font-black text-white tracking-[0.2em] uppercase">황실의 의지</h2>
                            <p className="text-[#92c99b] font-medium italic text-sm">"어떤 열망이 당신을 지혜의 문턱으로 이끌었습니까?"</p>
                        </div>
                        <div className="space-y-4">
                            {[
                                { id: 'habit', label: '꾸준한 습관 형성', icon: 'event_repeat', desc: '매일 서고를 방문하는 의식을 치릅니다.' },
                                { id: 'study', label: '전문 지식 습득', icon: 'psychology', desc: '학문적 정점을 찍기 위한 강도 높은 연구를 수행합니다.' },
                                { id: 'leisure', label: '지적 유희', icon: 'sentiment_very_satisfied', desc: '순수한 즐거움을 위해 서고를 느긋하게 거닙니다.' }
                            ].map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => setGoal(g.id)}
                                    className={`w-full p-6 bg-black/20 border-2 rounded-3xl text-left transition-all ${goal === g.id ? 'border-[#2bee4b] bg-[#2bee4b]/5 shadow-[0_0_20px_rgba(43,238,75,0.1)]' : 'border-[#32673b] opacity-40'}`}
                                >
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="material-symbols-outlined text-[#2bee4b] text-xl">{g.icon}</span>
                                        <p className="text-[#2bee4b] font-black uppercase tracking-widest">{g.label}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter ml-8">{g.desc}</p>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setStep(4)}
                            className="w-full py-5 bg-[#2bee4b] text-[#102213] font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase tracking-[0.2em]"
                        >
                            마지막 관문으로
                        </button>
                    </div>
                )}

                {/* Step 4: 완료 */}
                {step === 4 && (
                    <div className="space-y-10 animate-book text-center">
                        <div className="bg-[#2bee4b]/10 p-12 rounded-full size-52 mx-auto flex items-center justify-center border-2 border-[#2bee4b]/20 shadow-[0_0_50px_rgba(43,238,75,0.2)]">
                            <span className="material-symbols-outlined text-8xl text-[#2bee4b] animate-pulse">auto_stories</span>
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-4xl font-black text-white tracking-[0.2em] uppercase">의식 준비 완료</h2>
                            <p className="text-[#92c99b] font-medium italic leading-relaxed max-w-sm mx-auto">
                                "책은 당신의 영혼을 비추는 거울이며, 이 서고는 당신의 유산을 영원히 간직할 것입니다."
                            </p>
                        </div>
                        <button
                            onClick={handleFinish}
                            className="w-full py-6 bg-[#2bee4b] text-[#102213] font-black rounded-3xl shadow-[0_12px_32px_rgba(43,238,75,0.4)] hover:scale-[1.03] transition-all uppercase tracking-[0.3em]"
                        >
                            서고 입장하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

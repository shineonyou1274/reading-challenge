import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, updateDoc, increment, addDoc, collection, serverTimestamp, arrayUnion, runTransaction, query, orderBy, limit, onSnapshot, writeBatch, where } from 'firebase/firestore';
import { useUserStats } from './hooks/useUserStats';
import QuestBoard from './components/QuestBoard';
import Onboarding from './components/Onboarding';
import RoyalLibrary from './components/RoyalLibrary';
import Community from './components/Community';
import GlobalStatsModal from './components/GlobalStatsModal';
import TutorialModal from './components/TutorialModal';
import TeacherDashboard from './components/TeacherDashboard';
import { RPG_CONFIG, getLevelFromXP, getTitleForLevel, getLeagueTier, getDisplayTitle } from './utils/rpg';
import GuideModal from './components/GuideModal';
import GamePopups from './components/GamePopups';
import AchievementsModal from './components/AchievementsModal';
import GoldShop from './components/GoldShop';
import AnnouncementBanner from './components/AnnouncementBanner';
import ErrorBoundary from './components/ErrorBoundary';
import { checkNewAchievements, getRandomChestReward, rollRelicDrop, RELICS, ACHIEVEMENTS } from './utils/achievements';
import { soundManager } from './utils/soundManager';
import { getTodayKey, getTodayQuests, checkQuestCompletion } from './utils/dailyQuests';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Check if Firebase is properly configured
const isFirebaseReady = import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== "YOUR_API_KEY";

const INTRO_QUOTES = [
    { text: "책은 왕관보다 위대한 보물이다", author: "— 황실 격언" },
    { text: "지혜는 제국을 세우는 가장 강력한 힘이다", author: "— 로그라이아 초대 황제" },
    { text: "한 페이지가 한 세계를 연다", author: "— 비전티움 현자" },
    { text: "읽는 자가 다스리고, 기록하는 자가 영원하다", author: "— 팩토리아 대서기관" },
    { text: "오늘의 한 줄이 내일의 제국을 만든다", author: "— 황실 서고 비문" },
];

function IntroScreen({ onEnter }) {
    const [quote] = useState(() => INTRO_QUOTES[Math.floor(Math.random() * INTRO_QUOTES.length)]);
    const [started, setStarted] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [typingDone, setTypingDone] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [showEnter, setShowEnter] = useState(false);

    const handleStart = () => {
        if (started) return;
        setStarted(true);
        // 사용자 터치 후 오디오 활성화 → BGM + 타이핑 동시 시작
        soundManager.resume();
        soundManager.startBgm();
    };

    useEffect(() => {
        if (!started) return;
        let i = 0;
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                setDisplayedText(quote.text.slice(0, i + 1));
                soundManager.playTyping();
                i++;
                if (i >= quote.text.length) {
                    clearInterval(interval);
                    setTypingDone(true);
                    setTimeout(() => setShowWelcome(true), 800);
                    setTimeout(() => setShowEnter(true), 1800);
                }
            }, 60);
            return () => clearInterval(interval);
        }, 400);
        return () => clearTimeout(timer);
    }, [started, quote.text]);

    return (
        <div
            className="min-h-screen bg-[#102213] flex flex-col items-center justify-center p-6 relative overflow-hidden cursor-pointer select-none"
            onClick={handleStart}
        >
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(43,238,75,0.08)_0%,transparent_70%)] animate-glow-shift pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2bee4b]/20 to-transparent" />

            {/* 터치 전: 왕관 + 안내 */}
            {!started && (
                <>
                    <div className="animate-fade-up mb-8">
                        <span className="material-symbols-outlined text-[72px] text-[#2bee4b] drop-shadow-[0_0_30px_rgba(43,238,75,0.4)]">crown</span>
                    </div>
                    <p className="text-[#2bee4b]/60 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">
                        화면을 터치하세요
                    </p>
                </>
            )}

            {/* 터치 후: 타이핑 연출 */}
            {started && (
                <>
                    <div className="animate-fade-up mb-8">
                        <span className="material-symbols-outlined text-[72px] text-[#2bee4b] drop-shadow-[0_0_30px_rgba(43,238,75,0.4)]">crown</span>
                    </div>

                    <div className="text-center max-w-sm mb-6 min-h-[80px] flex flex-col items-center justify-center">
                        <p className="text-xl text-[#92c99b] italic leading-relaxed">
                            &ldquo;{displayedText}&rdquo;
                            {!typingDone && <span className="typing-cursor inline-block w-0 ml-0.5">&nbsp;</span>}
                        </p>
                        {typingDone && (
                            <p className="text-xs text-[#2bee4b]/50 mt-3 animate-fade-up tracking-wider">{quote.author}</p>
                        )}
                    </div>

                    {showWelcome && (
                        <div className="text-center mb-8 animate-fade-up">
                            <h1 className="text-2xl font-black text-white tracking-widest uppercase mb-2">황실 기록소</h1>
                            <p className="text-sm text-[#92c99b]/70">독서로 제국을 세우는 황실의 모험이 시작됩니다</p>
                        </div>
                    )}

                    {showEnter && (
                        <div className="text-center animate-fade-up">
                            <p className="text-[#2bee4b] text-xs font-bold uppercase tracking-[0.3em] mb-5">입장하시겠습니까?</p>
                            <button
                                onClick={onEnter}
                                className="px-12 py-4 bg-[#2bee4b] text-[#102213] font-black rounded-2xl shadow-[0_8px_32px_rgba(43,238,75,0.3)] hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-sm"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">door_open</span>
                                    황실 입장
                                </span>
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function Auth({ onMockLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isFirebaseReady) {
            setError('파이어베이스 설정이 필요합니다. 데모 계정으로 입장해주세요.');
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await setDoc(doc(db, 'users', user.uid), {
                    displayName: displayName || email.split('@')[0],
                    email,
                    level: 1,
                    currentXp: 0,
                    xpLimit: 500,
                    gold: 100,
                    streak: 0,
                    title: 'Novice Scholar',
                    onboardingCompleted: false,
                    createdAt: serverTimestamp()
                });
            }
        } catch (err) {
            setError(err.message === 'Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.).'
                ? 'API 키가 유효하지 않습니다. 데모 모드를 이용해주세요.'
                : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#102213] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a331d] to-[#102213]">
            <div className="max-w-md w-full animate-book">
                <div className="text-center mb-8">
                    <span className="material-symbols-outlined text-[56px] text-[#2bee4b] mb-3 drop-shadow-[0_0_20px_rgba(43,238,75,0.4)]">crown</span>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-1">황실 기록소</h1>
                    <p className="text-[#92c99b] text-xs font-medium italic">&ldquo;지혜는 왕국을 여는 열쇠입니다&rdquo;</p>
                </div>

                <div className="bg-[#1a331d] border border-[#32673b] p-8 rounded-[32px] shadow-2xl">
                    <div className="flex bg-black/30 p-1 rounded-xl mb-8">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${isLogin ? 'bg-[#2bee4b] text-[#102213]' : 'text-gray-500'}`}
                        >
                            입장하기
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${!isLogin ? 'bg-[#2bee4b] text-[#102213]' : 'text-gray-500'}`}
                        >
                            등록하기
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-1">
                                <label className="text-[10px] text-[#2bee4b] font-black uppercase ml-1">학자명</label>
                                <input
                                    type="text"
                                    placeholder="이름을 입력하세요"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full bg-black/40 border border-[#32673b] rounded-xl p-4 text-white placeholder:text-gray-600 outline-none focus:ring-1 ring-[#2bee4b] transition-all"
                                    required
                                />
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-[10px] text-[#2bee4b] font-black uppercase ml-1">이메일 터미널</label>
                            <input
                                type="email"
                                placeholder="name@domain.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/40 border border-[#32673b] rounded-xl p-4 text-white placeholder:text-gray-600 outline-none focus:ring-1 ring-[#2bee4b] transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-[#2bee4b] font-black uppercase ml-1">비밀 암호</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-[#32673b] rounded-xl p-4 text-white placeholder:text-gray-600 outline-none focus:ring-1 ring-[#2bee4b] transition-all"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl">
                                <p className="text-red-500 text-[11px] font-bold text-center">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#2bee4b] text-[#102213] font-black py-5 rounded-2xl shadow-[0_8px_24px_rgba(43,238,75,0.3)] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest mt-6"
                        >
                            {loading ? '인증 중...' : isLogin ? '서고 입장' : '대관식 시작'}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-[#32673b]/50 space-y-3">
                        <button
                            onClick={async () => {
                                try {
                                    setLoading(true);
                                    const provider = new GoogleAuthProvider();
                                    const result = await signInWithPopup(auth, provider);

                                    // Check if user document exists, if not create one
                                    const userDocRef = doc(db, 'users', result.user.uid);
                                    const userDoc = await getDoc(userDocRef);
                                    if (!userDoc.exists()) {
                                        await setDoc(userDocRef, {
                                            displayName: result.user.displayName || result.user.email.split('@')[0],
                                            email: result.user.email,
                                            level: 1,
                                            currentXp: 0,
                                            xpLimit: 500,
                                            gold: 100,
                                            streak: 0,
                                            title: 'Novice Scholar',
                                            onboardingCompleted: false,
                                            createdAt: serverTimestamp()
                                        });
                                    }
                                } catch (err) {
                                    setError(err.message);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            className="w-full bg-white text-gray-900 border border-gray-200 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                            구글 계정으로 입장
                        </button>
                        <p className="text-[10px] text-gray-500 text-center font-bold uppercase mb-2 mt-4 tracking-tighter">또는 데모 계정으로 체험하기</p>
                        <button
                            onClick={onMockLogin}
                            className="w-full bg-white/5 border border-[#32673b] text-[#2bee4b] py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">auto_fix</span>
                            데모 학자로 입장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const [user, setUser] = useState(null);
    const [isMocking, setIsMocking] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [showIntro, setShowIntro] = useState(true);
    const { stats, loading: statsLoading, refresh } = useUserStats();
    const [view, setView] = useState('dashboard');
    const [hideBottomNav, setHideBottomNav] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showAchievements, setShowAchievements] = useState(false);
    const [showRelicModal, setShowRelicModal] = useState(false);
    const [bgmOn, setBgmOn] = useState(() => JSON.parse(localStorage.getItem('rrq_bgm') ?? 'true'));
    const [showMenu, setShowMenu] = useState(false);
    const [floatingXP, setFloatingXP] = useState(null); // { xp, id }
    const [empireRank, setEmpireRank] = useState(null); // 내 제국 내 순위
    const [editingName, setEditingName] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState('');

    // PWA 업데이트 감지
    const { needRefresh, updateServiceWorker } = (() => {
        try { return useRegisterSW(); } catch { return { needRefresh: [false], updateServiceWorker: () => { } }; }
    })();
    const [showUpdateBanner, setShowUpdateBanner] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    useEffect(() => {
        if (needRefresh?.[0]) {
            if (sessionStorage.getItem('rrq_just_updated')) {
                sessionStorage.removeItem('rrq_just_updated');
                try { updateServiceWorker(true); } catch (e) { }
                return;
            }
            // 이미 업데이트 중이면 배너 표시 안 함
            if (!isUpdating) setShowUpdateBanner(true);
        }
    }, [needRefresh?.[0]]);

    // ── 팝업 큐 ────────────────────────────────────────────────────
    // { type: 'levelup'|'streak'|'chest'|'achievement', data: any }
    const [popupQueue, setPopupQueue] = useState([]);
    const enqueuePopups = (items) => setPopupQueue(prev => [...prev, ...items]);
    const nextPopup = () => setPopupQueue(prev => prev.slice(1));

    // 하위호환: 기존 levelUpData / streakMilestone 제거됨

    // Scroll Reset on View Change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [view]);

    // 메뉴/알림 외부 클릭 시 닫기
    useEffect(() => {
        if (!showMenu && !showNotifications) return;
        const handler = () => { setShowMenu(false); setShowNotifications(false); };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [showMenu, showNotifications]);

    // 🔔 실시간 알림 리스너
    useEffect(() => {
        if (!user) { setNotifications([]); setHasUnread(false); return; }
        const notifRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notifRef, orderBy('timestamp', 'desc'), limit(20));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setNotifications(list);
            setHasUnread(list.some(n => !n.read));
        });
        return () => unsub();
    }, [user]);

    // 알림 읽음 처리
    const markNotificationsRead = async () => {
        if (!user) return;
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;
        const batch = writeBatch(db);
        unread.forEach(n => {
            batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
        });
        try { await batch.commit(); } catch (e) { console.warn('Mark read failed:', e); }
    };

    // 닉네임 변경 함수 (공용) — 30일 쿨다운 + public_feed/ranking 동기화
    const handleNameChange = async (name) => {
        const trimmed = (name || '').trim();
        if (!trimmed || !auth.currentUser) return;
        if (trimmed === stats?.displayName) { setEditingName(false); return; }

        // 30일 쿨다운 체크
        if (stats?.lastNameChange) {
            const lastChange = new Date(stats.lastNameChange.seconds * 1000);
            const daysSince = (Date.now() - lastChange) / (1000 * 60 * 60 * 24);
            if (daysSince < 30) {
                const remaining = Math.ceil(30 - daysSince);
                alert(`별명은 30일에 한 번만 변경할 수 있습니다.\n${remaining}일 후에 다시 시도해주세요.`);
                setEditingName(false);
                return;
            }
        }

        try {
            const uid = auth.currentUser.uid;
            // 1. 유저 문서 업데이트
            await updateDoc(doc(db, 'users', uid), {
                displayName: trimmed,
                lastNameChange: serverTimestamp(),
            });

            // 2. public_feed 동기화 (내 글의 userName 변경)
            const feedSnap = await getDocs(query(collection(db, 'public_feed'), where('uid', '==', uid)));
            if (!feedSnap.empty) {
                const batch = writeBatch(db);
                feedSnap.docs.forEach(d => batch.update(d.ref, { userName: trimmed }));
                await batch.commit();
            }

            // 3. ranking_top50 동기화
            const rankingRef = doc(db, 'stats', 'ranking_top50');
            try {
                await runTransaction(db, async (transaction) => {
                    const rankDoc = await transaction.get(rankingRef);
                    if (!rankDoc.exists()) return;
                    const globalList = rankDoc.data().global || [];
                    const updated = globalList.map(e => e.uid === uid ? { ...e, name: trimmed } : e);
                    transaction.update(rankingRef, { global: updated });
                });
            } catch (e) { console.warn('Ranking name sync skipped:', e); }

            setEditingName(false);
        } catch (e) {
            console.error('Name change failed:', e);
            alert('별명 변경에 실패했습니다.');
        }
    };

    // 제국 내 순위 계산 (프로필 열릴 때)
    useEffect(() => {
        if (view !== 'profile' || !auth.currentUser || !stats?.empireId) return;
        const myXp = stats.totalXp || 0;
        // XP가 0이면 순위 표시하지 않음
        if (myXp === 0) { setEmpireRank(null); return; }
        getDocs(collection(db, 'users')).then(snap => {
            const empireId = stats.empireId;
            const members = [];
            snap.forEach(d => {
                const data = d.data();
                // XP가 0보다 큰 멤버만 순위에 포함
                if (data.empireId === empireId && (data.totalXp || 0) > 0) members.push(data.totalXp || 0);
            });
            members.sort((a, b) => b - a);
            const rank = members.findIndex(xp => xp <= myXp) + 1;
            setEmpireRank(rank > 0 ? rank : members.length);
        }).catch(e => console.warn('Empire rank fetch failed:', e));
    }, [view, stats?.empireId, stats?.totalXp]);

    // Theme Management
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('rrq_theme');
        return saved ? saved === 'dark' : true; // Default to dark
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('rrq_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('rrq_theme', 'light');
        }
    }, [darkMode]);

    // BGM 미리 로드
    useEffect(() => { soundManager.preload?.(); }, []);

    // 뷰 전환 시 스크롤 최상단으로
    useEffect(() => { window.scrollTo(0, 0); }, [view]);

    useEffect(() => {
        if (isFirebaseReady) {
            try {
                const unsubscribe = onAuthStateChanged(auth, (u) => {
                    if (u) {
                        setUser(u);
                        setIsMocking(false);
                        // Check for tutorial
                        if (!localStorage.getItem('rrq_tutorial_seen')) {
                            setShowTutorial(true);
                        }
                    } else {
                        // Explicitly clear user state on logout
                        setUser(null);
                        setIsMocking(false);
                    }
                    setInitializing(false);
                });
                return unsubscribe;
            } catch (err) {
                console.error("Auth init failed:", err);
                setInitializing(false);
            }
        } else {
            setInitializing(false);
        }
    }, []);

    const handleSaveSession = async (sessionData) => {
        if (isMocking || !isFirebaseReady) { console.log('Mock session saved:', sessionData); return; }
        if (!auth.currentUser) return;
        const userRef = doc(db, 'users', auth.currentUser.uid);

        try {
            // 1. 현재 유저 snapshot
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data() || {};
            const inventory = userData.inventory || {};

            // 2. 스트릭 계산 (방패 아이템 소모)
            let newStreak = userData.streak || 0;
            let usedShield = false;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            if (userData.lastRead) {
                const lastDate = new Date(userData.lastRead.seconds * 1000); lastDate.setHours(0, 0, 0, 0);
                const diff = Math.round((today - lastDate) / 86400000);
                if (diff === 0) { /* 유지 */ }
                else if (diff === 1) { newStreak += 1; }
                else {
                    // 스트릭 방패 보유 시 자동 소모하여 스트릭 보호
                    if ((inventory.streak_shield || 0) > 0) {
                        usedShield = true;
                        // 스트릭 유지 (리셋하지 않음)
                    } else {
                        newStreak = 1;
                    }
                }
            } else { newStreak = 1; }

            // 3. 서버 XP 배율
            let finalXp = sessionData.rewards.xp;
            let finalGold = sessionData.rewards.gold;
            try {
                const cfg = await getDoc(doc(db, 'system', 'config'));
                if (cfg.exists()) {
                    const m = cfg.data().multiplier || 1.0;
                    if (m !== 1.0) { finalXp = Math.round(finalXp * m); finalGold = Math.round(finalGold * m); }
                }
            } catch { /* 배율 읽기 실패 시 기본값 */ }

            // 3-1. XP 부스터 아이템 적용
            if ((inventory.xp_booster || 0) > 0) {
                finalXp = Math.round(finalXp * 1.5);
            }

            // 3-2. 한 줄 요약 보너스 (+60 XP)
            const summaryBonus = (sessionData.summary || '').trim().length >= 5 ? 60 : 0;
            finalXp += summaryBonus;

            // 4. 레벨업 감지
            const xpBefore = userData.totalXp || 0;
            const { level: oldLevel } = getLevelFromXP(xpBefore);
            const { level: newLevel } = getLevelFromXP(xpBefore + finalXp);

            // 5. 통계 추적
            const newTotalSessions = (userData.totalSessions || 0) + 1;
            const addedMinutes = Math.floor((sessionData.elapsedTime || 0) / 60);
            const newTotalMinutes = (userData.totalMinutes || 0) + addedMinutes;
            // 날짜 키로 오늘 누적 시간 추적 (일 경계 자동 처리)
            const todayMinKey = `todayMin_${getTodayKey()}`;
            const todayTotalMinutes = (userData[todayMinKey] || 0) + addedMinutes;

            // 6. 업적 체크
            const earnedIds = userData.achievements || [];
            const newAchievements = checkNewAchievements(sessionData, {
                totalSessions: newTotalSessions,
                totalMinutes: newTotalMinutes,
                streak: newStreak,
                level: newLevel,
            }, earnedIds);
            const achievementBonusXp = newAchievements.reduce((s, a) => s + (a.xpBonus || 0), 0);

            // 7. 보물상자 (30분 이상)
            const hasChest = (sessionData.elapsedTime || 0) >= 1800;
            const chestReward = hasChest ? getRandomChestReward() : null;
            const chestXp = chestReward?.xp || 0;
            const chestGold = chestReward?.gold || 0;

            // 7-2. 황실 유물 랜덤 드롭 (유물 탐지기 보유 시 확률 2배 → 시간 2배로 환산)
            const hasRadar = (inventory.relic_radar || 0) > 0;
            const relicTime = hasRadar ? (sessionData.elapsedTime || 0) * 2 : (sessionData.elapsedTime || 0);
            const relicDrop = rollRelicDrop(relicTime);

            // 8. 데일리 퀘스트 완료 체크
            const todayKey = getTodayKey();
            const todayQuests = getTodayQuests();
            const completedToday = userData.dailyQuestProgress?.[todayKey] || {};
            const newlyCompleted = [];
            let questBonusXp = 0;
            let questBonusGold = 0;
            const todayStats = {
                totalMinutes: todayTotalMinutes,
                note: sessionData.note || '',
                summary: sessionData.summary || '',
                mode: sessionData.mode || '',
                isNewBook: !userData.readBooks?.includes(sessionData.bookTitle),
            };
            for (const quest of todayQuests) {
                if (!completedToday[quest.id] && checkQuestCompletion(quest, sessionData, todayStats)) {
                    newlyCompleted.push(quest);
                    questBonusXp += quest.xpReward || 0;
                    questBonusGold += quest.goldReward || 0;
                }
            }

            // 9. Firestore 업데이트 (방어: 규칙 상한 초과 방지)
            finalXp = Math.min(finalXp, 30000);
            finalGold = Math.min(Math.round(finalGold), 30000);
            const safeElapsedTime = typeof sessionData.elapsedTime === 'number' ? sessionData.elapsedTime : 0;
            const boostedRewards = { ...sessionData.rewards, xp: finalXp, gold: finalGold };
            const inventoryUpdate = {};
            if (usedShield) inventoryUpdate['inventory.streak_shield'] = increment(-1);
            if ((inventory.xp_booster || 0) > 0) inventoryUpdate['inventory.xp_booster'] = increment(-1);
            if (hasRadar) inventoryUpdate['inventory.relic_radar'] = increment(-1);
            // 유물 드롭 시 컬렉션에 추가
            if (relicDrop) inventoryUpdate[`relics.${relicDrop.relic.id}`] = increment(1);
            const questProgressUpdate = {};
            for (const q of newlyCompleted) {
                questProgressUpdate[`dailyQuestProgress.${todayKey}.${q.id}`] = true;
            }
            const totalXpGain = finalXp + achievementBonusXp + chestXp + questBonusXp;
            const totalGoldGain = finalGold + chestGold + questBonusGold;

            await updateDoc(userRef, {
                totalXp: increment(totalXpGain),
                gold: increment(totalGoldGain),
                lastRead: serverTimestamp(),
                streak: newStreak,
                totalSessions: increment(1),
                totalMinutes: increment(addedMinutes),
                [todayMinKey]: increment(addedMinutes),
                ...(newAchievements.length > 0 && {
                    achievements: arrayUnion(...newAchievements.map(a => a.id))
                }),
                ...(sessionData.bookTitle && { [`readBooks`]: arrayUnion(sessionData.bookTitle) }),
                ...inventoryUpdate,
                ...questProgressUpdate,
            });

            // 10. 세션 + 피드 저장
            const empireId = userData.empireId;
            const sessionRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'sessions'), {
                ...sessionData, elapsedTime: safeElapsedTime, rewards: boostedRewards, timestamp: serverTimestamp()
            });
            // 프로필 공개 유저만 피드에 게시 (기본값: 공개)
            if (userData.isPublic !== false) {
                await setDoc(doc(db, 'public_feed', sessionRef.id), {
                    userName: stats?.displayName || auth.currentUser.displayName || '익명의 학자',
                    userTitle: getDisplayTitle(stats?.inventory, stats?.title || '학자'),
                    bookTitle: sessionData.bookTitle,
                    note: sessionData.note,
                    elapsedTime: sessionData.elapsedTime,
                    bookImage: sessionData.bookImage || null,
                    mood: sessionData.mood || null,
                    rewards: boostedRewards,
                    timestamp: serverTimestamp(),
                    uid: auth.currentUser.uid,
                    isChat: false,
                    empireId: empireId || null,
                });
            }

            // 11-a. 집계 문서 업데이트 (실시간 랭킹/제국전쟁용)
            if (empireId) {
                const empireTotalsRef = doc(db, 'stats', 'empire_totals');
                await setDoc(empireTotalsRef, {
                    [`${empireId}.xp`]: increment(totalXpGain),
                    [`${empireId}.minutes`]: increment(addedMinutes),
                    [`${empireId}.sessions`]: increment(1),
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            }

            // 11-b. 랭킹 TOP 50 업데이트 (트랜잭션)
            const newTotalXp = xpBefore + totalXpGain;
            const rankingRef = doc(db, 'stats', 'ranking_top50');
            try {
                await runTransaction(db, async (transaction) => {
                    const rankDoc = await transaction.get(rankingRef);
                    const rankData = rankDoc.exists() ? rankDoc.data() : {};
                    const globalList = rankData.global || [];

                    const myEntry = {
                        uid: auth.currentUser.uid,
                        name: stats?.displayName || auth.currentUser.displayName || '익명',
                        xp: newTotalXp,
                        level: newLevel,
                        empire: empireId || '',
                    };

                    // 기존 내 엔트리 제거 후 추가
                    const filtered = globalList.filter(e => e.uid !== auth.currentUser.uid);
                    filtered.push(myEntry);
                    filtered.sort((a, b) => b.xp - a.xp);
                    const newGlobal = filtered.slice(0, 50);

                    // 제국별 TOP 10
                    const byEmpire = {};
                    for (const entry of newGlobal) {
                        if (!entry.empire) continue;
                        if (!byEmpire[entry.empire]) byEmpire[entry.empire] = [];
                        if (byEmpire[entry.empire].length < 10) byEmpire[entry.empire].push(entry);
                    }

                    transaction.set(rankingRef, {
                        global: newGlobal,
                        byEmpire,
                        updatedAt: serverTimestamp(),
                    });
                });
            } catch (e) {
                console.warn('Ranking update skipped:', e);
            }

            // 🔊 저장 완료 사운드
            soundManager.resume();
            soundManager.playSuccess();

            // ✨ 떠오르는 XP 숫자
            setFloatingXP({ xp: totalXpGain, id: Date.now() });
            setTimeout(() => setFloatingXP(null), 1800);

            // 11. 팝업 큐 구성
            const popups = [];
            if (newLevel > oldLevel) popups.push({ type: 'levelup', data: { oldLevel, newLevel } });
            const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];
            if (STREAK_MILESTONES.includes(newStreak)) popups.push({ type: 'streak', data: { streak: newStreak } });
            if (chestReward) popups.push({ type: 'chest', data: chestReward });
            if (relicDrop) popups.push({ type: 'relic', data: relicDrop });
            newAchievements.forEach(a => popups.push({ type: 'achievement', data: a }));
            newlyCompleted.forEach(q => popups.push({ type: 'dailyquest', data: q }));
            if (usedShield) popups.push({ type: 'shield', data: { streak: newStreak } });
            if (popups.length > 0) setTimeout(() => enqueuePopups(popups), 800);

            refresh();
        } catch (err) {
            console.error('Session save failed:', err);
            enqueuePopups([{ type: 'achievement', data: { icon: '⚠️', name: '저장 실패', desc: '독서 기록 저장에 실패했습니다. 네트워크를 확인해주세요.', xpBonus: 0 } }]);
        }
    };

    // 황실 상회 — 골드 상점 구매
    const handleShopPurchase = async (itemId) => {
        if (isMocking || !isFirebaseReady || !auth.currentUser) return;
        const item = RPG_CONFIG.SHOP_ITEMS[itemId];
        if (!item) return;
        const currentGold = stats?.gold || 0;
        if (currentGold < item.price) return;

        const userRef = doc(db, 'users', auth.currentUser.uid);
        try {
            await updateDoc(userRef, {
                gold: increment(-item.price),
                [`inventory.${itemId}`]: increment(1),
            });
            soundManager.resume();
            soundManager.playCoin?.();
            refresh();
        } catch (err) {
            console.error('Shop purchase failed:', err);
        }
    };

    if (initializing) return (
        <div className="min-h-screen bg-[#102213] flex flex-col items-center justify-center text-[#2bee4b]">
            <span className="material-symbols-outlined text-[64px] animate-pulse">auto_stories</span>
        </div>
    );

    // 매 진입 시 인트로 → 로그인 유저는 메인으로, 비로그인 유저는 로그인 폼으로
    if (showIntro) return <IntroScreen onEnter={() => setShowIntro(false)} />;

    if (!user && !isMocking) return <Auth onMockLogin={() => setIsMocking(true)} />;

    // When mocking, stats handle the demo data
    if (statsLoading && !isMocking) return (
        <div className="min-h-screen bg-[#102213] flex flex-col items-center justify-center text-[#2bee4b]">
            <span className="material-symbols-outlined text-[64px] animate-pulse">refresh</span>
            <p className="mt-4 font-black uppercase tracking-widest text-xs">Identity Synchronizing...</p>
        </div>
    );

    return (
        <div
            className="min-h-screen bg-[#F9F8F4] dark:bg-[#102213] text-slate-900 dark:text-white font-sans flex flex-col relative pb-28 selection:bg-[#2bee4b] selection:text-[#102213] transition-colors duration-300"
            onPointerDown={() => soundManager.resume()}
        >
            {/* 🌌 테마 배경 (보유 테마 중 우선순위: aurora > midnight > forest) */}
            {(stats?.inventory?.theme_aurora || 0) > 0 ? <div className="aurora-bg" />
             : (stats?.inventory?.theme_midnight || 0) > 0 ? <div className="midnight-bg" />
             : (stats?.inventory?.theme_forest || 0) > 0 ? <div className="forest-bg" />
             : null}

            {/* 📲 PWA 업데이트 알림 배너 */}
            {showUpdateBanner && (
                <div className="fixed top-0 left-0 right-0 z-[600] flex items-center justify-between gap-3 bg-[#2bee4b] text-[#102213] px-5 py-3 shadow-2xl animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>system_update</span>
                        <span className="text-sm font-black">새 버전이 있습니다!</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={isUpdating}
                            onClick={async () => {
                                setIsUpdating(true);
                                setShowUpdateBanner(false);
                                sessionStorage.setItem('rrq_just_updated', '1');
                                try { await updateServiceWorker(true); } catch (e) { console.warn('SW update failed:', e); }
                                if ('serviceWorker' in navigator) {
                                    const regs = await navigator.serviceWorker.getRegistrations();
                                    await Promise.all(regs.map(r => r.unregister()));
                                }
                                if ('caches' in window) {
                                    const names = await caches.keys();
                                    await Promise.all(names.map(n => caches.delete(n)));
                                }
                                window.location.reload();
                            }}
                            className="bg-[#102213] text-[#2bee4b] text-xs font-black px-4 py-1.5 rounded-lg uppercase tracking-widest"
                        >{isUpdating ? '적용 중...' : '업데이트'}</button>
                        <button onClick={() => setShowUpdateBanner(false)} className="text-[#102213]/60 text-xs px-2">✕</button>
                    </div>
                </div>
            )}

            {/* ✨ Floating XP 숫자 */}
            {floatingXP && (
                <div
                    key={floatingXP.id}
                    className="fixed bottom-36 left-1/2 -translate-x-1/2 z-[400] pointer-events-none animate-float-up"
                >
                    <div className="bg-[#2bee4b] text-[#102213] px-5 py-2 rounded-full font-black text-lg shadow-2xl shadow-[#2bee4b]/40 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                        +{floatingXP.xp} XP!
                    </div>
                </div>
            )}

            <header className="flex items-center justify-between p-6 md:px-12 pt-8 sticky top-0 bg-[#F9F8F4]/80 dark:bg-[#102213]/80 backdrop-blur-xl z-[100] border-b border-stone-200 dark:border-transparent">
                {/* 좌측: 프로필 아바타 → 마이페이지 */}
                <div className="flex items-center gap-3">
                    <button
                        className="relative group cursor-pointer appearance-none border-none bg-transparent p-0 flex flex-col items-center"
                        onClick={() => setView('profile')}
                        aria-label="마이페이지"
                    >
                        <div
                            className={`size-10 md:size-12 rounded-full bg-cover bg-center border-2 hover:border-[#2bee4b] transition-all shadow-lg overflow-hidden ${
                                (stats?.inventory?.frame_crystal || 0) > 0 ? 'border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                                : (stats?.inventory?.frame_gold || 0) > 0 ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                                : 'border-[#32673b]'
                            }`}
                            style={{ backgroundImage: `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${isMocking ? 'demo' : user?.uid}')` }}
                        ></div>
                        {empireRank && empireRank <= 3 && (
                            <div className="absolute -top-2 -left-1 text-lg drop-shadow-lg animate-bounce" style={{ animationDuration: '2s' }}>
                                {['👑', '🥈', '🥉'][empireRank - 1]}
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-[#2bee4b] text-[#102213] text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-[#102213] shadow-md">
                            LV {stats?.level || 1}
                        </div>
                        <span className="text-[8px] font-black text-slate-400 dark:text-[#92c99b] uppercase tracking-widest mt-2">마이페이지</span>
                    </button>
                </div>

                {/* 우측: 알림 + 메뉴(≡) */}
                <div className="flex items-center gap-2">
                    {/* 🔔 알림 버튼 */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                const opening = !showNotifications;
                                setShowNotifications(opening);
                                setShowMenu(false);
                                if (opening) markNotificationsRead();
                            }}
                            className="size-10 md:size-12 flex items-center justify-center rounded-full bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] shadow-sm text-slate-600 dark:text-gray-400 relative hover:bg-stone-50 dark:hover:bg-[#254528] transition-all active:scale-90"
                        >
                            <span className="material-symbols-outlined text-[24px]">notifications</span>
                            {hasUnread && <span className="absolute top-2 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1a331d]"></span>}
                        </button>

                        {showNotifications && (
                            <div className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 z-[110] max-h-80 overflow-y-auto"
                                onPointerDown={(e) => e.stopPropagation()}>
                                <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-900 dark:text-white">
                                    <span className="material-symbols-outlined text-xs text-[#2bee4b]">campaign</span>
                                    황실 전령
                                </h4>
                                <div className="space-y-2 text-xs text-slate-600 dark:text-gray-300">
                                    {notifications.length === 0 ? (
                                        <div className="p-3 text-center text-slate-400 dark:text-gray-600">
                                            <span className="material-symbols-outlined text-2xl opacity-30 mb-1 block">notifications_off</span>
                                            아직 알림이 없습니다
                                        </div>
                                    ) : notifications.map(n => (
                                        <div key={n.id} className={`p-3 rounded-xl border transition-colors ${n.read ? 'bg-stone-50 dark:bg-black/20 border-stone-100 dark:border-white/5' : 'bg-[#2bee4b]/5 border-[#2bee4b]/20'}`}>
                                            {n.type === 'reaction' ? (
                                                <>
                                                    <p className="font-bold text-[#057a1b] dark:text-[#2bee4b] flex items-center gap-1">
                                                        ✍️ 깃펜 흔들기
                                                    </p>
                                                    <p className="opacity-80 mt-0.5">
                                                        <span className="font-bold">{n.fromName}</span>님이 {n.bookTitle ? `"${n.bookTitle}"` : '회원님의'} 기록에 깃펜을 흔들었습니다
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="opacity-60">{n.message || '알림'}</p>
                                            )}
                                            {n.timestamp && (
                                                <p className="text-[10px] text-slate-400 dark:text-gray-600 mt-1">
                                                    {(() => {
                                                        const secs = Math.floor((Date.now() - new Date(n.timestamp.seconds * 1000)) / 1000);
                                                        if (secs < 60) return '방금 전';
                                                        if (secs < 3600) return `${Math.floor(secs / 60)}분 전`;
                                                        if (secs < 86400) return `${Math.floor(secs / 3600)}시간 전`;
                                                        return `${Math.floor(secs / 86400)}일 전`;
                                                    })()}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ≡ 메뉴 버튼 (드롭다운) */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowMenu(!showMenu); setShowNotifications(false); }}
                            className="size-10 md:size-12 flex items-center justify-center rounded-full bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] shadow-sm text-slate-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-[#254528] transition-all active:scale-90"
                            aria-label="메뉴"
                        >
                            <span className="material-symbols-outlined text-[24px]">menu</span>
                        </button>

                        {showMenu && (
                            <div
                                className="absolute top-full right-0 mt-3 w-56 bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 z-[110]"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                {/* 사용자 이름 */}
                                <div className="px-3 py-2 mb-1 border-b border-stone-100 dark:border-white/5">
                                    <p className="text-xs font-black text-slate-900 dark:text-white">{stats?.displayName || '학자님'}</p>
                                    <p className="text-[10px] text-[#057a1b] dark:text-[#2bee4b]">{stats?.title || '평민'} · LV {stats?.level || 1}</p>
                                </div>

                                {/* BGM 토글 */}
                                <button
                                    onClick={() => { soundManager.resume(); const on = soundManager.toggleBgm(); setBgmOn(on); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-white/5 transition-colors text-left"
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${bgmOn ? 'text-[#2bee4b]' : 'text-gray-400'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {bgmOn ? 'music_note' : 'music_off'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-gray-200">{bgmOn ? '배경음악 끄기' : '배경음악 켜기'}</span>
                                </button>

                                {/* 다크모드 토글 */}
                                <button
                                    onClick={() => setDarkMode(!darkMode)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-white/5 transition-colors text-left"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-yellow-500 dark:text-gray-400">
                                        {darkMode ? 'dark_mode' : 'light_mode'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-gray-200">{darkMode ? '라이트 모드' : '다크 모드'}</span>
                                </button>

                                <div className="my-1 border-t border-stone-100 dark:border-white/5" />

                                {/* 도움말 */}
                                <button
                                    onClick={() => { setShowGuide(true); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-white/5 transition-colors text-left"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-gray-400">help</span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-gray-200">도움말</span>
                                </button>

                                {/* 업적 컬렉션 */}
                                <button
                                    onClick={() => { setShowAchievements(true); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors text-left relative"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-gray-200">업적 컬렉션</span>
                                    {(stats?.achievements?.length || 0) > 0 && (
                                        <span className="ml-auto bg-amber-400 text-[#102213] text-[8px] font-black px-1.5 py-0.5 rounded-full">
                                            {stats.achievements.length}
                                        </span>
                                    )}
                                </button>

                                {/* 마이페이지 */}
                                <button
                                    onClick={() => { setView('profile'); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-white/5 transition-colors text-left"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-gray-400" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-gray-200">마이페이지</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-4xl mx-auto md:px-6">
              <ErrorBoundary>
                {/* 📢 공지사항 배너 (모든 탭에서 표시) */}
                {user && <AnnouncementBanner />}

                {view === 'dashboard' && <QuestBoard stats={stats} onSaveSession={handleSaveSession} onGoToLibrary={() => setView('library')} onModalChange={setHideBottomNav} />}
                {view === 'library' && <RoyalLibrary />}
                {view === 'community' && <Community darkMode={darkMode} stats={stats} onShopPurchase={handleShopPurchase} />}
                {view === 'shop' && (
                    <div className="px-4 py-6 max-w-lg mx-auto">
                        <GoldShop stats={stats} onPurchase={handleShopPurchase} />
                    </div>
                )}
                {view === 'profile' && (
                    <div className="text-center py-20 px-6 animate-book">
                        {/* 프로필 아바타 */}
                        <div className="relative size-32 mx-auto mb-6">
                            <div className={`size-full rounded-full border-4 p-1 ${
                                (stats?.inventory?.frame_crystal || 0) > 0 ? 'border-cyan-300 shadow-[0_0_40px_rgba(6,182,212,0.4)]'
                                : (stats?.inventory?.frame_gold || 0) > 0 ? 'border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.4)]'
                                : 'border-[#2bee4b] shadow-[0_0_40px_rgba(43,238,75,0.3)]'
                            }`}>
                                <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${isMocking ? 'demo' : user?.uid}')` }}></div>
                            </div>
                            {/* 관리자 왕관 또는 순위 배지 */}
                            {user?.email === 'peace@peace.re.kr' ? (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl" title="관리자">👑</div>
                            ) : empireRank && empireRank <= 3 ? (
                                <div className="absolute -top-3 -left-1 text-2xl drop-shadow-lg" title={`제국 ${empireRank}위`}>
                                    {['🥇', '🥈', '🥉'][empireRank - 1]}
                                </div>
                            ) : null}
                        </div>
                        {editingName ? (
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <input
                                    type="text"
                                    value={newDisplayName}
                                    onChange={e => setNewDisplayName(e.target.value)}
                                    maxLength={20}
                                    autoFocus
                                    className="bg-white dark:bg-black/40 border border-stone-300 dark:border-[#32673b] rounded-xl px-3 py-2 text-center text-lg font-black text-slate-900 dark:text-white outline-none focus:ring-2 ring-[#2bee4b] w-48"
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') { await handleNameChange(newDisplayName); }
                                        else if (e.key === 'Escape') { setEditingName(false); }
                                    }}
                                />
                                <button
                                    onClick={() => handleNameChange(newDisplayName)}
                                    className="size-9 rounded-full bg-[#2bee4b] text-[#102213] flex items-center justify-center shadow-md active:scale-90 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">check</span>
                                </button>
                                <button
                                    onClick={() => setEditingName(false)}
                                    className="size-9 rounded-full bg-stone-200 dark:bg-white/10 text-slate-500 dark:text-gray-400 flex items-center justify-center active:scale-90 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        ) : (
                            <h2 className="text-3xl font-black mb-1 font-mono tracking-tight text-slate-900 dark:text-white group/name flex items-center justify-center gap-2">
                                {user?.email === 'peace@peace.re.kr' && <span className="text-yellow-400 mr-1">👑</span>}
                                {empireRank && empireRank <= 3 && user?.email !== 'peace@peace.re.kr' && (
                                    <span className="mr-1">{['🥇', '🥈', '🥉'][empireRank - 1]}</span>
                                )}
                                {stats?.displayName || '황실 학자'}
                                <button
                                    onClick={() => { setNewDisplayName(stats?.displayName || ''); setEditingName(true); }}
                                    className="opacity-0 group-hover/name:opacity-100 transition-opacity size-7 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center text-slate-400 dark:text-gray-500 hover:text-[#2bee4b] active:scale-90"
                                    title="별명 변경"
                                >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                </button>
                            </h2>
                        )}
                        <p className="text-[#057a1b] dark:text-[#2bee4b] font-black uppercase tracking-[0.3em] text-[10px] mb-6">{getDisplayTitle(stats?.inventory, stats?.title || '입문 학자')}</p>

                        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
                            <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${stats?.empireId === 'logreia' ? 'bg-amber-400/10 border-amber-400 text-amber-400' :
                                stats?.empireId === 'visiontium' ? 'bg-purple-400/10 border-purple-400 text-purple-400' :
                                    stats?.empireId === 'factoria' ? 'bg-cyan-400/10 border-cyan-400 text-cyan-400' :
                                        'bg-gray-500/10 border-gray-500 text-gray-500'
                                }`}>
                                <span className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-xs">flag</span>
                                    {stats?.empireId ? (RPG_CONFIG.EMPIRES[stats.empireId]?.label || stats.empireId) : '소속 없음'}
                                </span>
                            </div>
                            {/* 제국 내 순위 */}
                            {empireRank && empireRank <= 3 && (
                                <div className="px-3 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400 text-yellow-400 text-[10px] font-black uppercase tracking-widest">
                                    {['🥇', '🥈', '🥉'][empireRank - 1]} 제국 {empireRank}위
                                </div>
                            )}
                            {empireRank && empireRank > 3 && (
                                <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                    제국 {empireRank}위
                                </div>
                            )}
                            {/* 프로필 공개 토글 (작은 배지) */}
                            <button
                                onClick={async () => {
                                    if (!auth.currentUser) return;
                                    const newVal = !(stats?.isPublic !== false);
                                    await updateDoc(doc(db, 'users', auth.currentUser.uid), { isPublic: newVal });
                                }}
                                className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
                                    stats?.isPublic !== false
                                        ? 'bg-[#2bee4b]/10 border-[#2bee4b] text-[#2bee4b]'
                                        : 'bg-stone-100/10 border-stone-300 dark:border-gray-600 text-slate-400 dark:text-gray-500'
                                }`}
                            >
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {stats?.isPublic !== false ? 'visibility' : 'visibility_off'}
                                    </span>
                                    {stats?.isPublic !== false ? '공개' : '비공개'}
                                </span>
                            </button>
                        </div>

                        {/* My Page Statistics Dashboard */}
                        <div className="space-y-6 text-left mb-16 max-w-sm mx-auto">
                            {/* Summary Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-[#1a331d] p-5 rounded-3xl border border-stone-200 dark:border-[#32673b] shadow-sm">
                                    <p className="text-[10px] uppercase text-gray-500 font-extrabold mb-1 tracking-widest">누적 골드</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.gold || 0} G</p>
                                </div>
                                <div className="bg-white dark:bg-[#1a331d] p-5 rounded-3xl border border-stone-200 dark:border-[#32673b] relative group cursor-pointer active:scale-95 transition-all shadow-sm overflow-hidden">
                                    <p className="text-[10px] uppercase text-gray-500 font-extrabold mb-1 tracking-widest">제국 기여</p>
                                    <p className="text-2xl font-black text-[#057a1b] dark:text-[#2bee4b]">{stats?.totalXp || 0} XP</p>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm("제국을 변경하시겠습니까?\n변경 시 '대관식(온보딩)' 절차를 다시 진행합니다.")) {
                                                const userRef = doc(db, 'users', auth.currentUser.uid);
                                                await updateDoc(userRef, { onboardingCompleted: false });
                                                window.location.reload();
                                            }
                                        }}
                                        className="absolute inset-0 flex items-center justify-center bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl text-[10px] font-black text-[#2bee4b] uppercase tracking-widest"
                                    >
                                        제국 재배정
                                    </button>
                                </div>
                            </div>

                            {/* Level Progress Card (Moved from Dashboard) */}
                            <div className="bg-white dark:bg-[#1a331d] p-6 rounded-3xl shadow-xl border border-stone-200 dark:border-[#32673b]">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 dark:text-[#92c99b] mb-1 opacity-60">현재 등급</span>
                                        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                                            <span className="material-symbols-outlined text-[#057a1b] dark:text-[#2bee4b] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
                                            <span className="text-lg font-bold">{getDisplayTitle(stats?.inventory, stats?.title || '입문 학자')}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] uppercase tracking-widest font-black text-[#92c99b] mb-1">LV. {stats?.level || 1}</span>
                                        <div className="flex items-center gap-1 text-orange-500 font-black">
                                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                            <span className="text-base">{stats?.streak || 0}일</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative pt-2">
                                    <div className="flex justify-between text-[10px] font-black text-[#92c99b] mb-1.5 uppercase tracking-wide">
                                        <span>{stats?.currentXp || 0} XP</span>
                                        <span>Goal: {stats?.xpLimit || 500} XP</span>
                                    </div>
                                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-[#2bee4b] to-[#1a331d] rounded-full transition-all duration-1000" style={{ width: `${(stats?.currentXp / (stats?.xpLimit || 500)) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Imperial League Card (Moved from Dashboard) */}
                            {(() => {
                                const tier = getLeagueTier(stats?.level || 1);
                                const levelsToNext = tier.nextMinLevel ? tier.nextMinLevel - (stats?.level || 1) : 0;
                                const tierProgress = tier.nextMinLevel
                                    ? ((stats?.level || 1) - tier.minLevel) / (tier.nextMinLevel - tier.minLevel) * 100
                                    : 100;
                                return (
                                    <div className="p-6 rounded-3xl shadow-xl border relative overflow-hidden"
                                        style={{ background: `linear-gradient(135deg, ${tier.color}20, ${tier.color}08)`, borderColor: tier.color + '40' }}>
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase tracking-widest font-black mb-1 opacity-60" style={{ color: tier.color }}>Imperial League</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{tier.icon}</span>
                                                    <span className="text-xl font-black uppercase tracking-widest" style={{ color: tier.color }}>{tier.label}</span>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 rounded-full border" style={{ backgroundColor: tier.color + '20', borderColor: tier.color + '50' }}>
                                                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: tier.color }}>LV.{stats?.level || 1}</span>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${tierProgress}%`, backgroundColor: tier.color, boxShadow: `0 0 12px ${tier.color}` }}></div>
                                        </div>
                                        {tier.nextLabel ? (
                                            <p className="text-[10px] text-slate-500 dark:text-white/50 mt-2 tracking-wide">다음 리그 <span style={{ color: tier.color }} className="font-bold">{tier.nextLabel}</span>까지 <span className="font-bold text-slate-900 dark:text-white">{levelsToNext}레벨</span></p>
                                        ) : (
                                            <p className="text-[10px] mt-2 tracking-wide font-bold" style={{ color: tier.color }}>최고 리그 달성!</p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Admin Access: Only for designated admin */}
                        {user?.email === 'peace@peace.re.kr' && (
                            <div className="mb-4">
                                <button
                                    onClick={() => setShowAdmin(true)}
                                    className="text-[10px] text-red-500 hover:text-red-400 border border-red-900/50 hover:border-red-500 bg-red-900/10 px-4 py-2 rounded-lg transition-colors uppercase tracking-widest"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">settings_suggest</span>
                                        관리자 모드 (Teacher Control)
                                    </span>
                                </button>
                            </div>
                        )}

                        {/* 유물관 & 업적 바로가기 버튼 */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                onClick={() => setShowRelicModal(true)}
                                className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-2xl p-4 text-left transition-all active:scale-[0.97] shadow-sm"
                            >
                                <div className="flex items-center gap-2.5 mb-2">
                                    <span className="material-symbols-outlined text-amber-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>museum</span>
                                    <span className="text-xs font-black text-slate-900 dark:text-white">유물관</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 dark:text-gray-500">
                                        {RELICS.filter(r => (stats?.relics?.[r.id] || 0) > 0).length}/{RELICS.length} 수집
                                    </span>
                                    <div className="flex -space-x-1">
                                        {RELICS.filter(r => (stats?.relics?.[r.id] || 0) > 0).slice(0, 4).map(r => (
                                            <span key={r.id} className="text-sm">{r.icon}</span>
                                        ))}
                                        {RELICS.filter(r => (stats?.relics?.[r.id] || 0) > 0).length === 0 && (
                                            <span className="text-xs text-slate-300 dark:text-gray-600">?</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                            <button
                                onClick={() => setShowAchievements(true)}
                                className="bg-white dark:bg-[#1a331d] border border-stone-200 dark:border-[#32673b] rounded-2xl p-4 text-left transition-all active:scale-[0.97] shadow-sm"
                            >
                                <div className="flex items-center gap-2.5 mb-2">
                                    <span className="material-symbols-outlined text-amber-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                                    <span className="text-xs font-black text-slate-900 dark:text-white">업적</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 dark:text-gray-500">
                                        {(stats?.achievements || []).length}/{ACHIEVEMENTS.length} 달성
                                    </span>
                                    <div className="flex -space-x-1">
                                        {ACHIEVEMENTS.filter(a => (stats?.achievements || []).includes(a.id)).slice(0, 4).map(a => (
                                            <span key={a.id} className="text-sm">{a.icon}</span>
                                        ))}
                                    </div>
                                </div>
                            </button>
                        </div>

                        <div className="mb-8 space-x-4">
                            <button
                                onClick={() => { setNewDisplayName(stats?.displayName || ''); setEditingName(true); }}
                                className="text-[10px] text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white border-b border-stone-200 dark:border-gray-600 hover:border-slate-900 dark:hover:border-white pb-0.5 transition-colors uppercase tracking-widest"
                            >
                                별명 변경
                            </button>
                            <button
                                onClick={async () => {
                                    if (!user?.email) {
                                        alert("이메일 정보가 없습니다. 관리자에게 문의하세요.");
                                        return;
                                    }
                                    if (window.confirm(`가입하신 이메일(${user.email})로 비밀번호 재설정 링크를 발송하시겠습니까?`)) {
                                        try {
                                            await sendPasswordResetEmail(auth, user.email);
                                            alert("비밀번호 재설정 이메일이 발송되었습니다. 메일함을 확인해주세요.");
                                        } catch (error) {
                                            console.error("Password reset error:", error);
                                            alert("메일 발송에 실패했습니다. 유효한 이메일인지 확인하거나 나중에 다시 시도해주세요.");
                                        }
                                    }
                                }}
                                className="text-[10px] text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white border-b border-stone-200 dark:border-gray-600 hover:border-slate-900 dark:hover:border-white pb-0.5 transition-colors uppercase tracking-widest"
                            >
                                비밀번호 변경
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                auth.signOut();
                                setIsMocking(false);
                            }}
                            className="text-xs font-black text-red-500/80 hover:text-red-400 uppercase tracking-widest border-b border-red-500/20 pb-1"
                        >
                            {isMocking ? '데모 모드 종료' : '서고에서 로그아웃'}
                        </button>
                    </div>
                )}
              </ErrorBoundary>
            </main>

            {/* ─── 하단 탭 내비게이션 ─────────────────────────────────── */}
            <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-[100] transition-all duration-300 ${hideBottomNav ? 'translate-y-24 opacity-0 pointer-events-none' : ''}`}>
                <div className="bg-white/95 dark:bg-[#1a331d]/95 backdrop-blur-2xl border border-stone-200 dark:border-[#32673b] rounded-[28px] shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.7)] flex justify-between items-center px-4 py-2">
                    {/* 홈 */}
                    <button
                        aria-label="홈"
                        aria-current={view === 'dashboard' ? 'page' : undefined}
                        onClick={() => setView('dashboard')}
                        className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all active:scale-90 ${view === 'dashboard' ? 'text-[#2bee4b] bg-[#2bee4b]/10' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: view === 'dashboard' ? "'FILL' 1" : "''" }}>home</span>
                        <span className="text-[10px] font-black uppercase tracking-wide">홈</span>
                    </button>
                    {/* 서고 */}
                    <button
                        aria-label="서고"
                        aria-current={view === 'library' ? 'page' : undefined}
                        onClick={() => setView('library')}
                        className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all active:scale-90 ${view === 'library' ? 'text-[#2bee4b] bg-[#2bee4b]/10' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: view === 'library' ? "'FILL' 1" : "''" }}>menu_book</span>
                        <span className="text-[10px] font-black uppercase tracking-wide">서고</span>
                    </button>
                    {/* 중앙 타이머 버튼 */}
                    <button
                        aria-label="시간의 기록"
                        onClick={() => setShowStatsModal(true)}
                        className="flex flex-col items-center justify-center size-14 bg-[#2bee4b] rounded-full -mt-8 border-4 border-white dark:border-[#102213] text-[#102213] shadow-[0_4px_20px_rgba(43,238,75,0.5)] hover:scale-110 active:scale-90 transition-all"
                    >
                        <span className="material-symbols-outlined text-[26px]">timelapse</span>
                    </button>
                    {/* 피드 */}
                    <button
                        aria-label="커뮤니티 피드"
                        aria-current={view === 'community' ? 'page' : undefined}
                        onClick={() => setView('community')}
                        className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all active:scale-90 ${view === 'community' ? 'text-[#2bee4b] bg-[#2bee4b]/10' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: view === 'community' ? "'FILL' 1" : "''" }}>diversity_3</span>
                        <span className="text-[10px] font-black uppercase tracking-wide">피드</span>
                    </button>
                    {/* 황실상회 */}
                    <button
                        aria-label="황실상회"
                        aria-current={view === 'shop' ? 'page' : undefined}
                        onClick={() => setView('shop')}
                        className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all active:scale-90 ${view === 'shop' ? 'text-[#2bee4b] bg-[#2bee4b]/10' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: view === 'shop' ? "'FILL' 1" : "''" }}>storefront</span>
                        <span className="text-[10px] font-black uppercase tracking-wide">상회</span>
                    </button>
                </div>
            </div>

            {
                stats && !stats.onboardingCompleted && (
                    <Onboarding user={user || { uid: 'demo' }} onComplete={refresh} />
                )
            }

            {user && showTutorial && (
                <TutorialModal onClose={() => setShowTutorial(false)} />
            )}

            {/* Admin Dashboard */}
            {showAdmin && <TeacherDashboard onClose={() => setShowAdmin(false)} />}

            {/* Guide Modal */}
            {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

            <GlobalStatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} />

            {/* 🏆 업적 모달 */}
            <AchievementsModal
                isOpen={showAchievements}
                onClose={() => setShowAchievements(false)}
                earnedIds={stats?.achievements || []}
                stats={stats}
            />

            {/* 🏺 유물관 모달 */}
            {showRelicModal && (() => {
                const myRelics = stats?.relics || {};
                const collected = RELICS.filter(r => (myRelics[r.id] || 0) > 0);
                return (
                    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowRelicModal(false)}>
                        <div
                            className="bg-[#F9F8F4] dark:bg-[#102213] border border-stone-200 dark:border-[#32673b] w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300 shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-5 pb-3 border-b border-stone-100 dark:border-white/5 shrink-0">
                                <div className="w-10 h-1 bg-stone-200 dark:bg-white/10 rounded-full mx-auto mb-4 sm:hidden" />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-amber-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>museum</span>
                                            황실 유물관
                                        </h2>
                                        <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
                                            {collected.length}/{RELICS.length} 수집 · 독서 기록 시 랜덤 발견
                                        </p>
                                    </div>
                                    <button onClick={() => setShowRelicModal(false)} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 transition-colors">
                                        <span className="material-symbols-outlined text-xl">close</span>
                                    </button>
                                </div>
                                <div className="mt-3 h-1.5 bg-stone-100 dark:bg-black/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{ width: `${Math.round((collected.length / RELICS.length) * 100)}%` }} />
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1 p-4">
                                <div className="grid grid-cols-4 gap-2.5">
                                    {RELICS.map(relic => {
                                        const owned = myRelics[relic.id] || 0;
                                        const rarityColor = { common: '#9ca3af', uncommon: '#22c55e', rare: '#a855f7', legendary: '#f59e0b' }[relic.rarity];
                                        const rarityLabel = { common: '일반', uncommon: '희귀', rare: '전설', legendary: '신화' }[relic.rarity];
                                        return (
                                            <div
                                                key={relic.id}
                                                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border text-center transition-all ${
                                                    owned > 0
                                                        ? 'bg-white dark:bg-[#1a331d] border-stone-200 dark:border-[#32673b] shadow-sm'
                                                        : 'bg-stone-50 dark:bg-black/20 border-stone-100 dark:border-white/5 opacity-30'
                                                }`}
                                            >
                                                <div className={`size-10 rounded-xl flex items-center justify-center text-2xl ${owned > 0 ? '' : 'grayscale'}`}>
                                                    {owned > 0 ? relic.icon : '?'}
                                                </div>
                                                <p className={`text-[8px] font-bold leading-tight ${owned > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-gray-600'}`}>
                                                    {owned > 0 ? relic.name : '???'}
                                                </p>
                                                {owned > 0 && (
                                                    <span className="text-[7px] font-black" style={{ color: rarityColor }}>
                                                        {rarityLabel} ×{owned}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 🎮 게임 이벤트 팝업 큐 (레벨업, 스트릭, 보물상자, 업적) */}
            <GamePopups
                queue={popupQueue}
                onNext={nextPopup}
                stats={stats}
            />
        </div >
    );
}

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, onSnapshot, deleteDoc, setDoc, where, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { RPG_CONFIG, getLevelFromXP, getTitleForLevel } from '../utils/rpg';

export default function TeacherDashboard({ onClose }) {
    const [activeTab, setActiveTab] = useState('war'); // 'war' | 'students' | 'announce' | 'export'
    const [students, setStudents] = useState([]);
    const [warStatus, setWarStatus] = useState({ isActive: true, round: 1, multiplier: 1.0 });
    const [xpMultiplier, setXpMultiplier] = useState(1.0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [resetProgress, setResetProgress] = useState(null);
    // 공지사항
    const [announcements, setAnnouncements] = useState([]);
    const [newAnn, setNewAnn] = useState({ title: '', content: '', type: 'info', isActive: true });

    // Sync System Config (War Status)
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'system', 'config'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setWarStatus(prev => ({ ...prev, ...data }));
                setXpMultiplier(data.multiplier || 1.0);
            }
        });
        return () => unsubscribe();
    }, []);

    // 공지사항 실시간 구독
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'announcements'), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setAnnouncements(list);
        });
        return () => unsub();
    }, []);

    // CSV 내보내기
    const handleExportCSV = async () => {
        setLoading(true);
        try {
            const usersSnap = await getDocs(collection(db, 'users'));
            const header = ['이름', '제국', '작위', '레벨', '총XP', '골드', '스트릭', '총세션수', '총독서시간(분)', '업적수', '최근독서일'];
            const rows = [header];
            for (const userDoc of usersSnap.docs) {
                const d = userDoc.data();
                const { level } = getLevelFromXP(d.totalXp || 0);
                rows.push([
                    d.displayName || '알 수 없음',
                    RPG_CONFIG.EMPIRES[d.empireId]?.label || '미지정',
                    d.title || getTitleForLevel(level),
                    level,
                    d.totalXp || 0,
                    Math.round(d.gold || 0),
                    d.streak || 0,
                    d.totalSessions || 0,
                    d.totalMinutes || 0,
                    (d.achievements || []).length,
                    d.lastRead?.toDate ? d.lastRead.toDate().toLocaleDateString('ko-KR') : '-',
                ]);
            }
            // BOM + CSV (Excel 한글 호환)
            const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `황실기록소_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}.csv`;
            a.click(); URL.revokeObjectURL(url);
        } catch (err) { alert('내보내기 실패: ' + err.message); }
        finally { setLoading(false); }
    };

    // 공지 등록
    const handleAddAnnouncement = async () => {
        if (!newAnn.content.trim()) return alert('내용을 입력하세요.');
        try {
            await addDoc(collection(db, 'announcements'), {
                ...newAnn,
                createdAt: serverTimestamp(),
            });
            setNewAnn({ title: '', content: '', type: 'info', isActive: true });
        } catch (err) { alert('공지 등록 실패: ' + err.message); }
    };

    // 공지 삭제/토글
    const handleDeleteAnnouncement = async (id) => {
        if (!window.confirm('공지를 삭제하시겠습니까?')) return;
        await deleteDoc(doc(db, 'announcements', id));
    };
    const handleToggleAnnouncement = async (id, current) => {
        await updateDoc(doc(db, 'announcements', id), { isActive: !current });
    };

    // ─── 이주의 학자 ──────────────────────────────────────────────────
    const [scholar, setScholar] = useState(null); // { uid, displayName, reason, totalXp, empireId }
    const [scholarReason, setScholarReason] = useState('');

    // 현재 이주의 학자 실시간 구독
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'system', 'scholar'), (snap) => {
            setScholar(snap.exists() ? snap.data() : null);
        });
        return () => unsub();
    }, []);

    const handleSelectScholar = async (student) => {
        const reason = window.prompt(
            `"${student.displayName}"을 이주의 학자로 선정합니다.\n선정 이유를 입력하세요 (예: 이번 주 최다 독서!):`,
            scholarReason || ''
        );
        if (reason === null) return; // 취소
        try {
            await setDoc(doc(db, 'system', 'scholar'), {
                uid: student.id,
                displayName: student.displayName || '학자',
                totalXp: student.totalXp || 0,
                empireId: student.empireId || '',
                reason: reason.trim() || '이주의 최고 학자!',
                weekStart: serverTimestamp(),
            });
            alert(`✅ "${student.displayName}"이(가) 이주의 학자로 선정되었습니다!`);
        } catch (err) {
            alert('선정 실패: ' + err.message);
        }
    };

    const handleClearScholar = async () => {
        if (!window.confirm('이주의 학자 선정을 해제하시겠습니까?')) return;
        await deleteDoc(doc(db, 'system', 'scholar'));
    };

    // Fetch students logic
    useEffect(() => {
        if (activeTab === 'students') {
            const fetchStudents = async () => {
                setLoading(true);
                setError(null);
                try {
                    // Fetch all users (Client-side sorting to avoid Index requirements for MVP)
                    const q = query(collection(db, 'users'));
                    const snapshot = await getDocs(q);
                    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    // Sort by XP descending
                    data.sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));
                    setStudents(data);
                } catch (err) {
                    console.error("Fetch students failed", err);
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchStudents();
        }
    }, [activeTab]);

    const handleSyncData = async () => {
        if (!window.confirm("모든 학생의 실제 독서 기록(세션)을 기반으로 누적 경험치와 골드를 재계산하시겠습니까?\n\n이 작업은 데이터베이스의 '유령 점수'를 제거하고 실제 기록과 동기화합니다.")) return;
        setLoading(true);
        try {
            const usersSnap = await getDocs(collection(db, 'users'));
            const feedSnap = await getDocs(collection(db, 'public_feed'));
            const feedDocs = feedSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const currentUserIds = new Set(usersSnap.docs.map(d => d.id));
            let updatedCount = 0;

            for (const userDoc of usersSnap.docs) {
                const userId = userDoc.id;
                const sessionsSnap = await getDocs(collection(db, 'users', userId, 'sessions'));
                const sessionIds = new Set(sessionsSnap.docs.map(d => d.id));

                let totalXp = 0;
                let totalGold = 0;

                sessionsSnap.forEach(sDoc => {
                    const sData = sDoc.data();
                    if (sData.rewards) {
                        totalXp += (sData.rewards.xp || 0);
                        totalGold += (sData.rewards.gold || 0);
                    }
                });

                // Clean up ghost feed items for THIS user
                const userFeedItems = feedDocs.filter(fd => fd.uid === userId && !fd.isChat);
                for (const item of userFeedItems) {
                    if (!sessionIds.has(item.id)) {
                        await deleteDoc(doc(db, 'public_feed', item.id));
                    }
                }

                await updateDoc(doc(db, 'users', userId), {
                    totalXp,
                    gold: totalGold
                });
                updatedCount++;
            }

            // FINAL SWEEP: Delete ANY feed item whose UID doesn't exist in our user list
            for (const item of feedDocs) {
                if (!item.isChat && item.uid && !currentUserIds.has(item.uid)) {
                    await deleteDoc(doc(db, 'public_feed', item.id));
                }
            }

            alert(`동기화 완료! 총 ${updatedCount}명의 데이터가 실제 기록과 동기화되었습니다.`);
            const q = query(collection(db, 'users'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));
            setStudents(data);
        } catch (err) {
            console.error("Sync failed", err);
            alert("동기화 중 오류가 발생했습니다: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleWarAction = async (action) => {
        if (!window.confirm(`정말 '${action}'을(를) 실행하시겠습니까?`)) return;

        try {
            const configRef = doc(db, 'system', 'config');

            if (action === 'RESET') {
                const secondConfirm = window.prompt(
                    `⚠️ 시즌 초기화\n\n모든 학생 XP, 골드, 스트릭이 0으로 리셋됩니다.\n독서 기록(세션)은 보존됩니다.\n\n확인하려면 "시즌초기화"를 입력하세요:`
                );
                if (secondConfirm !== '시즌초기화') {
                    alert('취소되었습니다.');
                    return;
                }

                setLoading(true);
                const usersSnap = await getDocs(collection(db, 'users'));
                const newRound = (warStatus.round || 1) + 1;
                setResetProgress({ current: 0, total: usersSnap.docs.length });

                // 유저 stats 청크 배치로 초기화 (Firestore 500개 제한 대응)
                const BATCH_SIZE = 400;
                let pendingDocs = [];
                for (let i = 0; i < usersSnap.docs.length; i++) {
                    pendingDocs.push(usersSnap.docs[i]);
                    if (pendingDocs.length === BATCH_SIZE || i === usersSnap.docs.length - 1) {
                        const batch = writeBatch(db);
                        for (const uDoc of pendingDocs) {
                            batch.update(doc(db, 'users', uDoc.id), { totalXp: 0, gold: 0, streak: 0 });
                        }
                        await batch.commit();
                        setResetProgress({ current: i + 1, total: usersSnap.docs.length });
                        pendingDocs = [];
                    }
                }

                // 공개 피드 삭제 (채팅 제외)
                const feedSnap = await getDocs(collection(db, 'public_feed'));
                let feedBatch = writeBatch(db);
                let feedCount = 0;
                for (const fDoc of feedSnap.docs) {
                    if (!fDoc.data().isChat) {
                        feedBatch.delete(doc(db, 'public_feed', fDoc.id));
                        feedCount++;
                        if (feedCount % 400 === 0) {
                            await feedBatch.commit();
                            feedBatch = writeBatch(db);
                        }
                    }
                }
                if (feedCount % 400 !== 0 && feedCount > 0) await feedBatch.commit();

                // 새 시즌 설정
                await setDoc(configRef, {
                    isActive: true, round: newRound, multiplier: 1.0,
                    seasonStartedAt: serverTimestamp()
                }, { merge: true });

                setResetProgress(null);
                alert(`🎉 시즌 ${newRound} 시작!\n${usersSnap.docs.length}명의 데이터가 새 시즌으로 초기화되었습니다.`);

            } else if (action === 'PAUSE') {
                const newStatus = !warStatus.isActive;
                await setDoc(configRef, { isActive: newStatus }, { merge: true });

            } else if (action === 'SYNC') {
                await handleSyncData();
            }
        } catch (err) {
            console.error("Action failed", err);
            setResetProgress(null);
            alert("명령 실패: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncStudent = async (studentId) => {
        try {
            const sessionsSnap = await getDocs(collection(db, 'users', studentId, 'sessions'));
            const sessionIds = new Set(sessionsSnap.docs.map(d => d.id));

            let totalXp = 0;
            let totalGold = 0;
            sessionsSnap.forEach(sDoc => {
                const sData = sDoc.data();
                if (sData.rewards) {
                    totalXp += (sData.rewards.xp || 0);
                    totalGold += (sData.rewards.gold || 0);
                }
            });

            // Clean public feed
            const feedRef = collection(db, 'public_feed');
            const q = query(feedRef, where('uid', '==', studentId));
            const feedSnap = await getDocs(q);

            for (const fDoc of feedSnap.docs) {
                const fData = fDoc.data();
                if (!fData.isChat && !sessionIds.has(fDoc.id)) {
                    await deleteDoc(doc(db, 'public_feed', fDoc.id));
                }
            }

            await updateDoc(doc(db, 'users', studentId), { totalXp, gold: totalGold });
            setStudents(prev => prev.map(s => s.id === studentId ? { ...s, totalXp, gold: totalGold } : s));
            alert("해당 학생의 실제 기록 기반 점수 및 피드 동기화가 완료되었습니다.");
        } catch (err) {
            console.error("Single sync failed", err);
            alert("동기화 실패: " + err.message);
        }
    };

    const handleUpdateEmpire = async (studentId, currentEmpire) => {
        const empires = Object.entries(RPG_CONFIG.EMPIRES);
        const options = empires.map(([id, emp]) => `${id}: ${emp.label}`).join('\n');
        const newEmpireId = window.prompt(`변경할 제국 ID를 입력하세요:\n${options}`, currentEmpire);

        if (!newEmpireId) return;
        if (!RPG_CONFIG.EMPIRES[newEmpireId.toLowerCase()]) {
            alert("유효하지 않은 제국 ID입니다.");
            return;
        }

        try {
            await updateDoc(doc(db, 'users', studentId), {
                empireId: newEmpireId.toLowerCase()
            });
            setStudents(prev => prev.map(s => s.id === studentId ? { ...s, empireId: newEmpireId.toLowerCase() } : s));
            alert("제국이 변경되었습니다.");
        } catch (err) {
            console.error("Update empire failed", err);
            alert("변경 실패: " + err.message);
        }
    };

    const handleDeleteStudent = async (studentId) => {
        if (!window.confirm("정말 이 학생의 데이터를 영구 삭제하시겠습니까?\n(복구할 수 없습니다)")) return;
        try {
            await deleteDoc(doc(db, 'users', studentId));
            setStudents(prev => prev.filter(s => s.id !== studentId));
            alert("삭제되었습니다.");
        } catch (err) {
            console.error("Delete failed", err);
            alert("삭제 실패: " + err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#050b06] z-[250] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header */}
            <header className="bg-[#1a331d] border-b border-[#32673b] p-6 flex justify-between items-center shadow-md z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-900/30 rounded-xl border border-red-500/30 text-red-500">
                        <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest">관리자 모드</h2>
                        <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Teacher / Admin Access</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-3 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                    <span className="material-symbols-outlined text-2xl">close</span>
                </button>
            </header>

            {/* Sidebar + Content Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-[#0f1a12] border-r border-[#32673b] p-6 hidden md:block">
                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab('war')}
                            className={`w-full p-4 rounded-xl text-left font-bold uppercase tracking-wider flex items-center gap-3 transition-all ${activeTab === 'war' ? 'bg-[#2bee4b] text-[#102213] shadow-[0_0_15px_rgba(43,238,75,0.3)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined">public</span>
                            영토 전쟁 제어
                        </button>
                        <button
                            onClick={() => setActiveTab('students')}
                            className={`w-full p-4 rounded-xl text-left font-bold uppercase tracking-wider flex items-center gap-3 transition-all ${activeTab === 'students' ? 'bg-[#2bee4b] text-[#102213] shadow-[0_0_15px_rgba(43,238,75,0.3)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined">school</span>
                            학자(학생) 관리
                        </button>

                        {/* 공지사항 탭 */}
                        <button
                            onClick={() => setActiveTab('announce')}
                            className={`w-full p-4 rounded-xl text-left font-bold uppercase tracking-wider flex items-center gap-3 transition-all ${activeTab === 'announce' ? 'bg-[#2bee4b] text-[#102213] shadow-[0_0_15px_rgba(43,238,75,0.3)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined">campaign</span>
                            공지사항 관리
                        </button>

                        {/* 내보내기 탭 */}
                        <button
                            onClick={() => setActiveTab('export')}
                            className={`w-full p-4 rounded-xl text-left font-bold uppercase tracking-wider flex items-center gap-3 transition-all ${activeTab === 'export' ? 'bg-[#2bee4b] text-[#102213] shadow-[0_0_15px_rgba(43,238,75,0.3)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined">download</span>
                            데이터 내보내기
                        </button>
                    </nav>

                    <div className="mt-12 p-4 bg-red-900/10 border border-red-900/30 rounded-xl">
                        <p className="text-[10px] text-red-400 font-bold uppercase mb-2">System Status</p>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-xs text-gray-300">Database: Online</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-xs text-gray-300">Sync Jar: Active</span>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-[#102213] p-6 md:p-10 relative">
                    {activeTab === 'war' && (
                        <div className="max-w-4xl space-y-8 animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-[#1a331d] border border-[#32673b] rounded-[32px] p-8 shadow-xl">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[#2bee4b]">swords</span>
                                    현재 시즌 제어 ({warStatus.round} 라운드)
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button
                                        onClick={() => handleWarAction('PAUSE')}
                                        className={`p-8 rounded-3xl border-2 flex flex-col items-center justify-center gap-4 transition-all ${!warStatus.isActive ? 'bg-amber-400/20 border-amber-400 text-amber-400' : 'bg-black/20 border-[#32673b] hover:border-amber-400/50 text-gray-400 hover:text-amber-400'}`}
                                    >
                                        <span className="material-symbols-outlined text-5xl">{warStatus.isActive ? 'pause_circle' : 'play_circle'}</span>
                                        <span className="text-lg font-black uppercase tracking-widest">{warStatus.isActive ? '전쟁 일시 정지' : '전쟁 재개'}</span>
                                        <p className="text-xs opacity-60 font-medium">학생들의 점령 활동을 {warStatus.isActive ? '중단' : '재개'}합니다.</p>
                                    </button>

                                    <button
                                        onClick={() => handleWarAction('SYNC')}
                                        className="p-8 rounded-3xl border-2 border-[#32673b] bg-black/20 hover:bg-[#2bee4b]/10 hover:border-[#2bee4b] text-gray-400 hover:text-[#2bee4b] flex flex-col items-center justify-center gap-4 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-5xl">sync</span>
                                        <span className="text-lg font-black uppercase tracking-widest">데이터 정밀 동기화</span>
                                        <p className="text-xs opacity-60 font-medium">실제 독서 기록을 전수 조사하여 점수 버그를 해결합니다.</p>
                                    </button>

                                    <button
                                        onClick={() => handleWarAction('RESET')}
                                        className="p-8 rounded-3xl border-2 border-[#32673b] bg-black/20 hover:bg-red-900/20 hover:border-red-500 text-gray-400 hover:text-red-500 flex flex-col items-center justify-center gap-4 transition-all group"
                                    >
                                        <span className="material-symbols-outlined text-5xl group-hover:rotate-180 transition-transform duration-500">restart_alt</span>
                                        <span className="text-lg font-black uppercase tracking-widest">시즌 초기화</span>
                                        <p className="text-xs opacity-60 font-medium">모든 영토 점유율을 0으로 리셋합니다. (주의)</p>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[#1a331d] border border-[#32673b] rounded-[32px] p-8 shadow-xl">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[#2bee4b]">tune</span>
                                    글로벌 밸런스 조정
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2 text-gray-400 font-bold uppercase">
                                            <span>XP Multiplier (이벤트 배율)</span>
                                            <span className="text-[#2bee4b]">x{xpMultiplier.toFixed(1)}</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="5" step="0.5"
                                            value={xpMultiplier}
                                            onChange={(e) => setXpMultiplier(parseFloat(e.target.value))}
                                            className="w-full accent-[#2bee4b] bg-black/40 h-2 rounded-full appearance-none cursor-pointer"
                                        />
                                        <div className="flex items-center justify-between mt-3">
                                            <p className="text-[10px] text-gray-500">전체 서버 경험치 획득 배율. 이벤트 기간에 사용하세요.</p>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await setDoc(doc(db, 'system', 'config'), { multiplier: xpMultiplier }, { merge: true });
                                                        alert(`✅ XP 배율이 x${xpMultiplier.toFixed(1)}로 적용되었습니다!`);
                                                    } catch (err) {
                                                        alert('적용 실패: ' + err.message);
                                                    }
                                                }}
                                                className="shrink-0 ml-4 bg-[#2bee4b] text-[#102213] text-xs font-black px-4 py-2 rounded-lg uppercase tracking-widest hover:bg-[#1ecc3a] transition-colors"
                                            >
                                                적용
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'students' && (
                        <div className="max-w-5xl animate-in fade-in zoom-in-95 duration-300">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#2bee4b]">group</span>
                                등록된 학자 목록 ({students.length})
                            </h3>

                            {/* 이주의 학자 현황 카드 */}
                            {scholar ? (
                                <div className="mb-6 bg-amber-400/10 border border-amber-400/30 rounded-2xl p-4 flex items-center gap-4">
                                    <span className="text-3xl">👑</span>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-0.5">이주의 학자</p>
                                        <p className="text-white font-black">{scholar.displayName}</p>
                                        {scholar.reason && <p className="text-gray-400 text-xs italic">"{scholar.reason}"</p>}
                                    </div>
                                    <button onClick={handleClearScholar}
                                        className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-bold">
                                        선정 해제
                                    </button>
                                </div>
                            ) : (
                                <div className="mb-4 text-xs text-gray-600 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs">info</span>
                                    학생 이름 옆 👑 버튼으로 이주의 학자를 선정하세요.
                                </div>
                            )}

                            <div className="bg-[#1a331d] border border-[#32673b] rounded-3xl overflow-hidden shadow-xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-400">
                                        <thead className="bg-black/20 text-[#2bee4b] uppercase font-bold text-[10px] tracking-[0.2em]">
                                            <tr>
                                                <th className="p-5">이름</th>
                                                <th className="p-5">소속 제국</th>
                                                <th className="p-5">작위</th>
                                                <th className="p-5 text-right">총 XP</th>
                                                <th className="p-5 text-center">최근 활동</th>
                                                <th className="p-5 text-center">관리</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {loading ? (
                                                <tr><td colSpan="6" className="p-20 text-center"><span className="animate-pulse">데이터를 불러오는 중...</span></td></tr>
                                            ) : error ? (
                                                <tr><td colSpan="6" className="p-20 text-center text-red-500 font-bold">Error: {error}</td></tr>
                                            ) : students.map(student => (
                                                <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="p-5 font-bold text-white">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-9 rounded-full bg-gray-700 bg-cover border border-white/10" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${student.uid || student.id}')` }}></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[15px]">{student.displayName || 'Unknown'}</span>
                                                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{student.uid?.substring(0, 8)}...</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-black border ${student.empireId === 'logreia' ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' :
                                                            student.empireId === 'visiontium' ? 'text-purple-400 border-purple-400/30 bg-purple-400/10' :
                                                                student.empireId === 'factoria' ? 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' :
                                                                    'text-gray-500 border-gray-500/30 bg-gray-500/10'
                                                            }`}>
                                                            {RPG_CONFIG.EMPIRES[student.empireId]?.label || '미지정'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-[10px] font-black uppercase tracking-widest text-[#92c99b]">{student.title || '입문자'}</td>
                                                    <td className="p-5 text-right font-mono text-white text-lg font-black">
                                                        {(student.totalXp || 0).toLocaleString()}
                                                        <span className="text-[10px] text-gray-500 ml-1 font-bold">XP</span>
                                                    </td>
                                                    <td className="p-5 text-center text-[10px] text-gray-500 font-bold uppercase">
                                                        {student.lastRead?.seconds ? new Date(student.lastRead.seconds * 1000).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                                            {/* 이주의 학자 선정 */}
                                                            <button
                                                                onClick={() => handleSelectScholar(student)}
                                                                title="이주의 학자 선정"
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-black text-[10px] uppercase shadow-sm transition-all ${scholar?.uid === student.id
                                                                    ? 'bg-amber-400/20 text-amber-400 border-amber-400/40 hover:bg-amber-400 hover:text-white'
                                                                    : 'bg-amber-400/10 text-amber-400 border-amber-400/20 hover:bg-amber-400 hover:text-white'
                                                                    }`}
                                                            >
                                                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                                                                {scholar?.uid === student.id ? '👑 선정됨' : '학자 선정'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateEmpire(student.id, student.empireId)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2bee4b]/10 text-[#2bee4b] rounded-lg border border-[#2bee4b]/30 font-black text-[10px] uppercase shadow-sm hover:bg-[#2bee4b] hover:text-[#102213] transition-all"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">flag</span>
                                                                제국 변경
                                                            </button>
                                                            <button
                                                                onClick={() => handleSyncStudent(student.id)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-400/10 text-cyan-400 rounded-lg border border-cyan-400/30 font-black text-[10px] uppercase shadow-sm hover:bg-cyan-400 hover:text-white transition-all outline-none"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">sync</span>
                                                                데이터 보정
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteStudent(student.id)}
                                                                className="p-1.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">delete_forever</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {students.length === 0 && !loading && !error && (
                                                <tr><td colSpan="6" className="p-20 text-center opacity-50 uppercase tracking-widest text-xs font-bold">등록된 학생이 없습니다.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 📢 공지사항 관리 탭 */}
                    {activeTab === 'announce' && (
                        <div className="max-w-2xl space-y-8 animate-in fade-in zoom-in-95 duration-300">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#2bee4b]" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
                                공지사항 관리
                            </h2>

                            {/* 새 공지 작성 */}
                            <div className="bg-[#1a331d] border border-[#32673b] rounded-3xl p-6 space-y-4">
                                <h3 className="text-sm font-black text-gray-300 uppercase tracking-widest">새 공지 작성</h3>
                                <input
                                    type="text" placeholder="제목 (선택사항)"
                                    value={newAnn.title}
                                    onChange={e => setNewAnn(p => ({ ...p, title: e.target.value }))}
                                    className="w-full bg-black/30 border border-[#32673b] text-white text-sm rounded-2xl px-4 py-3 focus:outline-none focus:border-[#2bee4b]"
                                />
                                <textarea
                                    placeholder="공지 내용을 입력하세요..."
                                    rows={3}
                                    value={newAnn.content}
                                    onChange={e => setNewAnn(p => ({ ...p, content: e.target.value }))}
                                    className="w-full bg-black/30 border border-[#32673b] text-white text-sm rounded-2xl px-4 py-3 focus:outline-none focus:border-[#2bee4b] resize-none"
                                />
                                <div className="flex items-center gap-3">
                                    <select
                                        value={newAnn.type}
                                        onChange={e => setNewAnn(p => ({ ...p, type: e.target.value }))}
                                        className="bg-black/30 border border-[#32673b] text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
                                    >
                                        <option value="info">ℹ️ 정보</option>
                                        <option value="event">🎉 이벤트</option>
                                        <option value="warning">⚠️ 경고</option>
                                    </select>
                                    <button
                                        onClick={handleAddAnnouncement}
                                        className="ml-auto bg-[#2bee4b] text-[#102213] text-sm font-black px-6 py-2 rounded-xl uppercase tracking-widest hover:bg-[#1ecc3a] transition-colors"
                                    >
                                        게시
                                    </button>
                                </div>
                            </div>

                            {/* 기존 공지 목록 */}
                            <div className="space-y-3">
                                {announcements.length === 0 && (
                                    <p className="text-gray-600 text-sm text-center py-8">등록된 공지사항이 없습니다.</p>
                                )}
                                {announcements.map(ann => (
                                    <div key={ann.id} className={`bg-[#1a331d] border rounded-2xl p-4 flex items-start gap-3 ${ann.isActive ? 'border-[#32673b]' : 'border-[#32673b]/30 opacity-50'}`}>
                                        <div className="flex-1 min-w-0">
                                            {ann.title && <p className="text-xs font-black text-[#2bee4b] mb-1">{ann.title}</p>}
                                            <p className="text-sm text-gray-300 line-clamp-2">{ann.content}</p>
                                            <p className="text-[10px] text-gray-600 mt-1">
                                                {ann.type === 'event' ? '🎉' : ann.type === 'warning' ? '⚠️' : 'ℹ️'} {ann.isActive ? '게시 중' : '숨김'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => handleToggleAnnouncement(ann.id, ann.isActive)}
                                                className="text-xs text-gray-400 hover:text-white bg-white/5 px-2 py-1 rounded-lg">
                                                {ann.isActive ? '숨김' : '게시'}
                                            </button>
                                            <button onClick={() => handleDeleteAnnouncement(ann.id)}
                                                className="text-xs text-red-400 hover:text-white bg-red-500/10 px-2 py-1 rounded-lg">
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 📊 데이터 내보내기 탭 */}
                    {activeTab === 'export' && (
                        <div className="max-w-2xl space-y-8 animate-in fade-in zoom-in-95 duration-300">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#2bee4b]" style={{ fontVariationSettings: "'FILL' 1" }}>download</span>
                                데이터 내보내기
                            </h2>

                            <div className="bg-[#1a331d] border border-[#32673b] rounded-3xl p-8 space-y-6">
                                <div>
                                    <h3 className="text-lg font-black text-white mb-2">📋 학생 독서 기록 (CSV)</h3>
                                    <p className="text-gray-400 text-sm mb-4">
                                        모든 학생의 이름, 제국, 레벨, XP, 골드, 스트릭, 총독서시간, 업적 수, 최근독서일을 Excel 호환 CSV 파일로 내보냅니다.
                                    </p>
                                    <div className="bg-black/30 rounded-2xl p-4 mb-4 text-xs text-gray-500 font-mono">
                                        이름 / 제국 / 작위 / 레벨 / 총XP / 골드 / 스트릭 / 총세션수 / 총독서시간(분) / 업적수 / 최근독서일
                                    </div>
                                    <button
                                        onClick={handleExportCSV}
                                        disabled={loading}
                                        className="w-full py-4 bg-[#2bee4b] text-[#102213] rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-[#1ecc3a] transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        <span className="material-symbols-outlined">download</span>
                                        {loading ? '처리 중...' : 'CSV 파일 다운로드'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-600 border-t border-white/5 pt-4">
                                    ⚠️ 한글 파일명 사용 시 Excel에서 올바르게 열리려면 UTF-8 BOM 인코딩이 필요합니다. 이 파일은 자동으로 BOM이 포함되어 있습니다.
                                </p>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* 시즌 초기화 진행률 오버레이 */}
            {resetProgress && (
                <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-[#2bee4b] text-5xl animate-spin mb-6">restart_alt</span>
                    <p className="text-white font-black text-xl mb-2">시즌 초기화 중...</p>
                    <p className="text-gray-400 text-sm mb-6">
                        {resetProgress.current} / {resetProgress.total} 명 완료
                    </p>
                    <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#2bee4b] rounded-full transition-all duration-300"
                            style={{ width: `${(resetProgress.current / resetProgress.total) * 100}%` }}
                        />
                    </div>
                    <p className="text-gray-600 text-xs mt-4">잠시만 기다려 주세요...</p>
                </div>
            )}
        </div>
    );
}

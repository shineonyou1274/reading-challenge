import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * HybridSyncWidget
 * 
 * Displays the connection status with the physical classroom "Ether Jar".
 * In a real scenario, this would connect to an IoT backend or MQTT broker.
 * For MVP, we simulate the "syncing" visual effect.
 */
export default function HybridSyncWidget({ user }) {
    const [syncStatus, setSyncStatus] = useState('connecting'); // connecting, synced, error
    const [jarLevel, setJarLevel] = useState(0); // 0-100%
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
        // Simulate initial connection sequence
        const timer1 = setTimeout(() => setSyncStatus('synced'), 2000);

        // Simulate jar level fluctuations (breathing effect)
        const interval = setInterval(() => {
            setPulse(p => !p);
        }, 3000);

        return () => {
            clearTimeout(timer1);
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (!user) return;
        // Listen to user's total XP to update the virtual jar level representation
        const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                const xp = doc.data().totalXp || 0;
                // Cap at 10000 XP for full jar visual in this widget
                const level = Math.min((xp % 2000) / 2000 * 100, 100);
                setJarLevel(level);
            }
        });
        return () => unsub();
    }, [user]);

    return (
        <div className="bg-[#1a331d] border border-[#32673b] rounded-2xl p-4 flex items-center gap-4 shadow-lg group relative overflow-hidden">
            {/* Background Circuit Pattern */}
            <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')] pointer-events-none"></div>

            {/* Status Indicator */}
            <div className={`relative size-12 rounded-full border-2 flex items-center justify-center bg-black/40 transition-all duration-1000 ${syncStatus === 'synced' ? 'border-cyan-500 shadow-[0_0_15px_#06b6d4]' : 'border-gray-500'}`}>
                <span className={`material-symbols-outlined text-2xl transition-colors ${syncStatus === 'synced' ? 'text-cyan-400' : 'text-gray-500'}`}>
                    {syncStatus === 'synced' ? 'dataset_linked' : 'cloud_sync'}
                </span>

                {/* Ping Animation */}
                {syncStatus === 'synced' && (
                    <div className="absolute inset-0 rounded-full border border-cyan-500/50 animate-ping"></div>
                )}
            </div>

            <div className="flex-1 z-10">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                        Classroom Ether Jar
                        <span className={`size-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`}></span>
                    </h4>
                    <span className="text-[10px] font-mono text-gray-500">ID: CIS-82</span>
                </div>

                <div className="h-2 w-full bg-[#0a150c] rounded-full overflow-hidden border border-white/5 relative">
                    {/* Liquid Effect */}
                    <div
                        className="h-full bg-cyan-500 relative transition-all duration-1000 ease-out"
                        style={{ width: `${jarLevel}%` }}
                    >
                        <div className="absolute top-0 right-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>
                    </div>
                </div>

                <p className="text-[9px] text-gray-400 mt-1.5 flex justify-between">
                    <span>Physical Sync Active</span>
                    <span>{Math.floor(jarLevel)}% Filled</span>
                </p>
            </div>
        </div>
    );
}

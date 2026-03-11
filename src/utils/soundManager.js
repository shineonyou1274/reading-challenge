/**
 * ─── Royal Reading Quest Sound Manager ───────────────────────────────────────
 * BGM: bgm1.mp3 / bgm2.mp3 (public 폴더) — 랜덤 루프 재생
 * SFX: Web Audio API 합성음 (별도 파일 불필요)
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.sfxGain = null;
        this.bgmAudio = null;
        this.isBgmPlaying = false;
        this.bgmEnabled = JSON.parse(localStorage.getItem('rrq_bgm') ?? 'true');
        this.sfxEnabled = JSON.parse(localStorage.getItem('rrq_sfx') ?? 'true');
        this._bgmFiles = ['/bgm1.mp3', '/bgm2.mp3'];
    }

    _initCtx() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
        this.sfxGain.connect(this.ctx.destination);
    }

    // ─── BGM: MP3 랜덤 루프 ──────────────────────────────────────────
    startBgm() {
        if (this.isBgmPlaying || !this.bgmEnabled) return;
        try {
            const file = this._bgmFiles[Math.floor(Math.random() * this._bgmFiles.length)];
            this.bgmAudio = new Audio(file);
            this.bgmAudio.loop = true;
            this.bgmAudio.volume = 0.22;
            this.bgmAudio.play().catch(() => { });
            this.isBgmPlaying = true;
        } catch (e) {
            console.warn('BGM 재생 실패:', e);
        }
    }

    stopBgm() {
        if (!this.bgmAudio) return;
        const step = this.bgmAudio.volume / 30;
        const fade = setInterval(() => {
            if (!this.bgmAudio) { clearInterval(fade); return; }
            if (this.bgmAudio.volume > step) {
                this.bgmAudio.volume -= step;
            } else {
                this.bgmAudio.pause();
                this.bgmAudio = null;
                clearInterval(fade);
            }
        }, 50);
        this.isBgmPlaying = false;
    }

    toggleBgm() {
        this.bgmEnabled = !this.bgmEnabled;
        localStorage.setItem('rrq_bgm', JSON.stringify(this.bgmEnabled));
        if (this.bgmEnabled) this.startBgm();
        else this.stopBgm();
        return this.bgmEnabled;
    }

    // 모바일 자동재생 정책 대응: 첫 터치 시 호출
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        if (this.bgmEnabled && !this.isBgmPlaying) this.startBgm();
    }

    // ─── SFX 공통 헬퍼 ───────────────────────────────────────────────
    _sfxOsc(freq, type, vol, start, end) {
        this._initCtx();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(freq, start);
        osc.type = type;
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.001, end);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(start);
        osc.stop(end + 0.05);
    }

    // ─── SFX: 주사위 굴리기 ─────────────────────────────────────────
    playDice() {
        if (!this.sfxEnabled) return;
        this._initCtx();
        const now = this.ctx.currentTime;
        for (let i = 0; i < 10; i++) {
            const t = now + i * 0.07 + Math.random() * 0.02;
            const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let j = 0; j < data.length; j++) {
                data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (data.length * 0.2));
            }
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
            src.connect(gain);
            gain.connect(this.sfxGain);
            src.start(t);
        }
        // 마지막 탁! 소리
        const lastT = now + 0.78;
        this._sfxOsc(180, 'sawtooth', 0.4, lastT, lastT + 0.15);
    }

    // ─── SFX: 코인/XP 획득 ─────────────────────────────────────────
    playCoin() {
        if (!this.sfxEnabled) return;
        this._initCtx();
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            this._sfxOsc(freq, 'sine', 0.35, now + i * 0.07, now + i * 0.07 + 0.2);
        });
    }

    // ─── SFX: 레벨업 팡파레 ─────────────────────────────────────────
    playLevelUp() {
        if (!this.sfxEnabled) return;
        this._initCtx();
        const now = this.ctx.currentTime;
        [[262, 0], [330, 0.12], [392, 0.24], [523, 0.36], [659, 0.52], [784, 0.7]].forEach(([freq, t]) => {
            this._sfxOsc(freq, 'triangle', 0.3, now + t, now + t + 0.45);
        });
    }

    // ─── SFX: 업적 달성 ─────────────────────────────────────────────
    playAchievement() {
        if (!this.sfxEnabled) return;
        this._initCtx();
        const now = this.ctx.currentTime;
        [[392, 0], [523, 0.1], [659, 0.2], [784, 0.3], [1046, 0.45]].forEach(([freq, t]) => {
            this._sfxOsc(freq, 'sine', 0.25, now + t, now + t + 0.3);
        });
    }

    // ─── SFX: 보물상자 열기 ─────────────────────────────────────────
    playChestOpen() {
        if (!this.sfxEnabled) return;
        this._initCtx();
        const now = this.ctx.currentTime;
        this._sfxOsc(120, 'sawtooth', 0.12, now, now + 0.35);
        setTimeout(() => this.playCoin(), 380);
    }

    // ─── SFX: 저장 완료 ─────────────────────────────────────────────
    playSuccess() {
        if (!this.sfxEnabled) return;
        this._initCtx();
        const now = this.ctx.currentTime;
        [[440, 0], [554, 0.1], [659, 0.2]].forEach(([freq, t]) => {
            this._sfxOsc(freq, 'sine', 0.3, now + t, now + t + 0.28);
        });
    }

    // ─── SFX: 클릭 ──────────────────────────────────────────────────
    playClick() {
        if (!this.sfxEnabled) return;
        this._initCtx();
        const now = this.ctx.currentTime;
        this._sfxOsc(900, 'sine', 0.12, now, now + 0.05);
    }

    // ─── SFX: 스트릭 마일스톤 🔥 ────────────────────────────────────
    playStreak() {
        if (!this.sfxEnabled) return;
        this._initCtx();
        const now = this.ctx.currentTime;
        for (let i = 0; i < 6; i++) {
            const freq = 220 * Math.pow(1.15, i);
            this._sfxOsc(freq, 'sawtooth', 0.15, now + i * 0.08, now + i * 0.08 + 0.12);
        }
    }
}

export const soundManager = new SoundManager();

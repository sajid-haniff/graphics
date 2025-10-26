// Howler-based SFX registry in closure style (no classes).
import { Howl, Howler } from 'howler';

const createManagedHowl = ({ src, volume = 0.5, loop = false, max = 0 }) => {
    let active = 0;
    const h = new Howl({ src: [src], volume, loop });

    const play = ({ volume: vol, rate } = {}) => {
        if (max && active >= max) return null;
        const id = h.play();
        active++;
        if (vol !== undefined) h.volume(vol, id);
        if (rate) h.rate(rate, id);
        h.once('end', () => { active = Math.max(0, active - 1); }, id);
        return { stop: () => h.stop(id), setVolume: (v) => h.volume(v, id), id, howl: h };
    };

    return { howl: h, play };
};

export const createHowlerSFX = (basePath = 'dist/assets/') => {
    const reg = Object.create(null);
    let enabled = true;

    const loadMap = (map) => {
        Object.entries(map).forEach(([name, file]) => {
            const desc = typeof file === 'string' ? { src: basePath + file } : { ...file, src: basePath + file.src };
            reg[name] = createManagedHowl(desc);
        });
    };

    const play = (name, opts) => (enabled && reg[name]) ? reg[name].play(opts) : null;
    const playRandom = (names, opts) => play(names[Math.floor(Math.random() * names.length)], opts);

    const loop = (name, { volume = 0.3, rate = 1.0 } = {}) => {
        if (!enabled || !reg[name]) return null;
        reg[name].howl.loop(true);
        return reg[name].play({ volume, rate });
    };

    const on = () => { enabled = true; Howler.mute(false); };
    const off = () => { enabled = false; Howler.mute(true); };
    const stopAll = () => Howler.stop();

    // Mobile/desktop autoplay unlock
    const resumeOnFirstGesture = () => {
        const resume = () => { try { Howler.ctx?.resume?.(); } catch(e){};
            window.removeEventListener('pointerdown', resume);
            window.removeEventListener('keydown', resume);
        };
        window.addEventListener('pointerdown', resume, { once: true });
        window.addEventListener('keydown', resume, { once: true });
    };

    return { loadMap, play, playRandom, loop, on, off, stopAll, resumeOnFirstGesture };
};

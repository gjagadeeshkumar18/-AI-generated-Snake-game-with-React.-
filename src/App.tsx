import React, { useEffect, useRef, useState, useCallback } from 'react';

const TRACKS = [
  { id: 1, title: "SYS_ERR_01.WAV", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, title: "MEM_LEAK_02.WAV", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: 3, title: "NULL_PTR_03.WAV", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
];

const GRID_SIZE = 20;
const TILE_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * TILE_SIZE;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const requestRef = useRef<number>();
  
  // Game State Refs
  const snakeRef = useRef([{ x: 10, y: 10 }]);
  const dirRef = useRef({ x: 0, y: -1 });
  const nextDirRef = useRef({ x: 0, y: -1 });
  const foodRef = useRef({ x: 15, y: 5 });
  const scoreRef = useRef(0);
  const stateRef = useRef<'IDLE' | 'PLAYING' | 'CRASHED'>('IDLE');
  const lastTimeRef = useRef(0);
  const accumulatorRef = useRef(0);
  const shakeRef = useRef(0);
  const particlesRef = useRef<any[]>([]);
  
  // UI State
  const [scoreUI, setScoreUI] = useState(0);
  const [gameStateUI, setGameStateUI] = useState<'IDLE' | 'PLAYING' | 'CRASHED'>('IDLE');
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Audio Controls
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play error:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const skipForward = () => {
    setCurrentTrack((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };
  const skipBack = () => {
    setCurrentTrack((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  // Game Logic
  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x * TILE_SIZE + TILE_SIZE / 2,
        y: y * TILE_SIZE + TILE_SIZE / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1.0,
        color
      });
    }
  };

  const crash = () => {
    stateRef.current = 'CRASHED';
    setGameStateUI('CRASHED');
    shakeRef.current = 40;
    spawnParticles(snakeRef.current[0].x, snakeRef.current[0].y, '#FF00FF', 60);
  };

  const updateGame = () => {
    if (stateRef.current !== 'PLAYING') return;

    dirRef.current = nextDirRef.current;
    const head = { ...snakeRef.current[0] };
    head.x += dirRef.current.x;
    head.y += dirRef.current.y;

    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      crash();
      return;
    }

    if (snakeRef.current.some(s => s.x === head.x && s.y === head.y)) {
      crash();
      return;
    }

    snakeRef.current.unshift(head);

    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      scoreRef.current += 1;
      setScoreUI(scoreRef.current);
      shakeRef.current = 15;
      spawnParticles(foodRef.current.x, foodRef.current.y, '#00FFFF', 20);
      
      let newFood;
      while (true) {
        newFood = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
        // eslint-disable-next-line no-loop-func
        if (!snakeRef.current.some(s => s.x === newFood.x && s.y === newFood.y)) break;
      }
      foodRef.current = newFood;
    } else {
      snakeRef.current.pop();
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    if (shakeRef.current > 0) {
      const dx = (Math.random() - 0.5) * shakeRef.current;
      const dy = (Math.random() - 0.5) * shakeRef.current;
      ctx.translate(dx, dy);
      shakeRef.current -= 1;
    }

    ctx.strokeStyle = '#003333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += TILE_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
    }

    ctx.fillStyle = '#FF00FF';
    const foodShrink = Math.random() > 0.8 ? 4 : 2;
    ctx.fillRect(foodRef.current.x * TILE_SIZE + foodShrink, foodRef.current.y * TILE_SIZE + foodShrink, TILE_SIZE - foodShrink*2, TILE_SIZE - foodShrink*2);

    snakeRef.current.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#FFFFFF' : '#00FFFF';
      if (Math.random() > 0.90 && index !== 0) {
        ctx.fillStyle = '#FF00FF';
        ctx.fillRect(segment.x * TILE_SIZE + 2, segment.y * TILE_SIZE, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.fillStyle = '#00FFFF';
        ctx.fillRect(segment.x * TILE_SIZE - 2, segment.y * TILE_SIZE, TILE_SIZE - 2, TILE_SIZE - 2);
      } else {
        ctx.fillRect(segment.x * TILE_SIZE + 1, segment.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      }
    });

    particlesRef.current.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, 4, 4);
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
    });
    ctx.globalAlpha = 1.0;
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    ctx.restore();
  };

  const loop = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;

    accumulatorRef.current += dt;
    const step = 1000 / 15; // 15 FPS

    while (accumulatorRef.current >= step) {
      updateGame();
      accumulatorRef.current -= step;
    }

    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ') {
        if (stateRef.current !== 'PLAYING') {
          snakeRef.current = [{ x: 10, y: 10 }];
          dirRef.current = { x: 0, y: -1 };
          nextDirRef.current = { x: 0, y: -1 };
          scoreRef.current = 0;
          setScoreUI(0);
          stateRef.current = 'PLAYING';
          setGameStateUI('PLAYING');
          particlesRef.current = [];
        }
        return;
      }

      const currentDir = dirRef.current;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': if (currentDir.y !== 1) nextDirRef.current = { x: 0, y: -1 }; break;
        case 'ArrowDown': case 's': case 'S': if (currentDir.y !== -1) nextDirRef.current = { x: 0, y: 1 }; break;
        case 'ArrowLeft': case 'a': case 'A': if (currentDir.x !== 1) nextDirRef.current = { x: -1, y: 0 }; break;
        case 'ArrowRight': case 'd': case 'D': if (currentDir.x !== -1) nextDirRef.current = { x: 1, y: 0 }; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-black text-cyan-glitch font-mono p-4 md:p-8 flex flex-col items-center justify-center relative crt-flicker">
      <div className="scanlines"></div>
      <div className="noise"></div>

      <header className="mb-8 text-center z-10 w-full max-w-6xl flex justify-between items-end border-b-4 border-magenta-glitch pb-4">
        <h1 className="text-4xl md:text-6xl font-bold glitch-text text-magenta-glitch" data-text="NEON_SNAKE.EXE">NEON_SNAKE.EXE</h1>
        <div className="text-xl hidden md:block">SYS_TIME: {new Date().getTime().toString().slice(-6)}</div>
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* Audio Panel */}
        <div className="lg:col-span-4 border-2 border-cyan-glitch bg-black/80 p-6 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-glitch"></div>
          <h2 className="text-2xl mb-6 text-magenta-glitch glitch-text" data-text="AUDIO_SUBSYSTEM">AUDIO_SUBSYSTEM</h2>
          
          <div className="mb-6 border border-cyan-glitch/50 p-4">
            <div className="text-sm text-cyan-glitch/70 mb-2">CURRENT_STREAM:</div>
            <div className="text-2xl truncate">{TRACKS[currentTrack].title}</div>
            <div className="text-sm mt-2 flex items-center gap-2">
              STATUS: <span className={isPlaying ? "text-magenta-glitch animate-pulse" : "text-cyan-glitch/70"}>{isPlaying ? "TRANSMITTING" : "HALTED"}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-between">
              <button onClick={skipBack} className="border border-cyan-glitch px-4 py-2 hover:bg-cyan-glitch hover:text-black transition-colors">[ &lt;&lt; ]</button>
              <button onClick={togglePlay} className="border-2 border-magenta-glitch text-magenta-glitch px-6 py-2 hover:bg-magenta-glitch hover:text-black transition-colors font-bold">
                {isPlaying ? "[ HALT ]" : "[ INITIATE ]"}
              </button>
              <button onClick={skipForward} className="border border-cyan-glitch px-4 py-2 hover:bg-cyan-glitch hover:text-black transition-colors">[ &gt;&gt; ]</button>
            </div>
          </div>

          <div className="mt-8 border-t border-cyan-glitch/30 pt-4">
            <h3 className="text-xl text-magenta-glitch mb-4">INPUT_PARAMS</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>W/A/S/D</div><div className="text-right text-cyan-glitch/70">VECTOR_SHIFT</div>
              <div>ARROWS</div><div className="text-right text-cyan-glitch/70">VECTOR_SHIFT</div>
              <div>SPACE</div><div className="text-right text-magenta-glitch">EXECUTE</div>
            </div>
          </div>
        </div>

        {/* Game Panel */}
        <div className="lg:col-span-8 flex flex-col items-center border-2 border-magenta-glitch bg-black/80 p-6 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-magenta-glitch"></div>
          
          <div className="w-full flex justify-between items-center mb-4">
            <h2 className="text-2xl text-cyan-glitch glitch-text" data-text="ENTITY_TRACKER">ENTITY_TRACKER</h2>
            <div className="text-2xl">SCORE: <span className="text-magenta-glitch">{scoreUI.toString().padStart(4, '0')}</span></div>
          </div>

          <div className="relative border-4 border-cyan-glitch bg-black w-full max-w-[500px] aspect-square overflow-hidden">
            <canvas 
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="w-full h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
            
            {/* Overlays */}
            {gameStateUI === 'IDLE' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                <div className="text-magenta-glitch text-3xl mb-4 glitch-text" data-text="AWAITING_INPUT">AWAITING_INPUT</div>
                <div className="text-cyan-glitch animate-pulse">PRESS [SPACE] TO INITIALIZE</div>
              </div>
            )}

            {gameStateUI === 'CRASHED' && (
              <div className="absolute inset-0 bg-magenta-900/40 flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="text-black bg-magenta-glitch px-4 py-1 text-4xl font-bold mb-4">FATAL_ERROR</div>
                <div className="text-cyan-glitch mb-8">ENTITY_DESTROYED</div>
                <div className="text-white animate-pulse">PRESS [SPACE] TO REBOOT</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <audio ref={audioRef} src={TRACKS[currentTrack].url} onEnded={skipForward} crossOrigin="anonymous" />
    </div>
  );
}

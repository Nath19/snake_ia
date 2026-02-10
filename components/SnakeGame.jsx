"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GRID_SIZE = 24;
const START_LENGTH = 3;
const BASE_SPEED = 6;
const SPEED_STEP = 0.45;
const MAX_SPEED = 16;
const STORAGE_KEY = "neon-snake-high-score";

export default function SnakeGame() {
  const canvasRef = useRef(null);
  const animationRef = useRef(0);
  const scoreRef = useRef(0);
  const stateRef = useRef({
    snake: [],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: { x: 0, y: 0 },
    gameSpeed: BASE_SPEED,
    accumulator: 0,
    lastTime: 0,
    hasStarted: false,
    isPaused: false,
    isGameOver: false,
    cellSize: 0
  });

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [overlay, setOverlay] = useState({
    show: true,
    title: "Neon Snake",
    text: "Appuie sur une flèche pour commencer.",
    button: "Start"
  });

  const updateOverlay = (show, title = "", text = "", button = "") => {
    setOverlay({ show, title, text, button });
  };

  const spawnFood = useCallback(() => {
    const state = stateRef.current;
    let x = 0;
    let y = 0;
    do {
      x = Math.floor(Math.random() * GRID_SIZE);
      y = Math.floor(Math.random() * GRID_SIZE);
    } while (state.snake.some((segment) => segment.x === x && segment.y === y));

    state.food = { x, y };
  }, []);

  const resetGame = useCallback(() => {
    const center = Math.floor(GRID_SIZE / 2);
    const snake = [];
    for (let i = 0; i < START_LENGTH; i += 1) {
      snake.push({ x: center - i, y: center });
    }

    stateRef.current = {
      ...stateRef.current,
      snake,
      direction: { x: 1, y: 0 },
      nextDirection: { x: 1, y: 0 },
      gameSpeed: BASE_SPEED,
      accumulator: 0,
      hasStarted: false,
      isPaused: false,
      isGameOver: false
    };

    scoreRef.current = 0;
    setScore(0);
    updateOverlay(true, "Neon Snake", "Appuie sur une flèche pour commencer.", "Start");
    spawnFood();
  }, [spawnFood]);

  const playEatSound = () => {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(now);
      osc.stop(now + 0.11);
      osc.onended = () => context.close();
    } catch {}
  };

  const queueDirection = (newDir) => {
    const state = stateRef.current;

    if (!state.hasStarted && !state.isGameOver) {
      state.hasStarted = true;
      updateOverlay(false);
    }

    if (newDir.x === -state.direction.x && newDir.y === -state.direction.y) {
      return;
    }

    state.nextDirection = newDir;
  };

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = Math.min(canvas.clientWidth, canvas.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stateRef.current.cellSize = size / GRID_SIZE;
  }, []);

  const drawRoundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const state = stateRef.current;
    const size = state.cellSize;
    const boardSize = GRID_SIZE * size;

    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const grad = ctx.createLinearGradient(0, 0, boardSize, boardSize);
    grad.addColorStop(0, "#070d1a");
    grad.addColorStop(1, "#090712");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, boardSize, boardSize);

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i += 1) {
      const p = i * size;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, boardSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(boardSize, p);
      ctx.stroke();
    }

    const fx = state.food.x * size;
    const fy = state.food.y * size;
    ctx.save();
    ctx.shadowBlur = size * 0.95;
    ctx.shadowColor = "#ff2ea6";
    ctx.fillStyle = "#ff4dc9";
    ctx.beginPath();
    ctx.arc(fx + size / 2, fy + size / 2, size * 0.33, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    state.snake.forEach((segment, index) => {
      const x = segment.x * size;
      const y = segment.y * size;
      const inset = size * 0.08;
      const radius = size * 0.2;

      ctx.save();
      ctx.shadowBlur = size * (index === 0 ? 0.95 : 0.65);
      ctx.shadowColor = index === 0 ? "#57ff9a" : "#00f6ff";
      ctx.fillStyle = index === 0 ? "#8bffb8" : "#36faff";
      drawRoundRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, radius);
      ctx.fill();
      ctx.restore();
    });
  }, []);

  const tickGame = useCallback(() => {
    const state = stateRef.current;
    state.direction = state.nextDirection;

    const currentHead = state.snake[0];
    const newHead = {
      x: currentHead.x + state.direction.x,
      y: currentHead.y + state.direction.y
    };

    // Collision logic: out-of-bounds or overlap with the snake body => game over.
    const hitWall =
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE;

    if (hitWall || state.snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
      state.isGameOver = true;
      state.hasStarted = false;
      updateOverlay(true, "Game Over", `Score: ${scoreRef.current}`, "Restart");
      return;
    }

    state.snake.unshift(newHead);
    const ateFood = newHead.x === state.food.x && newHead.y === state.food.y;

    if (ateFood) {
      setScore((prev) => {
        const next = prev + 10;
        scoreRef.current = next;
        setHighScore((hs) => {
          const nextHigh = Math.max(hs, next);
          localStorage.setItem(STORAGE_KEY, String(nextHigh));
          return nextHigh;
        });
        return next;
      });
      state.gameSpeed = Math.min(MAX_SPEED, state.gameSpeed + SPEED_STEP);
      spawnFood();
      playEatSound();
    } else {
      state.snake.pop();
    }
  }, [spawnFood]);

  useEffect(() => {
    setHighScore(Number(localStorage.getItem(STORAGE_KEY)) || 0);
    resizeCanvas();
    resetGame();

    const onKeyDown = (event) => {
      const map = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }
      };

      if (event.key === " " || event.code === "Space") {
        const state = stateRef.current;
        if (!state.hasStarted || state.isGameOver) return;
        state.isPaused = !state.isPaused;
        updateOverlay(state.isPaused, "Pause", "Appuie sur SPACE pour reprendre.", "Resume");
        return;
      }

      if (!map[event.key]) return;
      event.preventDefault();

      const state = stateRef.current;
      if (state.isGameOver) return;
      if (state.isPaused) {
        state.isPaused = false;
        updateOverlay(false);
      }

      queueDirection(map[event.key]);
    };

    const loop = (timestamp) => {
      const state = stateRef.current;
      if (!state.lastTime) state.lastTime = timestamp;

      const delta = (timestamp - state.lastTime) / 1000;
      state.lastTime = timestamp;

      // requestAnimationFrame renders smoothly every frame.
      // The accumulator executes fixed-size game steps so movement stays grid-aligned.
      if (!state.isGameOver && state.hasStarted && !state.isPaused) {
        state.accumulator += delta;
        const step = 1 / state.gameSpeed;

        while (state.accumulator >= step) {
          tickGame();
          state.accumulator -= step;
          if (state.isGameOver) break;
        }
      }

      drawFrame();
      animationRef.current = requestAnimationFrame(loop);
    };

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", onKeyDown);
    animationRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const handleMobile = (dir) => {
    const map = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };
    const state = stateRef.current;
    if (state.isPaused) {
      state.isPaused = false;
      updateOverlay(false);
    }
    queueDirection(map[dir]);
  };

  // Handle overlay button: start initial game or restart after game over.
  const handleOverlayButton = () => {
    const state = stateRef.current;

    if (state.isPaused) {
      state.isPaused = false;
      updateOverlay(false);
      return;
    }

    // If the game is over, run a full reset.
    if (state.isGameOver) {
      resetGame();
      return;
    }

    // Fresh session: hide overlay and let the snake start moving immediately.
    if (!state.hasStarted) {
      state.hasStarted = true;
      updateOverlay(false);
      return;
    }

    // Fallback: reset if we ever get here in an unexpected state.
    resetGame();
  };

  return (
    <main className="app">
      <section className="gameShell">
        <header className="hud">
          <div>Score <span className="value">{score}</span></div>
          <div>High Score <span className="value">{highScore}</span></div>
        </header>

        <div className="canvasWrap">
          <canvas ref={canvasRef} aria-label="Snake game" role="img" />
          <div className={`overlay ${overlay.show ? "show" : ""}`}>
            <div className="dialog">
              <h2>{overlay.title}</h2>
              <p>{overlay.text}</p>
              <button type="button" onClick={handleOverlayButton}>{overlay.button}</button>
            </div>
          </div>
        </div>

        <p className="help">Flèches: déplacer • Espace: pause • Mange pour accélérer.</p>

        <div className="mobileControls" aria-label="Mobile controls">
          <span className="spacer" />
          <button className="dir" type="button" onClick={() => handleMobile("up")}>▲</button>
          <span className="spacer" />
          <button className="dir" type="button" onClick={() => handleMobile("left")}>◀</button>
          <button className="dir" type="button" onClick={() => handleMobile("down")}>▼</button>
          <button className="dir" type="button" onClick={() => handleMobile("right")}>▶</button>
        </div>
      </section>
    </main>
  );
}

"use client";

import { generatePassage } from "content";
import { hasGraceElapsed } from "game-core";
import { useEffect, useRef, useState } from "react";
import { PassageLine } from "./PassageLine";

const TYPE_WPM = 90;
const ERASE_WPM = 80;
const RESTART_DELAY_MS = 1200;

function charsPerSecond(wpm: number): number {
  return (wpm * 5) / 60;
}

export function TypingDemo() {
  const [passage, setPassage] = useState(() => generatePassage("medium"));
  const [typedChars, setTypedChars] = useState(0);
  const [erasedChars, setErasedChars] = useState(0);
  const elapsedMsRef = useRef(0);

  useEffect(() => {
    let frame: number;
    let lastTime: number | null = null;

    function tick(time: number) {
      if (lastTime === null) lastTime = time;
      const dtMs = time - lastTime;
      lastTime = time;

      elapsedMsRef.current += dtMs;
      setTypedChars((t) => Math.min(passage.length, t + charsPerSecond(TYPE_WPM) * (dtMs / 1000)));
      if (hasGraceElapsed(elapsedMsRef.current)) {
        setErasedChars((e) => Math.min(passage.length, e + charsPerSecond(ERASE_WPM) * (dtMs / 1000)));
      }

      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [passage]);

  useEffect(() => {
    if (erasedChars < passage.length) return;
    const timer = setTimeout(() => {
      setPassage(generatePassage("medium"));
      setTypedChars(0);
      setErasedChars(0);
      elapsedMsRef.current = 0;
    }, RESTART_DELAY_MS);
    return () => clearTimeout(timer);
  }, [erasedChars, passage]);

  return (
    <div className="pointer-events-none select-none">
      <PassageLine
        passage={passage}
        typed={passage.slice(0, Math.floor(typedChars))}
        erasedCount={Math.floor(erasedChars)}
        size="lg"
        wide
      />
    </div>
  );
}

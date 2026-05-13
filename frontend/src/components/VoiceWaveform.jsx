import { useEffect, useRef } from 'react';

/**
 * VoiceWaveform - Real-time audio visualization
 * Uses Web Audio API AnalyserNode to draw frequency bars
 * Animates with requestAnimationFrame for smooth 60fps
 */
export default function VoiceWaveform({ isActive, audioStream = null }) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);

  useEffect(() => {
    if (!isActive || !audioStream) {
      // Clear canvas when inactive
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set up audio analyser
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.fillStyle = 'rgb(229, 231, 235)'; // Tailwind gray-200
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bars
      const barCount = 32; // Number of visible bars
      const barWidth = canvas.width / barCount;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        // Get average amplitude for this bar
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j];
        }
        const average = sum / step;

        // Scale to canvas height (min 4px, max full height)
        const barHeight = Math.max(4, (average / 255) * canvas.height);

        // Color based on activity
        const intensity = average / 255;
        const r = Math.floor(59 + (239 - 59) * intensity);  // blue-600 to red-500
        const g = Math.floor(130 + (68 - 130) * intensity);
        const b = Math.floor(246 + (66 - 246) * intensity);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

        // Draw centered bar
        const x = i * barWidth;
        const y = (canvas.height - barHeight) / 2;
        ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
      }
    };

    draw();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      source.disconnect();
      audioContext.close();
    };
  }, [isActive, audioStream]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={60}
      className="w-full h-12 rounded-lg bg-gray-200"
    />
  );
}

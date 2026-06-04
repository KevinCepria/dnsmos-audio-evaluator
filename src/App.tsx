import { useEffect, useState } from "react";
import { AudioVisualizer } from "react-audio-visualize";
import { AudioVisualizer as LiveAudioVisualizer } from "./components/AudioVisualizer";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { useAudioEvaluator } from "./hooks/useAudioEvaluator";

function App() {
  const { runInference, isInferencing, quality, ready, reset } =
    useAudioEvaluator();

  const {
    recording,
    startFullRecording,
    stopFullRecording,
    fullWavBlob,
    recordedChunks,
  } = useAudioRecorder({
    onStop: (audio) => {
      runInference(audio);
    },
  });

  const [countdown, setCountdown] = useState<number | null>(null);

  // countdown logic
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      setCountdown(null);
      stopFullRecording();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, stopFullRecording]);

  const handleStart = async () => {
    await startFullRecording();
    setCountdown(5);
  };

  const handleReset = () => {
    reset();
    setCountdown(null);
  };

  const getHeading = () => {
    // loading state
    if (!ready) {
      return "Start recording. You will have 5 seconds to speak";
    }

    // inferencing state
    if (isInferencing) {
      return "Inferencing...";
    }

    // result state
    if (quality) {
      return `Audio is ${quality}`;
    }

    // countdown state
    if (countdown !== null) {
      return countdown > 0 ? `${countdown}` : "Stopping...";
    }

    // initial ready state
    return "Start recording. You will have 5 seconds to speak";
  };

  return (
    <div className="app">
      <div className="card">
        <div className="header">
          <h1 className="title">{getHeading()}</h1>

          <p className="subtitle">Audio quality checker</p>
        </div>

        <div className="button-wrapper">
          {countdown === null && !isInferencing && (
            <button
              onClick={quality? handleReset : handleStart}
              disabled={!ready}
              className="button"
            >
              {!ready
                ? "Loading..."
                : quality
                  ? "Try Again"
                  : "Start"}
            </button>
          )}
        </div>

        <div className="visualizer">
          {recording ? (
            <LiveAudioVisualizer
              pcmChunks={recordedChunks}
              width={"100%"}
              height={120}
            />
          ) : (
            <div className="placeholder">Waiting for audio...</div>
          )}
        </div>

        {fullWavBlob && quality &&(
          <div className="audio-card">
            <h2 className="audio-title">Recorded Audio</h2>

            <AudioVisualizer
              blob={fullWavBlob}
              width={500}
              height={75}
              barWidth={1}
              gap={0}
              barColor={"#f76565"}
            />

            <audio
              src={URL.createObjectURL(fullWavBlob)}
              controls
              className="audio-player"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

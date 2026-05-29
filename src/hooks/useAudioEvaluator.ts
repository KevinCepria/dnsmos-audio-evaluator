import { useRef, useState, useEffect } from "react";

const DNSMOS_MODEL_URL = "/models/sig_bak_ovr.onnx";

export const useAudioEvaluator = () => {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState('');
  const [isInferencing, setIsInferencing] = useState(false);

  const initWorker = async () => {
    const modelResponse = await fetch(DNSMOS_MODEL_URL);
    const modelBuffer = await modelResponse.arrayBuffer();

    workerRef.current = new Worker(
      new URL("/workers/worker.js", import.meta.url),
    );

    workerRef.current.postMessage({ type: "init", data: [modelBuffer] });
    workerRef.current.onmessage = (event) => {
      const { type, error, quality } = event.data;
      console.log("Worker message:", event.data);
      if (type === "init-complete") {
        setReady(true);
      } else if (type === "init-error") {
        setError(error);
      } else if (type === "processed") {
        setIsInferencing(false);
        setQuality(quality);
      }
    };
  };

  const runInference = (audio: Float32Array) => {
    workerRef.current?.postMessage({ type: "process", data: audio });
    setIsInferencing(true);
  };

  const reset = () => {
    setIsInferencing(false);
    setQuality('');
  };

  useEffect(() => {
    initWorker();

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return { ready, error, runInference, isInferencing, quality, reset };
};

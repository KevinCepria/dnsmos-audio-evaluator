import { useState, useRef, useCallback } from "react";
import { encodeToWav, mergeChunks } from "../utils/audio";

const workletURL = "/worklets/worklet.js";

export const useAudioRecorder = ({
  onStop,
}: {
  onStop: (audio: Float32Array) => void;
}) => {
  const [recording, setRecording] = useState(false);
  const [fullWavBlob, setFullWavBlob] = useState<Blob | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const recordedChunksRef = useRef<Float32Array[]>([]);

  const startFullRecording = useCallback(async () => {
    if (recording) return;

    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });

      const source = audioContextRef.current.createMediaStreamSource(
        mediaStreamRef.current,
      );
      await audioContextRef.current.audioWorklet.addModule(workletURL);

      workletNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        "pcm-processor",
      );

      workletNodeRef.current.port.onmessage = (event) => {
        const rawPcm = new Float32Array(event.data);
        recordedChunksRef.current.push(rawPcm);
      };

      source.connect(workletNodeRef.current);
      workletNodeRef.current.connect(audioContextRef.current.destination);

      setRecording(true);
    } catch (error) {
      console.error("Error during recording setup:", error);
    }
  }, [recording]);

  const stopFullRecording = useCallback(() => {
    if (!recording) return;

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    audioContextRef.current?.close();
    audioContextRef.current = null;
    const merged = mergeChunks(recordedChunksRef.current);

    onStop(merged);

    setFullWavBlob(encodeToWav(merged));

    recordedChunksRef.current = [];
    setRecording(false);
  }, [recording]);

  return {
    recording,
    startFullRecording,
    stopFullRecording,
    fullWavBlob,
    recordedChunks: recordedChunksRef.current,
  };
};

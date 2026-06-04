importScripts("https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js");

ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

const SAMPLE_RATE = 16000;
const WINDOW_SECONDS = 5;
const REQUIRED_SAMPLES = Math.floor(SAMPLE_RATE * WINDOW_SECONDS);

// tune this after testing
const QUALITY_THRESHOLD = 2.0;

let session = null;

function expandAudio(audio) {
  const targetLength = 144160;

  let expanded = audio;

  while (expanded.length < targetLength) {
    const merged = new Float32Array(expanded.length + audio.length);
    merged.set(expanded);
    merged.set(audio, expanded.length);

    expanded = merged;
  }

  return expanded.slice(0, targetLength);
}

async function runInference(audio) {
  const expandedAudio = expandAudio(audio);

  const inputTensor = new ort.Tensor("float32", expandedAudio, [
    1,
    expandedAudio.length,
  ]);

  const result = await session.run({
    input_1: inputTensor,
  });

  const output = result[session.outputNames[0]].data;

  const sig = output[0];
  const bak = output[1];
  const ovrl = output[2];


  let quality;

  if (ovrl > 4) {
    quality = "excellent! 🥳";
  } else if (ovrl > 3) {
    quality = "great! 😁";
  } else if (ovrl > QUALITY_THRESHOLD) {
    quality = "good 🙂";
  } else {
    quality = "poor 😫";
  }


  self.postMessage({
    type: "processed",
    quality,
    scores: {
      sig,
      bak,
      ovrl,
    },
  });
}

self.onmessage = async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case "init": {
      try {
        const [DNSMOSBuffer] = data;

        session = await ort.InferenceSession.create(DNSMOSBuffer, {
          executionProviders: ["wasm"],
        });

        self.postMessage({
          type: "init-complete",
        });
      } catch (err) {
        self.postMessage({
          type: "init-error",

          error: err.message,
        });
      }

      break;
    }

    case "process": {
      try {
        if (!session) return;

        const pcm =
          data.pcmData instanceof Float32Array
            ? data.pcmData
            : new Float32Array(data);

        await runInference(pcm);
      } catch (err) {
        self.postMessage({
          type: "error",

          error: err.message,
        });
      }

      break;
    }
  }
};

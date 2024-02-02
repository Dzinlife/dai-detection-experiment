"use client";

import { MouseEventHandler, useEffect, useMemo, useRef, useState } from "react";
import Meyda from "meyda";
import Dtw from "dynamic-time-warping";
import Transcribe from "./Transcribe";
import { useAsyncMemo } from "use-async-memo";
import DtwChart from "./DtwChart";
import SlopeChart from "./SlopeChart";

export default function Home() {
  const inputRef_1 = useRef<HTMLInputElement>(null);
  const inputRef_2 = useRef<HTMLInputElement>(null);

  const audio_0 = useAsyncMemo(async () => {
    const buffer = await fetch(
      "/8BFAC106-D38E-4E97-83CC-4CFEDC0A9C05.mp3"
    ).then((res) => res.arrayBuffer());

    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(buffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    return {
      audioBuffer,
      audioContext,
      source,
    };
  }, []);

  const audio_1 = useAsyncMemo(async () => {
    const buffer = await fetch(
      "/8BFAC106-D38E-4E97-83CC-4CFEDC0A9C05 2.mp3"
    ).then((res) => res.arrayBuffer());

    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(buffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    return {
      audioBuffer,
      audioContext,
      source,
    };
  }, []);

  async function preprocess(audioFile: File): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event?.target?.result) return;
        if (typeof event.target.result === "string") return;

        const audioContext = new AudioContext();

        try {
          const buffer = await audioContext.decodeAudioData(
            event.target.result
          );
          resolve(buffer);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = function (error) {
        reject(error);
      };
      reader.readAsArrayBuffer(audioFile);
    });
  }

  const chunkNum = 600;

  const windowSize = Math.pow(2, 15); // 32768 ~0.75s

  async function extractFeatures(
    audio: NonNullable<typeof audio_0>,
    key?: string
  ) {
    if (key) {
      const cached = localStorage.getItem(key);
      if (cached) {
        return JSON.parse(cached) as number[][];
      }
    }

    const { audioBuffer, audioContext } = audio;

    const semples = audioBuffer.getChannelData(0);
    // .slice(hopSize * 0, hopSize * chunkNum);

    const resempleScale = 2;

    const reducedData = new Float32Array(semples.length / resempleScale);
    for (let i = 0; i < reducedData.length; i++) {
      reducedData[i] = semples[i * resempleScale];
    }

    const reducedWindow = windowSize / resempleScale;

    const chuckLength = Math.floor(reducedData.length / reducedWindow);

    console.log("total chucks num", chuckLength);

    const features: number[][] = await new Promise((resolve) => {
      const results: number[][] = [];

      let currentTick = 0;
      let lastBreakTime = performance.now();
      const tick = (i: number) => {
        if (results.length === chuckLength) {
          resolve(results);
          return;
        }

        const chunk = reducedData.slice(
          i * reducedWindow,
          (i + 1) * reducedWindow
        );

        const feature = Meyda.extract("chroma", chunk) as number[];

        console.log(key, i);
        results.push(feature);
        const tickEnd = performance.now();

        if (tickEnd - lastBreakTime > 100) {
          lastBreakTime = tickEnd;
          setTimeout(() => {
            tick(++currentTick);
          });
        } else {
          tick(++currentTick);
        }
      };

      tick(0);
    });

    //   for (let i = 0; i < chuckLength; i++) {
    //     const chunk = reducedData.slice(
    //       i * reducedWindow,
    //       (i + 1) * reducedWindow
    //     );

    //     // const feature = Meyda.extract("chroma", chunk) as number[];

    //     const feature = await new Promise<number[]>((resolve) => {
    //       setTimeout(() => {
    //         const feature = Meyda.extract("chroma", chunk) as number[];
    //         resolve(feature);
    //       });

    //       const timer = setInterval(() => {
    //         clearInterval(timer);
    //       });
    //     });

    //     console.log(key, i);
    //     feature && features.push(feature);
    //   }

    if (key) {
      localStorage.setItem(key, JSON.stringify(features));
    }
    return features;
  }

  const [path, setPath] = useState<[number, number][]>([]);

  const pathAMap = useMemo(() => {
    const map = new Map<number, number>();
    path.forEach((n) => {
      map.set(n[0], n[1]);
    });
    return map;
  }, [path]);

  const pathBMap = useMemo(() => {
    const map = new Map<number, number>();
    path.forEach((n) => {
      map.set(n[1], n[0]);
    });
    return map;
  }, [path]);

  const handleClick = async (force?: boolean) => {
    const start = Date.now();
    // const file_1 = inputRef_1.current?.files?.[0];
    // if (!file_1) return;
    // const audio_1 = await preprocess(file_1);

    // const file_2 = inputRef_2.current?.files?.[0];
    // if (!file_2) return;
    // const audio_2 = await preprocess(file_2);

    if (!force && (!audio_0 || !audio_1)) {
      alert("audio not ready");
      return;
    }

    console.log("start processing");

    const [mfcc_1, mfcc_2] = await Promise.all([
      extractFeatures(audio_0!, "a"),
      extractFeatures(audio_1!, "b"),
    ]);

    console.log(mfcc_1, mfcc_2);

    const dtw = new Dtw(mfcc_1, mfcc_2, (vec1, vec2) => {
      if (typeof vec1 === "number") vec1 = [vec1];
      if (typeof vec2 === "number") vec2 = [vec2];

      let sum = 0;
      for (let i = 0; i < vec1.length; i++) {
        sum += Math.pow(vec1[i] - vec2[i], 2);
      }
      return Math.sqrt(sum);
    });

    const path = dtw.getPath();
    setPath(path);

    const end = Date.now();

    const time = end - start;
    alert("done, time: " + time / 1000 + "s");
  };

  const sempleRate = audio_0?.audioContext.sampleRate || 44100;
  const ratio = sempleRate / windowSize;

  const syncTime = (time: number, reverse?: boolean) => {
    const indexFloor = Math.floor(time * ratio);
    const indexCeil = Math.ceil(time * ratio);

    const distHopFloor = reverse
      ? pathBMap.get(indexFloor)!
      : pathAMap.get(indexFloor)!;
    const distHopCeil = reverse
      ? pathBMap.get(indexCeil)!
      : pathAMap.get(indexCeil)!;

    const distHop =
      distHopFloor + (distHopCeil - distHopFloor) * (time * ratio - indexFloor);

    if (distHop === undefined) return time;

    return distHop / ratio;
  };

  const [isAudioPlaying, setAudioPlaying] = useState(false);
  const audioSourceRef = useRef<AudioBufferSourceNode>();

  const [track, setTrack] = useState(0);

  const currentAudioRef = useRef(track === 0 ? audio_0 : audio_1);
  currentAudioRef.current = track === 0 ? audio_0 : audio_1;

  const playAudio = (time: number) => {
    const audio = currentAudioRef.current;

    if (!audio) {
      alert("audio not ready");
      return;
    }

    const ctx = audio.audioContext;

    const buffer = audio.audioBuffer;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    if (isAudioPlaying) {
      audioSourceRef.current?.stop();
      audioSourceRef.current?.disconnect();
    }
    source.start(0, time);
    audioSourceRef.current = source;
    setAudioPlaying(true);
  };

  const stopAudio = () => {
    const audio = currentAudioRef.current;

    if (!audio) {
      alert("audio not ready");
      return;
    }

    setSubtitleTime(0);

    audioSourceRef.current?.stop();
    audioSourceRef.current?.disconnect();
    setAudioPlaying(false);
  };

  const [subtitleTime, setSubtitleTime] = useState<number>(0);

  const [audioOffset, setAudioOffset] = useState<number>(0);

  useEffect(() => {
    if (isAudioPlaying) {
      if (!currentAudioRef.current) return;
      const audioContext = currentAudioRef.current.audioContext;

      const baseTime = audioContext.currentTime;

      const timer = setInterval(() => {
        const audioTime = audioContext.currentTime - baseTime + audioOffset;

        const time = track === 0 ? audioTime : syncTime(audioTime, true);

        setSubtitleTime(time);
      }, 100);

      return () => {
        clearInterval(timer);
      };
    }
  }, [isAudioPlaying, audioOffset, track]);

  useEffect(() => {}, [track]);

  const changeTrack = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTrack(Number(e.target.value));

    if (!audio_0 || !audio_1) {
      return;
    }

    if (isAudioPlaying) {
      stopAudio();
    }
  };

  useEffect(() => {
    if (localStorage.getItem("a") && localStorage.getItem("b")) {
      handleClick(true);
    }
  }, [audio_0, audio_1]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 ">
      <div className="w-full">
        {/* <input type="file" ref={inputRef_1} />
        <input type="file" ref={inputRef_2} /> */}

        <div className="flex space-x-4 sticky top-0 pt-4 bg-white z-10 text-black">
          <div>
            <div>DTW</div>
            <DtwChart path={path} ratio={ratio} />
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex space-x-4">
              <label>
                <input
                  type="radio"
                  value={0}
                  checked={track === 0}
                  onChange={changeTrack}
                />
                Audio A{audio_0 ? "" : " loading..."}
              </label>
              <label>
                <input
                  type="radio"
                  value={1}
                  checked={track === 1}
                  onChange={changeTrack}
                />
                Audio B{audio_1 ? "" : " loading..."}
              </label>
            </div>
            <button
              className="border px-2 py-1 rounded-md"
              onClick={(e) => handleClick()}
            >
              Process
            </button>
            <button
              className="border px-2 py-1 rounded-md"
              onClick={() => {
                localStorage.clear();
              }}
            >
              Clean Cache
            </button>
            {isAudioPlaying && (
              <button
                className="border px-2 py-1 rounded-md"
                onClick={stopAudio}
              >
                Stop
              </button>
            )}
            <SlopeChart path={path} ratio={ratio} />
          </div>
        </div>
        <div className="bg-white text-black mt-4 px-2 py-1 text-lg font-bold">
          Audio-A Transcribe {subtitleTime}
        </div>
        <Transcribe
          time={subtitleTime}
          onClickWord={(word) => {
            const audioTime = track === 1 ? syncTime(word.ts) : word.ts;
            setAudioOffset(audioTime);
            playAudio(audioTime);
          }}
        />
      </div>
    </main>
  );
}

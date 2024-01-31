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

  // const hopSize = Math.pow(2, 14); // 16384 ~0.37s
  const hopSize = Math.pow(2, 15); // 32768 ~0.75s
  // const hopSize = Math.pow(2, 16); // 65536 ~1.5s

  async function extractFeatures(audio: AudioBuffer) {
    const semples = audio.getChannelData(0);
    // .slice(hopSize * 0, hopSize * chunkNum);

    const chuckLength = Math.floor(semples.length / hopSize);

    console.log("total chucks num", chuckLength);

    let prevChunk: Float32Array | undefined;

    const features: number[][] = [];
    for (let i = 0; i < chuckLength; i++) {
      const chunk = semples.slice(i * hopSize, (i + 1) * hopSize);
      const mfcc = Meyda.extract("mfcc", chunk) as number[];
      // prevChunk = chunk;
      if (!mfcc) continue;
      // const reduced = (mfcc as number[]).reduce((a, b) => a + b, 0);
      console.log(i, mfcc);
      mfcc && features.push(mfcc);
    }
    return features;
  }

  const [path, setPath] = useState<[number, number][]>([]);

  const handleClick: MouseEventHandler<HTMLButtonElement> = async () => {
    const start = Date.now();
    // const file_1 = inputRef_1.current?.files?.[0];
    // if (!file_1) return;
    // const audio_1 = await preprocess(file_1);

    // const file_2 = inputRef_2.current?.files?.[0];
    // if (!file_2) return;
    // const audio_2 = await preprocess(file_2);

    if (!audio_0 || !audio_1) {
      alert("audio not ready");
      return;
    }

    console.log("start processing");

    const [mfcc_1, mfcc_2] = await Promise.all([
      extractFeatures(audio_0.audioBuffer),
      extractFeatures(audio_1.audioBuffer),
    ]);

    console.log(mfcc_1, mfcc_2);

    const dtw = new Dtw(mfcc_1, mfcc_2, (vec1, vec2) => {
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
    // alert("done, time: " + time / 1000 + "s");
  };

  const sempleRate = audio_0?.audioContext.sampleRate!;
  const ratio = sempleRate / hopSize;

  const syncTime = (time: number, reverse?: boolean) => {
    const index = Math.floor(time * ratio);

    const distHop = reverse
      ? path.find((n) => {
          return n[1] === index;
        })?.[0]
      : path.find((n) => {
          return n[0] === index;
        })?.[1];

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
      audioSourceRef.current?.stop(ctx.currentTime);
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
      const baseTime = currentAudioRef.current?.audioContext.currentTime || 0;

      const timer = setInterval(() => {
        const audioTime =
          (currentAudioRef.current?.audioContext.currentTime || 0) -
          baseTime +
          audioOffset;

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 ">
      <div className="w-full">
        {/* <input type="file" ref={inputRef_1} />
        <input type="file" ref={inputRef_2} /> */}

        <div className="flex space-x-4 sticky top-0 pt-4 bg-[rgba(0,0,0,0.5)] z-10">
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
              onClick={handleClick}
            >
              Process
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

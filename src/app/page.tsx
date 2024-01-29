"use client";

import { MouseEventHandler, useRef, useState } from "react";
import Meyda from "meyda";
import Dtw from "dynamic-time-warping";

export default function Home() {
  const inputRef_1 = useRef<HTMLInputElement>(null);
  const inputRef_2 = useRef<HTMLInputElement>(null);

  function preprocess(audioFile: File): Promise<AudioBuffer> {
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

  const chunkNum = 300;

  async function extractFeatures(audio: AudioBuffer) {
    // const hopSize = Math.pow(2, 14); // 16384 ~0.37s
    // const hopSize = Math.pow(2, 15); // 32768 ~0.75s
    const hopSize = Math.pow(2, 16); // 65536 ~1.5s

    const semples = audio
      .getChannelData(0)
      .slice(hopSize * 0, hopSize * chunkNum);

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

  const [path, setPath] = useState<number[][]>();

  const handleClick: MouseEventHandler<HTMLButtonElement> = async () => {
    const start = Date.now();
    const file_1 = inputRef_1.current?.files?.[0];
    if (!file_1) return;
    const audio_1 = await preprocess(file_1);

    const file_2 = inputRef_2.current?.files?.[0];
    if (!file_2) return;
    const audio_2 = await preprocess(file_2);

    console.log("wav convert done, time: " + (Date.now() - start) / 1000 + "s");

    const [mfcc_1, mfcc_2] = await Promise.all([
      extractFeatures(audio_1),
      extractFeatures(audio_2),
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
    console.log(path);

    const mtx = Array(chunkNum)
      .fill([])
      .map(() => Array(chunkNum).fill(0));

    path.forEach(([a, b]) => {
      mtx[a][b] = 1;
    });

    setPath(mtx);

    const end = Date.now();

    const time = end - start;
    alert("done, time: " + time / 1000 + "s");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <input type="file" ref={inputRef_1} />
      <input type="file" ref={inputRef_2} />
      <button className="border px-2 py-1 rounded-md" onClick={handleClick}>
        Process
      </button>
      <table>
        {path?.map((row, i) => {
          return (
            <tr key={i}>
              {row.map((col, j) => {
                return (
                  <td
                    key={j}
                    className={`${col === 1 ? "bg-red-500" : "bg-transparent"}`}
                  ></td>
                );
              })}
            </tr>
          );
        })}
      </table>
    </main>
  );
}

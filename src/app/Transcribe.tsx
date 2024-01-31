"use client";

import React, { Fragment, MouseEventHandler, useRef, useState } from "react";
import subtitle_file from "./8BFAC106-D38E-4E97-83CC-4CFEDC0A9C05.json";
import { formatSeconds, slopeChange } from "./utils";

interface Word {
  type: "text";
  value: string;
  ts: number;
  end_ts: number;
  confidence: number;
}

interface Punctuation {
  type: "punct";
  value: string;
}

interface monologue {
  speaker: number;
  elements: (Word | Punctuation)[];
}

interface Subtitle {
  monologues: monologue[];
}

const subtitle = subtitle_file as Subtitle;

const Word: React.FC<{
  word: Word;
  onMouseEnter?: (e: {
    event: Parameters<MouseEventHandler<HTMLSpanElement>>[0];
    word: Word;
  }) => void;
  onClick?: (e: {
    event: Parameters<MouseEventHandler<HTMLSpanElement>>[0];
    word: Word;
  }) => void;
  onMouseLeave?: MouseEventHandler;
  highlight?: boolean;
}> = ({ word, onMouseEnter, onMouseLeave, onClick, highlight }) => {
  const [showtip, setShowtip] = useState(false);

  const genTip = () => {
    return (
      <div
        className={`absolute left-1/2 translate-x-[-50%] m-auto bottom-[120%] rounded-md px-2 bg-white text-black border-2`}
      >
        {formatSeconds(word.ts)}
      </div>
    );
  };

  return (
    <span
      className={`relative hover:text-green-500 cursor-pointer ${
        highlight ? "text-green-500" : ""
      }`}
      onMouseEnter={(e) => {
        onMouseEnter?.({ event: e, word });
        setShowtip(true);
      }}
      onMouseLeave={(e) => {
        setShowtip(false);
        onMouseLeave?.(e);
      }}
      onClick={(e) => {
        onClick?.({ event: e, word });
      }}
    >
      {word.value}
      {showtip && genTip()}
    </span>
  );
};

const Transcribe: React.FC<{
  onClickWord?: (word: Word) => void;
  time: number;
}> = ({ onClickWord, time }) => {
  const refs = useRef<[]>([]);

  const handleWordClick: React.ComponentProps<typeof Word>["onClick"] = ({
    word,
  }) => {
    onClickWord?.(word);
  };

  return (
    <div>
      {subtitle.monologues.map((monologue, i) => {
        return (
          <div key={i} className="flex space-x-8 mt-4">
            <div>Speaker {monologue.speaker}</div>
            <div className="flex-1">
              {monologue.elements.map((element, i) => {
                return element.type === "text" ? (
                  <Word
                    key={i}
                    word={element}
                    onClick={handleWordClick}
                    highlight={time > element.ts && time < element.end_ts}
                  ></Word>
                ) : (
                  <Fragment key={i}>{element.value}</Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(Transcribe);

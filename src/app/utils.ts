export const formatSeconds = (seconds: number) => {
  let hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  let minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  if (hours) {
    return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  } else {
    return `${minutes < 10 ? "0" : ""}${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  }
};

export const calculateSlope = (
  point1: [number, number],
  point2: [number, number]
) => {
  return (point2[1] - point1[1]) / (point2[0] - point1[0]);
};

export const slopeChange = (path: [number, number][]) => {
  let slopes = path.slice(1).map((point, index) => {
    const prevPoint = path[index];
    let slope: number;
    if (point[0] === prevPoint[0]) {
      // 如果斜率无穷大，返回1
      slope = 1;
    } else if (point[1] === prevPoint[1]) {
      // 如果斜率为 0，返回 -1
      slope = -1;
    } else {
      // 如果斜率为 1，返回 0
      slope = 0;
    }

    return {
      point,
      slope,
    };
  });

  const windowSize = 2;

  let results: typeof slopes = [];
  for (let i = 0; i < slopes.length; i++) {
    let start = Math.max(0, i - windowSize + 1);
    let end = i + 1;
    let windowArr = slopes.slice(start, end);
    let sum = windowArr.reduce((a, b) => a + b.slope, 0);
    let avg = sum;
    results.push({
      point: slopes[i].point,
      slope: avg,
    });
  }

  // 计算滑动窗口中的斜率平均值
  return results;
};

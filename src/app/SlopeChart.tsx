"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from "echarts/components";
import { BarChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { formatSeconds, slopeChange } from "./utils";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  BarChart,
  GridComponent,
  CanvasRenderer,
]);

const Chart: React.FC<{ path: [number, number][]; ratio: number }> = ({
  path,
  ratio,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [chart, setChart] = useState<echarts.ECharts>();

  useEffect(() => {
    setTimeout(() => {
      setChart(echarts.init(containerRef.current!));
    });
  }, []);

  useEffect(() => {
    if (!chart || !path) return;

    const data = slopeChange(path);

    const trackData = data.reduce((acc, cur, i, arr) => {
      const curStep = cur.point[0];
      const prevStep = arr[i - 1]?.point[0];

      if (curStep === prevStep) {
        acc[acc.length - 1] += cur.slope;
      } else {
        acc.push(cur.slope);
      }

      return acc;
    }, [] as number[]);

    const filterData = (
      data: number[],
      windowSize: number,
      threshold: number
    ) => {
      const results: number[] = [];

      for (let i = 0; i < data.length; i++) {
        let start = Math.max(0, i - windowSize + 1);
        let end = i + 1;
        let windowArr = data.slice(start, end);
        let sum = windowArr.reduce((a, b) => a + b, 0);
        let avg = sum / windowArr.length;
        if (Math.abs(sum) > threshold || Math.abs(avg) > threshold) {
          results.push(1);
        } else {
          results.push(0);
        }
      }

      return results;
    };

    const filterData2 = (data: number[], windowSize: number) => {
      let fill = true;

      let continuous_1 = 0;
      let continuous_0 = 0;
      const results = data.slice();

      for (let i = 0; i < data.length; i++) {
        if (data[i] === 1) {
          continuous_1++;
          if (continuous_1 >= windowSize) {
            fill = true;
          }

          if (fill && continuous_0 > 0) {
            for (let j = i - 1; j >= i - continuous_0; j--) {
              results[j] = 1;
            }
            fill = false;
            continuous_1 = 0;
          }
          continuous_0 = 0;
        } else {
          continuous_0++;

          if (continuous_0 > windowSize) {
            fill = false;
          }

          continuous_1 = 0;
        }
      }

      return results;
    };

    let normalizedData = filterData(trackData, 44, 6);
    normalizedData = filterData2(normalizedData, 20);

    console.log(normalizedData);

    chart.setOption({
      xAxis: {
        name: "Audio A",
        data: normalizedData.map((_, i) => formatSeconds(i / ratio)),
      },
      yAxis: {
        name: "Audio B",
      },
      series: [
        {
          data: normalizedData,
          type: "bar",
        },
      ],
      grid: {
        left: "5%",
        right: "5%",
        bottom: "5%",
        top: "5%",
        containLabel: true,
      },

      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const value = params.dataIndex as number;
          console.log(params);
          return `Audio A: ${formatSeconds(value / ratio)}`;
        },
      },
    });
  }, [chart, path]);

  return <div className="h-[100px] w-full" ref={containerRef}></div>;
};

export default Chart;

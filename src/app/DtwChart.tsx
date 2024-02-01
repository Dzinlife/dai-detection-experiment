"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { formatSeconds } from "./utils";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  LineChart,
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

    chart.setOption({
      xAxis: {
        name: "Audio A",
      },
      yAxis: {
        name: "Audio B",
      },
      series: [
        {
          data: path,
          type: "line",
          showSymbol: false,
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
        trigger: "axis",
        formatter: (params: any) => {
          const [a, b] = params[0].value;
          return `Audio A: ${formatSeconds(
            a / ratio
          )}<br/>Audio B: ${formatSeconds(b / ratio)}`;
        },
      },
    });
  }, [chart, path]);

  return <div className="h-[300px] w-[300px]" ref={containerRef}></div>;
};

export default Chart;

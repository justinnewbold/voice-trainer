import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { COLORS } from '../constants/theme';

interface Props {
  data: number[];    // 0..1 normalized values
  width: number;
  height?: number;
  color?: string;
  accuracy: number;  // 0–100, used to tint color
}

export default function WaveformSparkline({
  data,
  width,
  height = 32,
  color,
  accuracy,
}: Props) {
  const barColor = color ?? (
    accuracy >= 80 ? COLORS.success :
    accuracy >= 60 ? '#F59E0B' :
    '#EF4444'
  );

  const buckets = data.length;
  const barW = Math.max(1, (width / buckets) - 1);
  const midY = height / 2;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Center line */}
        <Line
          x1={0} y1={midY}
          x2={width} y2={midY}
          stroke="#2A2A50"
          strokeWidth={1}
        />
        {data.map((v, i) => {
          const x = (i / buckets) * width;
          const barH = Math.max(2, Math.abs(v - 0.5) * height * 1.8);
          const y = midY - barH / 2;
          const deviation = Math.abs(v - 0.5);
          const opacity = 0.3 + deviation * 1.4;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={barW / 2}
              fill={barColor}
              opacity={Math.min(1, opacity)}
            />
          );
        })}
      </Svg>
    </View>
  );
}

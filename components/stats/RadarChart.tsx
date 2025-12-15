import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Polygon, Text as SvgText } from 'react-native-svg';

interface RadarData {
  label: string;
  value: number; // 0-100
}

export default function RadarChart({ data, size = 220 }: { data: RadarData[], size?: number }) {
  const radius = size / 2.8; // Biraz padding bırak
  const center = size / 2;
  const angleSlice = (Math.PI * 2) / data.length;

  const getCoordinates = (value: number, index: number, max: number = 100) => {
    const angle = index * angleSlice - Math.PI / 2; 
    const r = (value / max) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const points = data.map((d, i) => {
    const { x, y } = getCoordinates(d.value, i);
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg height={size} width={size}>
        {/* Grid (Arka Plan Ağları) */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((level, i) => (
          <Polygon
            key={i}
            points={data.map((_, idx) => {
                const {x, y} = getCoordinates(100 * level, idx);
                return `${x},${y}`;
            }).join(' ')}
            stroke="#E0E0E0"
            strokeWidth="1"
            fill={i === 4 ? "#FAFAFA" : "none"} // En dışı hafif boya
          />
        ))}

        {/* Eksen Çizgileri */}
        {data.map((_, i) => {
           const { x, y } = getCoordinates(100, i);
           return <Line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#E0E0E0" />;
        })}

        {/* Veri Alanı */}
        <Polygon points={points} fill="rgba(33, 150, 243, 0.4)" stroke="#2196F3" strokeWidth="2" />

        {/* Etiketler */}
        {data.map((d, i) => {
           const { x, y } = getCoordinates(125, i); // Biraz dışarı taşır
           return (
             <SvgText
               key={i}
               x={x}
               y={y}
               fill="#666"
               fontSize="11"
               fontWeight="bold"
               textAnchor="middle"
               alignmentBaseline="middle"
             >
               {d.label}
             </SvgText>
           );
        })}
      </Svg>
    </View>
  );
}
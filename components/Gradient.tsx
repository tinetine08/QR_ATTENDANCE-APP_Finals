import { ReactNode, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';

// Drop-in replacement for expo-linear-gradient built on react-native-svg,
// so no extra native module (and no app rebuild) is needed.
type Props = {
  colors: readonly string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

let counter = 0;

export default function Gradient({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  style,
  children,
}: Props) {
  const id = useRef(`grad${counter++}`).current;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const last = Math.max(colors.length - 1, 1);
  const radius = StyleSheet.flatten(style)?.borderRadius ?? 0;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  };

  return (
    // Solid first color behind the gradient gives Android a proper shadow shape.
    <View style={[{ backgroundColor: colors[0] }, style]} onLayout={onLayout}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
      >
        {size.w > 0 && size.h > 0 && (
          <Svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
            <Defs>
              <SvgGradient id={id} x1={start.x} y1={start.y} x2={end.x} y2={end.y}>
                {colors.map((c, i) => (
                  <Stop key={i} offset={i / last} stopColor={c} />
                ))}
              </SvgGradient>
            </Defs>
            <Rect x="0" y="0" width={size.w} height={size.h} fill={`url(#${id})`} />
          </Svg>
        )}
      </View>
      {children}
    </View>
  );
}
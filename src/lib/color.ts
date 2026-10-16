/** Convert one linear-sRGB channel (Blender / glTF values) to gamma-encoded sRGB. */
function linearToSrgb(c: number): number {
  const v = Math.min(1, Math.max(0, c));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}

export function linearToHex([r, g, b]: readonly number[]): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.round(linearToSrgb(c) * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

export interface PixelImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
export interface ForensicNote {
  label: "Indikasi edit";
  confidence: "sedang";
  reasons: string[];
  note: string;
}
/** Exploratory measurements only. Deliberately has no Signal or score output. */
export function imageForensics(
  image: PixelImage,
  recompressed?: PixelImage,
  fontHeights: number[] = [],
): ForensicNote | null {
  const { width, height, data } = image;
  if (
    width < 32 ||
    height < 32 ||
    data.length !== width * height * 4 ||
    width * height > 4_000_000
  )
    return null;
  const luminance = (i: number) => (data[i] + data[i + 1] + data[i + 2]) / 3;
  const reasons: string[] = [];
  let boundary = 0,
    interior = 0,
    bn = 0,
    inside = 0;
  for (let y = 1; y < height; y++)
    for (let x = 1; x < width; x++) {
      const i = (y * width + x) * 4;
      const difference = Math.abs(luminance(i) - luminance(i - 4));
      if (x % 8 === 0) {
        boundary += difference;
        bn++;
      } else {
        interior += difference;
        inside++;
      }
    }
  if (
    bn &&
    inside &&
    interior / inside > 1 &&
    boundary / bn > 3 * (interior / inside)
  )
    reasons.push("Ketidakkonsistenan batas blok kompresi");
  if (
    recompressed &&
    recompressed.width === width &&
    recompressed.height === height &&
    recompressed.data.length === data.length
  ) {
    const errors: number[] = [];
    for (let y = 0; y < height; y += 8)
      for (let x = 0; x < width; x += 8) {
        let sum = 0,
          n = 0;
        for (let dy = 0; dy < 8 && y + dy < height; dy++)
          for (let dx = 0; dx < 8 && x + dx < width; dx++) {
            const i = ((y + dy) * width + x + dx) * 4;
            for (let c = 0; c < 3; c++) {
              sum += Math.abs(data[i + c] - recompressed.data[i + c]);
              n++;
            }
          }
        errors.push(sum / n);
      }
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
    const variance =
      errors.reduce((a, b) => a + (b - mean) ** 2, 0) / errors.length;
    if (
      mean > 1 &&
      Math.max(...errors) > mean + 4 * Math.sqrt(variance) &&
      Math.max(...errors) > 20
    )
      reasons.push("Sebaran error recompression tidak seragam");
  }
  const regionHashes = new Map<string, number>();
  for (let y = 0; y + 16 <= height; y += 16)
    for (let x = 0; x + 16 <= width; x += 16) {
      const values: number[] = [];
      for (let dy = 0; dy < 16; dy += 2)
        for (let dx = 0; dx < 16; dx += 2)
          values.push(
            Math.round(luminance(((y + dy) * width + x + dx) * 4) / 8),
          );
      if (Math.max(...values) - Math.min(...values) < 8) continue;
      const key = values.join(",");
      regionHashes.set(key, (regionHashes.get(key) ?? 0) + 1);
    }
  if ([...regionHashes.values()].some((n) => n >= 4))
    reasons.push("Region bertekstur berulang secara identik");
  if (fontHeights.length >= 8) {
    const sorted = fontHeights.filter((h) => h > 0).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (sorted.filter((h) => h > median * 1.8).length >= 2)
      reasons.push("Variasi tinggi teks memerlukan pemeriksaan manual");
  }
  if (reasons.length < 2) return null;
  return {
    label: "Indikasi edit",
    confidence: "sedang",
    reasons,
    note: "Eksperimental: kompresi dan tata letak yang sah juga dapat menimbulkan pola ini. Tidak memengaruhi skor; belum divalidasi pada 40 screenshot nyata.",
  };
}

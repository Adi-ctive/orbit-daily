// Canvas labels in the app font. `scale` 1 is a small label (about 7 logical units).
export function drawText(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  color: string,
  scale = 1,
  align: 'left' | 'center' | 'right' = 'left',
): void {
  ctx.fillStyle = color
  ctx.font = `600 ${7 * scale}px 'Inter Variable', system-ui, sans-serif`
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  ctx.fillText(s, x, y)
}

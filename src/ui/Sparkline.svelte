<script lang="ts">
  interface Props {
    values: number[]
    label: string
  }
  let { values, label }: Props = $props()
  const W = 160
  const H = 44
  const path = $derived.by(() => {
    if (values.length < 2) return ''
    const lo = Math.min(...values) - 15
    const hi = Math.max(...values) + 15
    return values
      .map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * (W - 4) + 2).toFixed(1)},${(H - 4 - ((v - lo) / (hi - lo)) * (H - 8)).toFixed(1)}`)
      .join(' ')
  })
</script>

<div class="spark panel">
  <div class="head"><span class="label">{label}</span><span class="val">{values.at(-1) ?? '–'}</span></div>
  <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" role="img" aria-label="{label} rating trend">
    {#if path}<path d={path} fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke" />{/if}
  </svg>
</div>

<style>
  .spark {
    padding: 12px;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .val {
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  svg {
    width: 100%;
    height: 44px;
    display: block;
    margin-top: 6px;
  }
</style>

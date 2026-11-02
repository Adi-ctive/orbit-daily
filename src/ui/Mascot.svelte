<script lang="ts">
  import { onMount } from 'svelte'
  import { MASCOT_SIZE, mascotFrame, type Mood } from '../art/sprites/mascot'
  import { drawIndexed } from '../art/sprites/sprite'
  import { app } from '../state/app.svelte'

  interface Props {
    mood?: Mood
    size?: number
  }
  let { mood = 'idle', size = 96 }: Props = $props()

  let canvas: HTMLCanvasElement
  const cache: Record<string, ReturnType<typeof mascotFrame>> = {}

  function frame(m: Mood, f: number) {
    const k = m + f
    return (cache[k] ??= mascotFrame(m, f))
  }

  onMount(() => {
    const ctx = canvas.getContext('2d')!
    let tick = 0
    const draw = () => {
      ctx.clearRect(0, 0, MASCOT_SIZE, MASCOT_SIZE)
      let m = mood
      // Blink now and then while idle.
      if (m === 'idle' && tick % 14 === 13) m = 'blink'
      drawIndexed(ctx, frame(m, app.reducedMotion ? 0 : tick % 2), 0, 0)
    }
    draw()
    const id = setInterval(() => {
      tick++
      draw()
    }, 420)
    return () => clearInterval(id)
  })

  $effect(() => {
    void mood
    if (canvas) {
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, MASCOT_SIZE, MASCOT_SIZE)
      drawIndexed(ctx, frame(mood, 0), 0, 0)
    }
  })
</script>

<span class="mascot" role="img" aria-label="Pip, your guide, looking {mood}">
  <canvas
    bind:this={canvas}
    class="pixel-canvas"
    width={MASCOT_SIZE}
    height={MASCOT_SIZE}
    style:width="{size}px"
    style:height="{size}px"
    aria-hidden="true"
  ></canvas>
</span>

<style>
  .mascot {
    display: inline-block;
  }
</style>

<script lang="ts">
  // Dev-only: /dev/game?id=<game>&d=<0..1>&seed=<s> mounts one game on its own.
  import { onMount } from 'svelte'
  import { loadGame } from '../games/registry'
  import { generateVerified, type RoundResult } from '../games/types'
  import { RNG } from '../lib/rng'
  import StarField from '../ui/StarField.svelte'

  const p = new URLSearchParams(location.search)
  const id = p.get('id') ?? 'fuel-mix'
  const d = Number(p.get('d') ?? 0.5)
  const seed = p.get('seed') ?? 'preview'
  let host: HTMLDivElement
  let title = $state('')
  let result = $state<RoundResult | null>(null)

  onMount(() => {
    let destroy = () => {}
    void loadGame(id).then((m) => {
      title = m.title
      const rng = new RNG(seed)
      const level = generateVerified(m, rng, d)
      const fx = { sfx() {}, haptic() {}, shake() {}, duck() {} }
      const inst = m.mount({ host, level, difficulty: d, rng: rng.fork('rt'), fx, reducedMotion: false, boss: false, finish: (r) => (result = r) })
      destroy = () => inst.destroy()
    })
    return () => destroy()
  })
</script>

<StarField seed={'orbit-v1|' + seed} />
<section class="screen session">
  <h2 class="center">{title}</h2>
  <div class="game" bind:this={host}></div>
  {#if result}
    <pre class="panel" data-testid="preview-result">{JSON.stringify(result, null, 1)}</pre>
  {/if}
</section>

<style>
  .game {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  pre {
    white-space: pre-wrap;
    font-size: 0.8rem;
  }
</style>

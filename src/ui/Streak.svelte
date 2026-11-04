<script lang="ts">
  // Streak as a number plus the last 7 days as dots.
  import { addDays } from '../lib/clock'
  import Icon from './Icon.svelte'

  interface Props {
    count: number
    today: string
    done: string[]
    frozen: string[]
  }
  let { count, today, done, frozen }: Props = $props()
  const days = $derived(Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)))
</script>

<div class="streak" aria-label="{count} day streak">
  <span class="num"><Icon name="flame" size={18} /> {count}</span>
  <span class="dots" aria-hidden="true">
    {#each days as d (d)}
      <span class="dot" class:on={done.includes(d)} class:frozen={frozen.includes(d)} class:today={d === today}></span>
    {/each}
  </span>
</div>

<style>
  .streak {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
  }
  .num {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 650;
    color: var(--warm);
    font-variant-numeric: tabular-nums;
  }
  .dots {
    display: flex;
    gap: 6px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--surface-hi);
    border: 1px solid var(--border);
  }
  .dot.on {
    background: var(--warm);
    border-color: transparent;
  }
  .dot.frozen {
    background: var(--accent);
    border-color: transparent;
  }
  .dot.today {
    outline: 1px solid var(--border-hi);
    outline-offset: 2px;
  }
</style>

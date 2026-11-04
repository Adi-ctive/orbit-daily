<script lang="ts">
  interface Props {
    total: number
    index: number
  }
  let { total, index }: Props = $props()
</script>

<div class="bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index} aria-label="Mission progress">
  {#each Array.from({ length: total }) as _, i (i)}
    <span class:done={i < index} class:now={i === index}></span>
  {/each}
</div>

<style>
  .bar {
    flex: 1;
    display: flex;
    gap: 4px;
    max-width: 320px;
  }
  span {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--surface-hi);
  }
  .done {
    background: var(--accent);
  }
  .now {
    background: rgb(143 180 255 / 0.45);
  }
</style>

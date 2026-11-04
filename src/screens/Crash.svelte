<script lang="ts">
  interface Props {
    message?: string
  }
  let { message = '' }: Props = $props()
</script>

<section class="screen crash" role="alert">
  <h1>Houston, we have a problem</h1>
  <p class="muted">Something broke. Your progress is saved on this device.</p>
  {#if message}<p class="muted small">{message}</p>{/if}
  <button class="btn primary" onclick={() => location.reload()}>Reload</button>
</section>

<style>
  .crash {
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 10px;
  }
  .small {
    font-size: 0.8rem;
    word-break: break-word;
  }
</style>

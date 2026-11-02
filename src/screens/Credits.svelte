<script lang="ts">
  import { CREDITS } from '../content/credits'
  import { app } from '../state/app.svelte'
  import Icon from '../ui/Icon.svelte'
</script>

<section class="screen credits">
  <header class="topbar">
    <button class="btn ghost icon-btn" aria-label="Back" onclick={() => app.open('settings')}><Icon name="back" /></button>
    <h1>Credits</h1>
    <span></span>
  </header>
  <ul class="panel list">
    {#each CREDITS as c (c.what)}
      <li>
        <strong>{c.what}</strong><br />
        <span class="muted">{c.source} · {c.license}</span>
        {#if c.url}<br /><a href={c.url} target="_blank" rel="noopener">{c.url}</a>{/if}
      </li>
    {/each}
  </ul>
  <p class="muted small">Each Star Chart card links to its source article. Wikipedia text is shown under CC BY-SA 4.0 and may be shortened.</p>
</section>

<style>
  .list {
    list-style: none;
    display: grid;
    gap: 12px;
  }
  a {
    color: var(--cyan-hi);
    word-break: break-all;
  }
  .small {
    font-size: 0.85rem;
  }
</style>

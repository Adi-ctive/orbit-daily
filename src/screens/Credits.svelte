<script lang="ts">
  import { app } from '../state/app.svelte'
  import Icon from '../ui/Icon.svelte'

  const CREDITS = [
    { what: 'Font: Inter', who: 'Rasmus Andersson, via Fontsource', license: 'SIL Open Font License 1.1', url: 'https://rsms.me/inter/' },
    { what: 'Explainers, riddles, Fermi questions, puzzles', who: 'Written for ORBIT', license: 'Original', url: '' },
    { what: 'Planets, stars, sound and music', who: 'Generated in code for ORBIT', license: 'Original', url: '' },
    { what: 'Further-reading links', who: 'Wikipedia contributors and the other linked sites', license: 'Linked only, not copied', url: 'https://en.wikipedia.org/' },
  ]
</script>

<section class="screen credits">
  <header class="topbar">
    <button class="btn ghost icon-btn" aria-label="Back" onclick={() => app.open('settings')}><Icon name="back" /></button>
    <h2>Credits</h2>
    <span style="width:44px"></span>
  </header>
  <ul class="list">
    {#each CREDITS as c (c.what)}
      <li class="panel">
        <strong>{c.what}</strong>
        <span class="muted">{c.who} · {c.license}</span>
        {#if c.url}<a href={c.url} target="_blank" rel="noopener">{c.url}</a>{/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  li {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  a {
    color: var(--accent);
    word-break: break-all;
    font-size: 0.9rem;
  }
</style>

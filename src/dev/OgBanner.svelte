<script lang="ts">
  // Dev-only: /dev/og renders the 1200×630 link-preview banner from the real art engine.
  import { TAGLINE } from '../config'
  import Mascot from '../ui/Mascot.svelte'
  import PlanetView from '../ui/PlanetView.svelte'
  import SkyBackdrop from '../ui/SkyBackdrop.svelte'
</script>

<SkyBackdrop seed="orbit-v1|og-banner" />
<div class="og">
  <div class="planet"><PlanetView seed="orbit-v1|og-0" radius={46} /></div>
  <div class="text">
    <h1>ORBIT</h1>
    <p class="tag">{TAGLINE}</p>
    <p class="sub">A free daily brain-training and STEM mission</p>
  </div>
  <div class="pip"><Mascot mood="cheer" size={144} /></div>
</div>

<style>
  .og {
    position: relative;
    z-index: 1;
    width: 1200px;
    height: 630px;
    display: grid;
    grid-template-columns: 420px 1fr;
    align-items: center;
    padding: 40px;
  }
  .planet :global(.planet) {
    height: 520px;
  }
  h1 {
    font-size: 96px;
    margin: 0;
    color: var(--accent-hi);
    text-shadow: 6px 6px 0 var(--accent-lo);
  }
  .tag {
    font-family: var(--label-font);
    font-size: 32px;
    margin: 24px 0 8px;
    color: var(--ink-bright);
  }
  .sub {
    font-size: 26px;
    color: var(--cyan-hi);
    margin: 0;
  }
  .pip {
    position: absolute;
    right: 56px;
    bottom: 40px;
  }
</style>

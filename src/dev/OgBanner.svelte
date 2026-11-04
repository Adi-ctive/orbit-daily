<script lang="ts">
  // Dev-only: /dev/og renders the 1200×630 link-preview banner.
  import { TAGLINE } from '../config'
  import PlanetView from '../ui/PlanetView.svelte'
  import StarField from '../ui/StarField.svelte'
</script>

<StarField seed="orbit-v1|og-banner" />
<div class="og">
  <div class="planet"><PlanetView seed="orbit-v1|og-0" size={460} /></div>
  <div class="text">
    <p class="brand">ORBIT</p>
    <h1>{TAGLINE}</h1>
    <p class="sub">A daily mission for focus, memory and curiosity. Free, no ads, no account.</p>
  </div>
</div>

<style>
  .og {
    position: relative;
    z-index: 1;
    width: 1200px;
    height: 630px;
    display: grid;
    grid-template-columns: 520px 1fr;
    align-items: center;
    padding: 40px 64px 40px 24px;
  }
  .brand {
    font-weight: 700;
    letter-spacing: 0.4em;
    font-size: 26px;
    color: var(--accent);
    margin: 0 0 18px;
  }
  h1 {
    font-size: 58px;
    line-height: 1.08;
    letter-spacing: -0.03em;
    margin: 0 0 20px;
  }
  .sub {
    font-size: 24px;
    color: var(--muted);
    margin: 0;
    max-width: 22em;
  }
</style>

<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    export let tile: Tile;
    export let x: number = 0;
    export let y: number = 0;
    export let onUpdate: (updates: Partial<Tile>) => void;
  
    const terrainTypes = ['grass', 'water', 'forest', 'desert', 'swamp', 'mine'] as const;
    const crownValues = [0, 1, 2, 3];
  
    function setTerrain(type: string) {
      onUpdate({ terrain: type });
    }
  
    function setCrowns(count: number) {
      onUpdate({ crowns: count });
    }
  
    function erase() {
      onUpdate({ terrain: null, crowns: 0 });
      onClose();
    }

    function close() {
    dispatch('close');
  }
  </script>
  
  <div class="overlay" on:pointerdown={() => close()}></div>
  <div class="editor" style="left: {x}px; top: {y}px;"
     on:click|stopPropagation
     on:pointerdown|stopPropagation>
    <!-- Trashcan (center) -->
    <button class="center" on:click={erase}>🗑️</button>
  
    <!-- Crowns in diamond -->
    {#each crownValues as c, i}
      <button
        class="crown crown-{i}"
        on:click={() => setCrowns(c)}
      >{c}</button>
    {/each}
  
    <!-- Terrain in hexagon -->
    {#each terrainTypes as t, i}
      <button
        class="terrain terrain-{i}"
        class:grass={t === 'grass'}
        class:water={t === 'water'}
        class:forest={t === 'forest'}
        class:desert={t === 'desert'}
        class:swamp={t === 'swamp'}
        class:mine={t === 'mine'}
                on:click={() => setTerrain(t)}
      >{t}</button>
    {/each}
  </div>
  
  <style>
    .editor {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 220px;
      height: 220px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.95);
      border: 2px solid #ccc;
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: auto;
      z-index: 1001;
    }
  
    .editor button {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid #888;
      /* background: white; */
      font-size: 14px;
      cursor: pointer;
    }
  
    .center { top: 50%; left: 50%; transform: translate(-50%, -50%); }
  
    /* Crowns in diamond */
    .crown-0 { top: 25%; left: 50%; transform: translate(-50%, -50%); }
    .crown-1 { top: 50%; left: 75%; transform: translate(-50%, -50%); }
    .crown-2 { top: 75%; left: 50%; transform: translate(-50%, -50%); }
    .crown-3 { top: 50%; left: 25%; transform: translate(-50%, -50%); }
  
    /* Terrain in hexagon (approximate radial layout) */
    .terrain-0 { top: 5%;  left: 50%; transform: translate(-50%, -50%); }
    .terrain-1 { top: 25%; left: 85%; transform: translate(-50%, -50%); }
    .terrain-2 { top: 75%; left: 85%; transform: translate(-50%, -50%); }
    .terrain-3 { top: 95%; left: 50%; transform: translate(-50%, -50%); }
    .terrain-4 { top: 75%; left: 15%; transform: translate(-50%, -50%); }
    .terrain-5 { top: 25%; left: 15%; transform: translate(-50%, -50%); }

    .terrain {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #888;
  font-size: 0.8rem;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
}

    .grass { background-color: rgb(119 216 78); }
    .water { background-color: rgb(78 147 213); }
    .forest { background-color: rgb(118,126,75); }
    .desert { background-color: rgb(255 183 73); }
    .swamp { background-color: rgb(214 163 146); }
    .mine { background-color: rgb(69,54,59); color: white; }

    .overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw;
  height: 100vh;
  background: transparent; /* or rgba(0,0,0,0.1) for subtle overlay */
  z-index: 1000;
}

  </style>
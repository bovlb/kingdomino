<script lang="ts">
  import { afterUpdate } from "svelte";

  import { onMount, onDestroy } from "svelte";
  import { score } from "./lib/scoring";

  let debugLog: string[] = [];

  function log(msg: string) {
    // debugLog = [...debugLog, msg].slice(-10); // keep last 10 messages
  }

  let isDragging = false;
  let dragTerrain: Terrain | null = null;
  let castleDragStart: { row: number; col: number } | null = null;

  function stopDrag() {
    isDragging = false;
    dragTerrain = null;
    castleDragStart = null;
  }

  onMount(() => {
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
  });
  onDestroy(() => {
    window.removeEventListener("pointerup", stopDrag);
    window.removeEventListener("pointercancel", stopDrag);
  });

  // Optional debugging aid
  // $: console.log("isDragging:", isDragging, "dragTerrain:", dragTerrain, "castleDragStart:", castleDragStart);

  const terrainTypes = [
    "grass",
    "water",
    "forest",
    "wheat",
    "swamp",
    "mine",
  ] as const;
  type Terrain = (typeof terrainTypes)[number] | "empty";

  interface Tile {
    terrain: Terrain | null;
    crowns: number;
  }

  const gridSize = 13;
  let board: Tile[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ({ terrain: null, crowns: 0 }))
  );

  let viewportSize = 5; // or 7
  let viewportOrigin = { row: 4, col: 4 }; // start at center-ish

  let castle = { row: 6, col: 6 }; // always inside full grid

  function beginDrag(tile: Tile, row: number, col: number) {
    log(`beginDrag: ${row}, ${col}`);
    if (isCastle(row, col)) {
      castleDragStart = { row, col };
    } else if (pendingCrown === null) {
      isDragging = true;
      dragTerrain = selectedTerrain === "empty" ? null : selectedTerrain;
      applyDrag(tile, row, col); // apply immediately
    }
  }
  function endDrag(e: PointerEvent) {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    if (!el?.dataset) return;

    const row = parseInt(el.dataset.row ?? "");
    const col = parseInt(el.dataset.col ?? "");
    if (isNaN(row) || isNaN(col)) return;

    log(`endDrag: ${row}, ${col}`);
    if (castleDragStart) {
      const dRow = row - castleDragStart.row;
      const dCol = col - castleDragStart.col;
      tryMoveViewport(castle.row + dRow, castle.col + dCol);
      castleDragStart = null;
    }
    isDragging = false;
    dragTerrain = null;
  }

  function tryMoveViewport(
    newCastleRow: number,
    newCastleCol: number
  ): boolean {
    const dRow = newCastleRow - castle.row;
    const dCol = newCastleCol - castle.col;

    const newOrigin = {
      row: viewportOrigin.row - dRow,
      col: viewportOrigin.col - dCol,
    };

    const { minRow, maxRow, minCol, maxCol } = boundingBox();

    // Will the new bounding box still be visible?
    const visibleMinRow = newOrigin.row;
    const visibleMaxRow = newOrigin.row + viewportSize - 1;
    const visibleMinCol = newOrigin.col;
    const visibleMaxCol = newOrigin.col + viewportSize - 1;

    const isVisible =
      minRow >= visibleMinRow &&
      maxRow <= visibleMaxRow &&
      minCol >= visibleMinCol &&
      maxCol <= visibleMaxCol;

    // console.log(
    //   `New castle: ${newCastleRow}, ${newCastleCol} | ` +
    //   `Delta: ${dRow}, ${dCol} | ` +
    //   `Old Origin: ${viewportOrigin.row}, ${viewportOrigin.col} | ` +
    //   `New Origin: ${newOrigin.row}, ${newOrigin.col} | ` +
    //   `Visible: ${isVisible} | ` +
    //   `Bounding Box: [${minRow}, ${maxRow}] x [${minCol}, ${maxCol}] | ` +
    //   `Old Viewport: [${viewportOrigin.row}, ${viewportOrigin.col}] | ` +
    //   `Viewport: [${visibleMinRow}, ${visibleMaxRow}] x [${visibleMinCol}, ${visibleMaxCol}]`);

    if (!isVisible) {
      // alert("Move would hide part of your kingdom.");
      return false;
    }

    // Apply
    viewportOrigin = newOrigin;
    update();

    return true;
  }

  function update() {
    board = [...board];
    const scores = score(board, castle, viewportOrigin, viewportSize);
    totalScore = scores.total;
    hasMiddleKingdom = scores.middleKingdom;
    hasHarmony = scores.harmony;
    terrainScore = scores.terrain;
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging || dragTerrain === null) return;

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    if (!el?.dataset) return;

    const row = parseInt(el.dataset.row ?? "");
    const col = parseInt(el.dataset.col ?? "");
    if (isNaN(row) || isNaN(col)) return;

    const tile = board[row][col];
    applyDrag(tile, row, col);
  }

  function applyDrag(tile: Tile, row: number, col: number) {
    log(`applyDrag: ${row}, ${col}`);
    if (isCastle(row, col)) return;
    if (isDragging && dragTerrain !== null) {
      console.log("applyDrag: terrain", dragTerrain);
      tile.terrain = dragTerrain;
      // tile.crowns = Math.floor(Math.random() * 4);  // <-- force visible change
      update();
    }
  }
  let selectedTerrain: Terrain = "grass";

  function setSelectedTerrain(t: string) {
    selectedTerrain = t as Terrain;
    pendingCrown = null;
  }
  let pendingCrown: number | null = null;

  function applySelection(tile: Tile, row: number, col: number) {
    if (isCastle(row, col)) return;

    if (pendingCrown !== null) {
      console.log("applySelection: crown", pendingCrown);
      tile.crowns = pendingCrown;
      // pendingCrown = null;
    } else {
      console.log("applySelection: terrain", selectedTerrain);
      tile.terrain = selectedTerrain === "empty" ? null : selectedTerrain;
    }

    update();
  }

  function isCastle(row: number, col: number) {
    return row === castle.row && col === castle.col;
  }

  function boundingBox(): {
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
  } {
    let minRow = gridSize,
      maxRow = -1,
      minCol = gridSize,
      maxCol = -1;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (
          board[r][c].terrain !== null ||
          (r === castle.row && c === castle.col)
        ) {
          minRow = Math.min(minRow, r);
          maxRow = Math.max(maxRow, r);
          minCol = Math.min(minCol, c);
          maxCol = Math.max(maxCol, c);
        }
      }
    }
    return { minRow, maxRow, minCol, maxCol };
  }

  $: visibleTiles = Array.from({ length: viewportSize }, (_, dr) =>
    Array.from({ length: viewportSize }, (_, dc) => {
      const row = viewportOrigin.row + dr;
      const col = viewportOrigin.col + dc;
      return {
        tile: board[row][col],
        row,
        col,
      };
    })
  );

  let totalScore = 0;
  let hasMiddleKingdom = false;
  let hasHarmony = false;
  let terrainScore = 0;

  function tryToggleViewportSize() {
    if (viewportSize === 5) {
      // Try growing to 7×7
      viewportSize = 7;
      if (viewportOrigin.row > 0) {
        viewportOrigin.row -= 1;
      }
      if (viewportOrigin.col > 0) {
        viewportOrigin.col -= 1;
      }
    } else {
      // Try shrinking to 5×5
      const box = boundingBox();

      if (box.maxRow - box.minRow >= 5 || box.maxCol - box.minCol >= 5) {
        return;
      }

      const newRow =
        box.maxRow < viewportOrigin.row + 6
          ? viewportOrigin.row + 1
          : viewportOrigin.row;
      const newCol =
        box.maxCol < viewportOrigin.col + 6
          ? viewportOrigin.col + 1
          : viewportOrigin.col;
      // Check if the new origin would be valid
      const newOrigin = {
        row: newRow,
        col: newCol,
      };

      viewportOrigin = newOrigin;

      viewportSize = 5;
    }
  }
</script>

<h1 style="text-align: center;">Kingdomino Scorer</h1>
<div class="crown-controls controls">
  {#each [0, 1, 2, 3] as c}
    <button
      class:selected={pendingCrown === c}
      on:click={() => (pendingCrown = pendingCrown === c ? null : c)}
      >{c} 👑</button
    >
  {/each}
</div>

<div class="board" style="--board-size: {viewportSize};">
  {#each visibleTiles as vt}
    {#each vt as { tile, row, col }}
      <button
        data-row={row}
        data-col={col}
        class="tile"
        class:grass={tile.terrain === "grass"}
        class:water={tile.terrain === "water"}
        class:forest={tile.terrain === "forest"}
        class:wheat={tile.terrain === "wheat"}
        class:swamp={tile.terrain === "swamp"}
        class:mine={tile.terrain === "mine"}
        class:castle={isCastle(row, col)}
        on:click={() => applySelection(tile, row, col)}
        on:pointerdown={(e) => beginDrag(tile, row, col)}
        on:pointermove={(e) => handlePointerMove(e)}
        on:pointerup={(e) => endDrag(e)}
      >
        {tile.crowns > 0 ? tile.crowns : ""}
      </button>
    {/each}
  {/each}
</div>
<div class="controls">
  {#each ["empty", ...terrainTypes] as t (t)}
    <button
      class:selected={selectedTerrain === t}
      class={t}
      on:click={() => setSelectedTerrain(t)}>{t}</button
    >
  {/each}
</div>

<p style="text-align: center; font-size: 1.2rem;">
  Total Score: <strong>{totalScore}</strong>
  <span style="margin-left: 1rem;">
    {#if hasMiddleKingdom}🏰 Middle Kingdom +10{/if}
  </span>
  <span style="margin-left: 1rem;">
    {#if hasHarmony}🎯 Harmony +5{/if}
  </span>
  <button on:click={() => tryToggleViewportSize()} style="margin-left: 20px;">
    Board Size: {viewportSize}×{viewportSize}
  </button>
</p>

<!-- <div class="debug-log">
  {#each debugLog as msg}
    <div>{msg}</div>
  {/each}
</div> -->

<style>
  .debug-log {
    font-family: monospace;
    font-size: 0.9rem;
    padding: 0.5rem;
    margin-top: 1rem;
    border-top: 1px dashed #ccc;
    max-height: 10rem;
    overflow-y: auto;
    background: #f7f7f7;
    color: #333;
    pointer-events: none;
  }

  .board {
    touch-action: none;
  }
  .tile {
    touch-action: none;
  }

  html,
  body {
    overscroll-behavior: none;
    touch-action: manipulation;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(var(--board-size), 1fr);
    gap: 2px;
    width: 80vw; /* Slightly smaller than viewport */
    /* max-width: 500px;        Optional cap for desktop */
    margin: 0 auto;
  }

  .tile {
    aspect-ratio: 1;
    width: 100%;
    font-weight: bold;
    user-select: none;
    touch-action: manipulation;
    border: 1px solid #ccc;
    font-size: clamp(1rem, 3vw, 1.5rem);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
  }
  .grass {
    background-color: rgb(119 216 78);
  }
  .water {
    background-color: rgb(78 147 213);
  }
  .forest {
    background-color: rgb(118, 126, 75);
    color: white;
  }
  .wheat {
    background-color: rgb(255 183 73);
  }
  .swamp {
    background-color: rgb(214 163 146);
  }
  .mine {
    background-color: rgb(69, 54, 59);
    color: white;
  }

  .castle {
    border: 3px solid black;
  }

  .controls {
    display: flex;
    flex: 1 1 auto;
    font-size: clamp(1rem, 4vw, 1.5rem);
    min-width: 4rem;
    max-width: 100%;
    justify-content: space-evenly;
    align-items: center;
    gap: 2rem;
    padding: 1rem;
    flex-wrap: wrap;
    text-align: center;
  }

  .terrain-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem;
  }
  .terrain-buttons button {
    flex: 1 1 0;
    min-width: 3rem;
    max-width: 6rem;
    font-size: clamp(0.8rem, 4vw, 1.2rem);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0.75rem 1rem;
  }
  @media (min-width: 420px) {
    .terrain-buttons {
      flex-wrap: nowrap;
    }
  }
  .crown-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  button {
    padding: 1rem;
    border: 2px solid #888;
    border-radius: 0.75rem;
    font-size: 1.2rem;
    cursor: pointer;
    background: white;
    /* min-width: 100px; */
  }

  button.selected {
    /* background-color: #4a90e2; */
    /* color: white; */
    border-color: #2563eb;
    border-width: 5px;
  }
</style>

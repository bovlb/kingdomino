<script lang="ts">
    import { afterUpdate } from "svelte";

  const terrainTypes = ['grass', 'water', 'forest', 'desert', 'swamp', 'mine'] as const;
  type Terrain = typeof terrainTypes[number];

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

  let isDragging = false;
  let dragTerrain: Terrain | null = null;

  let castleDragStart: { row: number; col: number } | null = null;

function beginDrag(tile: Tile, row: number, col: number) {
  if (isCastle(row, col)) {
    castleDragStart = { row, col };
  } else if (tile.terrain) {
    isDragging = true;
    dragTerrain = tile.terrain;
  }
}

function endDrag(row: number, col: number) {
  if (castleDragStart) {
    const dRow = row - castleDragStart.row;
    const dCol = col - castleDragStart.col;
    tryMoveViewport(castle.row + dRow, castle.col + dCol);
    castleDragStart = null;
  }
  isDragging = false;
  dragTerrain = null;
}  

function tryMoveViewport(newCastleRow: number, newCastleCol: number): boolean {
  const dRow = newCastleRow - castle.row;
  const dCol = newCastleCol - castle.col;

  const newOrigin = {
    row: viewportOrigin.row - dRow,
    col: viewportOrigin.col - dCol
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
    board = board;
    totalScore = score();
  }


  function applyDrag(tile: Tile, row: number, col: number) {
    if (isCastle(row, col)) return;
    if (isDragging && dragTerrain !== null) {
      tile.terrain = dragTerrain;
      update();
    }
  }

  function cycleTerrain(tile: Tile) {
    const index = terrainTypes.indexOf(tile.terrain as Terrain);
    tile.terrain = terrainTypes[(index + 1) % terrainTypes.length];
    update();
  }

  function cycleCrowns(tile: Tile) {
    tile.crowns = (tile.crowns + 1) % 4; // 0-3 crowns
    update();
  }

  let tapTimeout: ReturnType<typeof setTimeout> | null = null;

  function handleTap(tile: Tile, row: number, col: number) {
    if (isCastle(row, col)) return;
    if (tapTimeout) {
      clearTimeout(tapTimeout);
      tapTimeout = null;
      cycleCrowns(tile); // Double tap
    } else {
      tapTimeout = setTimeout(() => {
        cycleTerrain(tile); // Single tap
        tapTimeout = null;
      }, 250);
    }
  }

  function isCastle(row: number, col: number) {
    return row === castle.row && col === castle.col;
  }

  function qualifiesMiddleKingdom(): boolean {
    const { minRow, maxRow, minCol, maxCol } = boundingBox();
    const centerRow = Math.floor((minRow + maxRow) / 2);
    const centerCol = Math.floor((minCol + maxCol) / 2);
    const castleInCentre = castle.row === centerRow && castle.col === centerCol;
    const boxFits = maxRow - minRow + 1 === viewportSize && maxCol - minCol + 1 === viewportSize;
    return castleInCentre && boxFits;
  }

  function qualifiesHarmony(): boolean {
    const { minRow, maxRow, minCol, maxCol } = boundingBox();

    // Check bounding box fits exactly in viewport
    const boxFits =
      maxRow - minRow + 1 === viewportSize &&
      maxCol - minCol + 1 === viewportSize;

    // Check all tiles are filled (castle excluded)
    for (let r = viewportOrigin.row; r < viewportOrigin.row + viewportSize; r++) {
      for (let c = viewportOrigin.col; c < viewportOrigin.col + viewportSize; c++) {
        if ((r !== castle.row || c !== castle.col) && board[r][c].terrain === null) {
          return false;
        }
      }
    }

    return boxFits;
  }

  function score(): number {
    const visited = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill(false)
    );
    let total = 0;

    function dfs(r: number, c: number, terrain: Terrain): [number, number] {
      if (
        r < 0 || r >= gridSize || c < 0 || c >= gridSize ||
        visited[r][c] ||
        board[r][c].terrain !== terrain
      ) return [0, 0];

      visited[r][c] = true;
      let size = 1;
      let crowns = board[r][c].crowns;

      for (const [dr, dc] of [[1,0], [-1,0], [0,1], [0,-1]]) {
        const [s, cr] = dfs(r + dr, c + dc, terrain);
        size += s;
        crowns += cr;
      }

      return [size, crowns];
    }

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const tile = board[r][c];
        if (tile.terrain && !visited[r][c]) {
          const [size, crowns] = dfs(r, c, tile.terrain);
          total += size * crowns;
        }
      }
    }
    total += qualifiesMiddleKingdom() ? 10 : 0;
    total += qualifiesHarmony() ? 5 : 0;

    return total;
  }

function boundingBox(): { minRow: number; maxRow: number; minCol: number; maxCol: number } {
  let minRow = gridSize, maxRow = -1, minCol = gridSize, maxCol = -1;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (board[r][c].terrain !== null || (r === castle.row && c === castle.col)) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }
  return { minRow, maxRow, minCol, maxCol };
}

function isWithinViewport(): boolean {
  const { minRow, maxRow, minCol, maxCol } = boundingBox();
  return (maxRow - minRow + 1 <= viewportSize) &&
         (maxCol - minCol + 1 <= viewportSize);
}
type ViewportTile = {
  tile: Tile;
  row: number;
  col: number;
};

$: visibleTiles = Array.from({ length: viewportSize }, (_, dr) =>
  Array.from({ length: viewportSize }, (_, dc) => {
    const row = viewportOrigin.row + dr;
    const col = viewportOrigin.col + dc;
    return {
      tile: board[row][col],
      row,
      col
    };
  })
);

let totalScore = 0;

function tryToggleViewportSize() {
  if (viewportSize === 5) {
    // Try growing to 7×7
    viewportSize = 7;
    if (viewportOrigin.row > 0) {
      viewportOrigin.row -= 1;
    }
    if(viewportOrigin.col > 0) {
      viewportOrigin.col -= 1;
    } 
  } else {
    // Try shrinking to 5×5
    const box = boundingBox();

    if (
      box.maxRow - box.minRow >= 5 ||
      box.maxCol - box.minCol >= 5
    ) {
      return;
    }

    const newRow = box.maxRow < viewportOrigin.row + 6 ? viewportOrigin.row + 1  : viewportOrigin.row;
    const newCol = box.maxCol < viewportOrigin.col + 6 ? viewportOrigin.col + 1 : viewportOrigin.col;
      // Check if the new origin would be valid
      const newOrigin = {
        row: newRow,
        col: newCol
      };

      viewportOrigin = newOrigin;

      viewportSize = 5;
  }
}

</script>

<style>
  .board {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 2px;
    width: 100%;
    max-width: 500px;
    margin: auto;
  }

.tile {
  aspect-ratio: 1;
  width: 100%;
  font-weight: bold;
  user-select: none;
  touch-action: manipulation;
  border: 1px solid #ccc;
  font-size: 1.2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
}

.grass { background-color: rgb(119 216 78); }
.water { background-color: rgb(78 147 213); }
.forest { background-color: rgb(118,126,75); color: white; }
.desert { background-color: rgb(255 183 73); }
.swamp { background-color: rgb(214 163 146); }
.mine { background-color: rgb(69,54,59); color: white; }

.castle {
  border: 3px solid black;
}
</style>

<h1 style="text-align: center;">Kingdomino Scorer</h1>
<div class="board" style="grid-template-columns: repeat({viewportSize}, 1fr)">
  {#each visibleTiles as vt}
    {#each vt as { tile, row, col }}
      <button
        class="tile"
        class:grass={tile.terrain === 'grass'}
        class:water={tile.terrain === 'water'}
        class:forest={tile.terrain === 'forest'}
        class:desert={tile.terrain === 'desert'}
        class:swamp={tile.terrain === 'swamp'}
        class:mine={tile.terrain === 'mine'}
        class:castle={isCastle(row, col)}
        on:click={(e) => handleTap(tile, row, col)}
        on:pointerdown={(e) => beginDrag(tile, row, col)}
        on:pointerenter={() => applyDrag(tile, row, col)}
        on:pointerup={() => endDrag(row, col)}
      >
        {tile.crowns > 0 ? tile.crowns : ''}
      </button>
    {/each}
  {/each}
</div>
<p style="text-align: center; font-size: 1.2rem;">
  Total Score: <strong>{totalScore}</strong>
  <button on:click={() => tryToggleViewportSize()} style="margin-left: 20px;">
    Board Size: {viewportSize}×{viewportSize}
  </button>
</p>

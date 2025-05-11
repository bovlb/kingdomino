<script lang="ts">
  const terrainTypes = ['grass', 'water', 'forest', 'desert', 'swamp', 'mine'] as const;
  type Terrain = typeof terrainTypes[number];

  interface Tile {
    terrain: Terrain | null;
    crowns: number;
  }

  const boardSize = 5;
  let board: Tile[][] = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => ({ terrain: null, crowns: 0 }))
  );

  let castle = { row: 2, col: 2 };

  let isDragging = false;
  let dragTerrain: Terrain | null = null;

  function beginDrag(tile: Tile, row: number, col: number) {
    if (isCastle(row, col)) {
      startCastleDrag(row, col);
    } else if (tile.terrain) {
      isDragging = true;
      dragTerrain = tile.terrain;
    }
  }

  function applyDrag(tile: Tile, row: number, col: number) {
    if (isCastle(row, col)) return;
    if (isDragging && dragTerrain !== null) {
      tile.terrain = dragTerrain;
      board = [...board]; // force reactivity
    }
  }

  function endDrag() {
    isDragging = false;
    dragTerrain = null;
  }

  function cycleTerrain(tile: Tile) {
    const index = terrainTypes.indexOf(tile.terrain as Terrain);
    tile.terrain = terrainTypes[(index + 1) % terrainTypes.length];
    board = board; // Trigger reactivity
  }

  function cycleCrowns(tile: Tile) {
    tile.crowns = (tile.crowns + 1) % 4; // 0-3 crowns
    board = board; // Trigger reactivity
  }

  let tapTimeout: ReturnType<typeof setTimeout> | null = null;

  function handleTap(tile: Tile, row: number, col: number) {
    if (isCastle(row, col)) return;
    if (tapTimeout) {
      clearTimeout(tapTimeout);
      tapTimeout = null;
      cycleCrowns(tile, row, col); // Double tap
    } else {
      tapTimeout = setTimeout(() => {
        cycleTerrain(tile, row, col); // Single tap
        tapTimeout = null;
      }, 250);
    }
  }

  function isCastle(row: number, col: number) {
    return row === castle.row && col === castle.col;
  }

  function score(): number {
    const visited = Array.from({ length: boardSize }, () =>
      Array(boardSize).fill(false)
    );
    let total = 0;

    function dfs(r: number, c: number, terrain: Terrain): [number, number] {
      if (
        r < 0 || r >= boardSize || c < 0 || c >= boardSize ||
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

    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        const tile = board[r][c];
        if (tile.terrain && !visited[r][c]) {
          const [size, crowns] = dfs(r, c, tile.terrain);
          total += size * crowns;
        }
      }
    }

    return total;
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

.grass { background-color: lightgreen; }
.water { background-color: lightblue; }
.forest { background-color: darkgreen; color: white; }
.desert { background-color: khaki; }
.swamp { background-color: mediumseagreen; }
.mine { background-color: gray; color: white; }

.castle {
  border: 3px solid black;
}
</style>

<h1 style="text-align: center;">Kingdomino Scorer</h1>
<div class="board">
  {#each board as row, r}
    {#each row as tile, c}
      <button
        class="tile"
        class:grass={tile.terrain === 'grass'}
        class:water={tile.terrain === 'water'}
        class:forest={tile.terrain === 'forest'}
        class:desert={tile.terrain === 'desert'}
        class:swamp={tile.terrain === 'swamp'}
        class:mine={tile.terrain === 'mine'}
        class:castle={isCastle(r, c)}
        on:pointerdown={(e) => beginDrag(tile)}
        on:pointerenter={() => applyDrag(tile, r, c)}
        on:pointerup={() => endDrag()}
        on:click={(e) => handleTap(tile, e)}
      >
        {tile.crowns > 0 ? tile.crowns : ''}
      </button>
    {/each}
  {/each}
</div>

<p style="text-align: center; font-size: 1.2rem;">
  Total Score: <strong>{score()}</strong>
</p>

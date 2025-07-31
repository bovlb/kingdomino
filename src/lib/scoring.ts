// lib/scoring.ts

const terrainTypes = [
    "grass",
    "water",
    "forest",
    "wheat",
    "swamp",
    "mine",
  ] as const;
  type Terrain = (typeof terrainTypes)[number] | "empty";

export interface Tile {
  terrain: Terrain | null;
  crowns: number;
}

export interface Position {
  row: number;
  col: number;
}

export function score(board: Tile[][], castle: Position, viewportOrigin: Position, viewportSize: number): {
    terrain: number;
    middleKingdom: boolean;
    harmony: boolean;
    total: number;} {
    const terrainScoreValue = terrainScore(board);
    const middleKingdomQualifies = qualifiesMiddleKingdom(board, castle, viewportSize);
    const harmonyQualifies = qualifiesHarmony(board, castle, viewportOrigin, viewportSize);
    
    const total = terrainScoreValue + (middleKingdomQualifies ? 10 : 0) + (harmonyQualifies ? 5 : 0);
    return {
        terrain: terrainScoreValue,
        middleKingdom: middleKingdomQualifies,
        harmony: harmonyQualifies,
        total: total
    }
}

export function terrainScore(board: Tile[][]): number {
  const visited: boolean[][] = board.map(row => row.map(() => false));
  let total = 0;

  function dfs(r: number, c: number, terrain: Terrain): [number, number] {
    if (
      r < 0 ||
      r >= board.length ||
      c < 0 ||
      c >= board[0].length ||
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

  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const tile = board[r][c];
      if (tile.terrain && !visited[r][c]) {
        const [size, crowns] = dfs(r, c, tile.terrain);
        total += size * crowns;
      }
    }
  }

  return total;
}

export function qualifiesMiddleKingdom(board: Tile[][], castle: Position, viewportSize: number): boolean {
  const { minRow, maxRow, minCol, maxCol } = boundingBox(board, castle);
  const centerRow = Math.floor((minRow + maxRow) / 2);
  const centerCol = Math.floor((minCol + maxCol) / 2);
  const castleInCentre = castle.row === centerRow && castle.col === centerCol;
  const boxFits = maxRow - minRow + 1 === viewportSize && maxCol - minCol + 1 === viewportSize;
  return castleInCentre && boxFits;
}

export function qualifiesHarmony(
  board: Tile[][],
  castle: Position,
  viewportOrigin: Position,
  viewportSize: number
): boolean {
  const { minRow, maxRow, minCol, maxCol } = boundingBox(board, castle);
  const boxFits = maxRow - minRow + 1 === viewportSize && maxCol - minCol + 1 === viewportSize;

  for (let r = viewportOrigin.row; r < viewportOrigin.row + viewportSize; r++) {
    for (let c = viewportOrigin.col; c < viewportOrigin.col + viewportSize; c++) {
      if ((r !== castle.row || c !== castle.col) && board[r][c].terrain === null) {
        return false;
      }
    }
  }

  return boxFits;
}

export function boundingBox(board: Tile[][], castle: Position): {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
} {
  let minRow = board.length,
      maxRow = -1,
      minCol = board[0].length,
      maxCol = -1;

  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
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

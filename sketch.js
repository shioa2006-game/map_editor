const TILE_SIZE = 48;
const SPRITE_SHEET_COLS = 8;
const DEFAULT_MAP_TEXT = `[
 "~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~",
 "~ . . . . . . . t t . . . # # . . . t t . . . ~",
 "~ . . . . . s . . . . . . . . . . . . . . . . ~",
 "~ . . ~ ~ ~ ~ ~ . . . . . t t . . . . . h . . ~",
 "~ . . ~ s s s ~ . # # . . . . . . . . . . . . ~",
 "~ . . ~ s u s ~ . # # . . t t . . s . . . . . ~",
 "~ . . ~ s . s ~ . . . . . . . . . . . . . . . ~",
 "~ . . ~ . . . ~ . . . t t . . . . . . . . . . ~",
 "~ . . ~ . . . ~ . . . . . . . . . . v . . . . ~",
 "~ . . ~ . . . ~ . . # # . . . . . . . . . . . ~",
 "~ . . ~ . . . ~ . . # # . . . . . . . . . . . ~",
 "~ . . ~ . . . ~ . . . . . . . . . . . . . . . ~",
 "~ . . . . . . . . . . . . . . . . . . . . . . ~",
 "~ . . t t . . . . . . . . . # # # # . . . . . ~",
 "~ . . . . . . . . . . . . . . . . . . . . . . ~",
 "~ . . s . . . . . . . . . . . . . . . . . . . ~",
 "~ . . . . . . . . . . . . . . . . . . . . . . ~",
 "~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~",
];`;

// タイル記号とスプライトの対応表
const tileCatalog = [
  { symbol: ".", name: "GRASS", index: 0, description: "草地" },
  { symbol: "r", name: "ROAD", index: 1, description: "道" },
  { symbol: "~", name: "WATER", index: 2, description: "水（通行不可）" },
  { symbol: "c", name: "FLOOR_CAVE", index: 3, description: "洞窟の床" },
  { symbol: "f", name: "FLOOR_BUILD", index: 4, description: "建物の床" },
  { symbol: "#", name: "MOUNTAIN", index: 5, description: "山（通行不可）" },
  { symbol: "s", name: "ROCK", index: 6, description: "岩（通行不可）" },
  { symbol: "t", name: "TREE", index: 7, description: "木" },
  { symbol: "w", name: "WALL", index: 8, description: "壁（通行不可）" },
  { symbol: "d", name: "DOOR", index: 9, description: "扉（ワープ）" },
  { symbol: "v", name: "ENTRANCE_VIL", index: 10, description: "村の入口" },
  { symbol: "h", name: "ENTRANCE_CAVE", index: 11, description: "洞窟の入口" },
  { symbol: "x", name: "STAIRS_UP", index: 12, description: "上り階段" },
  { symbol: "y", name: "STAIRS_DOWN", index: 13, description: "下り階段" },
  { symbol: "u", name: "RUINS", index: 14, description: "遺跡" },
];

// 記号からタイル情報を引けるようにした索引
const tileMap = Object.fromEntries(tileCatalog.map((tile) => [tile.symbol, tile]));

// 現在のマップ情報
let mapGrid = parseMapText(DEFAULT_MAP_TEXT);
let mapRows = mapGrid.length;
let mapCols = mapGrid[0]?.length || 0;

let tileSheet;
let selectedSymbol = tileCatalog[0].symbol;
let canvasInstance;

let paletteEl;
let selectedTileEl;
let mapInputEl;
let mapOutputEl;
let mapSizeLabelEl;

function preload() {
  tileSheet = loadImage("assets/tiles.png");
}

function setup() {
  canvasInstance = createCanvas(mapCols * TILE_SIZE, mapRows * TILE_SIZE);
  canvasInstance.parent("canvas-wrapper");
  noLoop();
  draw();
  setupDom();
  updateMapOutput();
}

function draw() {
  background(0);
  if (!tileSheet || !mapGrid.length) {
    return;
  }
  for (let y = 0; y < mapRows; y += 1) {
    for (let x = 0; x < mapCols; x += 1) {
      const symbol = mapGrid[y][x];
      const tile = tileMap[symbol] ?? tileMap["."];
      const sx = (tile.index % SPRITE_SHEET_COLS) * TILE_SIZE;
      const sy = Math.floor(tile.index / SPRITE_SHEET_COLS) * TILE_SIZE;
      image(tileSheet, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, sx, sy, TILE_SIZE, TILE_SIZE);
    }
  }
}

function mousePressed() {
  paintAtMouse();
}

function mouseDragged() {
  paintAtMouse();
}

// キャンバス上のマウス位置にタイルを配置
function paintAtMouse() {
  if (!mapGrid.length) return;
  const gridX = Math.floor(mouseX / TILE_SIZE);
  const gridY = Math.floor(mouseY / TILE_SIZE);
  if (gridX < 0 || gridX >= mapCols || gridY < 0 || gridY >= mapRows) return;
  if (mapGrid[gridY][gridX] === selectedSymbol) return;
  mapGrid[gridY][gridX] = selectedSymbol;
  redraw();
  updateMapOutput();
}

function setupDom() {
  paletteEl = document.getElementById("tile-palette");
  selectedTileEl = document.getElementById("selected-tile");
  mapInputEl = document.getElementById("map-input");
  mapOutputEl = document.getElementById("map-output");
  mapSizeLabelEl = document.getElementById("map-size-label");

  createPalette();
  selectTile(selectedSymbol);
  mapInputEl.value = DEFAULT_MAP_TEXT;
  mapSizeLabelEl.textContent = `${mapCols} x ${mapRows}`;

  document.getElementById("load-map").addEventListener("click", () => {
    try {
      const grid = parseMapText(mapInputEl.value);
      applyNewMap(grid);
    } catch (error) {
      alert(`マップ読込エラー: ${error.message}`);
    }
  });

  document.getElementById("reset-map").addEventListener("click", () => {
    mapInputEl.value = DEFAULT_MAP_TEXT;
    const grid = parseMapText(DEFAULT_MAP_TEXT);
    applyNewMap(grid);
  });

  document.getElementById("copy-output").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(mapOutputEl.value);
      alert("MAP配列をコピーしました。");
    } catch {
      alert("クリップボードへのコピーに失敗しました。");
    }
  });
}

function createPalette() {
  paletteEl.innerHTML = "";
  tileCatalog.forEach((tile) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile-button";
    btn.dataset.symbol = tile.symbol;
    btn.title = `${tile.name} (${tile.description})`;
    const sheetX = tile.index % SPRITE_SHEET_COLS;
    const sheetY = Math.floor(tile.index / SPRITE_SHEET_COLS);
    const posX = -sheetX * TILE_SIZE;
    const posY = -sheetY * TILE_SIZE;
    btn.style.backgroundPosition = `${posX}px ${posY}px`;
    btn.addEventListener("click", () => selectTile(tile.symbol));
    paletteEl.appendChild(btn);
  });
}

function selectTile(symbol) {
  selectedSymbol = symbol;
  const buttons = paletteEl.querySelectorAll(".tile-button");
  buttons.forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.symbol === symbol);
  });
  const tile = tileMap[symbol];
  selectedTileEl.textContent = `選択中: ${tile.name} (${symbol})`;
}

function applyNewMap(grid) {
  mapGrid = grid;
  mapRows = grid.length;
  mapCols = grid[0]?.length || 0;
  resizeCanvas(mapCols * TILE_SIZE, mapRows * TILE_SIZE);
  mapSizeLabelEl.textContent = `${mapCols} x ${mapRows}`;
  redraw();
  updateMapOutput();
}

function updateMapOutput() {
  mapOutputEl.value = stringifyMap(mapGrid);
}

// テキストエリアの内容を2次元配列に変換
function parseMapText(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line.length) continue;
    if (line === "[" || line === "]" || line === "];" || line === "],") continue;
    if (line.endsWith(",")) {
      line = line.slice(0, -1).trim();
    }
    if (line.endsWith(";")) {
      line = line.slice(0, -1).trim();
    }
    if (line.startsWith('"') && line.endsWith('"')) {
      line = line.slice(1, -1);
    }
    if (!line.length) continue;
    const cells = line.split(/\s+/);
    rows.push(cells);
  }
  if (!rows.length) {
    throw new Error("行が検出できませんでした。");
  }
  const width = rows[0].length;
  if (!rows.every((row) => row.length === width)) {
    throw new Error("各行のチップ数が一致していません。");
  }
  rows.forEach((row, rowIndex) => {
    row.forEach((symbol, colIndex) => {
      if (!tileMap[symbol]) {
        throw new Error(`${rowIndex + 1}行${colIndex + 1}列に未知のタイル「${symbol}」があります。`);
      }
    });
  });
  return rows;
}

// 2次元配列を書式付き文字列に戻す
function stringifyMap(grid) {
  const lines = grid.map((row) => `  "${row.join(" ")}"`);
  return `[\n${lines.join(",\n")}\n];`;
}

// ======================================================
// CHESS GAME + AI
// ======================================================

// ======================================================
// DOM
// ======================================================

const board = document.getElementById("chessboard");
const turnDisplay = document.getElementById("turn");
const materialScoreDisplay = document.getElementById("material-score");
const moveHistoryPanel = document.getElementById("training-move-history");

// ======================================================
// LANGUAGE / GLOBAL SETTINGS
// ======================================================

const TRANSLATIONS = {
  "zh-TW": {
    settings: "設定",
    language: "語言",
    settingsNote: "未來新增的功能設定將會顯示在這裡。",
    chooseMode: "選擇遊戲模式",
    normalMode: "一般模式",
    onlineMode: "線上模式",
    trainingMode: "訓練模式",
    gameStatus: "遊戲狀態",
    playAs: "選擇執棋方",
    white: "白方",
    black: "黑方",
    aiDifficulty: "AI 難度",
    beginner: "新手",
    easy: "簡單",
    normal: "普通",
    hard: "困難",
    gameRecord: "棋譜",
    game: "棋局",
    restart: "重新開始",
    reset: "重設",
    flipBoard: "翻轉棋盤",
    changeMode: "切換模式",
    mainMenu: "主選單",
    back: "返回",
    createRoom: "建立房間",
    joinRoom: "加入房間",
    leaveRoom: "離開房間",
    room: "房間",
    color: "顏色",
    board: "棋盤",
    navigation: "導覽",
    pieces: "棋子",
    tools: "工具",
    erase: "移除",
    clear: "清空",
    restore: "還原",
    whoStarts: "誰先開始？",
    playMode: "對戰模式",
    humanVsAi: "玩家對 AI",
    humanVsHuman: "玩家對玩家",
    startTraining: "開始訓練",
    aiThinking: "AI 思考中…",
    playerTurn: "玩家回合",
    yourTurn: "輪到你了",
    aiTurn: "AI 回合",
    material: "子力",
    moveNumber: "#",
    checkmate: "將死",
    wins: "獲勝",
    drawStalemate: "和棋 — 無子可走",
    drawInsufficient: "和棋 — 子力不足",
    drawFivefold: "和棋 — 五次重複局面",
    draw75Move: "和棋 — 75 步規則",
    drawThreefold: "和棋 — 三次重複局面",
    draw50Move: "和棋 — 50 步規則",
    promotionTitle: "選擇升變棋子",
    promotionInstructions: "請選擇棋子後按確認。",
    cancel: "取消",
    confirmPromotion: "確認升變",
    boardColor: "棋盤顏色",
    boardClassic: "經典木色",
    boardOcean: "深海藍",
    boardForest: "森林綠",
    sidebarPlay: "對局",
    sidebarActions: "操作",
  },
};

let currentLanguage = localStorage.getItem("chess-language") || "en";
let currentBoardTheme = localStorage.getItem("chess-board-theme") || "classic";

function t(key, fallback = key) {
  return TRANSLATIONS[currentLanguage]?.[key] || fallback;
}

function openSettings() {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.classList.remove("hidden");
}

function closeSettings() {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.classList.add("hidden");
}

function setLanguage(language) {
  currentLanguage = TRANSLATIONS[language] ? language : "en";
  localStorage.setItem("chess-language", currentLanguage);
  applyLanguage();
}

function setBoardTheme(theme) {
  if (!["classic", "ocean", "forest"].includes(theme)) return;
  currentBoardTheme = theme;
  localStorage.setItem("chess-board-theme", currentBoardTheme);
  applyBoardTheme();
}

function applyBoardTheme() {
  document.documentElement.dataset.boardTheme = currentBoardTheme;
  document.querySelectorAll(".board-theme-option").forEach((button) => {
    const isActive = button.dataset.boardTheme === currentBoardTheme;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });
}

function setNormalSidebarTab(tab) {
  const playContent = document.getElementById("normal-play-content");
  const actionsContent = document.getElementById("normal-actions-content");
  if (!playContent || !actionsContent) return;

  const showPlay = tab === "play";
  playContent.classList.toggle("hidden", !showPlay);
  actionsContent.classList.toggle("hidden", showPlay);

  document.querySelectorAll(".normal-sidebar-tab").forEach((button) => {
    const isActive = button.dataset.sidebarTab === tab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (!element.dataset.defaultText) element.dataset.defaultText = element.textContent.trim();
    element.textContent = t(key, element.dataset.defaultText);
  });

  const languageSelect = document.getElementById("language-select");
  if (languageSelect) languageSelect.value = currentLanguage;

  updateTurnDisplay();
  updateMaterialScoreDisplay();
  updateMoveHistoryDisplay();
}

// ======================================================
// AI SETTINGS
// ======================================================

let AI_ENABLED = true;

let playerColor = "white";
let AI_COLOR = "black";

let AI_DIFFICULTY = "normal";

const AI_DEPTHS = {
  beginner: 0,
  easy: 1,
  normal: 3,
  hard: 4,
};

function getAIDepth() {
  return AI_DEPTHS[AI_DIFFICULTY];
}

function setAIDifficulty(difficulty) {
  if (!(difficulty in AI_DEPTHS)) return;

  AI_DIFFICULTY = difficulty;
  updateAIDifficultyUI();
}

function updateAIDifficultyUI() {
  document.querySelectorAll("#difficulty-controls button").forEach((button) => {
    const isActive = button.dataset.difficulty === AI_DIFFICULTY;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

// ======================================================
// TRAINING MODE
// ======================================================

let trainingMode = false;
let trainingSetup = false;

let selectedSetupPiece = null;

let trainingPlayMode = "ai";
let trainingAIColor = "black";
let trainingSetupPosition = null;
let trainingStartPosition = null;
let trainingStartTurn = "white";

let trainingStartPlayerColor = "white";
let trainingStartPlayMode = "ai";
let trainingStartAIColor = "black";
// ======================================================
// TRAINING MODE UI
// ======================================================

function openTrainingMode() {
  const normalPanel = document.getElementById("normal-panel");
  const trainingPanel = document.getElementById("training-panel");

  if (!normalPanel || !trainingPanel) return;

  if (aiTurnTimer !== null) {
    clearTimeout(aiTurnTimer);
    aiTurnTimer = null;
  }

  trainingSetupPosition = copyBoard();

  trainingMode = true;
  trainingSetup = true;

  selectedSetupPiece = null;
  selectedSquare = null;
  aiThinking = false;

  normalPanel.classList.add("hidden");
  trainingPanel.classList.remove("hidden");

  updateTrainingModeUI();
  createBoard();
}

function closeTrainingMode() {
  const normalPanel = document.getElementById("normal-panel");
  const trainingPanel = document.getElementById("training-panel");

  if (!normalPanel || !trainingPanel) return;

  if (aiTurnTimer !== null) {
    clearTimeout(aiTurnTimer);
    aiTurnTimer = null;
  }

  trainingPanel.classList.add("hidden");
  normalPanel.classList.remove("hidden");

  trainingMode = false;
  trainingSetup = false;

  selectedSetupPiece = null;
  selectedSquare = null;

  aiThinking = false;
  isAnimating = false;
  AI_ENABLED = true;
  AI_COLOR = oppositeColor(playerColor);

  createBoard();
  updateTurnDisplay();
}

// ======================================================
// TRAINING MODE：開始訓練
// ======================================================
// ======================================================
// TRAINING MODE：切換遊戲模式 UI
// ======================================================

function updateTrainingModeUI() {
  const playerSection = document.getElementById("training-player-section");

  const selectedMode = document.querySelector(
    'input[name="training-play-mode"]:checked',
  );

  if (!playerSection || !selectedMode) return;

  if (selectedMode.value === "human") {
    // HUMAN VS HUMAN 不需要選擇玩家陣營
    playerSection.classList.add("hidden");
  } else {
    // HUMAN VS AI 顯示 YOU PLAY AS
    playerSection.classList.remove("hidden");
  }
}
function startTrainingGame() {
  if (!trainingMode || !trainingSetup) return;

  if (!isValidTrainingPosition()) {
    alert("訓練棋局必須各有一個白王和一個黑王。");
    return;
  }

  const startPlayer = document.querySelector(
    'input[name="training-start"]:checked',
  );

  const playMode = document.querySelector(
    'input[name="training-play-mode"]:checked',
  );

  const playerSide = document.querySelector(
    'input[name="training-player"]:checked',
  );

  currentTurn = startPlayer ? startPlayer.value : "white";
  trainingPlayMode = playMode ? playMode.value : "ai";

  if (trainingPlayMode === "ai") {
    AI_ENABLED = true;

    playerColor = playerSide ? playerSide.value : "white";
    trainingAIColor = oppositeColor(playerColor);
    AI_COLOR = trainingAIColor;
  } else {
    AI_ENABLED = false;
    trainingAIColor = null;
  }

  trainingStartPosition = copyBoard();
  trainingStartTurn = currentTurn;
  trainingStartPlayerColor = playerColor;
  trainingStartPlayMode = trainingPlayMode;
  trainingStartAIColor = AI_COLOR;

  trainingSetup = false;

  selectedSetupPiece = null;
  selectedSquare = null;

  lastMove = null;
  gameOver = false;
  aiThinking = false;
  isAnimating = false;

  moveHistory = [];
  positionHistory = new Map();
  halfmoveClock = 0;
  pendingPromotionNotation = null;

  // 自由擺盤無法判斷棋王與城堡過去是否移動過，
  // 因此訓練模式開始後禁止王車易位。
  whiteKingMoved = true;
  whiteKingsideRookMoved = true;
  whiteQueensideRookMoved = true;

  blackKingMoved = true;
  blackKingsideRookMoved = true;
  blackQueensideRookMoved = true;

  initializePositionHistory();

  updateTrainingModeUI();
  updatePlayerColorUI();
  createBoard();

  if (AI_ENABLED && currentTurn === AI_COLOR) {
    startAITurn();
  } else {
    updateTurnDisplay();
  }
}

// ======================================================
// AI HUMAN-LIKE THINKING TIME
// ======================================================

const AI_MIN_THINK_TIME = 1000;
const AI_MAX_THINK_TIME = 2500;

let aiTurnTimer = null;

// ======================================================
// ANIMATION SETTINGS
// ======================================================

const MOVE_ANIMATION_TIME = 350;

// ======================================================
// BOARD FLIP
// ======================================================

let boardFlipped = false;

// ======================================================
// GAME STATE
// ======================================================

let currentTurn = "white";

let lastMove = null;

let selectedSquare = null;

let gameOver = false;

let aiThinking = false;

let isAnimating = false;

// ======================================================
// MOVE HISTORY
// ======================================================

let moveHistory = [];

let pendingPromotionNotation = null;
let pendingPromotionSelection = null;

// ======================================================
// MATERIAL SCORE
// ======================================================

const MATERIAL_VALUES = {
  "♙": 1,
  "♘": 3,
  "♗": 3,
  "♖": 5,
  "♕": 9,
  "♔": 0,

  "♟": 1,
  "♞": 3,
  "♝": 3,
  "♜": 5,
  "♛": 9,
  "♚": 0,
};

// ======================================================
// DRAW STATE
// ======================================================

let halfmoveClock = 0;

let positionHistory = new Map();

// ======================================================
// CASTLING STATE
// ======================================================

let whiteKingMoved = false;
let whiteKingsideRookMoved = false;
let whiteQueensideRookMoved = false;

let blackKingMoved = false;
let blackKingsideRookMoved = false;
let blackQueensideRookMoved = false;

// ======================================================
// BOARD
// ======================================================

function createInitialPosition() {
  return [
    ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"],
    ["♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"],
    ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
  ];
}

let pieces = createInitialPosition();
// ======================================================
// BOARD COORDINATES
// ======================================================

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function getSquareName(row, col) {
  return FILES[col] + (8 - row);
}

// ======================================================
// VISUAL POSITION
// ======================================================

function getVisualPosition(row, col) {
  if (boardFlipped) {
    return {
      row: 7 - row,
      col: 7 - col,
    };
  }

  return {
    row,
    col,
  };
}

// ======================================================
// FLIP BOARD
// ======================================================

function flipBoard() {
  if (isAnimating || aiThinking) {
    return;
  }

  boardFlipped = !boardFlipped;

  selectedSquare = null;

  createBoard();
}

// ======================================================
// SET PLAYER COLOR
// ======================================================

function setPlayerColor(color) {
  if (color !== "white" && color !== "black") {
    return;
  }

  playerColor = color;

  AI_COLOR = oppositeColor(playerColor);

  boardFlipped = playerColor === "black";

  updatePlayerColorUI();

  resetGame();
}

// ======================================================
// UPDATE PLAYER COLOR UI
// ======================================================

function updatePlayerColorUI() {
  const buttons = document.querySelectorAll("#controls button");

  buttons.forEach((button) => {
    const buttonColor = button.dataset.color;

    button.classList.toggle("active", buttonColor === playerColor);
  });
}

// ======================================================
// PIECE COLOR
// ======================================================

function getPieceColor(piece) {
  if (!piece) {
    return null;
  }

  if ("♙♘♗♖♕♔".includes(piece)) {
    return "white";
  }

  if ("♟♞♝♜♛♚".includes(piece)) {
    return "black";
  }

  return null;
}

// ======================================================
// MATERIAL SCORE
// ======================================================

function calculateMaterialScore() {
  let whiteMaterial = 0;
  let blackMaterial = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = pieces[row][col];

      if (piece === "") {
        continue;
      }

      const value = MATERIAL_VALUES[piece] || 0;

      if (getPieceColor(piece) === "white") {
        whiteMaterial += value;
      } else if (getPieceColor(piece) === "black") {
        blackMaterial += value;
      }
    }
  }

  if (playerColor === "white") {
    return whiteMaterial - blackMaterial;
  }

  return blackMaterial - whiteMaterial;
}

// ======================================================
// UPDATE MATERIAL SCORE
// ======================================================

function updateMaterialScoreDisplay() {
  if (!materialScoreDisplay) {
    return;
  }

  const score = calculateMaterialScore();

  if (score > 0) {
    materialScoreDisplay.textContent = `${t("material", "MATERIAL")}  +${score}`;
  } else {
    materialScoreDisplay.textContent = `${t("material", "MATERIAL")}  ${score}`;
  }
}

// ======================================================
// CREATE MOVE HISTORY PANEL
// ======================================================

function getMoveHistoryPanels() {
  return [...document.querySelectorAll(".move-history")];
}

// ======================================================
// UPDATE MOVE HISTORY
// ======================================================

function updateMoveHistoryDisplay() {
  getMoveHistoryPanels().forEach((container) => {
    container.innerHTML = "";

    const table = document.createElement("div");
    table.className = "move-history-table";
    table.innerHTML = `<div class="move-history-header"><div>${t("moveNumber", "#")}</div><div>${t("white", "WHITE")}</div><div>${t("black", "BLACK")}</div></div>`;

    moveHistory.forEach((move, index) => {
      const row = document.createElement("div");
      row.className = "move-history-row";
      const isLatest = index === moveHistory.length - 1;
      const whiteClass = isLatest && move.white && !move.black ? " latest-move" : "";
      const blackClass = isLatest && move.black ? " latest-move" : "";
      row.innerHTML = `<div>${move.number}.</div><div class="${whiteClass.trim()}">${move.white || ""}</div><div class="${blackClass.trim()}">${move.black || ""}</div>`;
      table.appendChild(row);
    });

    container.appendChild(table);
    container.scrollTop = container.scrollHeight;
  });
}

// ======================================================
// ADD MOVE TO HISTORY
// ======================================================

function addMoveToHistory(color, notation) {
  if (!notation) {
    return;
  }

  if (color === "white") {
    moveHistory.push({
      number: moveHistory.length + 1,
      white: notation,
      black: "",
    });

    updateMoveHistoryDisplay();

    return;
  }

  if (moveHistory.length === 0) {
    moveHistory.push({
      number: 1,
      white: "",
      black: notation,
    });
  } else {
    const latest = moveHistory[moveHistory.length - 1];

    latest.black = notation;
  }

  updateMoveHistoryDisplay();
}

// ======================================================
// PIECE TO SAN
// ======================================================

function getSANPieceLetter(piece) {
  switch (piece) {
    case "♘":
    case "♞":
      return "N";

    case "♗":
    case "♝":
      return "B";

    case "♖":
    case "♜":
      return "R";

    case "♕":
    case "♛":
      return "Q";

    case "♔":
    case "♚":
      return "K";

    default:
      return "";
  }
}

// ======================================================
// CHECK CAPTURE
// ======================================================

function isMoveCapture(fromRow, fromCol, toRow, toCol, moveData) {
  if (moveData && moveData.enPassant) {
    return true;
  }

  return pieces[toRow][toCol] !== "";
}

// ======================================================
// CREATE SAN
// ======================================================

function createSANMoveNotation(fromRow, fromCol, toRow, toCol, moveData) {
  const piece = pieces[fromRow][fromCol];

  const color = getPieceColor(piece);

  if (moveData && moveData.castle) {
    if (toCol === 6) {
      return "O-O";
    }

    if (toCol === 2) {
      return "O-O-O";
    }
  }

  const pieceLetter = getSANPieceLetter(piece);

  const isPawn = piece === "♙" || piece === "♟";

  const isCapture = isMoveCapture(fromRow, fromCol, toRow, toCol, moveData);

  let notation = "";

  if (!isPawn) {
    notation += pieceLetter;
  }

  if (!isPawn) {
    const alternatives = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (row === fromRow && col === fromCol) {
          continue;
        }

        const otherPiece = pieces[row][col];

        if (otherPiece !== piece) {
          continue;
        }

        if (getPieceColor(otherPiece) !== color) {
          continue;
        }

        const otherMoves = getLegalMoves(row, col);

        const canAlsoMove = otherMoves.some(
          (move) => move.row === toRow && move.col === toCol,
        );

        if (canAlsoMove) {
          alternatives.push({
            row,
            col,
          });
        }
      }
    }

    if (alternatives.length > 0) {
      const sameFile = alternatives.some((square) => square.col === fromCol);

      const sameRank = alternatives.some((square) => square.row === fromRow);

      if (!sameFile) {
        notation += FILES[fromCol];
      } else if (!sameRank) {
        notation += String(8 - fromRow);
      } else {
        notation += FILES[fromCol] + String(8 - fromRow);
      }
    }
  }

  if (isPawn && isCapture) {
    notation += FILES[fromCol];
  }

  if (isCapture) {
    notation += "x";
  }

  notation += getSquareName(toRow, toCol);

  const promotion =
    (piece === "♙" && toRow === 0) || (piece === "♟" && toRow === 7);

  if (promotion) {
    notation += "=Q";
  }

  return notation;
}

// ======================================================
// UPDATE PROMOTION NOTATION
// ======================================================

function updateLastPromotionNotation(promotedPiece) {
  if (!pendingPromotionNotation) {
    return;
  }

  let promotionLetter = "Q";

  if (promotedPiece === "♖" || promotedPiece === "♜") {
    promotionLetter = "R";
  }

  if (promotedPiece === "♗" || promotedPiece === "♝") {
    promotionLetter = "B";
  }

  if (promotedPiece === "♘" || promotedPiece === "♞") {
    promotionLetter = "N";
  }

  const base = pendingPromotionNotation.replace(/=Q$/, "");

  pendingPromotionNotation = base + "=" + promotionLetter;
}

// ======================================================
// CHECK / CHECKMATE SYMBOL
// ======================================================

function addCheckOrMateSuffix(notation, colorWhoMoved) {
  const opponent = oppositeColor(colorWhoMoved);

  const opponentInCheck = isKingInCheck(opponent);

  if (!opponentInCheck) {
    return notation;
  }

  const opponentHasMove = hasAnyLegalMove(opponent);

  if (!opponentHasMove) {
    return notation + "#";
  }

  return notation + "+";
}

// ======================================================
// FINALIZE MOVE NOTATION
// ======================================================

function finalizeMoveNotation(notation, colorWhoMoved) {
  const finalNotation = addCheckOrMateSuffix(notation, colorWhoMoved);

  addMoveToHistory(colorWhoMoved, finalNotation);
}

// ======================================================
// CREATE BOARD
// ======================================================

const PIECE_IMAGE_FILES = {
  "♔": "white-king.png", "♕": "white-queen.png", "♖": "white-rook.png",
  "♗": "white-bishop.png", "♘": "white-knight.png", "♙": "white-pawn.png",
  "♚": "black-king.png", "♛": "black-queen.png", "♜": "black-rook.png",
  "♝": "black-bishop.png", "♞": "black-knight.png", "♟": "black-pawn.png",
};

function createPieceImage(piece) {
  const pieceElement = document.createElement("img");
  pieceElement.classList.add("piece", "piece-image", "piece-file-image");
  pieceElement.src = `assets/pieces/classic/${PIECE_IMAGE_FILES[piece]}`;
  pieceElement.alt = piece;
  pieceElement.dataset.piece = piece;
  pieceElement.setAttribute("role", "img");
  pieceElement.setAttribute("aria-label", piece);
  return pieceElement;
}

function createBoard() {
  const flipChanged = board.dataset.flipped !== String(boardFlipped);
  const needsBuild = board.children.length !== 64 || flipChanged;

  if (needsBuild) {
    board.innerHTML = "";
    board.dataset.flipped = String(boardFlipped);
  }

  for (let visualRow = 0; visualRow < 8; visualRow++) {
    for (let visualCol = 0; visualCol < 8; visualCol++) {
      const logicalRow = boardFlipped ? 7 - visualRow : visualRow;

      const logicalCol = boardFlipped ? 7 - visualCol : visualCol;

      const index = visualRow * 8 + visualCol;
      let square = board.children[index];

      if (needsBuild) {
        square = document.createElement("div");
        square.classList.add("square", (visualRow + visualCol) % 2 === 0 ? "light" : "dark");
        square.style.position = "relative";

        if (visualRow === 7) {
          const fileLabel = document.createElement("span");
          fileLabel.classList.add("file-label");
          fileLabel.textContent = FILES[logicalCol];
          square.appendChild(fileLabel);
        }

        if (visualCol === 0) {
          const rankLabel = document.createElement("span");
          rankLabel.classList.add("rank-label");
          rankLabel.textContent = String(8 - logicalRow);
          square.appendChild(rankLabel);
        }

        square.addEventListener("click", () => {
          handleSquareClick(logicalRow, logicalCol);
        });
        board.appendChild(square);
      }

      square.classList.remove("selected", "legal-move", "last-move");

      const piece = pieces[logicalRow][logicalCol];
      const existingPiece = square.querySelector(".piece");

      if (piece === "" && existingPiece) {
        existingPiece.remove();
      } else if (piece !== "" && (!existingPiece || existingPiece.dataset.piece !== piece)) {
        const pieceElement = createPieceImage(piece);
        pieceElement.style.position = "relative";
        pieceElement.style.zIndex = "2";
        pieceElement.style.pointerEvents = "none";
        if (existingPiece) {
          existingPiece.replaceWith(pieceElement);
        } else {
          square.appendChild(pieceElement);
        }
      }

      if (lastMove !== null) {
        const isStart =
          logicalRow === lastMove.fromRow && logicalCol === lastMove.fromCol;

        const isEnd =
          logicalRow === lastMove.toRow && logicalCol === lastMove.toCol;

        if (isStart || isEnd) {
          square.classList.add("last-move");
        }
      }

    }
  }

  updateTurnDisplay();

  updateMaterialScoreDisplay();

  updateMoveHistoryDisplay();
}

// ======================================================
// TURN DISPLAY
// ======================================================

function updateTurnDisplay() {
  if (gameOver) {
    return;
  }

  if (aiThinking) {
    turnDisplay.textContent = t("aiThinking", "AI is Thinking...");
    return;
  }

  const turnName = currentTurn === "white" ? t("white", "White") : t("black", "Black");

  // 訓練模式：人類對人類
  if (trainingMode && trainingPlayMode === "human") {
    turnDisplay.textContent = `${turnName} — ${t("playerTurn", "Player's Turn")}`;
    return;
  }

  // AI 關閉時，一律視為人類回合
  if (!AI_ENABLED) {
    turnDisplay.textContent = `${turnName} — ${t("playerTurn", "Player's Turn")}`;
    return;
  }

  // AI 對戰模式
  if (currentTurn === playerColor) {
    turnDisplay.textContent = `${turnName} — ${t("yourTurn", "Your Turn")}`;
  } else {
    turnDisplay.textContent = `${turnName} — ${t("aiTurn", "AI's Turn")}`;
  }
}

// ======================================================
// SWITCH TURN
// ======================================================

function switchTurn() {
  currentTurn = currentTurn === "white" ? "black" : "white";
}
// ======================================================
// TRAINING MODE：選擇棋子
// ======================================================

function selectSetupPiece(piece) {
  if (!trainingMode || !trainingSetup) return;

  selectedSetupPiece = piece;
}
// ======================================================
// TRAINING MODE：擺棋工具
// ======================================================

function eraseSetup() {
  if (!trainingMode || !trainingSetup) return;

  selectedSetupPiece = "erase";
}

function clearSetupBoard() {
  if (!trainingMode || !trainingSetup) return;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      pieces[row][col] = "";
    }
  }

  selectedSquare = null;
  createBoard();
}

function restoreSetupBoard() {
  if (!trainingMode || !trainingSetup) return;

  const snapshot =
    trainingSetupPosition !== null
      ? trainingSetupPosition
      : createInitialPosition();

  restoreBoard(snapshot);

  selectedSquare = null;
  selectedSetupPiece = null;

  createBoard();
}

// ======================================================
// HANDLE CLICK
// ======================================================

function handleSquareClick(row, col) {
  if (trainingMode && trainingSetup) {
    if (selectedSetupPiece === null) return;

    if (selectedSetupPiece === "erase") {
      pieces[row][col] = "";
    } else {
      pieces[row][col] = selectedSetupPiece;
    }

    selectedSquare = null;
    createBoard();
    return;
  }

  if (gameOver) return;
  if (aiThinking || isAnimating) return;

  if (AI_ENABLED && currentTurn === AI_COLOR) {
    return;
  }

  const humanCanMove = onlineMode
    ? onlineColor === currentTurn
    : !AI_ENABLED ||
      trainingPlayMode === "human" ||
      currentTurn === playerColor;

  if (!humanCanMove) return;

  const piece = pieces[row][col];

  if (selectedSquare === null) {
    if (piece === "") return;

    if (getPieceColor(piece) !== currentTurn) {
      return;
    }

    if (
      !onlineMode &&
      trainingPlayMode !== "human" &&
      getPieceColor(piece) !== playerColor
    ) {
      return;
    }

    selectedSquare = {
      row,
      col,
    };

    createBoard();
    highlightSquare(row, col);
    showLegalMoves(row, col);

    return;
  }

  const fromRow = selectedSquare.row;
  const fromCol = selectedSquare.col;

  const legalMoves = getLegalMoves(fromRow, fromCol);

  const selectedMove = legalMoves.find(
    (move) => move.row === row && move.col === col,
  );

  if (selectedMove) {
    makeMove(fromRow, fromCol, row, col, selectedMove);
    return;
  }

  if (
    piece !== "" &&
    getPieceColor(piece) === currentTurn &&
    (onlineMode ||
      trainingPlayMode === "human" ||
      getPieceColor(piece) === playerColor)
  ) {
    selectedSquare = {
      row,
      col,
    };

    createBoard();
    highlightSquare(row, col);
    showLegalMoves(row, col);

    return;
  }

  selectedSquare = null;
  createBoard();
}

// ======================================================
// MAKE PLAYER MOVE
// ======================================================

function makeMove(
  fromRow,
  fromCol,
  toRow,
  toCol,
  moveData,
  isRemoteMove = false,
) {
  if (isAnimating) {
    return;
  }

  const movingPiece = pieces[fromRow][fromCol];
  const isPromotionMove =
    (movingPiece === "♙" && toRow === 0) ||
    (movingPiece === "♟" && toRow === 7);

  // 人類升變先以視覺選單確認；確認後才真正執行這一步。
  if (isPromotionMove && !isRemoteMove && !moveData.promotion) {
    if (AI_ENABLED && currentTurn === AI_COLOR) {
      moveData = { ...moveData, promotion: "queen" };
    } else {
      openPromotionDialog(movingPiece === "♙" ? "white" : "black", (promotion) => {
        makeMove(fromRow, fromCol, toRow, toCol, { ...moveData, promotion });
      });
      return;
    }
  }
  // ======================================================
  // ONLINE MODE
  // ======================================================

  if (onlineMode && !isRemoteMove) {
    if (!onlineGameStarted) {
      return;
    }

    if (onlineColor !== currentTurn) {
      return;
    }

    const fromSquare = getSquareName(fromRow, fromCol);
    const toSquare = getSquareName(toRow, toCol);

    let promotion = null;

    promotion = moveData.promotion || null;

    submitOnlineMove(fromSquare, toSquare, promotion);

    selectedSquare = null;

    return;
  }
  // 最後一道合法性檢查
  const legalMoves = getLegalMoves(fromRow, fromCol);

  const isLegal = legalMoves.some(
    (move) => move.row === toRow && move.col === toCol,
  );

  if (!isLegal) {
    console.warn("Illegal move rejected.");
    selectedSquare = null;
    createBoard();
    return;
  }
  const capturedPiece = pieces[toRow][toCol];

  const isCapture = capturedPiece !== "" || moveData.enPassant === true;

  const playerMoveColor = currentTurn;

  let moveNotation = createSANMoveNotation(
    fromRow,
    fromCol,
    toRow,
    toCol,
    moveData,
  );

  if (moveData.enPassant) {
    pieces[fromRow][toCol] = "";
  }

  if (moveData.castle) {
    performCastling(fromRow, fromCol, toRow, toCol);

    updateMovementState(movingPiece, fromRow, fromCol);

    lastMove = {
      piece: movingPiece,
      fromRow,
      fromCol,
      toRow,
      toCol,
    };

    halfmoveClock++;

    selectedSquare = null;

    createBoard();

    isAnimating = true;

    animateMove(fromRow, fromCol, toRow, toCol, () => {
      isAnimating = false;

      finalizeMoveNotation(moveNotation, playerMoveColor);

      finishTurn();
    });

    return;
  }

  pieces[toRow][toCol] = movingPiece;

  pieces[fromRow][fromCol] = "";

  updateMovementState(movingPiece, fromRow, fromCol);

  lastMove = {
    piece: movingPiece,
    fromRow,
    fromCol,
    toRow,
    toCol,
  };

  if (movingPiece === "♙" || movingPiece === "♟" || isCapture) {
    halfmoveClock = 0;
  } else {
    halfmoveClock++;
  }

  selectedSquare = null;

  const isWhitePromotion = movingPiece === "♙" && toRow === 0;

  const isBlackPromotion = movingPiece === "♟" && toRow === 7;
  let selectedPromotion = null;

  if (isWhitePromotion || isBlackPromotion) {
    const promotionColor = isWhitePromotion ? "white" : "black";

    // 已在移動前由視覺選單（或遠端資料）決定升變種類。
    selectedPromotion = moveData.promotion || "queen";

    moveData = {
      ...moveData,
      promotion: selectedPromotion,
    };
  }

  createBoard();

  isAnimating = true;

  animateMove(fromRow, fromCol, toRow, toCol, () => {
    isAnimating = false;

    if (isWhitePromotion || isBlackPromotion) {
      pendingPromotionNotation = moveNotation;

      promotePawn(
        toRow,
        toCol,
        isWhitePromotion ? "white" : "black",
        selectedPromotion,
      );

      return;
    }

    finalizeMoveNotation(moveNotation, playerMoveColor);

    finishTurn();
  });
}

// ======================================================
// MOVEMENT STATE
// ======================================================

function updateMovementState(piece, row, col) {
  if (piece === "♔") {
    whiteKingMoved = true;
  }

  if (piece === "♚") {
    blackKingMoved = true;
  }

  if (piece === "♖" && row === 7 && col === 7) {
    whiteKingsideRookMoved = true;
  }

  if (piece === "♖" && row === 7 && col === 0) {
    whiteQueensideRookMoved = true;
  }

  if (piece === "♜" && row === 0 && col === 7) {
    blackKingsideRookMoved = true;
  }

  if (piece === "♜" && row === 0 && col === 0) {
    blackQueensideRookMoved = true;
  }
}

// ======================================================
// CASTLING
// ======================================================

function performCastling(fromRow, fromCol, toRow, toCol) {
  if (fromRow === 7 && fromCol === 4 && toRow === 7 && toCol === 6) {
    pieces[7][6] = "♔";
    pieces[7][4] = "";
    pieces[7][5] = "♖";
    pieces[7][7] = "";

    return;
  }

  if (fromRow === 7 && fromCol === 4 && toRow === 7 && toCol === 2) {
    pieces[7][2] = "♔";
    pieces[7][4] = "";
    pieces[7][3] = "♖";
    pieces[7][0] = "";

    return;
  }

  if (fromRow === 0 && fromCol === 4 && toRow === 0 && toCol === 6) {
    pieces[0][6] = "♚";
    pieces[0][4] = "";
    pieces[0][5] = "♜";
    pieces[0][7] = "";

    return;
  }

  if (fromRow === 0 && fromCol === 4 && toRow === 0 && toCol === 2) {
    pieces[0][2] = "♚";
    pieces[0][4] = "";
    pieces[0][3] = "♜";
    pieces[0][0] = "";
  }
}

// ======================================================
// FINISH TURN
// ======================================================

function finishTurn() {
  switchTurn();

  recordCurrentPosition();

  createBoard();

  checkGameState();

  if (AI_ENABLED && !gameOver && currentTurn === AI_COLOR) {
    startAITurn();
  }
}

// ======================================================
// MOVE ANIMATION
// ======================================================

function animateMove(fromRow, fromCol, toRow, toCol, callback) {
  const fromVisual = getVisualPosition(fromRow, fromCol);

  const toVisual = getVisualPosition(toRow, toCol);

  const fromIndex = fromVisual.row * 8 + fromVisual.col;

  const toIndex = toVisual.row * 8 + toVisual.col;

  const fromSquare = board.children[fromIndex];

  const toSquare = board.children[toIndex];

  if (!fromSquare || !toSquare) {
    callback();

    return;
  }

  const piece = pieces[toRow][toCol];

  const pieceElement = toSquare.querySelector(".piece");

  // 複製已經載入的終點棋子圖片，避免動畫開始時重新載入造成閃爍。
  const animationPiece = pieceElement
    ? pieceElement.cloneNode(true)
    : createPieceImage(piece);

  if (pieceElement) {
    pieceElement.style.visibility = "hidden";
  }

  const fromRect = fromSquare.getBoundingClientRect();

  const toRect = toSquare.getBoundingClientRect();

  const movingPiece = document.createElement("div");
  movingPiece.classList.add("moving-piece");
  movingPiece.appendChild(animationPiece);

  movingPiece.style.position = "fixed";

  movingPiece.style.zIndex = "9999";

  movingPiece.style.pointerEvents = "none";

  movingPiece.style.display = "flex";

  movingPiece.style.justifyContent = "center";

  movingPiece.style.alignItems = "center";

  movingPiece.style.width = fromRect.width + "px";

  movingPiece.style.height = fromRect.height + "px";

  movingPiece.style.left = fromRect.left + "px";

  movingPiece.style.top = fromRect.top + "px";

  document.body.appendChild(movingPiece);

  const startX = fromRect.left;

  const startY = fromRect.top;

  const endX = toRect.left;

  const endY = toRect.top;

  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;

    const progress = Math.min(elapsed / MOVE_ANIMATION_TIME, 1);

    const eased = 1 - Math.pow(1 - progress, 3);

    movingPiece.style.left = startX + (endX - startX) * eased + "px";

    movingPiece.style.top = startY + (endY - startY) * eased + "px";

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      movingPiece.remove();

      if (pieceElement) {
        pieceElement.style.visibility = "visible";
      }

      callback();
    }
  }

  requestAnimationFrame(animate);
}

// ======================================================
// LEGAL MOVES
// ======================================================

function getLegalMoves(row, col) {
  const piece = pieces[row][col];

  if (piece === "") {
    return [];
  }

  const color = getPieceColor(piece);

  if (color !== currentTurn) {
    return [];
  }

  const pseudoMoves = getPseudoLegalMoves(row, col);

  const legalMoves = [];

  for (const move of pseudoMoves) {
    // 王不能吃掉對方的王
    const targetPiece = pieces[move.row][move.col];

    if (targetPiece === "♔" || targetPiece === "♚") {
      continue;
    }

    if (isMoveSafeForKing(row, col, move.row, move.col, move)) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}

// ======================================================
// PSEUDO LEGAL MOVES
// ======================================================

function getPseudoLegalMoves(row, col) {
  const piece = pieces[row][col];

  const color = getPieceColor(piece);

  if (piece === "♙" || piece === "♟") {
    return getPawnMoves(row, col, color);
  }

  if (piece === "♖" || piece === "♜") {
    return getRookMoves(row, col, color);
  }

  if (piece === "♘" || piece === "♞") {
    return getKnightMoves(row, col, color);
  }

  if (piece === "♗" || piece === "♝") {
    return getBishopMoves(row, col, color);
  }

  if (piece === "♕" || piece === "♛") {
    return getQueenMoves(row, col, color);
  }

  if (piece === "♔" || piece === "♚") {
    return getKingMoves(row, col, color);
  }

  return [];
}

// ======================================================
// COPY BOARD
// ======================================================

function copyBoard() {
  return pieces.map((row) => [...row]);
}

// ======================================================
// RESTORE BOARD
// ======================================================

function restoreBoard(snapshot) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      pieces[row][col] = snapshot[row][col];
    }
  }
}

// ======================================================
// SAVE CASTLING STATE
// ======================================================

function saveCastlingState() {
  return {
    whiteKingMoved,
    whiteKingsideRookMoved,
    whiteQueensideRookMoved,

    blackKingMoved,
    blackKingsideRookMoved,
    blackQueensideRookMoved,
  };
}

// ======================================================
// RESTORE CASTLING STATE
// ======================================================

function restoreCastlingState(state) {
  whiteKingMoved = state.whiteKingMoved;

  whiteKingsideRookMoved = state.whiteKingsideRookMoved;

  whiteQueensideRookMoved = state.whiteQueensideRookMoved;

  blackKingMoved = state.blackKingMoved;

  blackKingsideRookMoved = state.blackKingsideRookMoved;

  blackQueensideRookMoved = state.blackQueensideRookMoved;
}

// ======================================================
// APPLY TEMPORARY MOVE
// ======================================================

function applyMoveWithoutHistory(fromRow, fromCol, toRow, toCol, moveData) {
  const piece = pieces[fromRow][fromCol];

  if (moveData.enPassant) {
    pieces[fromRow][toCol] = "";
  }

  if (moveData.castle) {
    performCastling(fromRow, fromCol, toRow, toCol);

    return;
  }

  pieces[toRow][toCol] = piece;

  pieces[fromRow][fromCol] = "";
}
// ======================================================
// CHECK IF A MOVE IS SAFE FOR THE KING
// ======================================================

function isMoveSafeForKing(fromRow, fromCol, toRow, toCol, moveData) {
  const movingPiece = pieces[fromRow][fromCol];

  if (movingPiece === "") {
    return false;
  }

  const color = getPieceColor(movingPiece);

  const snapshot = copyBoard();
  const oldLastMove = lastMove;
  const oldState = saveCastlingState();
  const oldTurn = currentTurn;

  // 確保模擬時使用正確的陣營
  currentTurn = color;

  applyMoveWithoutHistory(fromRow, fromCol, toRow, toCol, moveData);

  const king = findKing(color);

  let safe = false;

  if (king !== null) {
    safe = !isSquareAttacked(king.row, king.col, oppositeColor(color));
  }

  // 還原棋盤
  restoreBoard(snapshot);

  // 還原遊戲狀態
  lastMove = oldLastMove;
  restoreCastlingState(oldState);
  currentTurn = oldTurn;

  return safe;
}
// ======================================================
// FIND KING
// ======================================================

function findKing(color) {
  const king = color === "white" ? "♔" : "♚";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (pieces[row][col] === king) {
        return {
          row,
          col,
        };
      }
    }
  }

  return null;
}
// ======================================================
// TRAINING POSITION VALIDATION
// ======================================================

// 檢查指定陣營是否剛好有一個國王
function hasExactlyOneKing(color) {
  const king = color === "white" ? "♔" : "♚";

  let count = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (pieces[row][col] === king) {
        count++;
      }
    }
  }

  return count === 1;
}

// 檢查訓練模式的棋盤是否有效
function isValidTrainingPosition() {
  const hasWhiteKing = hasExactlyOneKing("white");
  const hasBlackKing = hasExactlyOneKing("black");

  return hasWhiteKing && hasBlackKing;
}

// ======================================================
// OPPOSITE COLOR
// ======================================================

function oppositeColor(color) {
  return color === "white" ? "black" : "white";
}

// ======================================================
// IS SQUARE ATTACKED
// ======================================================

function isSquareAttacked(row, col, byColor) {
  const pawn = byColor === "white" ? "♙" : "♟";

  const pawnDirection = byColor === "white" ? 1 : -1;

  const pawnRow = row + pawnDirection;

  if (pawnRow >= 0 && pawnRow < 8) {
    for (const pawnCol of [col - 1, col + 1]) {
      if (pawnCol >= 0 && pawnCol < 8 && pieces[pawnRow][pawnCol] === pawn) {
        return true;
      }
    }
  }

  const knight = byColor === "white" ? "♘" : "♞";

  const knightDirections = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];

  for (const direction of knightDirections) {
    const targetRow = row + direction[0];

    const targetCol = col + direction[1];

    if (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
      if (pieces[targetRow][targetCol] === knight) {
        return true;
      }
    }
  }

  const enemyKing = byColor === "white" ? "♔" : "♚";

  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const targetRow = row + rowOffset;

      const targetCol = col + colOffset;

      if (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
        if (pieces[targetRow][targetCol] === enemyKing) {
          return true;
        }
      }
    }
  }

  const enemyRook = byColor === "white" ? "♖" : "♜";

  const enemyQueen = byColor === "white" ? "♕" : "♛";

  const straightDirections = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const direction of straightDirections) {
    let targetRow = row + direction[0];

    let targetCol = col + direction[1];

    while (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
      const target = pieces[targetRow][targetCol];

      if (target === "") {
        targetRow += direction[0];
        targetCol += direction[1];

        continue;
      }

      if (target === enemyRook || target === enemyQueen) {
        return true;
      }

      break;
    }
  }

  const enemyBishop = byColor === "white" ? "♗" : "♝";

  const diagonalDirections = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];

  for (const direction of diagonalDirections) {
    let targetRow = row + direction[0];

    let targetCol = col + direction[1];

    while (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
      const target = pieces[targetRow][targetCol];

      if (target === "") {
        targetRow += direction[0];
        targetCol += direction[1];

        continue;
      }

      if (target === enemyBishop || target === enemyQueen) {
        return true;
      }

      break;
    }
  }

  return false;
}

// ======================================================
// KING IN CHECK
// ======================================================

function isKingInCheck(color) {
  const king = findKing(color);

  if (king === null) {
    return true;
  }

  return isSquareAttacked(king.row, king.col, oppositeColor(color));
}

// ======================================================
// CHECK GAME STATE
// ======================================================

function checkGameState() {
  const color = currentTurn;

  const inCheck = isKingInCheck(color);

  const hasLegalMove = hasAnyLegalMove(color);

  if (inCheck && !hasLegalMove) {
    gameOver = true;

    const winner = oppositeColor(color);

    turnDisplay.textContent =
      winner === "white"
        ? "White Wins — Checkmate!"
        : "Black Wins — Checkmate!";

    return;
  }

  if (!inCheck && !hasLegalMove) {
    gameOver = true;

    turnDisplay.textContent = "Draw — Stalemate";

    return;
  }

  if (isInsufficientMaterial()) {
    gameOver = true;

    turnDisplay.textContent = "Draw — Insufficient Material";

    return;
  }

  if (getCurrentPositionCount() >= 5) {
    gameOver = true;

    turnDisplay.textContent = "Draw — Fivefold Repetition";

    return;
  }

  if (halfmoveClock >= 150) {
    gameOver = true;

    turnDisplay.textContent = "Draw — 75-Move Rule";

    return;
  }

  if (getCurrentPositionCount() >= 3) {
    const claim = confirm(
      "同一局面已經出現三次。\n\n" +
        "依照西洋棋規則，你現在可以宣告和棋。\n\n" +
        "按「確定」宣告和棋。\n" +
        "按「取消」繼續遊戲。",
    );

    if (claim) {
      gameOver = true;

      turnDisplay.textContent = "Draw — Threefold Repetition";

      return;
    }
  }

  if (halfmoveClock >= 100) {
    const claim = confirm(
      "已經連續 50 回合沒有兵移動，也沒有吃子。\n\n" +
        "依照西洋棋規則，你現在可以宣告和棋。\n\n" +
        "按「確定」宣告和棋。\n" +
        "按「取消」繼續遊戲。",
    );

    if (claim) {
      gameOver = true;

      turnDisplay.textContent = "Draw — 50-Move Rule";

      return;
    }
  }

  if (inCheck) {
    turnDisplay.textContent =
      color === "white" ? "White is in Check!" : "Black is in Check!";
  } else {
    updateTurnDisplay();
  }
}

// ======================================================
// INSUFFICIENT MATERIAL
// ======================================================

function isInsufficientMaterial() {
  const nonKingPieces = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = pieces[row][col];

      if (piece === "") {
        continue;
      }

      if (piece === "♔" || piece === "♚") {
        continue;
      }

      nonKingPieces.push({
        piece,
        row,
        col,
      });
    }
  }

  if (nonKingPieces.length === 0) {
    return true;
  }

  for (const item of nonKingPieces) {
    if (
      item.piece === "♙" ||
      item.piece === "♟" ||
      item.piece === "♖" ||
      item.piece === "♜" ||
      item.piece === "♕" ||
      item.piece === "♛"
    ) {
      return false;
    }
  }

  if (nonKingPieces.length === 1) {
    return (
      nonKingPieces[0].piece === "♗" ||
      nonKingPieces[0].piece === "♝" ||
      nonKingPieces[0].piece === "♘" ||
      nonKingPieces[0].piece === "♞"
    );
  }

  if (nonKingPieces.length === 2) {
    const first = nonKingPieces[0];

    const second = nonKingPieces[1];

    if (
      (first.piece === "♘" || first.piece === "♞") &&
      (second.piece === "♘" || second.piece === "♞")
    ) {
      return false;
    }

    if (
      (first.piece === "♗" || first.piece === "♝") &&
      (second.piece === "♗" || second.piece === "♝")
    ) {
      const firstSquareColor = (first.row + first.col) % 2;

      const secondSquareColor = (second.row + second.col) % 2;

      return firstSquareColor === secondSquareColor;
    }
  }

  return false;
}

// ======================================================
// HAS ANY LEGAL MOVE
// ======================================================

function hasAnyLegalMove(color) {
  const oldTurn = currentTurn;

  currentTurn = color;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = pieces[row][col];

      if (piece !== "" && getPieceColor(piece) === color) {
        const moves = getLegalMoves(row, col);

        if (moves.length > 0) {
          currentTurn = oldTurn;

          return true;
        }
      }
    }
  }

  currentTurn = oldTurn;

  return false;
}

// ======================================================
// HIGHLIGHT
// ======================================================

function highlightSquare(row, col) {
  const visual = getVisualPosition(row, col);

  const index = visual.row * 8 + visual.col;

  const square = board.children[index];

  if (square) {
    square.classList.add("selected");
  }
}

// ======================================================
// SHOW LEGAL MOVES
// ======================================================

function showLegalMoves(row, col) {
  const moves = getLegalMoves(row, col);

  moves.forEach((move) => {
    const visual = getVisualPosition(move.row, move.col);

    const index = visual.row * 8 + visual.col;

    const square = board.children[index];

    if (square) {
      square.classList.add("legal-move");
    }
  });
}

// ======================================================
// PAWN MOVES
// ======================================================

function getPawnMoves(row, col, color) {
  const moves = [];

  const direction = color === "white" ? -1 : 1;

  const startRow = color === "white" ? 6 : 1;

  const oneStep = row + direction;

  if (oneStep >= 0 && oneStep < 8 && pieces[oneStep][col] === "") {
    moves.push({
      row: oneStep,
      col,
    });

    const twoStep = row + direction * 2;

    if (row === startRow && pieces[twoStep][col] === "") {
      moves.push({
        row: twoStep,
        col,
      });
    }
  }

  // ======================================================
  // PAWN CAPTURE
  // ======================================================

  const diagonalCols = [col - 1, col + 1];

  for (const targetCol of diagonalCols) {
    if (targetCol < 0 || targetCol >= 8) {
      continue;
    }

    if (oneStep < 0 || oneStep >= 8) {
      continue;
    }

    const target = pieces[oneStep][targetCol];
    const targetColor = getPieceColor(target);

    if (targetColor === oppositeColor(color)) {
      moves.push({
        row: oneStep,
        col: targetCol,
      });
    }
  }

  // ======================================================
  // EN PASSANT
  // ======================================================

  if (lastMove !== null) {
    const enemyPawn = color === "white" ? "♟" : "♙";

    if (lastMove.piece === enemyPawn) {
      const movedTwoSquares = Math.abs(lastMove.fromRow - lastMove.toRow) === 2;

      const beside =
        lastMove.toRow === row && Math.abs(lastMove.toCol - col) === 1;

      if (movedTwoSquares && beside) {
        moves.push({
          row: row + direction,
          col: lastMove.toCol,
          enPassant: true,
        });
      }
    }
  }

  return moves;
}

// ======================================================
// ROOK
// ======================================================

function getRookMoves(row, col, color) {
  return getSlidingMoves(row, col, color, [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]);
}

// ======================================================
// BISHOP
// ======================================================

function getBishopMoves(row, col, color) {
  return getSlidingMoves(row, col, color, [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]);
}

// ======================================================
// QUEEN
// ======================================================

function getQueenMoves(row, col, color) {
  return getSlidingMoves(row, col, color, [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]);
}

// ======================================================
// SLIDING MOVES
// ======================================================

function getSlidingMoves(row, col, color, directions) {
  const moves = [];

  for (const direction of directions) {
    let targetRow = row + direction[0];

    let targetCol = col + direction[1];

    while (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
      const target = pieces[targetRow][targetCol];

      if (target === "") {
        moves.push({
          row: targetRow,
          col: targetCol,
        });

        targetRow += direction[0];

        targetCol += direction[1];

        continue;
      }

      if (getPieceColor(target) !== color) {
        moves.push({
          row: targetRow,
          col: targetCol,
        });
      }

      break;
    }
  }

  return moves;
}

// ======================================================
// KNIGHT
// ======================================================

function getKnightMoves(row, col, color) {
  const moves = [];

  const directions = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];

  for (const direction of directions) {
    const targetRow = row + direction[0];

    const targetCol = col + direction[1];

    if (targetRow < 0 || targetRow >= 8 || targetCol < 0 || targetCol >= 8) {
      continue;
    }

    const target = pieces[targetRow][targetCol];

    if (target === "" || getPieceColor(target) !== color) {
      moves.push({
        row: targetRow,
        col: targetCol,
      });
    }
  }

  return moves;
}

// ======================================================
// KING
// ======================================================

function getKingMoves(row, col, color) {
  const moves = [];

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];

  for (const direction of directions) {
    const targetRow = row + direction[0];

    const targetCol = col + direction[1];

    if (targetRow < 0 || targetRow >= 8 || targetCol < 0 || targetCol >= 8) {
      continue;
    }

    const target = pieces[targetRow][targetCol];

    if (target === "" || getPieceColor(target) !== color) {
      moves.push({
        row: targetRow,
        col: targetCol,
      });
    }
  }

  const castlingMoves = getCastlingMoves(row, col, color);

  moves.push(...castlingMoves);

  return moves;
}

// ======================================================
// CASTLING MOVES
// ======================================================

function getCastlingMoves(row, col, color) {
  const moves = [];

  if (color === "white") {
    if (row !== 7 || col !== 4) {
      return moves;
    }

    if (whiteKingMoved) {
      return moves;
    }

    if (isSquareAttacked(7, 4, "black")) {
      return moves;
    }

    if (
      !whiteKingsideRookMoved &&
      pieces[7][7] === "♖" &&
      pieces[7][5] === "" &&
      pieces[7][6] === ""
    ) {
      const throughSquareSafe = !isSquareAttacked(7, 5, "black");

      const destinationSafe = !isSquareAttacked(7, 6, "black");

      if (throughSquareSafe && destinationSafe) {
        moves.push({
          row: 7,
          col: 6,
          castle: "kingside",
        });
      }
    }

    if (
      !whiteQueensideRookMoved &&
      pieces[7][0] === "♖" &&
      pieces[7][1] === "" &&
      pieces[7][2] === "" &&
      pieces[7][3] === ""
    ) {
      const throughSquareSafe = !isSquareAttacked(7, 3, "black");

      const destinationSafe = !isSquareAttacked(7, 2, "black");

      if (throughSquareSafe && destinationSafe) {
        moves.push({
          row: 7,
          col: 2,
          castle: "queenside",
        });
      }
    }
  }

  if (color === "black") {
    if (row !== 0 || col !== 4) {
      return moves;
    }

    if (blackKingMoved) {
      return moves;
    }

    if (isSquareAttacked(0, 4, "white")) {
      return moves;
    }

    if (
      !blackKingsideRookMoved &&
      pieces[0][7] === "♜" &&
      pieces[0][5] === "" &&
      pieces[0][6] === ""
    ) {
      const throughSquareSafe = !isSquareAttacked(0, 5, "white");

      const destinationSafe = !isSquareAttacked(0, 6, "white");

      if (throughSquareSafe && destinationSafe) {
        moves.push({
          row: 0,
          col: 6,
          castle: "kingside",
        });
      }
    }

    if (
      !blackQueensideRookMoved &&
      pieces[0][0] === "♜" &&
      pieces[0][1] === "" &&
      pieces[0][2] === "" &&
      pieces[0][3] === ""
    ) {
      const throughSquareSafe = !isSquareAttacked(0, 3, "white");

      const destinationSafe = !isSquareAttacked(0, 2, "white");

      if (throughSquareSafe && destinationSafe) {
        moves.push({
          row: 0,
          col: 2,
          castle: "queenside",
        });
      }
    }
  }

  return moves;
}

// ======================================================
// POSITION KEY
// ======================================================

function getPositionKey() {
  let boardString = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      boardString += pieces[row][col] || ".";
    }
  }

  let castling = "";

  if (
    pieces[7][4] === "♔" &&
    pieces[7][7] === "♖" &&
    !whiteKingMoved &&
    !whiteKingsideRookMoved
  ) {
    castling += "K";
  }

  if (
    pieces[7][4] === "♔" &&
    pieces[7][0] === "♖" &&
    !whiteKingMoved &&
    !whiteQueensideRookMoved
  ) {
    castling += "Q";
  }

  if (
    pieces[0][4] === "♚" &&
    pieces[0][7] === "♜" &&
    !blackKingMoved &&
    !blackKingsideRookMoved
  ) {
    castling += "k";
  }

  if (
    pieces[0][4] === "♚" &&
    pieces[0][0] === "♜" &&
    !blackKingMoved &&
    !blackQueensideRookMoved
  ) {
    castling += "q";
  }

  if (castling === "") {
    castling = "-";
  }

  const enPassant = getEnPassantKey();

  return boardString + "|" + currentTurn + "|" + castling + "|" + enPassant;
}

// ======================================================
// EN PASSANT POSITION KEY
// ======================================================

function getEnPassantKey() {
  if (lastMove === null) {
    return "-";
  }

  const movingPawn = lastMove.piece === "♙" || lastMove.piece === "♟";

  if (!movingPawn) {
    return "-";
  }

  const movedTwoSquares = Math.abs(lastMove.fromRow - lastMove.toRow) === 2;

  if (!movedTwoSquares) {
    return "-";
  }

  const enemyColor = currentTurn;

  const enemyPawn = enemyColor === "white" ? "♙" : "♟";

  const pawnRow = lastMove.toRow;

  for (const col of [lastMove.toCol - 1, lastMove.toCol + 1]) {
    if (col < 0 || col >= 8) {
      continue;
    }

    if (pieces[pawnRow][col] !== enemyPawn) {
      continue;
    }

    const targetRow = (lastMove.fromRow + lastMove.toRow) / 2;

    const moves = getLegalMoves(pawnRow, col);

    const legalEnPassant = moves.some(
      (move) =>
        move.enPassant === true &&
        move.row === targetRow &&
        move.col === lastMove.toCol,
    );

    if (legalEnPassant) {
      return String(targetRow) + "," + String(lastMove.toCol);
    }
  }

  return "-";
}

// ======================================================
// INITIAL POSITION HISTORY
// ======================================================

function initializePositionHistory() {
  positionHistory = new Map();

  const key = getPositionKey();

  positionHistory.set(key, 1);
}

// ======================================================
// RECORD CURRENT POSITION
// ======================================================

function recordCurrentPosition() {
  const key = getPositionKey();

  const currentCount = positionHistory.get(key) || 0;

  positionHistory.set(key, currentCount + 1);
}

// ======================================================
// CURRENT POSITION COUNT
// ======================================================

function getCurrentPositionCount() {
  const key = getPositionKey();

  return positionHistory.get(key) || 0;
}

// ======================================================
// RESET GAME
// ======================================================

function resetGame() {
  if (aiTurnTimer !== null) {
    clearTimeout(aiTurnTimer);
    aiTurnTimer = null;
  }

  restoreBoard(createInitialPosition());

  currentTurn = "white";
  lastMove = null;
  selectedSquare = null;
  gameOver = false;
  aiThinking = false;
  isAnimating = false;
  halfmoveClock = 0;
  moveHistory = [];
  pendingPromotionNotation = null;

  // 一般模式重設後允許王車易位
  whiteKingMoved = false;
  whiteKingsideRookMoved = false;
  whiteQueensideRookMoved = false;

  blackKingMoved = false;
  blackKingsideRookMoved = false;
  blackQueensideRookMoved = false;

  initializePositionHistory();

  createBoard();
  updatePlayerColorUI();
  updateAIDifficultyUI();
  updateTurnDisplay();

  if (AI_ENABLED && currentTurn === AI_COLOR) {
    startAITurn();
  }
}

// ======================================================
// PAWN PROMOTION
// ======================================================
const PROMOTION_CHOICES = ["queen", "rook", "bishop", "knight"];

function openPromotionDialog(color, onConfirm) {
  const modal = document.getElementById("promotion-modal");
  const options = document.getElementById("promotion-options");
  if (!modal || !options) return;

  pendingPromotionSelection = { color, onConfirm, promotion: "queen" };
  options.innerHTML = "";

  PROMOTION_CHOICES.forEach((promotion) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "promotion-option";
    button.dataset.promotion = promotion;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(promotion === "queen"));
    button.textContent = promotionCodeToPiece(color, promotion);
    button.onclick = () => selectPromotion(promotion);
    options.appendChild(button);
  });

  updatePromotionSelectionUI();
  modal.classList.remove("hidden");
}

function selectPromotion(promotion) {
  if (!pendingPromotionSelection || !PROMOTION_CHOICES.includes(promotion)) return;
  pendingPromotionSelection.promotion = promotion;
  updatePromotionSelectionUI();
}

function updatePromotionSelectionUI() {
  const selected = pendingPromotionSelection?.promotion;
  document.querySelectorAll(".promotion-option").forEach((button) => {
    const isSelected = button.dataset.promotion === selected;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-checked", String(isSelected));
  });
}

function confirmPromotion() {
  if (!pendingPromotionSelection) return;
  const { promotion, onConfirm } = pendingPromotionSelection;
  closePromotionDialog();
  onConfirm(promotion);
}

function cancelPromotion() {
  closePromotionDialog();
}

function closePromotionDialog() {
  const modal = document.getElementById("promotion-modal");
  if (modal) modal.classList.add("hidden");
  pendingPromotionSelection = null;
}

function promotionCodeToPiece(color, promotion) {
  const normalized = String(promotion || "queen").toLowerCase();

  if (normalized === "rook" || normalized === "r") {
    return color === "white" ? "♖" : "♜";
  }

  if (normalized === "bishop" || normalized === "b") {
    return color === "white" ? "♗" : "♝";
  }

  if (normalized === "knight" || normalized === "n") {
    return color === "white" ? "♘" : "♞";
  }

  return color === "white" ? "♕" : "♛";
}

function promotePawn(row, col, color, promotion = "queen") {
  const promotedPiece = promotionCodeToPiece(color, promotion);

  pieces[row][col] = promotedPiece;

  updateLastPromotionNotation(promotedPiece);

  if (pendingPromotionNotation) {
    finalizeMoveNotation(pendingPromotionNotation, color);

    pendingPromotionNotation = null;
  }

  createBoard();

  finishTurn();
}

// ======================================================
// AI SYSTEM
// ======================================================

const AI_PIECE_VALUES = {
  "♙": 100,
  "♘": 320,
  "♗": 330,
  "♖": 500,
  "♕": 900,
  "♔": 20000,

  "♟": 100,
  "♞": 320,
  "♝": 330,
  "♜": 500,
  "♛": 900,
  "♚": 20000,
};

const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_TABLE = [
  [0, 0, 0, 5, 5, 0, 0, 0],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const QUEEN_TABLE = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 5, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_TABLE = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

function getPositionBonus(piece, row, col) {
  const isWhite = getPieceColor(piece) === "white";

  const tableRow = isWhite ? row : 7 - row;

  let table = null;

  if (piece === "♙" || piece === "♟") {
    table = PAWN_TABLE;
  }

  if (piece === "♘" || piece === "♞") {
    table = KNIGHT_TABLE;
  }

  if (piece === "♗" || piece === "♝") {
    table = BISHOP_TABLE;
  }

  if (piece === "♖" || piece === "♜") {
    table = ROOK_TABLE;
  }

  if (piece === "♕" || piece === "♛") {
    table = QUEEN_TABLE;
  }

  if (piece === "♔" || piece === "♚") {
    table = KING_TABLE;
  }

  if (!table) {
    return 0;
  }

  return table[tableRow][col];
}

function evaluateBoard() {
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = pieces[row][col];

      if (piece === "") {
        continue;
      }

      const value = AI_PIECE_VALUES[piece] || 0;

      const positionBonus = getPositionBonus(piece, row, col);

      if (getPieceColor(piece) === "white") {
        score += value + positionBonus;
      } else {
        score -= value + positionBonus;
      }
    }
  }

  if (isKingInCheck("white")) {
    score -= 40;
  }

  if (isKingInCheck("black")) {
    score += 40;
  }

  return score;
}

function getAllLegalMoves(color) {
  const oldTurn = currentTurn;

  currentTurn = color;

  const allMoves = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = pieces[row][col];

      if (piece === "" || getPieceColor(piece) !== color) {
        continue;
      }

      const moves = getLegalMoves(row, col);

      for (const move of moves) {
        allMoves.push({
          fromRow: row,
          fromCol: col,
          toRow: move.row,
          toCol: move.col,
          moveData: move,
        });
      }
    }
  }

  currentTurn = oldTurn;

  return allMoves;
}

function saveSearchState() {
  return {
    board: copyBoard(),
    currentTurn,
    lastMove,
    halfmoveClock,

    whiteKingMoved,
    whiteKingsideRookMoved,
    whiteQueensideRookMoved,

    blackKingMoved,
    blackKingsideRookMoved,
    blackQueensideRookMoved,
  };
}

function restoreSearchState(state) {
  restoreBoard(state.board);

  currentTurn = state.currentTurn;

  lastMove = state.lastMove;

  halfmoveClock = state.halfmoveClock;

  whiteKingMoved = state.whiteKingMoved;

  whiteKingsideRookMoved = state.whiteKingsideRookMoved;

  whiteQueensideRookMoved = state.whiteQueensideRookMoved;

  blackKingMoved = state.blackKingMoved;

  blackKingsideRookMoved = state.blackKingsideRookMoved;

  blackQueensideRookMoved = state.blackQueensideRookMoved;
}

function applySearchMove(move) {
  const piece = pieces[move.fromRow][move.fromCol];

  const capturedPiece = pieces[move.toRow][move.toCol];

  const isCapture = capturedPiece !== "" || move.moveData.enPassant === true;

  if (move.moveData.enPassant) {
    pieces[move.fromRow][move.toCol] = "";
  }

  if (move.moveData.castle) {
    performCastling(move.fromRow, move.fromCol, move.toRow, move.toCol);
  } else {
    pieces[move.toRow][move.toCol] = piece;

    pieces[move.fromRow][move.fromCol] = "";

    if (piece === "♙" && move.toRow === 0) {
      pieces[move.toRow][move.toCol] = "♕";
    }

    if (piece === "♟" && move.toRow === 7) {
      pieces[move.toRow][move.toCol] = "♛";
    }
  }

  updateMovementState(piece, move.fromRow, move.fromCol);

  lastMove = {
    piece,
    fromRow: move.fromRow,
    fromCol: move.fromCol,
    toRow: move.toRow,
    toCol: move.toCol,
  };

  if (piece === "♙" || piece === "♟" || isCapture) {
    halfmoveClock = 0;
  } else {
    halfmoveClock++;
  }

  currentTurn = oppositeColor(currentTurn);
}

function orderAIMoves(moves) {
  return moves.sort((a, b) => {
    const scoreA = getMoveOrderingScore(a);

    const scoreB = getMoveOrderingScore(b);

    return scoreB - scoreA;
  });
}

function getMoveOrderingScore(move) {
  let score = 0;

  const movingPiece = pieces[move.fromRow][move.fromCol];

  const targetPiece = pieces[move.toRow][move.toCol];

  if (targetPiece !== "") {
    score += (AI_PIECE_VALUES[targetPiece] || 0) * 10;

    score -= AI_PIECE_VALUES[movingPiece] || 0;
  }

  if (move.moveData.enPassant) {
    score += 1000;
  }

  if (
    (movingPiece === "♙" && move.toRow === 0) ||
    (movingPiece === "♟" && move.toRow === 7)
  ) {
    score += 9000;
  }

  const state = saveSearchState();

  applySearchMove(move);

  if (isKingInCheck(currentTurn)) {
    score += 500;
  }

  restoreSearchState(state);

  return score;
}

function minimax(depth, alpha, beta) {
  const color = currentTurn;

  const legalMoves = getAllLegalMoves(color);

  if (legalMoves.length === 0) {
    if (isKingInCheck(color)) {
      if (color === AI_COLOR) {
        return 1000000 + depth;
      } else {
        return -1000000 - depth;
      }
    }

    return 0;
  }

  if (isInsufficientMaterial()) {
    return 0;
  }

  if (depth === 0) {
    return evaluateBoard();
  }

  orderAIMoves(legalMoves);

  if (color === AI_COLOR) {
    if (AI_COLOR === "black") {
      let bestScore = Infinity;

      for (const move of legalMoves) {
        const state = saveSearchState();

        applySearchMove(move);

        const score = minimax(depth - 1, alpha, beta);

        restoreSearchState(state);

        bestScore = Math.min(bestScore, score);

        beta = Math.min(beta, bestScore);

        if (beta <= alpha) {
          break;
        }
      }

      return bestScore;
    }

    let bestScore = -Infinity;

    for (const move of legalMoves) {
      const state = saveSearchState();

      applySearchMove(move);

      const score = minimax(depth - 1, alpha, beta);

      restoreSearchState(state);

      bestScore = Math.max(bestScore, score);

      alpha = Math.max(alpha, bestScore);

      if (beta <= alpha) {
        break;
      }
    }

    return bestScore;
  }

  if (AI_COLOR === "black") {
    let bestScore = -Infinity;

    for (const move of legalMoves) {
      const state = saveSearchState();

      applySearchMove(move);

      const score = minimax(depth - 1, alpha, beta);

      restoreSearchState(state);

      bestScore = Math.max(bestScore, score);

      alpha = Math.max(alpha, bestScore);

      if (beta <= alpha) {
        break;
      }
    }

    return bestScore;
  }

  let bestScore = Infinity;

  for (const move of legalMoves) {
    const state = saveSearchState();

    applySearchMove(move);

    const score = minimax(depth - 1, alpha, beta);

    restoreSearchState(state);

    bestScore = Math.min(bestScore, score);

    beta = Math.min(beta, bestScore);

    if (beta <= alpha) {
      break;
    }
  }

  return bestScore;
}

function findBestAIMove() {
  const aiMoves = getAllLegalMoves(AI_COLOR);

  if (aiMoves.length === 0) {
    return null;
  }

  orderAIMoves(aiMoves);

  // 新手難度只從合法棋步中隨機選擇，不會搜尋局面。
  if (AI_DIFFICULTY === "beginner") {
    return aiMoves[Math.floor(Math.random() * aiMoves.length)];
  }

  let bestMove = null;

  let bestScore = AI_COLOR === "black" ? Infinity : -Infinity;

  for (const move of aiMoves) {
    const state = saveSearchState();

    applySearchMove(move);

    const score = minimax(getAIDepth() - 1, -Infinity, Infinity);

    restoreSearchState(state);

    if (AI_COLOR === "black") {
      if (score < bestScore) {
        bestScore = score;

        bestMove = move;
      }
    } else {
      if (score > bestScore) {
        bestScore = score;

        bestMove = move;
      }
    }
  }

  // 簡單難度偶爾不選最佳步，讓玩家能把握可見的機會。
  if (AI_DIFFICULTY === "easy" && Math.random() < 0.35) {
    return aiMoves[Math.floor(Math.random() * aiMoves.length)];
  }

  return bestMove;
}

function getRandomAIThinkTime() {
  return (
    Math.floor(Math.random() * (AI_MAX_THINK_TIME - AI_MIN_THINK_TIME + 1)) +
    AI_MIN_THINK_TIME
  );
}

function startAITurn() {
  if (!AI_ENABLED || gameOver || currentTurn !== AI_COLOR) {
    return;
  }

  if (aiTurnTimer !== null) {
    clearTimeout(aiTurnTimer);

    aiTurnTimer = null;
  }

  aiThinking = true;

  updateTurnDisplay();

  aiTurnTimer = setTimeout(() => {
    aiTurnTimer = null;

    if (gameOver || currentTurn !== AI_COLOR) {
      aiThinking = false;

      updateTurnDisplay();

      return;
    }

    const bestMove = findBestAIMove();

    if (!bestMove) {
      aiThinking = false;

      checkGameState();

      return;
    }

    const thinkTime = getRandomAIThinkTime();

    console.log("AI calculated move.", "Waiting:", Math.round(thinkTime), "ms");

    aiTurnTimer = setTimeout(() => {
      aiTurnTimer = null;

      if (gameOver || currentTurn !== AI_COLOR) {
        aiThinking = false;

        updateTurnDisplay();

        return;
      }

      aiThinking = false;

      makeAIMove(bestMove);
    }, thinkTime);
  }, 100);
}

// ======================================================
// MAKE AI MOVE
// ======================================================

function makeAIMove(move) {
  if (isAnimating) {
    return;
  }
  // AI 最後一道合法性檢查
  const legalMoves = getLegalMoves(move.fromRow, move.fromCol);

  const isLegal = legalMoves.some(
    (legalMove) => legalMove.row === move.toRow && legalMove.col === move.toCol,
  );

  if (!isLegal) {
    console.warn("AI attempted an illegal move. Move rejected.");
    aiThinking = false;
    updateTurnDisplay();
    return;
  }

  const movingPiece = pieces[move.fromRow][move.fromCol];

  const capturedPiece = pieces[move.toRow][move.toCol];

  const isCapture = capturedPiece !== "" || move.moveData.enPassant === true;

  const aiMoveColor = currentTurn;

  const moveNotation = createSANMoveNotation(
    move.fromRow,
    move.fromCol,
    move.toRow,
    move.toCol,
    move.moveData,
  );

  if (move.moveData.enPassant) {
    pieces[move.fromRow][move.toCol] = "";
  }

  if (move.moveData.castle) {
    performCastling(move.fromRow, move.fromCol, move.toRow, move.toCol);
  } else {
    pieces[move.toRow][move.toCol] = movingPiece;

    pieces[move.fromRow][move.fromCol] = "";

    if (movingPiece === "♙" && move.toRow === 0) {
      pieces[move.toRow][move.toCol] = "♕";
    }

    if (movingPiece === "♟" && move.toRow === 7) {
      pieces[move.toRow][move.toCol] = "♛";
    }
  }

  updateMovementState(movingPiece, move.fromRow, move.fromCol);

  lastMove = {
    piece: movingPiece,
    fromRow: move.fromRow,
    fromCol: move.fromCol,
    toRow: move.toRow,
    toCol: move.toCol,
  };

  if (movingPiece === "♙" || movingPiece === "♟" || isCapture) {
    halfmoveClock = 0;
  } else {
    halfmoveClock++;
  }

  selectedSquare = null;

  createBoard();

  isAnimating = true;

  animateMove(move.fromRow, move.fromCol, move.toRow, move.toCol, () => {
    isAnimating = false;

    finalizeMoveNotation(moveNotation, aiMoveColor);

    switchTurn();

    recordCurrentPosition();

    createBoard();

    checkGameState();

    if (AI_ENABLED && !gameOver && currentTurn === AI_COLOR) {
      startAITurn();
    }
  });
}

// ======================================================
// START GAME
// ======================================================

initializePositionHistory();

createBoard();

updatePlayerColorUI();
updateAIDifficultyUI();
applyBoardTheme();
applyLanguage();

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSettings();
});

// ======================================================
// DEBUG
// ======================================================

console.log("Chess AI enabled:", AI_ENABLED);

console.log("Player color:", playerColor);

console.log("AI color:", AI_COLOR);

console.log("AI difficulty:", AI_DIFFICULTY);

console.log("AI search depth:", getAIDepth());

console.log("AI think time:", `${AI_MIN_THINK_TIME} - ${AI_MAX_THINK_TIME} ms`);

console.log("Material Score:", calculateMaterialScore());

console.log("Move history enabled:", true);

console.log("Board flip enabled:", true);
function resetTrainingGame() {
  if (!trainingMode || trainingStartPosition === null) {
    return;
  }

  if (aiTurnTimer !== null) {
    clearTimeout(aiTurnTimer);
    aiTurnTimer = null;
  }

  // 重設後回到「可擺盤、尚未開始」狀態
  trainingSetup = true;

  restoreBoard(trainingStartPosition);

  currentTurn = trainingStartTurn;
  playerColor = trainingStartPlayerColor;
  trainingPlayMode = trainingStartPlayMode;
  trainingAIColor = trainingStartAIColor;

  if (trainingPlayMode === "ai") {
    AI_ENABLED = true;
    AI_COLOR = trainingStartAIColor;
  } else {
    AI_ENABLED = false;
    AI_COLOR = null;
  }

  lastMove = null;
  selectedSquare = null;
  selectedSetupPiece = null;

  gameOver = false;
  aiThinking = false;
  isAnimating = false;

  moveHistory = [];
  positionHistory = new Map();
  halfmoveClock = 0;
  pendingPromotionNotation = null;

  // 訓練模式重設後禁止王車易位
  whiteKingMoved = true;
  whiteKingsideRookMoved = true;
  whiteQueensideRookMoved = true;

  blackKingMoved = true;
  blackKingsideRookMoved = true;
  blackQueensideRookMoved = true;

  initializePositionHistory();

  if (board) {
    createBoard();
  }

  updatePlayerColorUI();

  // 不要在這裡呼叫 startAITurn()
}
// ======================================================
// MAIN MENU / SCREEN SWITCHING
// ======================================================

function getElement(id) {
  return document.getElementById(id);
}

function showMainMenu() {
  const mainMenu = getElement("main-menu");
  const game = getElement("game");

  if (!mainMenu || !game) {
    console.error(
      "找不到 main-menu 或 game 元素。請確認 index.html 的 id 是否正確。",
    );
    return;
  }

  // 取消 AI 計時器
  if (aiTurnTimer !== null) {
    clearTimeout(aiTurnTimer);
    aiTurnTimer = null;
  }

  // 停止 AI 狀態
  aiThinking = false;
  isAnimating = false;
  selectedSquare = null;
  selectedSetupPiece = null;

  // 關閉訓練模式
  trainingMode = false;
  trainingSetup = false;

  // 顯示主選單，隱藏遊戲畫面
  mainMenu.classList.remove("hidden");
  game.classList.add("hidden");

  // 回到一般模式設定
  AI_ENABLED = true;
  AI_COLOR = oppositeColor(playerColor);

  const normalPanel = getElement("normal-panel");
  const trainingPanel = getElement("training-panel");

  if (normalPanel) {
    normalPanel.classList.remove("hidden");
  }

  if (trainingPanel) {
    trainingPanel.classList.add("hidden");
  }
}

function startNormalMode() {
  const mainMenu = getElement("main-menu");
  const game = getElement("game");

  if (!mainMenu || !game) return;

  onlineMode = false;
  onlineGameStarted = false;
  onlineRoomId = null;
  onlineColor = null;

  mainMenu.classList.add("hidden");
  game.classList.remove("hidden");

  trainingMode = false;
  trainingSetup = false;

  const normalPanel = getElement("normal-panel");
  const trainingPanel = getElement("training-panel");
  const onlinePanel = getElement("online-panel");

  if (normalPanel) {
    normalPanel.classList.remove("hidden");
  }

  if (trainingPanel) {
    trainingPanel.classList.add("hidden");
  }

  if (onlinePanel) {
    onlinePanel.classList.add("hidden");
  }

  AI_ENABLED = true;
  AI_COLOR = oppositeColor(playerColor);

  setNormalSidebarTab("play");
  resetGame();
}

function startTrainingMode() {
  const mainMenu = getElement("main-menu");
  const game = getElement("game");

  if (!mainMenu || !game) {
    console.error(
      "找不到 main-menu 或 game 元素。請確認 index.html 的 id 是否正確。",
    );
    return;
  }

  mainMenu.classList.add("hidden");
  game.classList.remove("hidden");

  openTrainingMode();
}
function startOnlineMode() {
  const mainMenu = document.getElementById("main-menu");
  const game = document.getElementById("game");
  const normalPanel = document.getElementById("normal-panel");
  const trainingPanel = document.getElementById("training-panel");
  const onlinePanel = document.getElementById("online-panel");

  onlineMode = true;
  AI_ENABLED = false;
  AI_COLOR = null;
  onlineGameStarted = false;
  onlineRoomId = null;
  onlineColor = null;

  if (mainMenu) {
    mainMenu.classList.add("hidden");
  }

  if (game) {
    game.classList.remove("hidden");
  }

  if (normalPanel) {
    normalPanel.classList.add("hidden");
  }

  if (trainingPanel) {
    trainingPanel.classList.add("hidden");
  }

  if (onlinePanel) {
    onlinePanel.classList.remove("hidden");
  }

  resetGame();
  connectOnlineSocket();
  showOnlineMenu();
  setOnlineStatus("請建立或加入房間");
}

function openOnlineMode() {
  const mainMenu = document.getElementById("main-menu");
  const game = document.getElementById("game");
  const normalPanel = document.getElementById("normal-panel");
  const trainingPanel = document.getElementById("training-panel");
  const onlinePanel = document.getElementById("online-panel");

  console.log("openOnlineMode()", {
    mainMenu,
    game,
    normalPanel,
    trainingPanel,
    onlinePanel,
  });

  onlineMode = true;
  AI_ENABLED = false;
  AI_COLOR = null;
  onlineGameStarted = false;
  onlineRoomId = null;
  onlineColor = null;

  if (mainMenu) {
    mainMenu.classList.add("hidden");
  }

  if (game) {
    game.classList.remove("hidden");
  }

  if (normalPanel) {
    normalPanel.classList.add("hidden");
  }

  if (trainingPanel) {
    trainingPanel.classList.add("hidden");
  }

  if (!onlinePanel) {
    console.error('找不到 id="online-panel"，請檢查 index.html。');
    return;
  }

  onlinePanel.classList.remove("hidden");

  resetGame();
  showOnlineMenu();
  setOnlineStatus("請建立或加入房間");
  connectOnlineSocket();
}

function closeOnlineMode() {
  const onlinePanel = document.getElementById("online-panel");

  if (onlinePanel) {
    onlinePanel.classList.add("hidden");
  }

  onlineMode = false;
  onlineGameStarted = false;
  onlineRoomId = null;
  onlineColor = null;
  AI_ENABLED = true;
  AI_COLOR = oppositeColor(playerColor);

  startNormalMode();
}

function showOnlineMenu() {
  const onlineMenu = document.getElementById("online-menu");
  const createPanel = document.getElementById("create-room-panel");
  const joinPanel = document.getElementById("join-room-panel");
  const roomPanel = document.getElementById("online-room-panel");

  if (onlineMenu) {
    onlineMenu.classList.remove("hidden");
  }

  if (createPanel) {
    createPanel.classList.add("hidden");
  }

  if (joinPanel) {
    joinPanel.classList.add("hidden");
  }

  if (roomPanel) {
    roomPanel.classList.add("hidden");
  }
}
function showCreateRoom() {
  const onlineMenu = document.getElementById("online-menu");
  const createPanel = document.getElementById("create-room-panel");

  if (onlineMenu) {
    onlineMenu.classList.add("hidden");
  }

  if (createPanel) {
    createPanel.classList.remove("hidden");
  }
}
function showJoinRoom() {
  const onlineMenu = document.getElementById("online-menu");
  const joinPanel = document.getElementById("join-room-panel");

  if (onlineMenu) {
    onlineMenu.classList.add("hidden");
  }

  if (joinPanel) {
    joinPanel.classList.remove("hidden");
  }

  const roomInput = document.getElementById("room-id");

  if (roomInput) {
    roomInput.focus();
  }
}
function showOnlineRoomPanel() {
  const onlineMenu = document.getElementById("online-menu");
  const createPanel = document.getElementById("create-room-panel");
  const joinPanel = document.getElementById("join-room-panel");
  const roomPanel = document.getElementById("online-room-panel");

  if (onlineMenu) {
    onlineMenu.classList.add("hidden");
  }

  if (createPanel) {
    createPanel.classList.add("hidden");
  }

  if (joinPanel) {
    joinPanel.classList.add("hidden");
  }

  if (roomPanel) {
    roomPanel.classList.remove("hidden");
  }
}

function setOnlineStatus(message) {
  const element = document.getElementById("online-status");

  if (element) {
    element.textContent = message;
  } else {
    console.log(message);
  }

  const roomElement = document.getElementById("current-room-id");

  if (roomElement) {
    roomElement.textContent = onlineRoomId || "—";
  }

  const colorElement = document.getElementById("current-player-color");

  if (colorElement) {
    colorElement.textContent =
      onlineColor === "white"
        ? "WHITE"
        : onlineColor === "black"
          ? "BLACK"
          : "—";
  }
}

let socket = null;
let onlineMode = false;
let onlineRoomId = null;
let onlineColor = null;
let onlineGameStarted = false;

function normalizeOnlineColor(color) {
  if (color === "w" || color === "white") {
    return "white";
  }

  if (color === "b" || color === "black") {
    return "black";
  }

  return null;
}

function connectOnlineSocket() {
  if (socket) {
    return socket;
  }

  if (typeof io !== "function") {
    console.error(
      "Socket.IO client 尚未載入，請確認 index.html 中有：",
      '<script src="/socket.io/socket.io.js"></script>',
    );

    setOnlineStatus("Socket.IO 尚未載入");
    return null;
  }

  socket = io();

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    setOnlineStatus("已連接伺服器，請建立或加入房間");
  });

  socket.on("gameStarted", (data) => {
    onlineMode = true;
    AI_ENABLED = false;
    AI_COLOR = null;
    onlineGameStarted = true;
    moveHistory = [];

    if (data && data.fen) {
      pieces = fenToPieces(data.fen);

      const turn = data.fen.split(" ")[1];

      currentTurn = turn === "w" ? "white" : "black";

      lastMove = null;
      selectedSquare = null;
      gameOver = false;

      createBoard();
    }

    showOnlineRoomPanel();

    setOnlineStatus("對手已加入，遊戲開始");

    updateTurnDisplay();
  });

  socket.on("roomReady", (data) => {
    onlineMode = true;
    AI_ENABLED = false;
    AI_COLOR = null;
    onlineGameStarted = true;

    if (data && data.roomId) {
      onlineRoomId = data.roomId;
    }

    showOnlineRoomPanel();
    setOnlineStatus("對手已加入，遊戲開始");
    updateTurnDisplay();
  });

  socket.on("moveMade", (data) => {
    console.log("收到 Server 棋步：", data);

    if (!data || !data.fen) {
      console.error("moveMade 沒有 FEN");
      return;
    }

    // ==========================================
    // Server 是 Online Mode 唯一真實棋盤
    // ==========================================

    pieces = fenToPieces(data.fen);

    // ==========================================
    // 從 FEN 取得目前回合
    // ==========================================

    const fenParts = data.fen.split(" ");
    const turn = fenParts[1];

    currentTurn = turn === "w" ? "white" : "black";

    // ==========================================
    // 更新最後一步
    // ==========================================

    if (data.move) {
      const from = squareToPosition(data.move.from);
      const to = squareToPosition(data.move.to);

      if (from && to) {
        lastMove = {
          piece: data.move.piece,
          fromRow: from.row,
          fromCol: from.col,
          toRow: to.row,
          toCol: to.col,
        };
      }

      addMoveToHistory(
        data.move.color === "w" ? "white" : "black",
        data.move.san || `${data.move.from}-${data.move.to}`,
      );
    }

    // ==========================================
    // 清除本地選取 / 動畫狀態
    // ==========================================

    selectedSquare = null;
    aiThinking = false;
    isAnimating = false;
    gameOver = false;

    // ==========================================
    // 重新繪製棋盤
    // ==========================================

    createBoard();

    // ==========================================
    // 檢查遊戲狀態
    // ==========================================

    checkGameState();

    console.log("Online 棋盤同步完成：", data.fen);
  });

  socket.on("gameOver", (data) => {
    gameOver = true;
    onlineGameStarted = false;

    setOnlineStatus(data && data.message ? data.message : "棋局結束");

    updateTurnDisplay();
  });

  socket.on("opponentDisconnected", () => {
    onlineGameStarted = false;
    setOnlineStatus("對手已離線");
    updateTurnDisplay();
  });

  socket.on("disconnect", () => {
    onlineGameStarted = false;
    setOnlineStatus("與伺服器中斷連線");
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
    setOnlineStatus("無法連接到伺服器");
  });

  return socket;
}

function getOnlineColorCode() {
  return onlineColor === "white" ? "w" : "b";
}

function createOnlineRoom() {
  const currentSocket = connectOnlineSocket();

  if (!currentSocket) {
    return;
  }

  onlineMode = true;
  AI_ENABLED = false;
  AI_COLOR = null;

  setOnlineStatus("正在建立房間……");

  currentSocket.emit("createRoom", (result) => {
    if (!result || !result.success) {
      setOnlineStatus(
        result && result.message ? result.message : "建立房間失敗",
      );
      return;
    }

    onlineRoomId = result.roomId;
    onlineColor = normalizeOnlineColor(result.color || "white");
    onlineGameStarted = false;
    moveHistory = [];
    updateMoveHistoryDisplay();

    showOnlineRoomPanel();

    setOnlineStatus(
      `房間 ${onlineRoomId} 已建立，你是${
        onlineColor === "white" ? "白方" : "黑方"
      }，等待對手加入`,
    );
  });
}

function joinOnlineRoom() {
  const currentSocket = connectOnlineSocket();

  if (!currentSocket) {
    setOnlineStatus("Socket.IO 尚未連線");
    return;
  }

  const input = document.getElementById("room-id");

  if (!input || !input.value.trim()) {
    setOnlineStatus("請輸入房間 ID");
    return;
  }

  const roomId = input.value.trim().toUpperCase();

  currentSocket.emit("joinRoom", roomId, (result) => {
    if (!result || !result.success) {
      setOnlineStatus(
        result && result.message ? result.message : "加入房間失敗",
      );
      return;
    }

    onlineMode = true;
    AI_ENABLED = false;
    AI_COLOR = null;
    onlineRoomId = result.roomId || roomId;
    onlineColor = normalizeOnlineColor(result.color || "black");
    onlineGameStarted = true;
    moveHistory = [];
    updateMoveHistoryDisplay();

    showOnlineRoomPanel();

    setOnlineStatus(
      `已加入房間 ${onlineRoomId}，你是${
        onlineColor === "white" ? "白方" : "黑方"
      }`,
    );

    updateTurnDisplay();
  });
}

function submitOnlineMove(from, to, promotion = null) {
  if (!socket || !onlineMode || !onlineGameStarted) {
    return false;
  }

  socket.emit(
    "submitMove",
    {
      from,
      to,
      promotion,
    },
    (result) => {
      if (!result || !result.success) {
        setOnlineStatus(result && result.message ? result.message : "棋步無效");
      }
    },
  );

  return true;
}

function applyOnlineMove(move) {
  if (!onlineMode || !onlineGameStarted || !move) {
    return;
  }

  const fromSquare = squareToPosition(move.from);
  const toSquare = squareToPosition(move.to);

  if (!fromSquare || !toSquare) {
    console.error("無效的線上棋步：", move);
    return;
  }

  // 如果現在輪到自己，表示收到的棋步可能是重複事件
  if (onlineColor === currentTurn) {
    console.warn("目前是自己的回合，忽略重複的遠端棋步。");
    return;
  }

  const legalMoves = getLegalMoves(fromSquare.row, fromSquare.col);

  const moveData = legalMoves.find(
    (candidate) =>
      candidate.row === toSquare.row && candidate.col === toSquare.col,
  );

  if (!moveData) {
    console.error("對手棋步不合法：", move);
    return;
  }

  const movingPiece = pieces[fromSquare.row][fromSquare.col];

  const isPromotion =
    (movingPiece === "♙" && toSquare.row === 0) ||
    (movingPiece === "♟" && toSquare.row === 7);

  if (isPromotion && !move.promotion) {
    console.error("遠端升變棋步缺少 promotion：", move);
    return;
  }

  const remoteMoveData = {
    ...moveData,
    promotion: move.promotion || null,
  };

  if (!moveData) {
    console.error("對手棋步不合法：", move);
    return;
  }

  makeMove(
    fromSquare.row,
    fromSquare.col,
    toSquare.row,
    toSquare.col,
    remoteMoveData,
    true,
  );
}

function squareToPosition(square) {
  if (typeof square !== "string" || !/^[a-h][1-8]$/.test(square)) {
    return null;
  }

  const col = FILES.indexOf(square[0]);
  const row = 8 - Number(square[1]);

  return { row, col };
}
function fenToPieces(fen) {
  const boardPart = fen.split(" ")[0];
  const rows = boardPart.split("/");

  const pieceMap = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",

    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
  };

  const newPieces = [];

  for (let row = 0; row < 8; row++) {
    const boardRow = [];
    const fenRow = rows[row];

    for (const char of fenRow) {
      if (/[1-8]/.test(char)) {
        const emptyCount = Number(char);

        for (let i = 0; i < emptyCount; i++) {
          boardRow.push("");
        }
      } else {
        boardRow.push(pieceMap[char] || "");
      }
    }

    newPieces.push(boardRow);
  }

  return newPieces;
}
function leaveOnlineRoom() {
  if (socket && onlineRoomId) {
    socket.emit("leaveRoom", {
      roomId: onlineRoomId,
    });
  }

  onlineMode = false;
  onlineGameStarted = false;
  onlineRoomId = null;
  onlineColor = null;

  AI_ENABLED = true;
  AI_COLOR = oppositeColor(playerColor);

  const onlinePanel = document.getElementById("online-panel");

  if (onlinePanel) {
    onlinePanel.classList.add("hidden");
  }

  startNormalMode();
}

// 📂 script.js

// =================================================================
// 1. ИМПОРТЫ FIREBASE (Импорт из firebase-init.js)
// =================================================================
import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from "./firebase-init.js";

const gamesCollection = collection(db, "games");

// =================================================================
// 2. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И СОСТОЯНИЕ
// =================================================================

let currentGameId = null;
let myTeam = null; // 'blue' или 'red'
let localInput = "";
let gameListener = null;

const TIME_LIMIT = 15;
let timerInterval;

// Элементы DOM
const elements = {
  lobbyOverlay: document.getElementById("lobby-overlay"),
  gameCodeInput: document.getElementById("game-code-input"),
  lobbyStatus: document.getElementById("lobby-status"),
  modalOverlay: document.getElementById("modal-overlay"),
  timerDisplay: document.getElementById("timer-display"),
  progressFill: document.getElementById("progress-fill"),
  winnerTitle: document.getElementById("winner-title"),
  gameRoot: document.getElementById("game-root"),
};

// Аудио (убедитесь, что MP3 файлы существуют)
const correctSounds = [
  document.getElementById("sound-correct-1"),
  document.getElementById("sound-correct-2"),
  document.getElementById("sound-correct-3"),
];
const errorSounds = [
  document.getElementById("sound-error-1"),
  document.getElementById("sound-error-2"),
  document.getElementById("sound-error-3"),
];

function playSound(isCorrect) {
  let soundList = isCorrect ? correctSounds : errorSounds;
  const randomIndex = Math.floor(Math.random() * soundList.length);
  const sound = soundList[randomIndex];
  if (sound) {
    sound.pause();
    sound.currentTime = 0;
    sound.play().catch((e) => console.error("Ошибка проигрывания звука:", e));
  }
}

// =================================================================
// 3. ЛОББИ И УПРАВЛЕНИЕ ИГРОЙ
// =================================================================

function generateGameCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function createGame() {
  const code = generateGameCode();
  currentGameId = code;
  myTeam = "blue";

  elements.lobbyStatus.innerText = `Создание игры: ${code}...`;

  const initialState = {
    code: code,
    status: "waiting",
    score: 50,
    maxNumber: 50,
    playerBlue: { id: "P1", points: 0, input: "" },
    playerRed: { id: null, points: 0, input: "" },
    problemBlue: generateMathProblem(50),
    problemRed: generateMathProblem(50),
    lastAction: Date.now(),
    lastUpdater: "server",
  };

  try {
    await setDoc(doc(gamesCollection, code), initialState);
    elements.lobbyStatus.innerText = `Игра создана. Код: ${code}. Ожидаем соперника...`;

    listenToGame(code);
  } catch (error) {
    console.error("Ошибка при создании игры: ", error);
    elements.lobbyStatus.innerText = `Ошибка при создании игры. Попробуйте еще раз.`;
  }
}

async function joinGame() {
  const code = elements.gameCodeInput.value.trim();
  if (code.length !== 4 || isNaN(code)) {
    elements.lobbyStatus.innerText = "Код должен состоять из 4 цифр.";
    return;
  }

  const gameRef = doc(gamesCollection, code);
  const gameDoc = await getDoc(gameRef);

  if (!gameDoc.exists || gameDoc.data().status !== "waiting") {
    elements.lobbyStatus.innerText =
      "Игра с таким кодом не найдена или уже началась.";
    return;
  }

  currentGameId = code;
  myTeam = "red";

  elements.lobbyStatus.innerText = `Присоединяемся к игре ${code}...`;

  try {
    await updateDoc(gameRef, {
      "playerRed.id": "P2",
      status: "playing",
    });

    listenToGame(code);
  } catch (error) {
    console.error("Ошибка при присоединении: ", error);
    elements.lobbyStatus.innerText = "Ошибка при присоединении к игре.";
  }
}

function listenToGame(code) {
  if (gameListener) {
    gameListener();
  }

  const gameRef = doc(gamesCollection, code);

  gameListener = onSnapshot(
    gameRef,
    (doc) => {
      if (doc.exists) {
        const gameState = doc.data();
        updateGameUI(gameState);
      } else {
        alert("Игра завершена или удалена!");
        resetToLobby();
      }
    },
    (error) => {
      console.error("Ошибка при получении данных Firestore: ", error);
    }
  );
}

function updateGameUI(gameState) {
  if (gameState.status === "waiting") {
    elements.lobbyOverlay.classList.add("show");
    elements.gameRoot.style.display = "none";
    elements.lobbyStatus.innerText = `Игра создана. Код: ${gameState.code}. Ожидаем соперника...`;
    return;
  }

  if (gameState.status === "playing") {
    elements.lobbyOverlay.classList.remove("show");
    elements.gameRoot.style.display = "flex";

    if (!timerInterval) {
      startTimer(gameState.lastAction);
    }

    const blueProblem = gameState.problemBlue.expression;
    const redProblem = gameState.problemRed.expression;

    document.getElementById("problem-blue").innerText = blueProblem;
    document.getElementById("problem-red").innerText = redProblem;

    document.getElementById(
      "score-blue"
    ).innerText = `Очки: ${gameState.playerBlue.points}`;
    document.getElementById(
      "score-red"
    ).innerText = `Очки: ${gameState.playerRed.points}`;

    updateProgressBar(gameState.score);

    const opponentTeam = myTeam === "blue" ? "red" : "blue";
    const opponentPlayerData =
      opponentTeam === "red" ? gameState.playerRed : gameState.playerBlue;

    // Настройка порядка зон и заголовков
    if (myTeam === "red") {
      document.getElementById("team-name-blue").innerText = `СОПЕРНИК (СИНИЕ)`;
      document.getElementById("team-name-red").innerText = `ВЫ (КРАСНЫЕ)`;

      document.querySelector(".player-zone.blue").style.order = 1;
      document.querySelector(".player-zone.red").style.order = 0;

      document.getElementById("numpad-blue").style.pointerEvents = "none";
      document.getElementById("numpad-red").style.pointerEvents = "auto";
    } else {
      document.getElementById("team-name-blue").innerText = `ВЫ (СИНИЕ)`;
      document.getElementById("team-name-red").innerText = `СОПЕРНИК (КРАСНЫЕ)`;

      document.querySelector(".player-zone.blue").style.order = 0;
      document.querySelector(".player-zone.red").style.order = 1;

      document.getElementById("numpad-blue").style.pointerEvents = "auto";
      document.getElementById("numpad-red").style.pointerEvents = "none";
    }

    // Обновляем ввод
    document.getElementById(`answer-${myTeam}`).innerText =
      localInput === "" ? "..." : localInput;
    document.getElementById(`answer-${opponentTeam}`).innerText =
      opponentPlayerData.input === "" ? "..." : opponentPlayerData.input;

    // 5. Проверка на победу
    if (gameState.score >= 100) {
      endGame("СИНЯЯ КОМАНДА ПОБЕДИЛА!", "var(--blue)");
    } else if (gameState.score <= 0) {
      endGame("КРАСНАЯ КОМАНДА ПОБЕДИЛА!", "var(--red)");
    }
  }
}

// =================================================================
// 4. ЛОГИКА ТАЙМЕРА И СЧЕТА
// =================================================================

function startTimer(lastActionTime) {
  clearInterval(timerInterval);
  const now = Date.now();
  const elapsedTime = Math.floor((now - lastActionTime) / 1000);

  let timeLeft = TIME_LIMIT - elapsedTime;

  const timerDisplay = elements.timerDisplay;

  timerInterval = setInterval(async () => {
    timeLeft--;

    if (timeLeft < 0) {
      clearInterval(timerInterval);
      handleTimeOut();
      return;
    }

    timerDisplay.innerText = `Время: ${timeLeft}`;

    if (timeLeft <= 5) {
      timerDisplay.classList.add("time-low");
    } else {
      timerDisplay.classList.remove("time-low");
    }
  }, 1000);
}

async function handleTimeOut() {
  if (!currentGameId || !myTeam) return;

  const gameRef = doc(gamesCollection, currentGameId);

  try {
    const gameDoc = await getDoc(gameRef);
    if (!gameDoc.exists) return;
    const gameState = gameDoc.data();

    const now = Date.now();
    const elapsedTime = Math.floor((now - gameState.lastAction) / 1000);

    if (elapsedTime >= TIME_LIMIT) {
      const max = gameState.maxNumber;

      await updateDoc(gameRef, {
        score: gameState.score - 5,
        problemBlue: generateMathProblem(max),
        problemRed: generateMathProblem(max),
        lastAction: now,
        lastUpdater: "timeout",
      });
    }
  } catch (e) {
    console.error("Ошибка таймаута:", e);
  } finally {
    startTimer(Date.now());
  }
}

function updateProgressBar(currentScore) {
  const fill = elements.progressFill;

  let fillWidth = (currentScore / 100) * 100;
  let redPercent = 100 - fillWidth;
  let bluePercent = fillWidth;

  fill.style.background = `linear-gradient(90deg, var(--blue) 0%, var(--blue) ${bluePercent}%, var(--red) ${bluePercent}%, var(--red) 100%)`;
  fill.style.width = fillWidth + "%";
}

// =================================================================
// 5. ЛОГИКА ВВОДА ИГРОКА И СИНХРОНИЗАЦИЯ
// =================================================================

function addNumber(team, number) {
  if (team !== myTeam || !currentGameId) return;

  if (localInput.length < 3) {
    localInput += number;
    document.getElementById(`answer-${myTeam}`).innerText = localInput;
    updateOpponentInput();
  }
}

function clearInput(team) {
  if (team !== myTeam || !currentGameId) return;

  localInput = "";
  document.getElementById(`answer-${myTeam}`).innerText = "...";
  updateOpponentInput();
}

async function updateOpponentInput() {
  if (!currentGameId || !myTeam) return;

  const gameRef = doc(gamesCollection, currentGameId);

  const updateData = {};
  if (myTeam === "blue") {
    updateData["playerBlue.input"] = localInput;
  } else {
    updateData["playerRed.input"] = localInput;
  }

  try {
    await updateDoc(gameRef, updateData);
  } catch (e) {
    console.error("Ошибка обновления ввода:", e);
  }
}

async function submitAnswer(team) {
  if (team !== myTeam || !currentGameId) return;
  if (localInput === "") return;

  const playerAnswer = parseInt(localInput);
  const gameRef = doc(gamesCollection, currentGameId);

  const btn = document.querySelector(`#numpad-${myTeam} .btn-enter`);
  btn.disabled = true;

  try {
    const gameDoc = await getDoc(gameRef);
    if (!gameDoc.exists || gameState.status !== "playing") return;
    const gameState = gameDoc.data();
    const max = gameState.maxNumber;

    let isCorrect = false;
    let newScore = gameState.score;
    let newProblem;
    let newPoints =
      myTeam === "blue"
        ? gameState.playerBlue.points
        : gameState.playerRed.points;

    const currentProblemState =
      myTeam === "blue" ? gameState.problemBlue : gameState.problemRed;

    if (playerAnswer === currentProblemState.answer) {
      isCorrect = true;
      playSound(true);
      newPoints++;

      if (myTeam === "blue") {
        newScore += 10;
      } else {
        newScore -= 10;
      }

      newProblem = generateMathProblem(max);
    } else {
      playSound(false);
      newScore -= 5;
      newProblem = currentProblemState;
    }

    const updateData = {
      score: newScore,
      lastAction: Date.now(),
      lastUpdater: myTeam,
    };

    if (myTeam === "blue") {
      updateData["playerBlue.points"] = newPoints;
      updateData["problemBlue"] = newProblem;
      updateData["playerBlue.input"] = "";
    } else {
      updateData["playerRed.points"] = newPoints;
      updateData["problemRed"] = newProblem;
      updateData["playerRed.input"] = "";
    }

    showFeedback(myTeam, isCorrect);

    localInput = "";
    await updateDoc(gameRef, updateData);

    startTimer(Date.now());
  } catch (error) {
    console.error("Ошибка при отправке ответа: ", error);
  } finally {
    btn.disabled = false;
  }
}

// =================================================================
// 6. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И ЭКСПОРТ
// =================================================================

function generateMathProblem(max) {
  const num1 = Math.floor(Math.random() * max) + 1;
  const num2 = Math.floor(Math.random() * max) + 1;
  const isPlus = Math.random() > 0.5;

  let expression = "";
  let answer = 0;

  if (isPlus) {
    expression = `${num1} + ${num2}`;
    answer = num1 + num2;
  } else {
    const maxVal = Math.max(num1, num2);
    const minVal = Math.min(num1, num2);
    expression = `${maxVal} - ${minVal}`;
    answer = maxVal - minVal;
  }

  return { expression, answer };
}

function showFeedback(team, isCorrect) {
  const display = document.getElementById(`answer-${team}`);

  if (isCorrect) {
    display.style.borderColor = "rgba(100, 255, 100, 0.5)";
    display.style.filter = "drop-shadow(0 0 5px rgba(0, 255, 0, 0.8))";
  } else {
    display.style.borderColor = "rgba(255, 100, 100, 0.5)";
    display.style.filter = "drop-shadow(0 0 5px rgba(255, 0, 0, 0.8))";
  }

  setTimeout(() => {
    display.style.borderColor = "rgba(255,255,255,0.1)";
    display.style.filter = "none";
  }, 500);
}

function endGame(message, color) {
  clearInterval(timerInterval);
  timerInterval = null;

  elements.winnerTitle.innerText = message;
  elements.winnerTitle.style.color = color;
  elements.modalOverlay.classList.add("show");
}

function resetToLobby() {
  if (gameListener) {
    gameListener();
  }

  currentGameId = null;
  myTeam = null;
  localInput = "";
  clearInterval(timerInterval);
  timerInterval = null;

  elements.modalOverlay.classList.remove("show");
  elements.gameRoot.style.display = "none";
  elements.lobbyOverlay.classList.add("show");
  elements.gameCodeInput.value = "";
  elements.lobbyStatus.innerText = "Ожидание...";

  document.querySelector(".player-zone.blue").style.order = 0;
  document.querySelector(".player-zone.red").style.order = 1;
  document.getElementById("team-name-blue").innerText = `ВЫ (СИНИЕ)`;
}

// Делаем функции доступными для HTML через глобальный объект window.game
window.game = {
  createGame,
  joinGame,
  addNumber,
  clearInput,
  submitAnswer,
  resetToLobby,
};

// === ГЛОБАЛЬНЫЕ НАСТРОЙКИ И СОСТОЯНИЕ ===
let score = 50;
let gameActive = false;
let maxNumber = 20;
const TIME_LIMIT = 10;
let timeLeft = TIME_LIMIT;

// Храним правильные ответы
let answerBlue = 0;
let answerRed = 0;

// Храним ввод игроков
let inputBlue = "";
let inputRed = "";

// Счетчики очков (правильных ответов)
let pointsBlue = 0;
let pointsRed = 0;

// Таймер
let timerInterval;

// Ссылки на аудио (оставляем массив для нескольких звуков)
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

// === ФУНКЦИИ ЗВУКА ===
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

// === УСТАНОВКА СЛОЖНОСТИ ===
window.onload = function () {
  correctSounds.forEach((s) => s && s.load());
  errorSounds.forEach((s) => s && s.load());
  document.getElementById("settings-overlay").style.display = "flex";
};

function setDifficulty(number) {
  maxNumber = number;
  document.getElementById("settings-overlay").style.display = "none";
  startNewGame();
}

// === УПРАВЛЕНИЕ ТАЙМЕРОМ ===
function startTimer() {
  clearInterval(timerInterval);
  timeLeft = TIME_LIMIT;

  const timerDisplay = document.getElementById("timer-display");
  timerDisplay.innerText = `Время: ${timeLeft}`;
  timerDisplay.classList.remove("time-low");

  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.innerText = `Время: ${timeLeft}`;

    // Красный эффект при малом времени
    if (timeLeft <= 3) {
      timerDisplay.classList.add("time-low");
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeOut();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function handleTimeOut() {
  // При таймауте обе команды теряют
  score -= 5;
  updateProgressBar();

  generateProblem("blue");
  generateProblem("red");

  startTimer();
}

// === ИГРОВЫЕ ФУНКЦИИ ===
function startNewGame() {
  score = 50;
  gameActive = true;
  pointsBlue = 0;
  pointsRed = 0;

  document.getElementById("modal-overlay").style.display = "none";

  updateProgressBar();
  updateScores();

  generateProblem("blue");
  generateProblem("red");

  updateDisplay("blue");
  updateDisplay("red");

  startTimer();
}

// Генерация случайного примера (Использует maxNumber)
function generateProblem(team) {
  if (!gameActive) return;

  const num1 = Math.floor(Math.random() * maxNumber) + 1;
  const num2 = Math.floor(Math.random() * maxNumber) + 1;
  const isPlus = Math.random() > 0.5;

  let problemText = "";
  let correct = 0;

  if (isPlus) {
    problemText = `${num1} + ${num2}`;
    correct = num1 + num2;
  } else {
    const max = Math.max(num1, num2);
    const min = Math.min(num1, num2);
    problemText = `${max} - ${min}`;
    correct = max - min;
  }

  if (team === "blue") {
    document.getElementById("problem-blue").innerText = problemText;
    answerBlue = correct;
    inputBlue = "";
    updateDisplay("blue");
  } else {
    document.getElementById("problem-red").innerText = problemText;
    answerRed = correct;
    inputRed = "";
    updateDisplay("red");
  }
}

// Добавление цифры
function addNumber(team, number) {
  if (!gameActive) return;

  if (team === "blue") {
    if (inputBlue.length < 3) {
      inputBlue += number;
      updateDisplay("blue");
    }
  } else {
    if (inputRed.length < 3) {
      inputRed += number;
      updateDisplay("red");
    }
  }
}

// Кнопка C (Очистить)
function clearInput(team) {
  if (!gameActive) return;

  if (team === "blue") {
    inputBlue = "";
    updateDisplay("blue");
  } else {
    inputRed = "";
    updateDisplay("red");
  }
}

// Обновление экрана ответа
function updateDisplay(team) {
  let text = team === "blue" ? inputBlue : inputRed;
  let displayElement = document.getElementById(`answer-${team}`);

  displayElement.innerText = text === "" ? "..." : text;
  // Возвращаем стандартный фон (прозрачный)
  displayElement.style.backgroundColor = "transparent";
  displayElement.style.borderColor = "rgba(255,255,255,0.02)";
}

// Обновление счетчиков очков
function updateScores() {
  document.getElementById("score-blue").innerText = `Очки: ${pointsBlue}`;
  document.getElementById("score-red").innerText = `Очки: ${pointsRed}`;
}

// Кнопка OK (Проверка ответа)
function checkAnswer(team) {
  if (!gameActive) return;

  let playerInputStr = team === "blue" ? inputBlue : inputRed;

  if (playerInputStr === "") return;

  let playerAnswer = parseInt(playerInputStr);
  let correctAnswer = team === "blue" ? answerBlue : answerRed;

  if (playerAnswer === correctAnswer) {
    // ПРАВИЛЬНО
    showFeedback(team, true);
    playSound(true);

    if (team === "blue") {
      score += 10;
      pointsBlue++;
    } else {
      score -= 10;
      pointsRed++;
    }

    updateProgressBar();
    updateScores();
    generateProblem(team);

    startTimer();
  } else {
    // НЕПРАВИЛЬНО
    showFeedback(team, false);
    playSound(false);
    clearInput(team);

    // Штраф
    score -= 5;
    updateProgressBar();

    generateProblem(team);
  }
}

// Анимация индикации ответа (ИСПРАВЛЕНО)
function showFeedback(team, isCorrect) {
  const display = document.getElementById(`answer-${team}`);

  if (isCorrect) {
    // ЗЕЛЕНАЯ ИНДИКАЦИЯ (меняем только рамку и добавляем свечение)
    display.style.borderColor = "rgba(100, 255, 100, 0.5)";
    display.style.filter = "drop-shadow(0 0 5px rgba(0, 255, 0, 0.8))";
  } else {
    // КРАСНАЯ ИНДИКАЦИЯ
    display.style.borderColor = "rgba(255, 100, 100, 0.5)";
    display.style.filter = "drop-shadow(0 0 5px rgba(255, 0, 0, 0.8))";
  }

  // Сброс через 500ms
  setTimeout(() => {
    display.style.borderColor = "rgba(255,255,255,0.02)"; // Стандартная рамка
    display.style.filter = "none"; // Убираем свечение
  }, 500);
}

// Двигаем полоску и проверяем победу
function updateProgressBar() {
  const fill = document.getElementById("progress-fill");

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  // Окрашивание полосы в красный/синий
  let fillWidth = (score / 100) * 100; // Прогресс в процентах
  let redPercent = 100 - fillWidth;
  let bluePercent = fillWidth;

  // Создаем градиент для правильного отображения цветов в Progress-fill
  fill.style.background = `linear-gradient(90deg, var(--blue) 0%, var(--blue) ${bluePercent}%, var(--red) ${bluePercent}%, var(--red) 100%)`;

  // Для анимации используем ширину
  fill.style.width = fillWidth + "%";

  checkWin();
}

// Проверяем победителя
function checkWin() {
  if (score >= 100) {
    endGame("СИНЯЯ КОМАНДА ПОБЕДИЛА!", "var(--blue)");
  } else if (score <= 0) {
    endGame("КРАСНАЯ КОМАНДА ПОБЕДИЛА!", "var(--red)");
  }
}

// Завершение игры
function endGame(message, color) {
  gameActive = false;
  stopTimer();
  const modal = document.getElementById("modal-overlay");
  const title = document.getElementById("winner-title");

  title.innerText = message;
  title.style.color = color;
  modal.style.display = "flex";
}

// Перезапуск игры
function restartGame() {
  document.getElementById("modal-overlay").style.display = "none";
  document.getElementById("settings-overlay").style.display = "flex";
}

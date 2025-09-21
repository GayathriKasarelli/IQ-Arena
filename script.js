// ---------------- Variables ----------------
const playerNameInput = document.getElementById('player-name');
const startBtn = document.getElementById('start-btn');
const toggleModeBtn = document.getElementById('toggle-mode');
const toggleSoundBtn = document.getElementById('toggle-sound');
const categorySelect = document.getElementById('category');
const difficultySelect = document.getElementById('difficulty');

const quizEl = document.getElementById('quiz');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const nextBtn = document.getElementById('next-btn');
const scoreEl = document.getElementById('score');
const progressEl = document.getElementById('progress');
const progressBar = document.getElementById('progress-bar');
const leaderboardContainer = document.getElementById('leaderboard-container');
const leaderboardList = document.getElementById('leaderboard-list');
const restartBtn = document.getElementById('restart-btn');
const backBtnHome = document.getElementById('back-btn');
const quitBtn = document.getElementById('quit-btn');

const TIME_PER_QUESTION = 15;

let currentQuestionIndex = 0;
let score = 0;
let timer;
let timeLeft;
let questions = [];
let playerName = "";
let soundOn = true;

// ---------------- Load Categories ----------------
async function loadCategories() {
  const res = await fetch("https://opentdb.com/api_category.php");
  const data = await res.json();
  data.trivia_categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name;
    categorySelect.appendChild(opt);
  });
}
loadCategories();

// ---------------- Sounds ----------------
const correctSound = new Audio('https://www.myinstants.com/media/sounds/correct.mp3');
const wrongSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_buzzer-incorrect-1-18594.mp3?filename=buzzer-incorrect-1-18594.mp3');

// ---------------- Timer ----------------
function stopTimer() {
  clearInterval(timer);
}
function startTimer() {
  timeLeft = TIME_PER_QUESTION;
  const timeEl = document.getElementById("time");
  timeEl.textContent = timeLeft;
  timeEl.classList.remove("low");

  timer = setInterval(() => {
    timeLeft--;
    timeEl.textContent = timeLeft;

    if (timeLeft <= 5) timeEl.classList.add("low");

    if(timeLeft <= 0) {
      stopTimer();
      revealAnswer();
      setTimeout(nextQuestion, 1000);
    }
  }, 1000);
}

// ---------------- Fetch Questions ----------------
async function fetchQuestions() {
  const cat = categorySelect.value;
  const diff = difficultySelect.value;

  let url = `https://opentdb.com/api.php?amount=15&type=multiple`;
  if (cat !== "any") url += `&category=${cat}`;
  if (diff !== "all") url += `&difficulty=${diff}`;

  const res = await fetch(url);
  const data = await res.json();

  questions = data.results.map(q => {
    const options = [...q.incorrect_answers, q.correct_answer];
    shuffle(options);
    return {
      question: decodeHTML(q.question),
      options: options.map(o => decodeHTML(o)),
      answer: decodeHTML(q.correct_answer)
    };
  });
}

// Decode HTML entities (API returns &quot;, etc.)
function decodeHTML(str) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

// ---------------- Utility ----------------
function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}
function resetState() {
  stopTimer();
  optionsEl.innerHTML = "";
}

// Clear result note if exists
function clearResultNote() {
  const oldNote = document.querySelector(".result-note");
  if (oldNote) oldNote.remove();
}

// ---------------- Quiz Flow ----------------
async function startQuiz() {
  playerName = playerNameInput.value.trim() || "Anonymous";

  await fetchQuestions();

  if (questions.length === 0) {
    alert("No questions found. Try different settings.");
    return;
  }

  startBtn.parentElement.classList.add('hidden');
  quizEl.classList.remove('hidden');
  currentQuestionIndex = 0;
  score = 0;
  scoreEl.textContent = score;

  backBtnHome.classList.remove('hidden');
  quitBtn.classList.remove('hidden');

  clearResultNote(); // ✅ fix applied

  showQuestion();
  updateProgress();
}

function showQuestion() {
  resetState();
  const qObj = questions[currentQuestionIndex];
  questionEl.textContent = qObj.question;

  qObj.options.forEach(option => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.addEventListener("click", selectAnswer);
    optionsEl.appendChild(btn);
  });

  startTimer();
}

function selectAnswer(e) {
  stopTimer();
  const selectedBtn = e.target;
  const correctAnswer = questions[currentQuestionIndex].answer;

  if(selectedBtn.textContent === correctAnswer) {
    selectedBtn.classList.add("correct");
    score++;
    scoreEl.textContent = score;
    if(soundOn) correctSound.play();
    launchConfetti();
  } else {
    selectedBtn.classList.add("wrong");
    revealAnswer();
    if(soundOn) wrongSound.play();
  }
  setTimeout(nextQuestion, 1200);
}

function revealAnswer() {
  const correctAnswer = questions[currentQuestionIndex].answer;
  Array.from(optionsEl.children).forEach(btn => {
    if (btn.textContent === correctAnswer) btn.classList.add("correct");
    btn.disabled = true;
  });
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
    showQuestion();
    updateProgress();
  } else {
    quizEnd();
  }
}

function updateProgress() {
  const total = questions.length;
  const current = currentQuestionIndex + 1;
  progressEl.textContent = `${current}/${total}`;
  progressBar.style.width = `${(current / total) * 100}%`;
}

// ---------------- End & Leaderboard ----------------
function quizEnd() {
  stopTimer();
  questionEl.textContent = "🎉 Quiz Completed!";
  optionsEl.innerHTML = "";
  nextBtn.style.display = "none";
  document.getElementById("timer").style.display = "none";

  const totalQuestions = questions.length;
  progressEl.textContent = `Final Score: ${score}/${totalQuestions}`;

  // Result note
  const resultNote = document.createElement("div");
  resultNote.classList.add("result-note");
  resultNote.style.color = score < totalQuestions/2 ? "#dc3545" : "#28a745";
  resultNote.textContent = score < totalQuestions/2 
    ? "💡 Better luck next time!" 
    : "🎉 Well done!";
  quizEl.appendChild(resultNote);

  saveScore(categorySelect.value, score);
  showLeaderboard();
}

function saveScore(category, score) {
  let leaderboard = JSON.parse(localStorage.getItem("quizLeaderboard")) || {};
  if (!leaderboard[category]) leaderboard[category] = [];
  leaderboard[category].push({ name: playerName, score: score });
  leaderboard[category] = leaderboard[category].sort((a,b)=>b.score-a.score).slice(0,5);
  localStorage.setItem("quizLeaderboard", JSON.stringify(leaderboard));
}

function showLeaderboard() {
  let leaderboard = JSON.parse(localStorage.getItem("quizLeaderboard")) || {};
  leaderboardList.innerHTML = "";

  const cat = categorySelect.value;
  if (!leaderboard[cat] || leaderboard[cat].length === 0) {
    leaderboardList.innerHTML = "<div>No scores yet.</div>";
  } else {
    leaderboardList.innerHTML += `<div><strong>${cat === "any" ? "All Categories" : cat}:</strong></div>`;
    leaderboard[cat].forEach((entry,index)=>{
      let medal = ["🏆","🥈","🥉"][index] || "";
      leaderboardList.innerHTML += `<div>${medal} ${index+1}. ${entry.name} - ${entry.score} pts</div>`;
    });
  }

  leaderboardList.innerHTML += `<button id="clear-leaderboard" class="clear-btn">🗑️ Clear Leaderboard</button>`;
  leaderboardContainer.classList.remove("hidden");

  document.getElementById("clear-leaderboard").addEventListener("click", () => {
    if(confirm("Are you sure you want to clear the leaderboard?")) {
      localStorage.removeItem("quizLeaderboard");
      leaderboardList.innerHTML = "<div>Leaderboard cleared.</div>";
    }
  });
}

// ---------------- Buttons ----------------
startBtn.addEventListener("click", startQuiz);
nextBtn.addEventListener("click", nextQuestion);
backBtnHome.addEventListener("click", () => {
  clearInterval(timer);
  quizEl.classList.add('hidden');
  leaderboardContainer.classList.add('hidden');
  startBtn.parentElement.classList.remove('hidden');
  backBtnHome.classList.add('hidden');
  quitBtn.classList.add('hidden');
  currentQuestionIndex = 0;
  score = 0;
  scoreEl.innerHTML = score;
  document.getElementById("time").innerHTML = TIME_PER_QUESTION;
  nextBtn.style.display = "inline-block";
  document.getElementById("timer").style.display = "inline-block";
  clearResultNote(); // ✅ fix applied
});

restartBtn.addEventListener("click", () => {
  leaderboardContainer.classList.add("hidden");
  quizEl.classList.add("hidden");
  startBtn.parentElement.classList.remove("hidden");
  quitBtn.classList.add('hidden');

  nextBtn.style.display = "inline-block";
  document.getElementById("timer").style.display = "inline-block";
  playerNameInput.value = "";
  clearResultNote(); // ✅ fix applied
});

// Quit button
quitBtn.addEventListener("click", () => {
  alert("Thanks for participating! 👋");
  window.location.reload(); 
});

// Dark/Light Mode
toggleModeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  document.body.classList.toggle("light-mode");
  toggleModeBtn.textContent = document.body.classList.contains("dark-mode")
    ? "☀️ Light Mode"
    : "🌙 Dark Mode";
});

// Toggle Sound
toggleSoundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  toggleSoundBtn.textContent = soundOn ? "🔊 Sound On" : "🔇 Sound Off";
});

// ---------------- Confetti ----------------
function launchConfetti() {
  confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
}

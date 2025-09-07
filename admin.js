import { firebaseConfig } from './firebase-config.js';

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const gameRef = database.ref('game');
let questions;
let timerInterval;

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const nextRoundBtn = document.getElementById('next-round-btn');
const countdownEl = document.getElementById('countdown');
const currentQuestionEl = document.getElementById('current-question-text');
const scoresListEl = document.getElementById('scores-list');

// Novos elementos para o QR Code
const qrCodeContainer = document.getElementById('qr-code-container');
const gameInfo = document.getElementById('game-info');

// Função para gerar e exibir o QR Code
const generateQRCode = () => {
    // Pega o URL da página atual (ex: https://usuario.github.io/projeto/)
    const baseUrl = window.location.href.split('index.html')[0];
    const playerUrl = `${baseUrl}player.html`;
    
    // Configura e gera o QR Code
    new QRCode(document.getElementById("qrcode"), {
        text: playerUrl,
        width: 256,
        height: 256,
        colorDark: "#FFD700",
        colorLight: "#222222",
        correctLevel: QRCode.CorrectLevel.H
    });
};

const resetGame = () => {
    gameRef.set({
        status: 'paused',
        currentQuestionIndex: -1,
        scores: {},
        currentQuestion: null,
        timer: 60
    });
    // Mostra o QR Code ao reiniciar
    qrCodeContainer.style.display = 'flex';
    gameInfo.style.display = 'none';
};

const loadQuestions = async () => {
    const response = await fetch('questions.json');
    questions = await response.json();
    console.log("Perguntas carregadas:", questions);
};

const startGame = () => {
    qrCodeContainer.style.display = 'none'; // Esconde o QR Code
    gameInfo.style.display = 'block'; // Mostra a tela do jogo
    resetGame();
    setTimeout(() => {
        gameRef.update({ status: 'active', currentQuestionIndex: 0 });
    }, 500);
};

// ... O resto do código (startTimer, nextQuestion, etc.) permanece o mesmo ...
// ... Basta copiar e colar o código anterior a partir daqui ...
const startTimer = () => {
    clearInterval(timerInterval);
    let timeLeft = 60;
    countdownEl.textContent = timeLeft;
    gameRef.update({ timer: timeLeft });

    timerInterval = setInterval(() => {
        timeLeft--;
        countdownEl.textContent = timeLeft;
        gameRef.update({ timer: timeLeft });

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            nextQuestion();
        }
    }, 1000);
};

const nextQuestion = () => {
    clearInterval(timerInterval);
    gameRef.once('value', (snapshot) => {
        const gameData = snapshot.val();
        let nextIndex = gameData.currentQuestionIndex + 1;

        if (nextIndex < questions.length) {
            const nextQuestion = questions[nextIndex];
            gameRef.update({
                currentQuestionIndex: nextIndex,
                currentQuestion: nextQuestion
            }).then(() => {
                startTimer();
            });
        } else {
            // Fim do jogo
            gameRef.update({ status: 'finished' });
            currentQuestionEl.textContent = 'Fim do Jogo!';
            countdownEl.textContent = '0';
        }
    });
};

const updateUI = (gameData) => {
    if (!gameData) return;
    // ... O resto da função updateUI permanece o mesmo ...
    // Atualiza a pergunta na tela
    if (gameData.currentQuestion) {
        currentQuestionEl.textContent = `Pergunta ${gameData.currentQuestionIndex + 1}: ${gameData.currentQuestion.pergunta}`;
    } else {
        currentQuestionEl.textContent = "Pressione 'Começar Jogo' para iniciar!";
    }

    // Atualiza o placar
    scoresListEl.innerHTML = '';
    if (gameData.scores) {
        const sortedScores = Object.entries(gameData.scores).sort(([, a], [, b]) => b - a);
        sortedScores.forEach(([player, score]) => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'player-score';
            scoreItem.textContent = `${player}: ${score} pontos`;
            scoresListEl.appendChild(scoreItem);
        });
    }

    // Gerencia botões
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-block';
    resumeBtn.style.display = 'none';
    nextBtn.style.display = 'inline-block';
    nextRoundBtn.style.display = 'none';

    if (gameData.status === 'paused') {
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'inline-block';
    } else if (gameData.status === 'finished') {
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        startBtn.style.display = 'inline-block';
    }
};

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', () => gameRef.update({ status: 'paused' }));
resumeBtn.addEventListener('click', () => gameRef.update({ status: 'active' }));
nextBtn.addEventListener('click', nextQuestion);
restartBtn.addEventListener('click', resetGame);

// Listener do Firebase
gameRef.on('value', (snapshot) => {
    const gameData = snapshot.val();
    updateUI(gameData);

    if (gameData && gameData.status === 'active' && gameData.currentQuestionIndex !== -1) {
        if (!timerInterval) {
            startTimer();
        }
    } else {
        clearInterval(timerInterval);
        timerInterval = null;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    generateQRCode(); // Gera o QR Code ao carregar a página
});
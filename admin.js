import { firebaseConfig } from './firebase-config.js';

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const gameRef = database.ref('game');
let questions;
let timerInterval;

// Elementos da interface
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const nextRoundBtn = document.getElementById('next-round-btn');
const countdownEl = document.getElementById('countdown');
const currentQuestionEl = document.getElementById('current-question-text');
const scoresListEl = document.getElementById('scores-list');
const qrCodeContainer = document.getElementById('qr-code-container');
const gameInfo = document.getElementById('game-info');
const gameTitleEl = document.querySelector('.game-title');

// Sons
const startSound = new Audio('assets/start_game.mp3');
const countdownSound = new Audio('assets/countdown.mp3');
const winRoundSound = new Audio('assets/win_round.mp3');
const finalWinSound = new Audio('assets/final_win.mp3');

// --- Funções de Controle ---

const resetGame = () => {
    gameRef.set({
        status: 'waiting',
        currentQuestionIndex: -1,
        scores: {},
        currentQuestion: null,
        timer: 60
    });
    // Mostra o QR Code ao reiniciar
    qrCodeContainer.style.display = 'flex';
    gameInfo.style.display = 'none';
    startBtn.style.display = 'inline-block';
    // Para o som de início ao reiniciar
    startSound.pause();
    startSound.currentTime = 0;
};

const loadQuestions = async () => {
    const response = await fetch('questions.json');
    questions = await response.json();
    console.log("Perguntas carregadas:", questions);
};

const startGame = () => {
    qrCodeContainer.style.display = 'none'; // Esconde o QR Code
    gameInfo.style.display = 'block'; // Mostra a tela do jogo
    
    // Para o som de início e toca o som do jogo
    startSound.pause();
    startSound.currentTime = 0;

    gameRef.update({ status: 'active', currentQuestionIndex: 0 });
};

const startTimer = () => {
    clearInterval(timerInterval);
    let timeLeft = 60;
    countdownEl.textContent = timeLeft;
    gameRef.update({ timer: timeLeft });

    timerInterval = setInterval(() => {
        timeLeft--;
        countdownEl.textContent = timeLeft;
        gameRef.update({ timer: timeLeft });

        // Toca o som de contagem nos últimos 5 segundos
        if (timeLeft <= 5 && timeLeft > 0) {
            countdownSound.play();
        }

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
            // Verifica se é o final de uma rodada
            if (nextIndex % 10 === 0 && nextIndex !== 0) {
                gameRef.update({ status: 'paused', currentQuestion: null });
                winRoundSound.play();
                // O botão de "Próxima Rodada" será exibido aqui
            } else {
                const nextQuestion = questions[nextIndex];
                gameRef.update({
                    currentQuestionIndex: nextIndex,
                    currentQuestion: nextQuestion,
                    status: 'active'
                }).then(() => {
                    startTimer();
                });
            }
        } else {
            // Fim do jogo
            gameRef.update({ status: 'finished' });
            currentQuestionEl.textContent = 'Fim do Jogo! Verifique o placar final.';
            countdownEl.textContent = '0';
            finalWinSound.play();
        }
    });
};

// ... O resto do código permanece o mesmo ...
// ... Botões e Listener do Firebase ...

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', () => gameRef.update({ status: 'paused' }));
resumeBtn.addEventListener('click', () => gameRef.update({ status: 'active', currentQuestion: questions[gameData.currentQuestionIndex] }));
nextBtn.addEventListener('click', nextQuestion);
restartBtn.addEventListener('click', resetGame);
nextRoundBtn.addEventListener('click', () => {
    gameRef.once('value', (snapshot) => {
        const gameData = snapshot.val();
        const nextIndex = gameData.currentQuestionIndex + 1;
        gameRef.update({
            currentQuestionIndex: nextIndex,
            currentQuestion: questions[nextIndex],
            status: 'active'
        });
    });
});

const updateUI = (gameData) => {
    if (!gameData) return;

    // Lógica para mostrar/esconder botões e elementos
    const isGameActive = gameData.status === 'active';
    const isGamePaused = gameData.status === 'paused';
    const isGameFinished = gameData.status === 'finished';

    startBtn.style.display = (gameData.status === 'waiting' || isGameFinished) ? 'inline-block' : 'none';
    pauseBtn.style.display = isGameActive ? 'inline-block' : 'none';
    resumeBtn.style.display = isGamePaused ? 'inline-block' : 'none';
    nextBtn.style.display = isGameActive ? 'inline-block' : 'none';
    restartBtn.style.display = 'inline-block';
    nextRoundBtn.style.display = (gameData.currentQuestionIndex % 10 === 9 && isGamePaused) ? 'inline-block' : 'none';

    if (isGameActive) {
        if (gameData.currentQuestion) {
            currentQuestionEl.textContent = `Pergunta ${gameData.currentQuestionIndex + 1}: ${gameData.currentQuestion.pergunta}`;
        }
        gameInfo.style.display = 'block';
        qrCodeContainer.style.display = 'none';
    } else if (isGamePaused) {
        currentQuestionEl.textContent = 'Rodada Finalizada!';
    } else if (isGameFinished) {
        currentQuestionEl.textContent = 'Fim do Jogo!';
        gameTitleEl.textContent = 'Parabéns!';
    } else {
        currentQuestionEl.textContent = 'Pressione "Começar Jogo" para iniciar!';
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
};

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
        countdownSound.pause();
        countdownSound.currentTime = 0;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    // Gera o QR Code e toca a música de início em loop
    const playerUrl = window.location.href.replace('index.html', 'player.html');
    new QRCode(document.getElementById("qrcode"), {
        text: playerUrl,
        width: 256,
        height: 256,
        colorDark: "#FFD700",
        colorLight: "#222222",
        correctLevel: QRCode.CorrectLevel.H
    });
    startSound.loop = true;
    startSound.play();
});

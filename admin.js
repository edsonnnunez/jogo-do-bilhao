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
const finalWinSound = new Audio('assets/final_win.mp2');

// --- Funções de Controle ---

const resetGame = () => {
    console.log("Reiniciando jogo...");
    gameRef.set({
        status: 'waiting',
        currentQuestionIndex: -1,
        scores: {},
        currentQuestion: null,
        timer: 60
    });
    // Força a mudança de tela para o estado de espera
    qrCodeContainer.style.display = 'flex';
    gameInfo.style.display = 'none';
    startBtn.style.display = 'inline-block';
    startSound.pause();
    startSound.currentTime = 0;
};

const loadQuestions = async () => {
    try {
        const response = await fetch('questions.json');
        questions = await response.json();
        console.log("Perguntas carregadas com sucesso.");
    } catch (error) {
        console.error("Erro ao carregar as perguntas:", error);
        questions = [];
    }
};

const startGame = () => {
    console.log("Botão 'Começar Jogo' clicado!");
    
    if (!questions || questions.length === 0) {
        console.error("As perguntas não foram carregadas. Não é possível iniciar o jogo.");
        // Exibe uma mensagem de erro na tela para o usuário
        currentQuestionEl.textContent = "Erro: Perguntas não carregadas. Tente recarregar a página.";
        return; 
    }
    
    // Atualiza o estado no Firebase
    gameRef.update({ 
        status: 'active', 
        currentQuestionIndex: 0,
        currentQuestion: questions[0]
    });
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
            if (nextIndex % 10 === 0 && nextIndex !== 0) {
                gameRef.update({ status: 'paused', currentQuestion: null });
                winRoundSound.play();
            } else {
                const nextQuestion = questions[nextIndex];
                gameRef.update({
                    currentQuestionIndex: nextIndex,
                    currentQuestion: nextQuestion,
                    status: 'active'
                });
            }
        } else {
            gameRef.update({ status: 'finished' });
            currentQuestionEl.textContent = 'Fim do Jogo! Verifique o placar final.';
            countdownEl.textContent = '0';
            finalWinSound.play();
        }
    });
};

const updateUI = (gameData) => {
    if (!gameData) return;
    const isGameActive = gameData.status === 'active';
    const isGamePaused = gameData.status === 'paused';
    const isGameFinished = gameData.status === 'finished';
    const isGameWaiting = gameData.status === 'waiting';

    // Gerencia a visibilidade dos botões
    startBtn.style.display = (isGameWaiting || isGameFinished) ? 'inline-block' : 'none';
    pauseBtn.style.display = isGameActive ? 'inline-block' : 'none';
    resumeBtn.style.display = isGamePaused ? 'inline-block' : 'none';
    nextBtn.style.display = isGameActive ? 'inline-block' : 'none';
    restartBtn.style.display = 'inline-block';
    nextRoundBtn.style.display = (gameData.currentQuestionIndex % 10 === 9 && isGamePaused) ? 'inline-block' : 'none';

    // Gerencia o conteúdo da tela principal
    if (isGameWaiting) {
        currentQuestionEl.textContent = 'Pressione "Começar Jogo" para iniciar!';
        gameInfo.style.display = 'block';
        qrCodeContainer.style.display = 'flex';
    } else if (isGameActive) {
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

// Event Listeners
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', () => gameRef.update({ status: 'paused' }));
resumeBtn.addEventListener('click', () => gameRef.update({ status: 'active' }));
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

// Listener principal do Firebase
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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadQuestions().then(() => {
        resetGame();
        const playerUrl = "https://edsonnnunez.github.io/jogo-do-bilhao/player/index.html";
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
});

import { firebaseConfig } from '../firebase-config.js';

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const gameRef = database.ref('game');
let playerName = '';

const joinScreen = document.getElementById('join-screen');
const gameScreen = document.getElementById('game-screen');
const joinBtn = document.getElementById('join-btn');
const playerNameInput = document.getElementById('player-name');
const playerQuestionEl = document.getElementById('player-question');
const playerOptionsEl = document.getElementById('player-options');
const playerStatusEl = document.getElementById('player-status');

const joinGame = () => {
    playerName = playerNameInput.value.trim();
    if (playerName) {
        joinScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        document.getElementById('player-welcome').textContent = `Bem-vindo, ${playerName}!`;
        gameRef.child(`scores/${playerName}`).set(0);
        playerStatusEl.textContent = 'Aguardando o administrador iniciar o jogo...';
    }
};

const handleAnswer = (selectedOption) => {
    gameRef.once('value', (snapshot) => {
        const gameData = snapshot.val();
        if (gameData && gameData.status === 'active') {
            const correctAnswer = gameData.currentQuestion.respostaCorreta;
            let currentScore = gameData.scores[playerName] || 0;
            if (selectedOption === correctAnswer) {
                currentScore += 10;
            } else {
                currentScore = Math.max(0, currentScore - 5);
            }
            gameRef.child(`scores/${playerName}`).set(currentScore);
            playerStatusEl.textContent = `Resposta enviada! Aguarde a próxima pergunta...`;
        }
    });
};

joinBtn.addEventListener('click', joinGame);

// Listener do Firebase para o jogador
gameRef.on('value', (snapshot) => {
    const gameData = snapshot.val();
    if (!gameData) {
        console.error("Dados do jogo não encontrados no Firebase.");
        return;
    }
    
    console.log("Estado do jogo no Firebase:", gameData.status);

    if (gameData.status === 'waiting') {
        playerQuestionEl.textContent = 'Aguardando o jogo começar...';
        playerOptionsEl.innerHTML = '';
        playerStatusEl.textContent = 'Conectado. Aguardando a partida iniciar.';
    } else if (gameData.status === 'prepare') {
        playerQuestionEl.textContent = 'PREPARE-SE PARA AS PERGUNTAS!';
        playerOptionsEl.innerHTML = '';
        playerStatusEl.textContent = 'Aguarde a contagem regressiva...';
    } else if (gameData.status === 'active') {
        const question = gameData.currentQuestion;
        if (question) {
            console.log("Pergunta recebida:", question.pergunta);
            playerQuestionEl.textContent = question.pergunta;
            playerOptionsEl.innerHTML = '';
            playerStatusEl.textContent = 'Escolha sua resposta!';
            
            question.opcoes.forEach(option => {
                const button = document.createElement('button');
                button.className = 'option-btn';
                button.textContent = option;
                button.onclick = () => handleAnswer(option);
                playerOptionsEl.appendChild(button);
            });
        } else {
            playerQuestionEl.textContent = 'Aguardando a próxima pergunta...';
            playerOptionsEl.innerHTML = '';
            playerStatusEl.textContent = '';
        }
    } else if (gameData.status === 'paused') {
        playerQuestionEl.textContent = 'Rodada finalizada. Aguardando a próxima...';
        playerOptionsEl.innerHTML = '';
        playerStatusEl.textContent = 'Placar atualizado. Olhe para a TV!';
    } else if (gameData.status === 'finished') {
        playerQuestionEl.textContent = 'Fim do Jogo! Verifique a TV para o resultado final.';
        playerOptionsEl.innerHTML = '';
        playerStatusEl.textContent = '';
    }
});

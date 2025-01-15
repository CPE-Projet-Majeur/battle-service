// Configuration : ajustez l'URL du serveur si nécessaire
// Par exemple, si le serveur tourne sur le même hôte sur le port 3000
const SERVER_URL = window.location.origin; // ou "http://localhost:3000"

// Récupération des éléments HTML
const logsElem = document.getElementById("logs");
const joinBattleBtn = document.getElementById("joinBattleBtn");
const sendActionBtn = document.getElementById("sendActionBtn");

// Extrait les valeurs d'input
function getInputValues() {
    return {
        userId: Number(document.getElementById("userId").value),
        battleId: document.getElementById("battleId").value, // peut être vide
        weather: Number(document.getElementById("weather").value),
        spellId: Number(document.getElementById("spellId").value),
        accuracy: Number(document.getElementById("accuracy").value)
    };
}

// Crée un socket avec des query parameters userId et type
function createSocket(userId, type) {
    // Construire l'URL avec les query string appropriées
    return io(SERVER_URL, {
        query: {
            userId: userId,
            userFirstName: `floppa-${1}`,
            userLastName: `McFlopper`,
            userHouse: 0,
            type: type // 'tournament' ou autre (pour ce test, on peut laisser vide ou 'battle')
        }
    });
}

// Pour ce test, on utilise un socket pour le combat (battle)
let socket = null;

// Fonction pour ajouter des logs dans la page
function addLog(msg) {
    logsElem.textContent += `${msg}\n`;
    console.log(msg);
}

// Bouton pour rejoindre ou créer un battle
joinBattleBtn.addEventListener("click", () => {
    const { userId, battleId, weather } = getInputValues();
    // Pour ce test, on considère que le type est "battle"
    if (!socket) {
        socket = createSocket(userId, "battle");

        // Gestion des événements émis par le serveur
        socket.on("BATTLE_START", data => {
            addLog("BATTLE_START reçu : " + JSON.stringify(data));
        });
        socket.on("BATTLE_SEND_ACTION", data => {
            addLog("BATTLE_SEND_ACTION reçu : " + JSON.stringify(data));
        });
        socket.on("BATTLE_OVER", data => {
            addLog("BATTLE_OVER reçu : " + JSON.stringify(data));
        });

        socket.on("connect", () => {
            addLog("Connecté avec l'ID de socket : " + socket.id);
        });

        socket.on("disconnect", () => {
            addLog("Déconnecté");
        });
    }

    // Déclencher l'événement BATTLE_WAITING avec les données correspondantes
    const waitingData = {
        battleId: battleId !== "" ? Number(battleId) : undefined, // undefined si vide
        weather: weather
    };
    addLog("Envoi de BATTLE_WAITING : " + JSON.stringify(waitingData));
    socket.emit("BATTLE_WAITING", waitingData);
});

// Bouton pour envoyer une action (BATTLE_RECEIVE_ACTION)
sendActionBtn.addEventListener("click", () => {
    if (!socket || !socket.connected) {
        addLog("Veuillez d'abord vous connecter en cliquant sur 'Envoyer BATTLE_WAITING'.");
        return;
    }
    const { spellId, accuracy } = getInputValues();
    const actionData = {
        spellId: spellId,
        accuracy: accuracy
    };
    addLog("Envoi de BATTLE_RECEIVE_ACTION : " + JSON.stringify(actionData));
    socket.emit("BATTLE_RECEIVE_ACTION", actionData);
});

// Nous déclarerons la variable socket de manière globale, mais sa création ne se fera qu'après connexion.
let socket = null;
const SERVER_URL = window.location.origin;

// Définitions des événements en accord avec le serveur
const ETournamentActions = {
    TOURNAMENT_JOIN : "TOURNAMENT_JOIN",
    TOURNAMENT_JOINED : "TOURNAMENT_JOINED",
    TOURNAMENT_CREATION : "TOURNAMENT_CREATION",
    TOURNAMENT_CREATED : "TOURNAMENT_CREATED",
    TOURNAMENT_UPDATE : "TOURNAMENT_UPDATE",
    TOURNAMENT_UPDATED : "TOURNAMENT_UPDATED",
    TOURNAMENT_START : "TOURNAMENT_START",
    TOURNAMENT_BRACKET_START : "TOURNAMENT_BRACKET_START",
    TOURNAMENT_OVER : "TOURNAMENT_OVER",
};

// Utilitaire pour ajouter des logs
function addLog(message) {
    const logDiv = document.getElementById('logs');
    const p = document.createElement('p');
    p.innerHTML = message;
    logDiv.appendChild(p);
}

// Gère la connexion en récupérant l'userId entré
document.getElementById('connectButton').addEventListener('click', () => {
    const userId = document.getElementById('userIdInput').value.trim();
    if (!userId) {
        alert("Veuillez saisir un userId");
        return;
    }

    // Création de la socket en passant le userId dans la query
    socket = io(SERVER_URL, {
        query: {
            userId: userId,
            userFirstName: `floppa-${1}`,
            userLastName: `McFlopper`,
            userHouse: 0,
            type: 'tournament'
        }
    });

    // Affichage d'un message de connexion réussie (à adapter selon votre logique serveur)
    socket.on('connect', () => {
        addLog(`Connecté avec userId : ${userId} (ID de socket: ${socket.id})`);
        // Masquer la section de connexion et afficher l'application principale
        document.getElementById('connectionSection').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
    });

    // Abonnement aux événements du tournoi

    // Réception de la création d'un tournoi
    socket.on(ETournamentActions.TOURNAMENT_CREATED, (data) => {
        document.getElementById('createTournamentResult').innerHTML =
            `Tournoi créé ! ID: ${data.tournamentId} / Code: ${data.code}`;
        addLog(`Tournoi créé : ID ${data.tournamentId}, Code: ${data.code}`);
    });

    // Réception de rejoindre un tournoi
    socket.on(ETournamentActions.TOURNAMENT_JOINED, (data) => {
        let message = `Rejoint tournoi ${data.tournamentName} (ID: ${data.tournamentId})<br>`;
        message += `Participants : `;
        data.tournamentParticipants.forEach(p => {
            message += `${p.name} (ID: ${p.id}) - `;
        });
        document.getElementById('joinTournamentResult').innerHTML = message;
        addLog(`Tournoi rejoint : ${data.tournamentName} (ID: ${data.tournamentId})`);
    });

    // Réception de démarrage du bracket (combat)
    socket.on(ETournamentActions.TOURNAMENT_BRACKET_START, (data) => {
        const message = `Nouveau combat lancé ! Battle ID: ${data.battleId}, Joueurs: ${data.userIds.join(', ')}`;
        addLog(message);
    });

    // Fin tournois
    socket.on(ETournamentActions.TOURNAMENT_OVER, (data) => {
        const message = `Fin du tournois : ! Gagnants : ${data.winnersNames.join(', ')}`;
        addLog(message);
    });

    // Error
    socket.on("ERROR", (data) => {
        const message = `ERROR ${data.code} : ${data.message}`;
        alert(message);
    });

    // Réception de la mise à jour du tournoi
    socket.on(ETournamentActions.TOURNAMENT_UPDATED, (data) => {
        console.log(data.tree)
        document.getElementById('updateTournamentResult').innerHTML =
            `Arbre du tournoi mis à jour: ${JSON.parse(data.tree)}`;
        addLog(`Mise à jour du tournoi: ${data.tree}`);
    });
});

// Une fois connecté, mettre en place les actions principales
document.getElementById('createTournament').addEventListener('click', () => {
    const name = document.getElementById('tournamentName').value.trim();
    if (!name) return alert("Veuillez saisir un nom de tournoi.");
    alert("Création du tournois !")
    socket.emit(ETournamentActions.TOURNAMENT_CREATION, name);
});

document.getElementById('joinTournament').addEventListener('click', () => {
    const code = document.getElementById('tournamentCode').value.trim();
    if (!code) return alert("Veuillez saisir le code du tournoi.");
    socket.emit(ETournamentActions.TOURNAMENT_JOIN, code);
});

document.getElementById('startTournament').addEventListener('click', () => {
    const tournamentId = parseInt(document.getElementById('tournamentId').value, 10);
    if (isNaN(tournamentId)) return alert("Veuillez saisir un ID de tournoi valide.");
    socket.emit(ETournamentActions.TOURNAMENT_START, tournamentId);
});

document.getElementById('updateTournament').addEventListener('click', () => {
    const tournamentId = parseInt(document.getElementById('updateTournamentId').value, 10);
    if (isNaN(tournamentId)) return alert("Veuillez saisir un ID de tournoi valide.");
    socket.emit(ETournamentActions.TOURNAMENT_UPDATE, tournamentId);
});

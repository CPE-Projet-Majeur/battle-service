enum ETournamentActions {
    // Participants send this event when they try to join a tournament
    TOURNAMENT_JOIN = "TOURNAMENT_JOIN",
    // This event is sent if the tournament was successfully joined
    TOURNAMENT_JOINED = "TOURNAMENT_JOINED",
    // The administrator sends this event to create a tournament
    TOURNAMENT_CREATION = "TOURNAMENT_CREATION",
    // This event is sent when the tournament is successfully created
    TOURNAMENT_CREATED = "TOURNAMENT_CREATED",
    // After each pool, this event is sent with the tree visualisation of the participants and the id of the next battle
    TOURNAMENT_UPDATE = "TOURNAMENT_UPDATE",
    // The administrator sends this event to start the tournament
    TOURNAMENT_START = "TOURNAMENT_START",
    // This event is sent when the tournament has successfully started
    TOURNAMENT_STARTED = "TOURNAMENT_STARTED",
    // This event is sent when the tournament is finished
    TOURNAMENT_OVER = "TOURNAMENT_OVER",
}
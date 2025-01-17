export enum ETournamentEvents {
    // Participants send this event when they try to join a tournament
    TOURNAMENT_JOIN = "TOURNAMENT_JOIN",
    // This event is sent if the tournament was successfully joined
    TOURNAMENT_JOINED = "TOURNAMENT_JOINED",
    // The administrator sends this event to create a tournament
    TOURNAMENT_CREATION = "TOURNAMENT_CREATION",
    // This event is sent when the tournament is successfully created
    TOURNAMENT_CREATED = "TOURNAMENT_CREATED",
    // The users asks for the tournament's update
    TOURNAMENT_UPDATE = "TOURNAMENT_UPDATE",
    // This event is sent to inform of the tournament's status
    TOURNAMENT_UPDATED = "TOURNAMENT_UPDATED",
    // The administrator sends this event to start the tournament
    TOURNAMENT_START = "TOURNAMENT_START",
    // This event is sent when the tournament has successfully started
    //TOURNAMENT_STARTED = "TOURNAMENT_STARTED",
    // This event is sent when a new bracket starts
    TOURNAMENT_BRACKET_START = "TOURNAMENT_BRACKET_START",
    // This event is sent when the tournament is finished
    TOURNAMENT_OVER = "TOURNAMENT_OVER",
}
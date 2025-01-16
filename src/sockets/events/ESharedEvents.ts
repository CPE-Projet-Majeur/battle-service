export type ErrorData = {
    code: number,
    message: string
}

export enum ESharedEvents {
    BRACKET_UPDATE = 'BRACKET_UPDATE',
    ERROR = "ERROR",
    UPDATE_USER_BATTLE = "UPDATE_USER_BATTLE",
}
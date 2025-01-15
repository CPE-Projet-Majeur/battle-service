export type ErrorData = {
    code: number,
    message: string
}

export enum EEvents {
    BRACKET_UPDATE = 'BRACKET_UPDATE',
    ERROR = "ERROR"
}
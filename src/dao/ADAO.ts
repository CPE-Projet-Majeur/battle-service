export default abstract class ADAO{
    private currentId: number = 1;

    public generateId(): number {
        return this.currentId++;
    }
}
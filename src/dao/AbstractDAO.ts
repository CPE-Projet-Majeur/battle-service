export default abstract class AbstractDAO {
    private currentId: number = 1;

    public generateId(): number {
        return this.currentId++;
    }
}
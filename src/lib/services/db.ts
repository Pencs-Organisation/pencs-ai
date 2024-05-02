import sql, { ConnectionPool, Request } from 'mssql';

export class DBClient {
    private pool: ConnectionPool;

    constructor(config: sql.config) {
        this.pool = new sql.ConnectionPool(config);
        this.connect();
    }

    private async connect() {
        try {
            await this.pool.connect();
            console.log("Connected to database");
        } catch (error: any) {
            console.error("Database connection error:", error.message);
        }
    }

    async query(query: string): Promise<any[]> {
        try {
            if (!this.pool.connected) {
                await this.connect()
            }

            console.log("Querying", query)
            const request = new Request(this.pool);
            const result = await request.query(query);
            return result.recordset;
        } catch (error: any) {
            console.error("Database query error:", error.message);
            throw error;
        }
    }

    async close() {
        try {
            await this.pool.close();
            console.log("Database connection closed");
        } catch (error: any) {
            console.error("Error closing database connection:", error.message);
        }
    }
}
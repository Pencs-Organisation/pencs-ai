import { DBClient } from "../services/db";

export class GPRNDBClient extends DBClient {
    constructor() {
        super({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER || "",
            database: process.env.DB_DATABASE,
            options: {
                encrypt: true,
                enableArithAbort: true,
                trustServerCertificate: true,
                connectTimeout: 30000,
            },
        });
    }
}
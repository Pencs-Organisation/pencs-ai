import { AzureKeyCredential, OpenAIClient } from "@azure/openai";

interface Prompts {
    role: string;
    content: string;
}
const context: Prompts[] = [
    {
        role: "system", content: `
This is a lookup table for the diagnosis codes. The table has two columns: Reference_DiagnosisID and Name.
SELECT Reference_DiagnosisID, Name FROM diagnosis.Reference_Diagnosis

This is a table of patient's diganosises. The table has two columns: FK_Reference_DiagnosisID which is foreign key to diagnosis.Reference_Diagnosis.Reference_DiagnosisID
SELECT FK_Reference_DiagnosisID, FK_PatientID, Active, Exists, Diagnosis_Date, First_Diagnosis_Date, IsNewestData FROM diagnosis.Diagnosis_Data

Make the response answer in a JSON format where the structure is {query: string, description: string}. Ensure the response can be parse as JSON
- query is the SQL Query used to execute DB from above schema
- description is some human non technical description in what the query will be about
    
The SQL Query should be MS SQL Server compatible
If Application in the SELECT statement at the diganosis date and patient id
In WHERE Clause any string comparsion should be lower case
Make sure the SQL Query can return data that can be used in a graph

Please provide me data about patients diagnosis that is related to diabete typed 1 in the past month
Querying SELECT d.FK_PatientID, r.Name, d.Diagnosis_Date FROM diagnosis.Diagnosis_Data d JOIN diagnosis.Reference_Diagnosis r ON d.FK_Reference_DiagnosisID = r.Reference_DiagnosisID WHERE r.Name LIKE '%diabete_type_1%' AND d.Diagnosis_Date >= DATEADD(month, -1, GETDATE())
` },
];

export class PenCSAIClient {
    client: OpenAIClient;
    deploymentId: string = "";

    hasContext: boolean = false;
    prompts: Prompts[] = [];
    constructor(deploymentId = process.env.OPEN_AI_DEPLOYMENT || "") {
        this.client = new OpenAIClient(
            process.env.OPEN_AI_ENDPOINT || "",
            new AzureKeyCredential(process.env.OPEN_AI_KEY || "")
        );
        this.deploymentId = deploymentId;

        this.prompts = [...context]
        this.hasContext = true;
    }

    async streamChatCompletionsAsJSON(prompt: string) {
        if (!prompt) {
            throw new Error("Prompt is required")
        }

        if (!this.hasContext) {
            this.prompts = [...context]
        }

        this.prompts.push({ role: "user", content: prompt });
        const events = await this.client.streamChatCompletions(
            this.deploymentId,
            this.prompts,
            { maxTokens: 128 });

        // let content = `{ "query": "SELECT * FROM TableName WHERE IsDeleted = 1 AND UpdatedDateTimeUTC >= DATEADD(month, -1, GETDATE())", "description": "This query retrieves all forms that have been deleted in the past month. It checks the IsDeleted column to be 1 and the UpdatedDateTimeUTC to be within the past month using the DATEADD function with a negative value for the month parameter." }`;
        let content = ""
        for await (const event of events) {
            for (const choice of event.choices) {
                if (choice.delta?.content) {
                    content += choice.delta.content + '';
                }
            }
        }

        try {
            content = content.replace(/(\r\n|\n|\r)/gm, "");
            return JSON.parse(content);
        } catch (error) {
            // console.error(error);
            const que = extractSQLQuery(content)
            return {
                query: extractSQLQuery(content),
                description: "No description available"
            }
        }
        return null
    };
}

function extractSQLQuery(text: string) {
    // Regular expression pattern to match SQL SELECT, INSERT, UPDATE, DELETE queries
    const sqlPattern = /\b(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b[\s\S]+?;/i;

    // Search for the first occurrence of SQL query in the text
    const match = text.match(sqlPattern);

    if (match) {
        // Extract the matched SQL query
        const sqlQuery = match[0].trim(); // Trim to remove leading/trailing whitespace
        return sqlQuery;
    } else {
        // No SQL query found in the text
        return null;
    }
}
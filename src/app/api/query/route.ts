import { NextRequest, NextResponse } from 'next/server'
import { GPRNDBClient } from '@/lib/server/gprn-db';
import { PenCSAIClient } from '@/lib/services/open-ai';

// Example Prompt = "Get all patients that has cancer related diagnosis"
export async function POST(request: NextRequest) {
    const body = await request.json();
    if (!validateBody(body)) {
        return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
    }

    const model = new PenCSAIClient();
    const payload = await model.streamChatCompletionsAsJSON(body.prompt);

    if (!payload || !payload.query) {
        return NextResponse.json(
            { message: `Error parsing completion: ${JSON.parse(payload)}` },
            { status: 400 })
    }

    console.log(payload.query)
    const db = new GPRNDBClient()
    try {
        const ds: any[] = await db.query(payload.query)
        console.log(ds.length || "0")

        return Response.json({ result: ds, query: payload.query })
    } catch (error) {
        return Response.json({ message: "Error querying database" }, { status: 500 })
    }
}

const validateBody = (body: any) => {
    if (!body) {
        return false
    }

    if (!body.prompt) {
        return false
    }

    return true
}
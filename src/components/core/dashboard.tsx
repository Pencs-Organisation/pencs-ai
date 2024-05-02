"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Button } from "../ui/button"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"

export interface DashboardProps
    extends React.HTMLAttributes<HTMLDivElement> {
}


interface ChartData {
    name: string;
    uv: number;
}

function generateChartData(items: any[]): ChartData[] {
    const itemCountsByDate = new Map<string, number>();

    // Calculate counts of items by date
    items.forEach(item => {
        const { Diagnosis_Date } = item;
        const date = new Date(Diagnosis_Date).toISOString().slice(0, 10); // Extract YYYY-MM-DD from ISO string

        if (itemCountsByDate.has(date)) {
            itemCountsByDate.set(date, itemCountsByDate.get(date)! + 1);
        } else {
            itemCountsByDate.set(date, 1);
        }
    });

    // Convert map to array of objects suitable for Recharts
    const chartData: ChartData[] = [];
    itemCountsByDate.forEach((count, date) => {
        chartData.push({ name: date, uv: count });
    });

    return chartData;
}


export const Dashboard = ({ }: DashboardProps) => {
    const [data, setData] = useState<any[]>([])
    const [prompt, setPrompt] = useState<string>("")
    const [history, setHistory] = useState<string[]>([])
    const [query, setQuery] = useState<string>("")

    const handleOnClick = async () => {
        if (!prompt) {
            console.log("Prompt is required")
        }

        const response = await fetch("/api/query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt
            }),
        })

        if (!response.ok) {
            console.log("Error fetching data", await response.json())
            return
        }

        setHistory([...history, prompt])
        const data = await response.json()
        console.log(data)

        const sample = data.result[0]
        setQuery(data.query)
        if (sample.Diagnosis_Date && sample.FK_PatientID) {
            let ret: any[] = generateChartData(data.result)
            console.log(ret)
            // {
            //     name: 'Page G',
            //     uv: 3490,
            //     amt: 2100,
            //   },
            setData(ret)
        }
    }

    return (
        <div>
            <Textarea onChange={(e) => setPrompt(e.target.value)} />
            <Button onClick={handleOnClick}>Click me</Button>

            <h2>Graph</h2>
            <LineChart width={500} height={300} data={data}>
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="uv" stroke="#8884d8" />
                <Line type="monotone" dataKey="pv" stroke="#82ca9d" />
            </LineChart>

            {query}
        </div>
    )
}
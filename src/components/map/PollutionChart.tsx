import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { predictor } from '@/lib/ai/prediction_model';

type Props = {
    currentAQI: number;
    region: string;
};

export default function PollutionChart({ currentAQI, region }: Props) {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        const loadPredictions = async () => {
            // Generate last 24h mock history
            const history = Array.from({ length: 24 }, (_, i) => ({
                time: `${i}:00`,
                actual: Math.max(0, currentAQI + (Math.random() - 0.5) * 50),
                predicted: null as number | null
            }));

            // Generate next 24h predictions
            const predictedValues = await predictor.predictNext24Hours(currentAQI);
            const future = predictedValues.map((val, i) => ({
                time: `${i}:00 (+1d)`,
                actual: null as number | null,
                predicted: val
            }));

            // Stitch together
            // Add the last actual point as the start of prediction for continuity
            const connectionPoint = {
                time: 'Now',
                actual: currentAQI,
                predicted: currentAQI
            };

            setData([...history, connectionPoint, ...future]);
        };

        loadPredictions();
    }, [currentAQI, region]);

    return (
        <div className="w-full h-48 bg-slate-900/50 rounded-xl border border-white/10 p-2">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <XAxis
                        dataKey="time"
                        hide
                        interval={4}
                    />
                    <YAxis
                        hide
                        domain={[0, 500]}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                        itemStyle={{ fontSize: 12 }}
                        labelStyle={{ display: 'none' }}
                    />
                    {/* Historical Line */}
                    <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        animationDuration={1000}
                    />
                    {/* Predicted Line (Dashed) */}
                    <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#a855f7"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        animationDuration={1000}
                    />
                </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-1">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-0.5 bg-blue-500" />
                    <span className="text-[10px] text-slate-400">Past 24h</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-0.5 bg-purple-500 border-dashed border-t border-b-0 h-0" />
                    <span className="text-[10px] text-purple-400">AI Forecast (+24h)</span>
                </div>
            </div>
        </div>
    );
}

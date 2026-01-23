import * as tf from '@tensorflow/tfjs';

export class AQIPredictor {
    model: tf.Sequential | null = null;
    isTraining: boolean = false;

    constructor() {
        this.initModel();
    }

    async initModel() {
        // Simple linear regression model for demo purposes
        // In a real app, we would load a pre-trained model via tf.loadLayersModel('...')
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
        model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

        this.model = model;

        // Train on some dummy data immediately to have *something* ready
        // X: [time_step], Y: [aqi_trend]
        const xs = tf.tensor2d([-2, -1, 0, 1, 2], [5, 1]);
        const ys = tf.tensor2d([150, 160, 180, 200, 210], [5, 1]); // Upward trend

        await this.model.fit(xs, ys, { epochs: 50 });
    }

    async predictNext24Hours(currentAQI: number): Promise<number[]> {
        if (!this.model) return Array(24).fill(currentAQI);

        const predictions: number[] = [];
        let lastVal = currentAQI;

        // Simulate next 24 hours
        // We add some randomness to make it look realistic for the demo
        // since a linear model would just be a straight line
        const trend = (Math.random() - 0.3) * 5; // Slight bias

        for (let i = 1; i <= 24; i++) {
            // Predict based on trend
            // In reality, we'd feed the output back as input
            const noise = (Math.random() - 0.5) * 10;
            const nextVal = Math.max(0, lastVal + trend + noise);

            predictions.push(Math.round(nextVal));
            lastVal = nextVal;
        }

        return predictions;
    }
}

export const predictor = new AQIPredictor();

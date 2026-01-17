
'use client';

import { useState } from 'react';
import { X, Camera, Loader2, AlertTriangle, CloudFog, Flame, Truck, Zap, Factory, BrickWall, Trash2, HardHat, Wheat, Building2 } from 'lucide-react';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    location: { lat: number, lng: number } | null;
}

const CATEGORIES = [
    { id: 'Power & Energy', label: 'Power & Energy', icon: Zap, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    { id: 'Industrial Manufacturing', label: 'Industrial', icon: Factory, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { id: 'Brick & Construction Materials', label: 'Brick Kiln', icon: BrickWall, color: 'text-amber-900', bg: 'bg-amber-900/10', border: 'border-amber-900/20' },
    { id: 'Waste & Burning', label: 'Waste Burning', icon: Trash2, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { id: 'Construction & Urban Dust', label: 'Construction Dust', icon: HardHat, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { id: 'Fuel Combustion', label: 'Fuel Combustion', icon: Flame, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/20' },
    { id: 'Agriculture-Linked', label: 'Agriculture', icon: Wheat, color: 'text-green-700', bg: 'bg-green-700/10', border: 'border-green-700/20' },
    { id: 'Public & Institutional', label: 'Public Spaces', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
];

export default function ReportModal({ isOpen, onClose, location }: ReportModalProps) {
    if (!isOpen) return null;

    const [category, setCategory] = useState<string>('Waste & Burning');
    const [severity, setSeverity] = useState(3);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category,
                    severity,
                    description,
                    location
                })
            });

            if (!res.ok) throw new Error('Failed to submit');

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2000);
        } catch (e) {
            console.error(e);
            alert('Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border border-green-500/30 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
                    <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Report Submitted!</h3>
                    <p className="text-slate-400 text-sm">Thank you for being a vigilant citizen. Your report has been logged.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-950 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
                    <h2 className="font-bold text-lg text-white">Report Pollution</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-6">

                    {/* Location Preview */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <div>
                            <p className="text-xs font-bold text-blue-300 uppercase">Pinned Location</p>
                            <p className="text-[10px] text-blue-200/60 font-mono">{location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}</p>
                        </div>
                    </div>

                    {/* Category Grid */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pollution Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${category === cat.id
                                        ? `${cat.bg} ${cat.border} ring-1 ring-offset-0 ${cat.color.replace('text-', 'ring-')}`
                                        : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                                        }`}
                                >
                                    <cat.icon className={`w-5 h-5 mb-2 ${category === cat.id ? cat.color : 'text-slate-500'}`} />
                                    <p className={`text-xs font-bold ${category === cat.id ? 'text-white' : ''}`}>{cat.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Severity Slider */}
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Severity (1-5)</label>
                            <span className="text-xs font-bold text-white bg-white/10 px-2 rounded">{severity}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={severity}
                            onChange={(e) => setSeverity(Number(e.target.value))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                            <span>Mild</span>
                            <span>Severe</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Details</label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Describe what you see..."
                        />
                    </div>

                    {/* Mock Photo Upload */}
                    <button type="button" className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-white/30 transition-all gap-2">
                        <Camera className="w-6 h-6" />
                        <span className="text-xs font-bold">Add Photo</span>
                    </button>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-slate-900/50">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-pink-600 hover:bg-pink-500 disabled:bg-pink-600/50 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Report'}
                    </button>
                </div>

            </div>
        </div>
    );
}

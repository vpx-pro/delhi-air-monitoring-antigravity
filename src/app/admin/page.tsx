'use client';

import { useState, useEffect } from 'react';
import { generateReports } from '@/lib/simulation';
import { CitizenReport } from '@/lib/types';
import { ShieldCheck, XCircle, CheckCircle, AlertTriangle, CloudFog, Car, Flame } from 'lucide-react';
import clsx from 'clsx';

export default function AdminDashboard() {
    const [reports, setReports] = useState<CitizenReport[]>([]);
    const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);

    // Initial simulated data load
    useEffect(() => {
        // In real app, this would be a Supabase fetch
        setReports(generateReports('live', 20));
    }, []);

    const handleVerify = (id: string, status: 'verified' | 'rejected') => {
        setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        setSelectedReport(null);
    };

    const pendingReports = reports.filter(r => r.status === 'pending');
    const verifiedCount = reports.filter(r => r.status === 'verified').length;
    const rejectedCount = reports.filter(r => r.status === 'rejected').length;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/10 bg-slate-900/50 flex flex-col">
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <ShieldCheck className="text-blue-500" />
                        Admin Console
                    </h1>
                </div>
                <div className="p-4 space-y-4">
                    <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                        <p className="text-xs text-blue-300 uppercase font-bold">Pending Review</p>
                        <p className="text-3xl font-bold text-blue-400">{pendingReports.length}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                            <p className="text-[10px] text-green-300 uppercase font-bold">Verified</p>
                            <p className="text-xl font-bold text-green-400">{verifiedCount}</p>
                        </div>
                        <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            <p className="text-[10px] text-red-300 uppercase font-bold">Rejected</p>
                            <p className="text-xl font-bold text-red-400">{rejectedCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex">
                {/* List View */}
                <div className="w-1/2 border-r border-white/10 overflow-y-auto">
                    <div className="p-6">
                        <h2 className="text-lg font-bold mb-4">Incoming Reports</h2>
                        <div className="space-y-2">
                            {pendingReports.map(report => (
                                <div
                                    key={report.id}
                                    onClick={() => setSelectedReport(report)}
                                    className={clsx(
                                        "p-4 rounded-xl border cursor-pointer transition-all hover:bg-white/5",
                                        selectedReport?.id === report.id ? "bg-white/10 border-blue-500/50" : "bg-slate-900/50 border-white/5"
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {report.type === 'GARBAGE_BURNING' && <Flame className="w-4 h-4 text-orange-500" />}
                                            {report.type === 'CONSTRUCTION_DUST' && <CloudFog className="w-4 h-4 text-slate-400" />}
                                            {report.type === 'TRAFFIC_CONGESTION' && <Car className="w-4 h-4 text-red-400" />}
                                            <span className="text-sm font-bold text-slate-200">
                                                {report.type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">{new Date(report.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-slate-400">Severity:</span>
                                            <div className="flex">
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className={clsx("w-1.5 h-1.5 rounded-full mx-0.5", i < report.severity ? "bg-red-500" : "bg-slate-700")} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {pendingReports.length === 0 && (
                                <div className="text-center py-10 text-slate-500">
                                    <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                    <p>All caught up! No pending reports.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Detail View */}
                <div className="w-1/2 bg-slate-900/30 p-8 flex flex-col items-center justify-center">
                    {selectedReport ? (
                        <div className="w-full max-w-md bg-slate-950 border border-white/10 rounded-2xl p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">Verify Incident</h3>
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30 uppercase">
                                    {selectedReport.id}
                                </span>
                            </div>

                            <div className="aspect-video bg-slate-900 rounded-xl mb-6 relative overflow-hidden border border-white/10">
                                {/* Mock Map Preview */}
                                <div className="absolute inset-0 flex items-center justify-center text-slate-600 bg-[size:20px_20px] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]">
                                    <div className="absolute w-4 h-4 bg-red-500 rounded-full animate-ping" />
                                    <div className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                                </div>
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-slate-300">
                                    {selectedReport.location.lat.toFixed(4)}, {selectedReport.location.lng.toFixed(4)}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <button
                                    onClick={() => handleVerify(selectedReport.id, 'rejected')}
                                    className="py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                >
                                    <XCircle size={18} />
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleVerify(selectedReport.id, 'verified')}
                                    className="py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-500 transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} />
                                    Verify
                                </button>
                            </div>

                            <div className="text-center">
                                <p className="text-xs text-slate-500 mb-2">Confidence Score: <span className="text-green-400 font-bold">92%</span></p>
                                <p className="text-[10px] text-slate-600">AI Cross-check: Confirmed via Sentinel-5P Satellite Data</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg">Select a report to verify</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

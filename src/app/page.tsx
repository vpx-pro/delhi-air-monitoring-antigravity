
import Link from 'next/link';
import { ArrowRight, Map as MapIcon, ShieldCheck, Users } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <MapIcon className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Delhi<span className="text-blue-500">Air</span></span>
                    </div>

                    <div className="flex items-center gap-6">
                        <Link href="/map" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                            Live Map
                        </Link>
                        <Link href="/about" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                            About
                        </Link>
                        <Link
                            href="/login"
                            className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 transition-all"
                        >
                            Login
                        </Link>
                        <Link
                            href="/signup"
                            className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all"
                        >
                            Volunteer Signup
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="pt-0 min-h-screen">
                <div className="grid lg:grid-cols-2 min-h-screen">
                    {/* Left Content */}
                    <div className="relative z-10 flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-32 lg:py-0 bg-slate-950/50 backdrop-blur-sm">
                        <div className="space-y-8 max-w-2xl mx-auto lg:mx-0">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                Live Beta
                            </div>

                            <h1 className="text-5xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.1]">
                                Breathe Better, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                                    Together.
                                </span>
                            </h1>

                            <p className="text-lg lg:text-xl text-slate-400 max-w-lg leading-relaxed">
                                A community-driven platform to monitor, report, and fight air pollution in Delhi-NCR. Combine official data with real-time citizen reports.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="/map"
                                    className="group px-8 py-5 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-blue-500 hover:scale-105 transition-all shadow-[0_0_40px_rgba(37,99,235,0.3)]"
                                >
                                    View Live Map
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link
                                    href="/signup"
                                    className="px-8 py-5 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 transition-all"
                                >
                                    Join as Volunteer
                                </Link>
                            </div>

                            <div className="pt-10 border-t border-white/10 flex gap-12">
                                <div>
                                    <p className="text-4xl font-bold text-white">50+</p>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-1">Stations</p>
                                </div>
                                <div>
                                    <p className="text-4xl font-bold text-white">24/7</p>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-1">Monitoring</p>
                                </div>
                                <div>
                                    <p className="text-4xl font-bold text-white">100%</p>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-1">Open Source</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Visual - Full Height */}
                    <div className="relative w-full h-[50vh] lg:h-full border-t lg:border-t-0 lg:border-l border-white/5 bg-slate-800">
                        <img
                            src="/images/hero.png"
                            alt="Delhi Pollution Futuristic Monitoring"
                            className="absolute inset-0 w-full h-full object-cover z-0"
                        />

                        {/* Floating Glass Card */}
                        <div className="absolute bottom-8 left-8 right-8 lg:bottom-16 lg:left-16 lg:right-16 p-8 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl transform hover:-translate-y-2 transition-transform duration-500 z-20">
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 rounded-2xl bg-blue-500/20 text-blue-400">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-0.5">Verified Data</h3>
                                        <p className="text-xs text-slate-400">Real-time CPCB Integration</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="p-4 rounded-2xl bg-orange-500/20 text-orange-400">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-0.5">Citizen Action</h3>
                                        <p className="text-xs text-slate-400">Track & Report Hotspots</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

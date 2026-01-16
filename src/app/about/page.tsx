
import Link from 'next/link';
import { ArrowLeft, Github, Heart, Globe, Shield } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                    <span className="font-bold text-lg tracking-tight">Delhi<span className="text-blue-500">Air</span></span>
                </div>
            </nav>

            <main className="pt-32 pb-16 px-6">
                <div className="max-w-7xl mx-auto space-y-12">

                    {/* Header */}
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Our Mission</h1>
                        <p className="text-xl text-slate-400 leading-relaxed">
                            Democratizing air quality data to empower the citizens of Delhi-NCR to breathe better, together.
                        </p>
                    </div>

                    {/* Content Blocks */}
                    <div className="grid gap-8">
                        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl">
                            <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6">
                                <Shield className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Why This Exists</h2>
                            <p className="text-slate-400 leading-relaxed">
                                Air pollution is the single largest health risk in Delhi. While official data exists, it is often scattered, delayed, or lacks hyperlocal granularity.
                                <br /><br />
                                <strong>DelhiAir</strong> bridges this gap by combining official CPCB station data with a network of citizen reports and (future) low-cost sensors. We believe that granular, real-time data is the first step towards policy change and personal protection.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl">
                                <div className="w-12 h-12 bg-pink-500/20 text-pink-400 rounded-xl flex items-center justify-center mb-6">
                                    <Heart className="w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-bold mb-3">Community Driven</h2>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    We rely on volunteers to verify hotspots, report illegal burning, and maintain the integrity of our data. This helps identify sources of pollution that sensors might miss.
                                </p>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl">
                                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-6">
                                    <Globe className="w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-bold mb-3">Open Source</h2>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    This project is 100% open source. We believe in transparency not just in air data, but in the code that processes it. Developers are welcome to contribute.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Team / Credits */}
                    <div className="pt-12 border-t border-white/10 text-center">
                        <p className="text-slate-500 mb-6 uppercase text-xs font-bold tracking-wider">Built with ❤️ for Delhi</p>
                        <div className="flex justify-center gap-4">
                            <a href="#" className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
                                <Github className="w-5 h-5" />
                            </a>
                            <a href="#" className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
                                <Globe className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

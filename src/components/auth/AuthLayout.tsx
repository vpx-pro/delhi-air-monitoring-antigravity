
import Link from 'next/link';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';

export default function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950 text-white font-sans">
            {/* Left: Form Area */}
            <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 py-12">
                <div className="mb-12">
                    <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>

                <div className="max-w-md w-full mx-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <MapIcon className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">Delhi<span className="text-blue-500">Air</span></h1>
                    </div>

                    <h2 className="text-3xl font-bold mb-2">{title}</h2>
                    <p className="text-slate-400 mb-8">{subtitle}</p>

                    {children}
                </div>
            </div>

            {/* Right: Visual Area */}
            <div className="hidden lg:block relative bg-slate-900 border-l border-white/5">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611273426732-45e697316790?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

                <div className="absolute bottom-12 left-12 right-12">
                    <blockquote className="text-2xl font-bold leading-relaxed mb-4">
                        "The only way to clear the air is to measure it, track it, and act on it together."
                    </blockquote>
                    <p className="text-slate-400 font-medium">— Antigravity Mission</p>
                </div>
            </div>
        </div>
    );
}

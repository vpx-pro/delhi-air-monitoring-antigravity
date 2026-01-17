
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
            } else {
                router.push('/map');
                router.refresh();
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Enter your details to access your dashboard."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</label>
                    <input
                        required
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="e.g. aditi@example.com"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                    <input
                        required
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter your password"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-slate-200 disabled:bg-slate-500 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
                </button>

                <p className="text-center text-slate-400 text-sm mt-6">
                    Don't have an account?{' '}
                    <Link href="/signup" className="text-white font-bold hover:underline">
                        Sign up
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}

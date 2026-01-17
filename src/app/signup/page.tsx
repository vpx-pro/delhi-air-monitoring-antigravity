
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        password: '',
        email: '',
        role: 'VOLUNTEER' as UserRole
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Basic validation
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters.');
            setIsLoading(false);
            return;
        }

        try {
            const supabase = createClient();
            const { data, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        phone: formData.phone,
                        role: formData.role,
                    },
                },
            });

            if (authError) {
                setError(authError.message);
            } else if (data.user) {
                // Success
                router.push('/map?onboarding=true');
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
            title="Create an account"
            subtitle="Join the community fighting for cleaner air."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                    <input
                        required
                        type="text"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="e.g. Aditi Sharma"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</label>
                    <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="e.g. aditi@example.com"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone Number</label>
                    <input
                        required
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="e.g. 9876543210"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                    <input
                        required
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="At least 6 characters"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">I am joining as</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, role: 'VOLUNTEER' })}
                            className={`p-3 rounded-xl border text-sm font-bold transition-all ${formData.role === 'VOLUNTEER'
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-slate-900 border-white/10 text-slate-400 hover:bg-slate-800'
                                }`}
                        >
                            Volunteer
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, role: 'OFFICIAL' })}
                            className={`p-3 rounded-xl border text-sm font-bold transition-all ${formData.role === 'OFFICIAL'
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-slate-900 border-white/10 text-slate-400 hover:bg-slate-800'
                                }`}
                        >
                            Govt. Official
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                </button>

                <p className="text-center text-slate-400 text-sm mt-6">
                    Already have an account?{' '}
                    <Link href="/login" className="text-white font-bold hover:underline">
                        Log in
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}

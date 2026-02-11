
import { login, signup } from "./actions";

export default function LoginPage() {
    return (
        <div className="flex h-screen items-center justify-center relative overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background z-0" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-20 z-0 pointer-events-none" />

            <form className="w-full max-w-md rounded-2xl glass-panel p-10 shadow-2xl relative z-10 backdrop-blur-xl border border-white/10">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                        Speacy
                    </h2>
                    <p className="text-sm text-zinc-400">Sign in to continue your progress</p>
                </div>

                <div className="space-y-5">
                    <div>
                        <label htmlFor="email" className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                            placeholder="student@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                    <button
                        formAction={login}
                        className="w-full rounded-lg bg-gradient-to-r from-primary to-blue-600 px-4 py-3 text-white font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                    >
                        Log in
                    </button>
                    <button
                        formAction={signup}
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-zinc-300 font-medium hover:bg-white/10 transition-colors"
                    >
                        Sign up
                    </button>
                </div>
            </form>
        </div>
    );
}

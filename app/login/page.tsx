
import { login, signup } from "./actions";

export default function LoginPage() {
    return (
        <div className="flex h-screen items-center justify-center bg-black">
            <form className="w-full max-w-md rounded-lg bg-zinc-900 border border-zinc-800 p-8 shadow-md">
                <h2 className="mb-6 text-2xl font-bold text-white">
                    Sign In to Speacy
                </h2>

                <div className="mb-4">
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-400">
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"
                    />
                </div>

                <div className="mb-6">
                    <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-400">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"
                    />
                </div>

                <div className="flex flex-col gap-4">
                    <button
                        formAction={login}
                        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Log in
                    </button>
                    <button
                        formAction={signup}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-300 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
                    >
                        Sign up
                    </button>
                </div>
            </form>
        </div>
    );
}

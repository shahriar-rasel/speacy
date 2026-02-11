
"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ExamCreationForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        topic: "",
        difficulty_level: "Intermediate",
        description: "",
        questions: [{ prompt: "" }],
        learning_goals: [""]
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleQuestionChange = (index: number, value: string) => {
        const newQuestions = [...formData.questions];
        newQuestions[index].prompt = value;
        setFormData({ ...formData, questions: newQuestions });
    };

    const addQuestion = () => {
        setFormData({ ...formData, questions: [...formData.questions, { prompt: "" }] });
    };

    const handleGoalChange = (index: number, value: string) => {
        const newGoals = [...formData.learning_goals];
        newGoals[index] = value;
        setFormData({ ...formData, learning_goals: newGoals });
    };

    const addGoal = () => {
        setFormData({ ...formData, learning_goals: [...formData.learning_goals, ""] });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/assignments", {
                method: "POST",
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert("Exam created successfully!");
                setFormData({
                    title: "",
                    topic: "",
                    difficulty_level: "Intermediate",
                    description: "",
                    questions: [{ prompt: "" }],
                    learning_goals: [""]
                });
                router.refresh(); // Refresh to see new assignment in list
            } else {
                alert("Failed to create exam");
            }
        } catch (error) {
            console.error(error);
            alert("Error creating exam");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Exam Title</label>
                <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Midterm Simulation"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Topic</label>
                    <input
                        type="text"
                        name="topic"
                        value={formData.topic}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                        placeholder="e.g. Dynamic Programming"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Difficulty</label>
                    <select
                        name="difficulty_level"
                        value={formData.difficulty_level}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 h-20"
                    placeholder="Brief description for students..."
                />
            </div>

            <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Learning Goals</label>
                {formData.learning_goals.map((goal, idx) => (
                    <div key={idx} className="flex gap-2">
                        <input
                            type="text"
                            value={goal}
                            onChange={(e) => handleGoalChange(idx, e.target.value)}
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                            placeholder={`Goal ${idx + 1}`}
                        />
                    </div>
                ))}
                <button type="button" onClick={addGoal} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                    <Plus size={12} /> Add Goal
                </button>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : "Create Assignment"}
            </button>
        </form>
    );
}

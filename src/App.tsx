import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  BookOpen, 
  Brain, 
  BarChart3, 
  Terminal, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  ArrowRightCircle,
  Loader2,
  PlusCircle,
  History,
  TrendingUp,
  Award,
  Sun,
  Moon,
  X,
  PlayCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateQuizWithAI } from './services/geminiService';
import { StudentProfile, AnalyticsData, Quiz, Recommendation, MasteryLevel, MentorFeedback } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TOPICS = ['Math', 'Coding', 'Aptitude'];

export default function App() {
  const [students, setStudents] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [newStudentName, setNewStudentName] = useState('');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'selection' | 'topic' | 'quiz' | 'result' | 'review'>('selection');
  
  const [currentTopic, setCurrentTopic] = useState('');
  const [currentDifficulty, setCurrentDifficulty] = useState<string>('Moderate');
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentRecommendation, setCurrentRecommendation] = useState<Recommendation | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<{ score: number; updatedTopic: any; mentorFeedback?: MentorFeedback } | null>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizForReview, setSelectedQuizForReview] = useState<any | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showProfileSummary, setShowProfileSummary] = useState(false);
  const [filterTopic, setFilterTopic] = useState('Overall');
  const [selectedMixedTopics, setSelectedMixedTopics] = useState<string[]>(TOPICS);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const fetchStudents = async () => {
    const res = await fetch('/api/students');
    const data = await res.json();
    setStudents(data);
  };

  const addLog = (newLogs: string[]) => {
    setLogs(prev => [...prev, ...newLogs]);
  };

  const handleSelectStudent = async (name: string) => {
    setLoading(true);
    setSelectedStudent(name);
    
    // Reset filters when selecting a new student
    setFilterTopic('Overall');
    setSelectedMixedTopics(TOPICS);
    
    const res = await fetch(`/api/profile/${name}?topic=Overall`);
    const data = await res.json();
    setProfile(data.profile);
    setAnalytics(data.analytics);
    if (data.recommendation) setCurrentRecommendation(data.recommendation);
    if (data.logs) addLog(data.logs);
    
    // Fetch quizzes
    const quizRes = await fetch(`/api/quizzes/${name}`);
    if (quizRes.ok) {
      const quizData = await quizRes.json();
      setQuizzes(quizData);
    }

    setShowReview(false);
    setStep('topic');
    setLoading(false);
  };

  const handleFilterChange = async (topic: string) => {
    setFilterTopic(topic);
    if (selectedStudent) {
      setLoading(true);
      let url = `/api/profile/${selectedStudent}?topic=${topic}`;
      if (topic === 'Mixed') {
        url += `&topics=${selectedMixedTopics.join(',')}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setAnalytics(data.analytics);
      if (data.logs) addLog(data.logs);
      setLoading(false);
    }
  };

  const toggleMixedTopic = async (topic: string) => {
    const newMixed = selectedMixedTopics.includes(topic)
      ? selectedMixedTopics.filter(t => t !== topic)
      : [...selectedMixedTopics, topic];
    
    setSelectedMixedTopics(newMixed);
    
    if (selectedStudent && filterTopic === 'Mixed') {
      setLoading(true);
      const url = `/api/profile/${selectedStudent}?topic=Mixed&topics=${newMixed.join(',')}`;
      const res = await fetch(url);
      const data = await res.json();
      setAnalytics(data.analytics);
      if (data.logs) addLog(data.logs);
      setLoading(false);
    }
  };

  const handleStartQuiz = async (topic: string) => {
    setLoading(true);
    try {
      setCurrentTopic(topic);
      const mastery = profile?.topics[topic]?.mastery || 'Weak';
      setCurrentDifficulty(mastery);
      
      // 1. Generate quiz on frontend using Gemini
      const quiz = await generateQuizWithAI(topic, mastery);
      
      // 2. Get recommendation and logs from backend
      const res = await fetch('/api/quiz/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedStudent, topic, mastery })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to prepare quiz');
      }
      
      const data = await res.json();
      
      setCurrentQuiz(quiz);
      setCurrentRecommendation(data.recommendation);
      setAnswers(new Array(quiz.questions.length).fill(-1));
      setShowReview(false);
      
      const aiLogs = [
        `[Assessment Agent] Generating adaptive quiz using Gemini AI`,
        `[Assessment Agent] Topic: ${topic}, Mastery: ${mastery}`,
        `[Assessment Agent] Quiz generated successfully with 5 questions`
      ];
      addLog([...aiLogs, ...data.logs]);
      
      setStep('quiz');
    } catch (error: any) {
      console.error('Failed to generate quiz:', error);
      alert(error.message || 'Failed to generate quiz. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (answers.includes(-1)) {
      alert('Please answer all questions');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: selectedStudent, 
          topic: currentTopic, 
          difficulty: currentDifficulty,
          quiz: currentQuiz, 
          answers 
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit quiz');
      }

      const data = await res.json();
      setQuizResult({ 
        score: data.score, 
        updatedTopic: data.updatedTopic,
        mentorFeedback: data.mentorFeedback 
      });
      setCurrentRecommendation(data.recommendation);
      if (data.logs) addLog(data.logs);
      
      // Refresh quizzes
      const quizRes = await fetch(`/api/quizzes/${selectedStudent}`);
      if (quizRes.ok) {
        const quizData = await quizRes.json();
        setQuizzes(quizData);
      }

      // Refresh profile and analytics with current filters
      let url = `/api/profile/${selectedStudent}?topic=${filterTopic}`;
      if (filterTopic === 'Mixed') {
        url += `&topics=${selectedMixedTopics.join(',')}`;
      }
      const profileRes = await fetch(url);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile);
        setAnalytics(profileData.analytics);
      }
      
      setStep('result');
    } catch (error: any) {
      console.error('Failed to submit quiz:', error);
      alert(error.message || 'Failed to submit quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewQuiz = async (quizId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quiz/${selectedStudent}/${quizId}`);
      if (!res.ok) throw new Error('Failed to fetch quiz details');
      const data = await res.json();
      setSelectedQuizForReview(data);
      setStep('review');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const MasteryBadge = ({ level }: { level: MasteryLevel }) => {
    const colors = {
      Weak: 'bg-red-100 text-red-700 border-red-200',
      Moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      Strong: 'bg-green-100 text-green-700 border-green-200'
    };
    return (
      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", colors[level])}>
        {level}
      </span>
    );
  };

  return (
    <div className={cn(
      "min-h-screen font-sans p-4 md:p-8 transition-colors duration-300",
      darkMode ? "bg-slate-950 text-slate-100" : "bg-[#F8F9FA] text-slate-900"
    )}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={cn(
              "text-3xl font-bold tracking-tight flex items-center gap-2",
              darkMode ? "text-white" : "text-slate-900"
            )}>
              <Brain className="w-8 h-8 text-indigo-500" />
              AI Mentor Ecosystem
            </h1>
            <p className="text-slate-500 mt-1">Self-evolving multi-agent learning platform</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={cn(
                "p-3 rounded-2xl shadow-sm border transition-all",
                darkMode 
                  ? "bg-slate-900 border-slate-800 text-yellow-400 hover:bg-slate-800" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {selectedStudent && (
              <button 
                onClick={() => setShowProfileSummary(true)}
                className={cn(
                  "flex items-center gap-3 p-2 px-4 rounded-2xl shadow-sm border transition-all text-left",
                  darkMode 
                    ? "bg-slate-900 border-slate-800 hover:bg-slate-800" 
                    : "bg-white border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{selectedStudent}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">View Summary</p>
                </div>
              </button>
            )}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            
            <AnimatePresence mode="wait">
              {step === 'selection' && (
                <motion.div 
                  key="selection"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    "rounded-3xl p-8 shadow-sm border space-y-6",
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  )}
                >
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Welcome, Learner</h2>
                    <p className="text-slate-500">Select your profile or create a new one to begin your journey.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {students.map(name => (
                      <button
                        key={name}
                        onClick={() => handleSelectStudent(name)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all group",
                          darkMode 
                            ? "border-slate-800 hover:border-indigo-500 hover:bg-slate-800" 
                            : "border-slate-200 hover:border-indigo-600 hover:bg-indigo-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                            darkMode 
                              ? "bg-slate-800 group-hover:bg-indigo-900/40 group-hover:text-indigo-400" 
                              : "bg-slate-100 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                          )}>
                            <User className="w-5 h-5" />
                          </div>
                          <span className="font-medium">{name}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                      </button>
                    ))}
                    
                    <div className={cn(
                      "flex items-center gap-2 p-2 border border-dashed rounded-2xl",
                      darkMode ? "border-slate-700" : "border-slate-300"
                    )}>
                      <input 
                        type="text" 
                        placeholder="New Student Name"
                        value={newStudentName}
                        onChange={e => setNewStudentName(e.target.value)}
                        className="flex-1 bg-transparent px-3 py-2 outline-none text-sm"
                      />
                      <button 
                        onClick={() => newStudentName && handleSelectStudent(newStudentName)}
                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                      >
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'topic' && profile && (
                <motion.div 
                  key="topic"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className={cn(
                    "rounded-3xl p-8 shadow-sm border space-y-6",
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  )}>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <BookOpen className="w-6 h-6 text-indigo-500" />
                      Choose a Topic
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {TOPICS.map(topic => (
                        <button
                          key={topic}
                          onClick={() => handleStartQuiz(topic)}
                          className={cn(
                            "flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all group",
                            darkMode 
                              ? "border-slate-800 hover:border-indigo-500 hover:bg-slate-800" 
                              : "border-slate-200 hover:border-indigo-600 hover:bg-indigo-50"
                          )}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                            darkMode 
                              ? "bg-slate-800 group-hover:bg-indigo-900/40 group-hover:text-indigo-400" 
                              : "bg-slate-100 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                          )}>
                            <Brain className="w-6 h-6" />
                          </div>
                          <span className="font-medium">{topic}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Topic History Table */}
                  <div className={cn(
                    "rounded-3xl p-8 shadow-sm border space-y-6",
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  )}>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <History className="w-6 h-6 text-indigo-500" />
                      Topic History
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className={cn(
                            "border-b text-xs uppercase tracking-wider",
                            darkMode ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"
                          )}>
                            <th className="pb-4 font-semibold text-indigo-500">Topic</th>
                            <th className="pb-4 font-semibold">Mastery</th>
                            <th className="pb-4 font-semibold">Attempts</th>
                            <th className="pb-4 font-semibold">Avg. Score</th>
                          </tr>
                        </thead>
                        <tbody className={cn(
                          "divide-y",
                          darkMode ? "divide-slate-800" : "divide-slate-50"
                        )}>
                          {Object.entries(profile.topics).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-slate-500 italic">No history yet. Start your first quiz!</td>
                            </tr>
                          ) : (
                            Object.entries(profile.topics).map(([topic, data]) => {
                              const topicData = data as any;
                              return (
                                <tr key={topic} className={cn(
                                  "group transition-colors",
                                  darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                                )}>
                                  <td className="py-4 font-medium">{topic}</td>
                                  <td className="py-4"><MasteryBadge level={topicData.mastery} /></td>
                                  <td className="py-4 text-slate-500">{topicData.attempts}</td>
                                  <td className="py-4 font-mono text-indigo-500">
                                    {Math.round(topicData.scores.reduce((a: number, b: number) => a + b, 0) / topicData.scores.length)}%
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Concept Insights */}
                  {Object.entries(profile.topics).some(([_, data]) => (data as any).concepts && Object.keys((data as any).concepts).length > 0) && (
                    <div className={cn(
                      "rounded-3xl p-8 shadow-sm border space-y-6",
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                    )}>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-amber-500" />
                        Concept Insights
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(profile.topics).map(([topic, data]) => {
                          const topicData = data as any;
                          if (!topicData.concepts || Object.keys(topicData.concepts).length === 0) return null;
                          
                          return (
                            <div key={topic} className="space-y-4">
                              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">{topic} Concepts</h3>
                              <div className="space-y-3">
                                {Object.values(topicData.concepts).map((concept: any) => (
                                  <div key={concept.concept} className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                      <span className="font-medium">{concept.concept}</span>
                                      <span className={cn(
                                        "font-bold",
                                        concept.accuracy < 60 ? "text-rose-500" : concept.accuracy < 80 ? "text-amber-500" : "text-emerald-500"
                                      )}>{concept.accuracy}%</span>
                                    </div>
                                    <div className={cn(
                                      "h-1.5 w-full rounded-full overflow-hidden",
                                      darkMode ? "bg-slate-800" : "bg-slate-100"
                                    )}>
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${concept.accuracy}%` }}
                                        className={cn(
                                          "h-full rounded-full",
                                          concept.accuracy < 60 ? "bg-rose-500" : concept.accuracy < 80 ? "bg-amber-500" : "bg-emerald-500"
                                        )}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Past Quizzes */}
                  <div className={cn(
                    "rounded-3xl p-8 shadow-sm border space-y-6",
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  )}>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <History className="w-6 h-6 text-indigo-500" />
                      Past Quizzes
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className={cn(
                            "border-b text-xs uppercase tracking-wider",
                            darkMode ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"
                          )}>
                            <th className="pb-4 font-semibold text-indigo-500">Topic</th>
                            <th className="pb-4 font-semibold">Difficulty</th>
                            <th className="pb-4 font-semibold">Date</th>
                            <th className="pb-4 font-semibold">Score</th>
                            <th className="pb-4 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className={cn(
                          "divide-y",
                          darkMode ? "divide-slate-800" : "divide-slate-50"
                        )}>
                          {quizzes.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-500 italic">No quiz history yet.</td>
                            </tr>
                          ) : (
                            [...quizzes].reverse().map((quiz) => (
                              <tr key={quiz.id} className={cn(
                                "group transition-colors",
                                darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                              )}>
                                <td className="py-4 font-medium">{quiz.topic}</td>
                                <td className="py-4 text-xs">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full border",
                                    (quiz.difficulty || 'Moderate') === 'Weak' || (quiz.difficulty || 'Moderate') === 'Beginner' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                    (quiz.difficulty || 'Moderate') === 'Moderate' || (quiz.difficulty || 'Moderate') === 'Intermediate' ? "bg-purple-100 text-purple-700 border-purple-200" :
                                    "bg-orange-100 text-orange-700 border-orange-200"
                                  )}>
                                    {quiz.difficulty || 'Moderate'}
                                  </span>
                                </td>
                                <td className="py-4 text-slate-500 text-sm">
                                  {new Date(quiz.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-4">
                                  <div className="flex flex-col">
                                    <span className="font-mono text-indigo-500 font-bold">{Math.round(quiz.score)}%</span>
                                    <span className="text-[10px] text-slate-400">{quiz.correctAnswers}/{quiz.totalQuestions} correct</span>
                                  </div>
                                </td>
                                <td className="py-4">
                                  <button 
                                    onClick={() => handleReviewQuiz(quiz.id)}
                                    className="text-indigo-500 hover:text-indigo-600 font-medium text-sm flex items-center gap-1 group"
                                  >
                                    Review <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'quiz' && currentQuiz && (
                <motion.div 
                  key="quiz"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  {currentRecommendation && (
                    <div className={cn(
                      "border rounded-2xl p-4 flex gap-3",
                      darkMode 
                        ? "bg-indigo-900/20 border-indigo-800/50" 
                        : "bg-indigo-50 border-indigo-100"
                    )}>
                      <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <p className={cn(
                          "text-sm font-semibold",
                          darkMode ? "text-indigo-300" : "text-indigo-900"
                        )}>{currentRecommendation.mode}</p>
                        <p className={cn(
                          "text-xs",
                          darkMode ? "text-indigo-400" : "text-indigo-700"
                        )}>{currentRecommendation.explanation}</p>
                      </div>
                    </div>
                  )}

                  <div className={cn(
                    "rounded-3xl p-8 shadow-sm border space-y-8",
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  )}>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">{currentTopic} Assessment</h2>
                      <span className="text-sm text-slate-500">5 Questions</span>
                    </div>

                    <div className="space-y-10">
                      {currentQuiz.questions.map((q, qIdx) => (
                        <div key={qIdx} className="space-y-4">
                          <p className="font-medium text-lg flex gap-3">
                            <span className="text-indigo-500 font-bold">{qIdx + 1}.</span>
                            {q.question}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-8">
                            {q.options.map((opt, oIdx) => (
                              <button
                                key={oIdx}
                                onClick={() => {
                                  const newAns = [...answers];
                                  newAns[qIdx] = oIdx;
                                  setAnswers(newAns);
                                }}
                                className={cn(
                                  "p-4 rounded-xl border text-left transition-all text-sm",
                                  answers[qIdx] === oIdx 
                                    ? (darkMode 
                                        ? "border-indigo-500 bg-indigo-900/30 text-indigo-300 font-medium" 
                                        : "border-indigo-600 bg-indigo-50 text-indigo-700 font-medium")
                                    : (darkMode 
                                        ? "border-slate-800 hover:border-slate-700 bg-slate-800/30" 
                                        : "border-slate-200 hover:border-slate-300")
                                )}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-8 flex justify-end">
                      <button
                        onClick={handleSubmitQuiz}
                        disabled={loading}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 disabled:opacity-50 flex items-center gap-2"
                      >
                        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                        Submit Assessment
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'result' && quizResult && (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className={cn(
                    "rounded-3xl p-12 shadow-sm border text-center space-y-6",
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  )}>
                    <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-bold">Assessment Complete!</h2>
                      <p className="text-slate-500">Great job on finishing the {currentTopic} quiz.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                      <div className={cn(
                        "p-4 rounded-2xl border",
                        darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                      )}>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Score</p>
                        <p className="text-3xl font-bold text-indigo-500">{quizResult.score}%</p>
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl border",
                        darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                      )}>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Mastery</p>
                        <div className="mt-1">
                          <MasteryBadge level={quizResult.updatedTopic.mastery} />
                        </div>
                      </div>
                    </div>

                    {/* AI Mentor Feedback Card */}
                    {quizResult.mentorFeedback && (
                      <div className={cn(
                        "rounded-3xl p-8 shadow-sm border text-left space-y-6",
                        darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <h3 className="text-xl font-bold">AI Mentor Feedback</h3>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Summary</p>
                            <p className={cn(
                              "text-sm leading-relaxed",
                              darkMode ? "text-slate-300" : "text-slate-600"
                            )}>
                              {quizResult.mentorFeedback.summary}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3" />
                                Strengths
                              </p>
                              <ul className="space-y-2">
                                {quizResult.mentorFeedback.strengths.map((s, i) => (
                                  <li key={i} className="flex gap-2 text-sm">
                                    <span className="text-green-500 font-bold">•</span>
                                    <span className={darkMode ? "text-slate-400" : "text-slate-600"}>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-3">
                              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                                <AlertCircle className="w-3 h-3" />
                                Areas for Improvement
                              </p>
                              <ul className="space-y-2">
                                {quizResult.mentorFeedback.weaknesses.map((w, i) => (
                                  <li key={i} className="flex gap-2 text-sm">
                                    <span className="text-amber-500 font-bold">•</span>
                                    <span className={darkMode ? "text-slate-400" : "text-slate-600"}>{w}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className={cn(
                            "p-6 rounded-2xl border space-y-4",
                            darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100"
                          )}>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                              <ArrowRightCircle className="w-3 h-3" />
                              Next Steps
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {quizResult.mentorFeedback.nextSteps.map((step, i) => (
                                <div key={i} className={cn(
                                  "p-4 rounded-xl border flex items-start gap-3",
                                  darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                                )}>
                                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {i + 1}
                                  </span>
                                  <p className="text-xs leading-relaxed">{step}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentRecommendation && (
                      <div className="space-y-6">
                        <div className={cn(
                          "border rounded-2xl p-6 text-left space-y-2",
                          darkMode 
                            ? "bg-indigo-900/20 border-indigo-800/50" 
                            : "bg-indigo-50 border-indigo-100"
                        )}>
                          <div className={cn(
                            "flex items-center gap-2 font-bold",
                            darkMode ? "text-indigo-300" : "text-indigo-900"
                          )}>
                            <TrendingUp className="w-5 h-5" />
                            Strategy Agent Recommendation
                          </div>
                          <p className={cn(
                            "text-sm font-semibold",
                            darkMode ? "text-indigo-400" : "text-indigo-800"
                          )}>{currentRecommendation.mode}</p>
                          <p className={cn(
                            "text-sm leading-relaxed",
                            darkMode ? "text-indigo-300/80" : "text-indigo-700"
                          )}>{currentRecommendation.explanation}</p>
                        </div>

                        {currentRecommendation.recommendedVideos && currentRecommendation.recommendedVideos.length > 0 && (
                          <div className="text-left space-y-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                              <PlusCircle className="w-5 h-5 text-indigo-500" />
                              Recommended Learning Resources
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {currentRecommendation.recommendedVideos.map((video, idx) => (
                                <a 
                                  key={idx}
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "p-4 rounded-2xl border transition-all group",
                                    darkMode 
                                      ? "bg-slate-800 border-slate-700 hover:border-indigo-500 hover:bg-slate-700" 
                                      : "bg-white border-slate-200 hover:border-indigo-600 hover:bg-indigo-50"
                                  )}
                                >
                                  <p className={cn(
                                    "font-bold text-sm group-hover:text-indigo-500",
                                    darkMode ? "text-slate-200" : "text-slate-900"
                                  )}>{video.title}</p>
                                  <p className="text-xs text-slate-500 mt-1">{video.reason}</p>
                                  <div className="mt-3 flex items-center text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                                    Watch Video <ChevronRight className="w-3 h-3 ml-1" />
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={() => setStep('topic')}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
                      >
                        Try Another Topic
                      </button>
                      <button
                        onClick={() => handleStartQuiz(currentTopic)}
                        className={cn(
                          "border px-8 py-3 rounded-2xl font-bold transition-all",
                          darkMode 
                            ? "bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-700" 
                            : "bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                        )}
                      >
                        Retake Quiz
                      </button>
                      <button
                        onClick={() => setShowReview(!showReview)}
                        className={cn(
                          "border px-8 py-3 rounded-2xl font-bold transition-all",
                          darkMode 
                            ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" 
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {showReview ? 'Hide Review' : 'Review Answers'}
                      </button>
                    </div>
                  </div>

                  {showReview && currentQuiz && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={cn(
                        "rounded-3xl p-8 shadow-sm border space-y-8",
                        darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                      )}
                    >
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-indigo-500" />
                        Detailed Review
                      </h2>
                      <div className="space-y-6">
                        {currentQuiz.questions.map((q, qIdx) => {
                          const isCorrect = answers[qIdx] === q.correctIndex;
                          return (
                            <div key={qIdx} className={cn(
                              "p-6 rounded-2xl border space-y-4",
                              darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100"
                            )}>
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1",
                                  isCorrect ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                )}>
                                  {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                </div>
                                <p className="font-bold">{qIdx + 1}. {q.question}</p>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-9">
                                {q.options.map((opt, oIdx) => {
                                  const isUserChoice = answers[qIdx] === oIdx;
                                  const isCorrectChoice = q.correctIndex === oIdx;
                                  
                                  return (
                                    <div 
                                      key={oIdx}
                                      className={cn(
                                        "p-3 rounded-xl border text-sm flex items-center gap-2",
                                        isCorrectChoice 
                                          ? "bg-green-100/50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                                          : isUserChoice && !isCorrect
                                            ? "bg-red-100/50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                                            : darkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-100 text-slate-500"
                                      )}
                                    >
                                      <div className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                        isCorrectChoice ? "bg-green-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                                      )}>
                                        {String.fromCharCode(65 + oIdx)}
                                      </div>
                                      {opt}
                                    </div>
                                  );
                                })}
                              </div>

                              <div className={cn(
                                "ml-9 p-4 rounded-xl border flex gap-3",
                                darkMode ? "bg-indigo-900/10 border-indigo-900/30" : "bg-indigo-50 border-indigo-100"
                              )}>
                                <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
                                  <span className="font-bold">Explanation:</span> {q.explanation}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Agent Collaboration Summary */}
                  <div className={cn(
                    "rounded-3xl p-8 shadow-sm border space-y-6",
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  )}>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Award className="w-6 h-6 text-indigo-500" />
                      Agent Collaboration Summary
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { agent: 'Assessment Agent', msg: `Evaluated answers and calculated score of ${quizResult.score}%` },
                        { agent: 'Learner Agent', msg: `Updated topic history and set mastery to ${quizResult.updatedTopic.mastery}` },
                        { agent: 'Strategy Agent', msg: `Analyzed performance and recommended ${currentRecommendation?.mode}` },
                        { agent: 'Analytics Agent', msg: `Recalculated performance trends and updated dashboard` }
                      ].map((item, i) => (
                        <div key={i} className={cn(
                          "p-4 rounded-2xl border space-y-1",
                          darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                        )}>
                          <p className="text-xs font-bold text-slate-500 uppercase">{item.agent}</p>
                          <p className="text-sm font-medium">{item.msg}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'review' && selectedQuizForReview && (
                <motion.div 
                  key="review"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setStep('topic')}
                      className="flex items-center gap-2 text-slate-500 hover:text-indigo-500 transition-colors"
                    >
                      <ArrowRightCircle className="w-5 h-5 rotate-180" />
                      Back to Profile
                    </button>
                    <div className="text-right">
                      <h2 className="text-2xl font-bold">{selectedQuizForReview.topic} Review</h2>
                      <p className="text-slate-500 text-sm">{new Date(selectedQuizForReview.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className={cn(
                    "rounded-3xl p-8 shadow-sm border space-y-8",
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  )}>
                    <div className="flex items-center justify-between border-b pb-6 border-slate-100 dark:border-slate-800">
                      <div className="flex gap-8">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Score</p>
                          <p className="text-3xl font-mono text-indigo-500 font-bold">{Math.round(selectedQuizForReview.score)}%</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Accuracy</p>
                          <p className="text-3xl font-mono text-slate-700 dark:text-slate-200 font-bold">
                            {selectedQuizForReview.correctAnswers}/{selectedQuizForReview.totalQuestions}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Difficulty</p>
                        <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-sm font-bold">
                          {selectedQuizForReview.difficulty || 'Moderate'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-12">
                      {selectedQuizForReview.quiz.questions.map((q: any, qIdx: number) => {
                        const selectedAns = selectedQuizForReview.answers[qIdx];
                        const isCorrect = selectedAns === q.correctIndex;
                        
                        return (
                          <div key={qIdx} className="space-y-6">
                            <div className="flex items-start gap-4">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm mt-1",
                                isCorrect 
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                              )}>
                                {qIdx + 1}
                              </div>
                              <div className="space-y-4 w-full">
                                <p className="text-lg font-medium leading-relaxed">{q.question}</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {q.options.map((opt: string, oIdx: number) => {
                                    const isSelected = selectedAns === oIdx;
                                    const isCorrectOpt = q.correctIndex === oIdx;
                                    
                                    return (
                                      <div
                                        key={oIdx}
                                        className={cn(
                                          "p-4 rounded-xl border text-sm transition-all relative flex items-center justify-between",
                                          isCorrectOpt 
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium"
                                            : isSelected && !isCorrect
                                              ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"
                                              : (darkMode ? "border-slate-800 bg-slate-800/30 text-slate-400" : "border-slate-100 bg-slate-50 text-slate-500")
                                        )}
                                      >
                                        <span>{opt}</span>
                                        {isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                        {isSelected && !isCorrect && <X className="w-4 h-4 text-rose-500" />}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className={cn(
                                  "p-4 rounded-2xl border text-sm space-y-2",
                                  darkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"
                                )}>
                                  <div className="flex items-center gap-2 font-bold text-indigo-500 uppercase tracking-widest text-[10px]">
                                    <BookOpen className="w-3 h-3" />
                                    Explanation
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {q.explanation}
                                  </p>
                                  <div className="pt-2 flex items-center gap-2">
                                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Concept:</span>
                                    <span className="text-[10px] font-bold text-indigo-400">{q.concept}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                      <button 
                        onClick={() => setStep('topic')}
                        className="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                      >
                        Done Reviewing
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Sidebar: Analytics & Logs */}
          <div className="space-y-8">
            
            {/* Analytics Panel */}
            <div className={cn(
              "rounded-3xl p-6 shadow-sm border space-y-6",
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            )}>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Performance Summary
              </h2>
              
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {['Overall', 'Math', 'Coding', 'Aptitude', 'Mixed'].map((topic) => (
                  <button
                    key={topic}
                    onClick={() => handleFilterChange(topic)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border uppercase tracking-wider",
                      filterTopic === topic
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : darkMode 
                          ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {topic}
                  </button>
                ))}
              </div>

              {/* Mixed Selection UI */}
              {filterTopic === 'Mixed' && (
                <div className={cn(
                  "p-4 rounded-2xl border space-y-3",
                  darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100"
                )}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Include Topics</p>
                  <div className="flex flex-wrap gap-4">
                    {TOPICS.map((topic) => (
                      <label key={topic} className="flex items-center gap-2 cursor-pointer group">
                        <div 
                          onClick={() => toggleMixedTopic(topic)}
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-all",
                            selectedMixedTopics.includes(topic)
                              ? "bg-indigo-600 border-indigo-600"
                              : darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-300"
                          )}
                        >
                          {selectedMixedTopics.includes(topic) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className={cn(
                          "text-xs font-medium",
                          selectedMixedTopics.includes(topic)
                            ? (darkMode ? "text-slate-200" : "text-slate-900")
                            : "text-slate-500"
                        )}>{topic}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {analytics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-bold uppercase">Avg. Score</p>
                      <p className="text-2xl font-bold text-indigo-500">{analytics.averageScore}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-bold uppercase">Attempts</p>
                      <p className={cn(
                        "text-2xl font-bold",
                        darkMode ? "text-slate-200" : "text-slate-900"
                      )}>{analytics.totalAttempts}</p>
                    </div>
                  </div>

                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.progression}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1E293B" : "#F1F5F9"} />
                        <XAxis dataKey="attempt" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            backgroundColor: darkMode ? '#0F172A' : '#FFFFFF',
                            color: darkMode ? '#F1F5F9' : '#0F172A'
                          }}
                          itemStyle={{ color: '#6366F1' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#6366F1" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: darkMode ? '#0F172A' : '#fff' }} 
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-center p-4">
                  <TrendingUp className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm italic">No data available yet.</p>
                </div>
              )}
            </div>

            {/* Agent Log Panel */}
            <div className={cn(
              "rounded-3xl p-6 shadow-xl border space-y-4 overflow-hidden flex flex-col h-[500px]",
              darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-900 border-slate-800"
            )}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Agent Log Panel
                </h2>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1 custom-scrollbar pr-2">
                {logs.length === 0 ? (
                  <p className="text-slate-600 italic">Waiting for agent activity...</p>
                ) : (
                  logs.map((log, i) => {
                    let color = 'text-slate-400';
                    if (log.includes('[Learner Agent]')) color = 'text-blue-400';
                    if (log.includes('[Strategy Agent]')) color = 'text-purple-400';
                    if (log.includes('[Assessment Agent]')) color = 'text-amber-400';
                    if (log.includes('[Analytics Agent]')) color = 'text-emerald-400';
                    
                    return (
                      <div key={i} className={cn("leading-relaxed", color)}>
                        <span className="opacity-30 mr-2">{(i + 1).toString().padStart(3, '0')}</span>
                        {log}
                      </div>
                    );
                  })
                )}
                <div ref={logEndRef} />
              </div>
            </div>

          </div>
        </main>

      </div>

      {/* Profile Summary Modal */}
      <AnimatePresence>
        {showProfileSummary && profile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileSummary(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden",
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{profile.name}'s Profile</h2>
                    <p className="text-xs text-slate-500">Comprehensive Learning Summary</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProfileSummary(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className={cn(
                    "p-4 rounded-2xl border text-center",
                    darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100"
                  )}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overall Average</p>
                    <p className="text-2xl font-bold text-indigo-500">{analytics?.averageScore || 0}%</p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl border text-center",
                    darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100"
                  )}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Attempts</p>
                    <p className="text-2xl font-bold text-indigo-500">{analytics?.totalAttempts || 0}</p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl border text-center",
                    darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100"
                  )}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Topics Explored</p>
                    <p className="text-2xl font-bold text-indigo-500">{Object.keys(profile.topics).length}</p>
                  </div>
                </div>

                {/* Detailed Topic Breakdown */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Topic Breakdown
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(profile.topics).length === 0 ? (
                      <p className="text-center py-8 text-slate-500 italic">No data available yet.</p>
                    ) : (
                      Object.entries(profile.topics).map(([topic, data]) => {
                        const topicData = data as any;
                        const avg = Math.round(topicData.scores.reduce((a: number, b: number) => a + b, 0) / topicData.scores.length);
                        return (
                          <div key={topic} className={cn(
                            "p-4 rounded-2xl border flex items-center justify-between",
                            darkMode ? "bg-slate-800/30 border-slate-800" : "bg-white border-slate-100"
                          )}>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold">{topic}</p>
                                <p className="text-xs text-slate-500">{topicData.attempts} attempts</p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-4">
                              <MasteryBadge level={topicData.mastery} />
                              <div className="w-12 text-center">
                                <p className="text-lg font-bold text-indigo-500">{avg}%</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Progress Chart */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Learning Curve
                  </h3>
                  <div className={cn(
                    "h-64 w-full rounded-2xl p-4",
                    darkMode ? "bg-slate-950/50" : "bg-slate-50"
                  )}>
                    {analytics && analytics.progression.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.progression}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1E293B" : "#E2E8F0"} />
                          <XAxis dataKey="attempt" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                          <YAxis hide domain={[0, 100]} />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '12px', 
                              border: 'none', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              backgroundColor: darkMode ? '#0F172A' : '#FFFFFF'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#6366F1" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: darkMode ? '#0F172A' : '#fff' }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">
                        Start taking quizzes to see your learning curve.
                      </div>
                    )}
                  </div>
                </div>

                {/* Personalized Recommendations */}
                {currentRecommendation && currentRecommendation.recommendedVideos.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Brain className="w-5 h-5 text-indigo-500" />
                      Personalized Recommendations
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {currentRecommendation.recommendedVideos.map((video, idx) => (
                        <a 
                          key={idx}
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "p-4 rounded-2xl border flex items-start gap-4 transition-all hover:scale-[1.01]",
                            darkMode ? "bg-slate-800/30 border-slate-800 hover:bg-slate-800/50" : "bg-white border-slate-100 hover:bg-slate-50"
                          )}
                        >
                          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                            <PlayCircle className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-sm">{video.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-2">{video.reason}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 ml-auto shrink-0 self-center" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => setShowProfileSummary(false)}
                  className="bg-indigo-600 text-white px-12 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
                >
                  Close Summary
                </button>
                <button 
                  onClick={() => {
                    setSelectedStudent('');
                    setStep('selection');
                    setProfile(null);
                    setShowProfileSummary(false);
                  }}
                  className={cn(
                    "px-12 py-3 rounded-2xl font-bold transition-all border",
                    darkMode 
                      ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Switch User
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className={cn(
            "p-8 rounded-3xl shadow-2xl border flex flex-col items-center gap-4",
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          )}>
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className={cn(
              "font-bold",
              darkMode ? "text-slate-200" : "text-slate-700"
            )}>Agents are collaborating...</p>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${darkMode ? '#334155' : '#CBD5E1'};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? '#475569' : '#94A3B8'};
        }
      `}</style>
    </div>
  );
}

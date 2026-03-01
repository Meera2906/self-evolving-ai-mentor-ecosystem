# Self-Evolving AI Mentor Ecosystem

A sophisticated adaptive learning platform powered by a multi-agent AI architecture that personalizes education through intelligent collaboration between specialized agents.

## 🎯 Overview

The Self-Evolving AI Mentor Ecosystem is an intelligent tutoring system that adapts to each learner's unique needs. Unlike traditional learning platforms, this system employs four specialized AI agents that work together to create a truly personalized learning experience. The platform continuously evolves its teaching strategies based on student performance, ensuring optimal learning outcomes.

## 🏗️ Architecture

### Multi-Agent System

The platform is built on a collaborative multi-agent architecture where each agent has a specific responsibility:

#### 1. **Learner Agent**
- Manages student profiles and learning history
- Tracks performance metrics across different topics
- Maintains mastery levels (Weak, Moderate, Strong)
- Stores historical scores and attempt counts
- Persists data using SQLite database

#### 2. **Assessment Agent**
- Generates adaptive quizzes using Google Gemini AI
- Adjusts question difficulty based on mastery level
- Evaluates student responses and calculates scores
- Creates topic-specific assessments (Math, Coding, Aptitude, Mixed)

#### 3. **Strategy Agent**
- Analyzes performance patterns to recommend learning strategies
- Determines optimal difficulty progression (Reinforce, Maintain, Challenge)
- Suggests relevant learning resources and video tutorials
- Provides personalized explanations for recommendations

#### 4. **Analytics Agent**
- Computes performance statistics and trends
- Generates progression charts and visualizations
- Calculates average scores and total attempts
- Provides insights into learning patterns

### Agent Collaboration Flow

```
Student Selects Topic
        ↓
Learner Agent → Retrieves Profile & History
        ↓
Strategy Agent → Recommends Difficulty Level
        ↓
Assessment Agent → Generates Adaptive Quiz
        ↓
Student Completes Quiz
        ↓
Assessment Agent → Evaluates Answers
        ↓
Learner Agent → Updates Profile & Mastery
        ↓
Strategy Agent → Provides Next Steps
        ↓
Analytics Agent → Updates Performance Metrics
```

## ✨ Features

### For Learners
- **Personalized Learning Paths**: Adaptive difficulty based on individual performance
- **Multiple Topics**: Math, Coding, Aptitude, and Mixed assessments
- **Real-time Feedback**: Instant scoring and mastery level updates
- **Progress Tracking**: Visual charts showing performance trends
- **Resource Recommendations**: Curated video tutorials based on weak areas
- **Topic History**: Complete record of attempts and scores

### For Developers
- **Modular Agent Architecture**: Easy to extend with new agents
- **Type-Safe TypeScript**: Full type definitions for all components
- **Real-time Logging**: Monitor agent collaboration in the log panel
- **RESTful API**: Clean separation between frontend and backend
- **Persistent Storage**: SQLite database for reliable data management

## 🛠️ Technology Stack

### Frontend
- **React 19** - Modern UI library with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Motion** - Smooth animations and transitions
- **Recharts** - Interactive data visualizations
- **Lucide React** - Beautiful icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **TypeScript** - Type-safe server code
- **Better-SQLite3** - Fast, synchronous SQLite database

### AI & Tools
- **Google Gemini AI** - Advanced language model for quiz generation
- **Vite** - Fast build tool and dev server
- **Google AI Studio** - AI model configuration and testing

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd self-evolving-ai-mentor-ecosystem
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

To get your API key:
1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy and paste it into `.env.local`

### 4. Run the Application
```bash
npm run dev
```

The application will start on `http://localhost:3000`

## 📁 Project Structure

```
self-evolving-ai-mentor-ecosystem/
├── src/
│   ├── agents/
│   │   ├── learnerAgent.ts      # Student profile management
│   │   ├── assessmentAgent.ts   # Quiz generation & evaluation
│   │   ├── strategyAgent.ts     # Learning strategy recommendations
│   │   └── analyticsAgent.ts    # Performance analytics
│   ├── App.tsx                  # Main React component
│   ├── types.ts                 # TypeScript type definitions
│   ├── main.tsx                 # React entry point
│   └── index.css                # Global styles
├── data/
│   └── learner_profiles.json    # SQLite database (auto-generated)
├── server.ts                    # Express server & API routes
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite build configuration
└── .env.local                   # Environment variables (create this)
```

## 🎮 Usage Guide

### Creating a Student Profile
1. Launch the application
2. Enter a new student name in the input field
3. Click the "+" button to create the profile

### Taking an Assessment
1. Select your student profile
2. Choose a topic (Math, Coding, Aptitude, or Mixed)
3. Review the strategy recommendation
4. Answer all 5 questions
5. Submit the assessment

### Understanding Results
- **Score**: Percentage of correct answers
- **Mastery Level**: 
  - Weak (0-59%)
  - Moderate (60-79%)
  - Strong (80-100%)
- **Strategy Recommendation**: Suggested next steps
- **Learning Resources**: Video tutorials for improvement

### Tracking Progress
- View performance summary in the right sidebar
- Check progression chart for score trends
- Review topic history table for detailed statistics

## 🔌 API Endpoints

### GET `/api/students`
Returns list of all student names
```json
["Alice", "Bob", "Charlie"]
```

### GET `/api/profile/:name`
Returns student profile and analytics
```json
{
  "profile": { "name": "Alice", "topics": {...} },
  "analytics": { "averageScore": 75, "totalAttempts": 10 },
  "logs": ["[Learner Agent] Retrieved profile..."]
}
```

### POST `/api/quiz/generate`
Generates adaptive quiz for a topic
```json
{
  "name": "Alice",
  "topic": "Math"
}
```

### POST `/api/quiz/submit`
Submits quiz answers and updates profile
```json
{
  "name": "Alice",
  "topic": "Math",
  "quiz": {...},
  "answers": [0, 2, 1, 3, 0]
}
```

## 🧪 Development

### Build for Production
```bash
npm run build
```

### Type Checking
```bash
npm run lint
```

### Clean Build Files
```bash
npm run clean
```

## 🎨 Customization

### Adding New Topics
Edit `src/App.tsx`:
```typescript
const TOPICS = ['Math', 'Coding', 'Aptitude', 'Mixed', 'YourNewTopic'];
```

### Modifying Mastery Thresholds
Edit `src/agents/learnerAgent.ts`:
```typescript
if (avgScore >= 80) return 'Strong';
if (avgScore >= 60) return 'Moderate';
return 'Weak';
```

### Customizing Quiz Generation
Edit `src/agents/assessmentAgent.ts` to modify the Gemini AI prompts

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Google Gemini AI for powering intelligent quiz generation
- The React and TypeScript communities for excellent tooling
- All contributors and users of this platform

## 📧 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Built with ❤️ using Multi-Agent Architecture

import { MasteryLevel, Recommendation, Video } from '../types';

export class StrategyAgent {
  private logs: string[] = [];

  private videoLibrary: Record<string, Record<MasteryLevel, Video[]>> = {
    'Coding': {
      'Weak': [
        { title: "Python Basics - Data Types Explained", url: "https://youtube.com/results?search_query=python+data+types+explained", reason: "Strengthen fundamental understanding of datatypes." },
        { title: "Programming for Beginners", url: "https://youtube.com/results?search_query=programming+for+beginners", reason: "Get a high-level overview of how code works." }
      ],
      'Moderate': [
        { title: "Data Structures and Algorithms", url: "https://youtube.com/results?search_query=data+structures+and+algorithms", reason: "Learn how to organize data efficiently." },
        { title: "Object Oriented Programming Concepts", url: "https://youtube.com/results?search_query=oop+concepts+explained", reason: "Master the pillars of modern software design." }
      ],
      'Strong': [
        { title: "System Design Primer", url: "https://youtube.com/results?search_query=system+design+primer", reason: "Prepare for large-scale application architecture." },
        { title: "Advanced Algorithms - Dynamic Programming", url: "https://youtube.com/results?search_query=dynamic+programming+tutorial", reason: "Solve complex problems with optimized logic." }
      ]
    },
    'Math': {
      'Weak': [
        { title: "Basic Arithmetic Refresher", url: "https://youtube.com/results?search_query=basic+arithmetic+refresher", reason: "Solidify your core calculation skills." },
        { title: "Understanding Fractions and Decimals", url: "https://youtube.com/results?search_query=fractions+and+decimals+basics", reason: "Master the building blocks of mathematics." }
      ],
      'Moderate': [
        { title: "Algebra 1 Full Course", url: "https://youtube.com/results?search_query=algebra+1+full+course", reason: "Learn to solve equations and understand variables." },
        { title: "Geometry Essentials", url: "https://youtube.com/results?search_query=geometry+essentials", reason: "Understand shapes, angles, and spatial reasoning." }
      ],
      'Strong': [
        { title: "Calculus for Beginners", url: "https://youtube.com/results?search_query=calculus+for+beginners", reason: "Explore the mathematics of change and motion." },
        { title: "Linear Algebra for Machine Learning", url: "https://youtube.com/results?search_query=linear+algebra+for+ml", reason: "Apply advanced math to modern technology." }
      ]
    },
    'Aptitude': {
      'Weak': [
        { title: "Logical Reasoning Basics", url: "https://youtube.com/results?search_query=logical+reasoning+basics", reason: "Learn the fundamentals of pattern recognition." },
        { title: "Basic Number Series Patterns", url: "https://youtube.com/results?search_query=number+series+patterns", reason: "Improve your sequence identification skills." }
      ],
      'Moderate': [
        { title: "Quantitative Aptitude Tricks", url: "https://youtube.com/results?search_query=quantitative+aptitude+tricks", reason: "Solve word problems faster with mental math." },
        { title: "Verbal Reasoning Techniques", url: "https://youtube.com/results?search_query=verbal+reasoning+techniques", reason: "Master logical deduction and word associations." }
      ],
      'Strong': [
        { title: "Advanced Data Interpretation", url: "https://youtube.com/results?search_query=data+interpretation+advanced", reason: "Analyze complex charts and datasets efficiently." },
        { title: "Critical Thinking and Problem Solving", url: "https://youtube.com/results?search_query=critical+thinking+skills", reason: "Develop high-level strategies for abstract problems." }
      ]
    }
  };

  constructor() {}

  private log(message: string) {
    const logMsg = `[Strategy Agent] ${message}`;
    console.log(logMsg);
    this.logs.push(logMsg);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  recommend(topic: string, mastery: MasteryLevel): Recommendation {
    this.log(`Mastery Level Detected: ${mastery}`);
    
    let mode = '';
    let explanation = '';

    switch (mastery) {
      case 'Weak':
        mode = 'Concept Explanation Mode';
        explanation = 'Recommendation based on mastery level: Weak. We will focus on fundamental concepts and step-by-step breakdowns.';
        break;
      case 'Moderate':
        mode = 'Practice Reinforcement Mode';
        explanation = 'Recommendation based on mastery level: Moderate. You have a good grasp, let\'s solidify it with more varied practice problems.';
        break;
      case 'Strong':
        mode = 'Advanced Challenge Mode';
        explanation = 'Recommendation based on mastery level: Strong. You are ready for complex scenarios and high-level abstract thinking.';
        break;
    }

    const recommendedVideos = this.videoLibrary[topic]?.[mastery] || this.videoLibrary['Coding']['Weak'];
    
    this.log(`Recommending ${recommendedVideos.length} videos for ${mastery} level`);
    this.log(`Recommended Mode: ${mode}`);
    
    return { mode, explanation, recommendedVideos };
  }
}

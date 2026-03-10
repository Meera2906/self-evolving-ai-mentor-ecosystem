import { MasteryLevel, Recommendation, Video } from '../types';

export class StrategyAgent {
  private logs: string[] = [];

  private videoLibrary: Record<string, Record<MasteryLevel, Video[]>> = {
    'Coding': {
      'Weak': [
        { title: "Python Basics - Data Types Explained", url: "https://youtube.com/results?search_query=python+data+types+explained", reason: "Strengthen fundamental understanding of datatypes." },
        { title: "Programming for Beginners", url: "https://youtube.com/results?search_query=programming+for+beginners", reason: "Get a high-level overview of how code works." },
        { title: "Logic Building for Coding", url: "https://youtube.com/results?search_query=logic+building+for+coding", reason: "Develop the mindset required for problem solving." }
      ],
      'Moderate': [
        { title: "Data Structures and Algorithms", url: "https://youtube.com/results?search_query=data+structures+and+algorithms", reason: "Learn how to organize data efficiently." },
        { title: "Object Oriented Programming Concepts", url: "https://youtube.com/results?search_query=oop+concepts+explained", reason: "Master the pillars of modern software design." },
        { title: "Clean Code Principles", url: "https://youtube.com/results?search_query=clean+code+principles", reason: "Learn to write maintainable and professional code." }
      ],
      'Strong': [
        { title: "System Design Primer", url: "https://youtube.com/results?search_query=system+design+primer", reason: "Prepare for large-scale application architecture." },
        { title: "Advanced Algorithms - Dynamic Programming", url: "https://youtube.com/results?search_query=dynamic+programming+tutorial", reason: "Solve complex problems with optimized logic." },
        { title: "Concurrency and Multithreading", url: "https://youtube.com/results?search_query=concurrency+and+multithreading", reason: "Understand how to build high-performance applications." }
      ]
    },
    'Math': {
      'Weak': [
        { title: "Basic Arithmetic Refresher", url: "https://youtube.com/results?search_query=basic+arithmetic+refresher", reason: "Solidify your core calculation skills." },
        { title: "Understanding Fractions and Decimals", url: "https://youtube.com/results?search_query=fractions+and+decimals+basics", reason: "Master the building blocks of mathematics." },
        { title: "Number Systems Simplified", url: "https://youtube.com/results?search_query=number+systems+simplified", reason: "Understand the different types of numbers and their properties." }
      ],
      'Moderate': [
        { title: "Algebra 1 Full Course", url: "https://youtube.com/results?search_query=algebra+1+full+course", reason: "Learn to solve equations and understand variables." },
        { title: "Geometry Essentials", url: "https://youtube.com/results?search_query=geometry+essentials", reason: "Understand shapes, angles, and spatial reasoning." },
        { title: "Trigonometry Basics", url: "https://youtube.com/results?search_query=trigonometry+basics", reason: "Master the relationships between triangle sides and angles." }
      ],
      'Strong': [
        { title: "Calculus for Beginners", url: "https://youtube.com/results?search_query=calculus+for+beginners", reason: "Explore the mathematics of change and motion." },
        { title: "Linear Algebra for Machine Learning", url: "https://youtube.com/results?search_query=linear+algebra+for+ml", reason: "Apply advanced math to modern technology." },
        { title: "Probability and Statistics Advanced", url: "https://youtube.com/results?search_query=advanced+probability+and+statistics", reason: "Master data analysis and predictive modeling." }
      ]
    },
    'Aptitude': {
      'Weak': [
        { title: "Logical Reasoning Basics", url: "https://youtube.com/results?search_query=logical+reasoning+basics", reason: "Learn the fundamentals of pattern recognition." },
        { title: "Basic Number Series Patterns", url: "https://youtube.com/results?search_query=number+series+patterns", reason: "Improve your sequence identification skills." },
        { title: "Blood Relations and Directions", url: "https://youtube.com/results?search_query=blood+relations+and+directions+aptitude", reason: "Master common logical reasoning problem types." }
      ],
      'Moderate': [
        { title: "Quantitative Aptitude Tricks", url: "https://youtube.com/results?search_query=quantitative+aptitude+tricks", reason: "Solve word problems faster with mental math." },
        { title: "Verbal Reasoning Techniques", url: "https://youtube.com/results?search_query=verbal+reasoning+techniques", reason: "Master logical deduction and word associations." },
        { title: "Time, Speed, and Distance", url: "https://youtube.com/results?search_query=time+speed+distance+aptitude", reason: "Solve complex motion problems with ease." }
      ],
      'Strong': [
        { title: "Advanced Data Interpretation", url: "https://youtube.com/results?search_query=data+interpretation+advanced", reason: "Analyze complex charts and datasets efficiently." },
        { title: "Critical Thinking and Problem Solving", url: "https://youtube.com/results?search_query=critical+thinking+skills", reason: "Develop high-level strategies for abstract problems." },
        { title: "Abstract Reasoning Masterclass", url: "https://youtube.com/results?search_query=abstract+reasoning+masterclass", reason: "Master non-verbal reasoning and spatial visualization." }
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

  recommend(topic: string, topicData: any): Recommendation {
    const mastery = topicData.mastery as MasteryLevel;
    this.log(`Mastery Level Detected: ${mastery}`);
    
    let mode = '';
    let explanation = '';
    let weakConcepts: string[] = [];

    if (topicData.concepts) {
      weakConcepts = Object.values(topicData.concepts as Record<string, any>)
        .filter((c: any) => c.accuracy < 60)
        .map((c: any) => c.concept);
    }

    if (weakConcepts.length > 0) {
      mode = 'Targeted Concept Reinforcement';
      explanation = `We've identified specific weaknesses in: ${weakConcepts.join(', ')}. Let's focus on these concepts to improve your overall ${topic} mastery.`;
    } else {
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
    }

    let recommendedVideos = [...(this.videoLibrary[topic]?.[mastery] || this.videoLibrary['Coding']['Weak'])];
    
    // Add specific concept videos if available
    if (weakConcepts.length > 0) {
      weakConcepts.forEach(concept => {
        recommendedVideos.unshift({
          title: `${concept} Refresher & Practice`,
          url: `https://youtube.com/results?search_query=${topic}+${concept}+tutorial`,
          reason: `Targeted help for your struggle with ${concept}.`
        });
      });
    }

    this.log(`Recommending ${recommendedVideos.length} videos for ${mastery} level`);
    this.log(`Recommended Mode: ${mode}`);
    
    return { mode, explanation, recommendedVideos: recommendedVideos.slice(0, 5) };
  }
}

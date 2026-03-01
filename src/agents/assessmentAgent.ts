import { MasteryLevel, Quiz, QuizQuestion } from '../types';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export class AssessmentAgent {
  private logs: string[] = [];

  private questionBank: Record<string, Record<Difficulty, QuizQuestion[]>> = {
    'Coding': {
      'Easy': [
        { question: "Which of the following is a datatype in Python?", options: ["String", "Repeat", "Integer", "Python"], correctIndex: 0 },
        { question: "What is the correct file extension for Python files?", options: [".py", ".python", ".pt", ".pyt"], correctIndex: 0 },
        { question: "Which function is used to output text to the console?", options: ["output()", "print()", "write()", "log()"], correctIndex: 1 },
        { question: "How do you start a comment in Python?", options: ["//", "/*", "#", "--"], correctIndex: 2 },
        { question: "Which of these is used to define a block of code in Python?", options: ["Brackets", "Indentation", "Parentheses", "Quotes"], correctIndex: 1 },
        { question: "What is the result of 3 * 3?", options: ["6", "9", "12", "33"], correctIndex: 1 },
        { question: "Which of these is a valid variable name?", options: ["2myvar", "my-var", "my_var", "my var"], correctIndex: 2 },
        { question: "What keyword is used to create a function?", options: ["func", "define", "def", "function"], correctIndex: 2 },
        { question: "Which of these is a boolean value?", options: ["'True'", "True", "1", "0"], correctIndex: 1 },
        { question: "What is the default value of an uninitialized integer in many C-style languages?", options: ["0", "null", "undefined", "Garbage value"], correctIndex: 3 }
      ],
      'Medium': [
        { question: "What is an array?", options: ["A single variable", "A collection of items at contiguous memory", "A type of function", "A loop structure"], correctIndex: 1 },
        { question: "Which loop is best when the number of iterations is known?", options: ["While", "Do-While", "For", "Infinite"], correctIndex: 2 },
        { question: "What is the index of the first element in an array?", options: ["1", "-1", "0", "Any number"], correctIndex: 2 },
        { question: "What does 'OOP' stand for?", options: ["Object Oriented Programming", "Open Operation Process", "Ordered Object Protocol", "Only One Path"], correctIndex: 0 },
        { question: "Which of these is NOT a pillar of OOP?", options: ["Encapsulation", "Inheritance", "Polymorphism", "Compilation"], correctIndex: 3 },
        { question: "What is a constructor?", options: ["A method to delete objects", "A method to initialize objects", "A type of variable", "A loop type"], correctIndex: 1 },
        { question: "What is the purpose of 'break' in a loop?", options: ["To skip one iteration", "To exit the loop entirely", "To restart the loop", "To slow down execution"], correctIndex: 1 },
        { question: "Which data structure uses LIFO (Last In First Out)?", options: ["Queue", "Stack", "Linked List", "Tree"], correctIndex: 1 },
        { question: "What is the time complexity of accessing an element in an array by index?", options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"], correctIndex: 0 },
        { question: "What is a 'null pointer'?", options: ["A pointer to zero", "A pointer that points to nothing", "An error in syntax", "A fast pointer"], correctIndex: 1 }
      ],
      'Hard': [
        { question: "What is recursion?", options: ["A loop", "A function calling itself", "A memory leak", "A type of class"], correctIndex: 1 },
        { question: "What is the time complexity of binary search?", options: ["O(n)", "O(n^2)", "O(log n)", "O(1)"], correctIndex: 2 },
        { question: "What is 'encapsulation'?", options: ["Hiding internal details", "Speeding up loops", "Writing comments", "Compiling code"], correctIndex: 0 },
        { question: "What is the purpose of an interface?", options: ["To store data", "To define a contract", "To speed up code", "To handle errors"], correctIndex: 1 },
        { question: "What is a 'memory leak'?", options: ["Hardware failure", "Unreleased allocated memory", "Fast memory access", "A type of virus"], correctIndex: 1 },
        { question: "Which sorting algorithm has the best average time complexity?", options: ["Bubble Sort", "Insertion Sort", "Quick Sort", "Selection Sort"], correctIndex: 2 },
        { question: "What is a 'deadlock' in multithreading?", options: ["Fast execution", "Threads waiting for each other indefinitely", "A finished thread", "A syntax error"], correctIndex: 1 },
        { question: "What is the difference between a Process and a Thread?", options: ["No difference", "Process is a subset of Thread", "Thread is a subset of Process", "Process is faster"], correctIndex: 2 },
        { question: "What is 'Big O' notation used for?", options: ["Naming variables", "Measuring algorithm efficiency", "Writing loops", "Debugging"], correctIndex: 1 },
        { question: "What is a 'singleton' pattern?", options: ["A class with multiple instances", "A class with only one instance", "A type of array", "A loop pattern"], correctIndex: 1 }
      ]
    },
    'Math': {
      'Easy': [
        { question: "What is 15 + 27?", options: ["32", "42", "52", "45"], correctIndex: 1 },
        { question: "What is 8 x 7?", options: ["54", "56", "64", "48"], correctIndex: 1 },
        { question: "What is the square root of 25?", options: ["4", "5", "6", "10"], correctIndex: 1 },
        { question: "What is 100 / 4?", options: ["20", "25", "30", "50"], correctIndex: 1 },
        { question: "What is 10 - (3 + 2)?", options: ["5", "9", "7", "1"], correctIndex: 0 },
        { question: "What is 1/2 + 1/4?", options: ["1/6", "2/6", "3/4", "1/8"], correctIndex: 2 },
        { question: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], correctIndex: 1 },
        { question: "What is the value of 5 squared?", options: ["10", "15", "25", "50"], correctIndex: 2 },
        { question: "What is 0.5 as a percentage?", options: ["5%", "50%", "0.5%", "500%"], correctIndex: 1 },
        { question: "What is the perimeter of a square with side 4?", options: ["8", "12", "16", "20"], correctIndex: 2 }
      ],
      'Medium': [
        { question: "Solve for x: 2x + 5 = 13", options: ["3", "4", "5", "6"], correctIndex: 1 },
        { question: "What is the area of a rectangle with length 5 and width 4?", options: ["9", "18", "20", "25"], correctIndex: 2 },
        { question: "What is 15% of 200?", options: ["20", "25", "30", "35"], correctIndex: 2 },
        { question: "What is the value of Pi (approx)?", options: ["3.12", "3.14", "3.16", "3.18"], correctIndex: 1 },
        { question: "What is 2 to the power of 5?", options: ["10", "16", "32", "64"], correctIndex: 2 },
        { question: "What is the median of 1, 3, 3, 6, 7, 8, 9?", options: ["3", "6", "7", "8"], correctIndex: 1 },
        { question: "What is the volume of a cube with side 3?", options: ["9", "18", "27", "81"], correctIndex: 2 },
        { question: "If a triangle has angles 90 and 45, what is the third angle?", options: ["45", "90", "180", "30"], correctIndex: 0 },
        { question: "What is the slope of the line y = 3x + 2?", options: ["2", "3", "3x", "1"], correctIndex: 1 },
        { question: "What is the probability of flipping heads on a fair coin?", options: ["0", "0.5", "1", "0.25"], correctIndex: 1 }
      ],
      'Hard': [
        { question: "What is the derivative of x^2?", options: ["x", "2x", "2", "x^3"], correctIndex: 1 },
        { question: "What is the sum of angles in a triangle?", options: ["90", "180", "270", "360"], correctIndex: 1 },
        { question: "Solve for x: x^2 - 4 = 0", options: ["2", "4", "0", "2 and -2"], correctIndex: 3 },
        { question: "What is the log base 10 of 1000?", options: ["2", "3", "4", "10"], correctIndex: 1 },
        { question: "What is the hypotenuse of a triangle with sides 3 and 4?", options: ["5", "6", "7", "25"], correctIndex: 0 },
        { question: "What is the integral of 2x?", options: ["x", "x^2", "2", "x^2 + C"], correctIndex: 3 },
        { question: "What is the value of sin(90 degrees)?", options: ["0", "0.5", "1", "-1"], correctIndex: 2 },
        { question: "What is the formula for the area of a circle?", options: ["2*pi*r", "pi*r^2", "pi*d", "2*pi*r^2"], correctIndex: 1 },
        { question: "What is the limit of 1/x as x approaches infinity?", options: ["1", "Infinity", "0", "Undefined"], correctIndex: 2 },
        { question: "What is the number of permutations of 3 items?", options: ["3", "6", "9", "1"], correctIndex: 1 }
      ]
    },
    'Aptitude': {
      'Easy': [
        { question: "Complete the pattern: 2, 4, 6, 8, ?", options: ["9", "10", "11", "12"], correctIndex: 1 },
        { question: "Which word is the odd one out?", options: ["Apple", "Banana", "Carrot", "Orange"], correctIndex: 2 },
        { question: "If CAT is 3120, what is DOG?", options: ["4157", "4158", "5157", "4167"], correctIndex: 0 },
        { question: "Find the next letter: A, C, E, G, ?", options: ["H", "I", "J", "K"], correctIndex: 1 },
        { question: "If yesterday was Monday, what is tomorrow?", options: ["Tuesday", "Wednesday", "Thursday", "Sunday"], correctIndex: 1 },
        { question: "Which number is prime?", options: ["4", "6", "9", "11"], correctIndex: 3 },
        { question: "How many months have 31 days?", options: ["6", "7", "8", "5"], correctIndex: 1 },
        { question: "A is the father of B, but B is not the son of A. What is B?", options: ["Daughter", "Brother", "Sister", "Cousin"], correctIndex: 0 },
        { question: "Which direction is opposite to South-East?", options: ["North-West", "North-East", "South-West", "North"], correctIndex: 0 },
        { question: "If 1=5, 2=10, 3=15, 4=20, then 5=?", options: ["25", "1", "30", "5"], correctIndex: 1 }
      ],
      'Medium': [
        { question: "A train travels 300km in 5 hours. What is its speed?", options: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"], correctIndex: 1 },
        { question: "If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops Lazzies?", options: ["Yes", "No", "Maybe", "Cannot tell"], correctIndex: 0 },
        { question: "Point A is North of B. B is West of C. What is the direction of A from C?", options: ["North-West", "North-East", "South-West", "South-East"], correctIndex: 0 },
        { question: "Find the missing number: 1, 4, 9, 16, ?", options: ["20", "24", "25", "30"], correctIndex: 2 },
        { question: "If 5 workers can build a wall in 10 days, how long for 10 workers?", options: ["20 days", "10 days", "5 days", "2 days"], correctIndex: 2 },
        { question: "A is twice as old as B. In 5 years, A will be 25. How old is B now?", options: ["10", "15", "20", "5"], correctIndex: 0 },
        { question: "Which number comes next: 1, 2, 4, 8, 16, ?", options: ["24", "30", "32", "64"], correctIndex: 2 },
        { question: "If RED is coded as 27, what is BLUE coded as?", options: ["40", "42", "38", "36"], correctIndex: 0 },
        { question: "A man walks 3km North, then 4km East. How far is he from start?", options: ["5km", "7km", "1km", "12km"], correctIndex: 0 },
        { question: "Which is the largest fraction?", options: ["1/2", "2/3", "3/4", "4/5"], correctIndex: 3 }
      ],
      'Hard': [
        { question: "A clock shows 3:15. What is the angle between the hands?", options: ["0", "7.5", "15", "22.5"], correctIndex: 1 },
        { question: "If 'P + Q' means P is the brother of Q, and 'P * Q' means P is the father of Q, what does 'A + B * C' mean?", options: ["A is C's uncle", "A is C's father", "A is C's brother", "A is C's son"], correctIndex: 0 },
        { question: "In a group of 15 people, 7 read French, 8 read English, and 3 read both. How many read neither?", options: ["0", "3", "5", "2"], correctIndex: 1 },
        { question: "What is the probability of rolling a sum of 7 with two dice?", options: ["1/6", "1/12", "1/36", "5/36"], correctIndex: 0 },
        { question: "If 3rd January is Sunday, what is the 4th Wednesday of that month?", options: ["20th", "27th", "24th", "25th"], correctIndex: 1 },
        { question: "A sum of money doubles in 10 years at simple interest. What is the rate?", options: ["5%", "10%", "15%", "20%"], correctIndex: 1 },
        { question: "If 12th March 2023 was Sunday, what day was 12th March 2024?", options: ["Monday", "Tuesday", "Wednesday", "Thursday"], correctIndex: 1 },
        { question: "A can do a work in 10 days, B in 15 days. How long together?", options: ["5 days", "6 days", "7 days", "8 days"], correctIndex: 1 },
        { question: "What is the next number in: 2, 3, 5, 7, 11, 13, ?", options: ["15", "17", "19", "21"], correctIndex: 1 },
        { question: "If 'WATER' is 'XBUFS', what is 'SCHOOL'?", options: ["TDIPPM", "TDIPPN", "RDIPPM", "TDJPPM"], correctIndex: 0 }
      ]
    }
  };

  constructor() {}

  private log(message: string) {
    const logMsg = `[Assessment Agent] ${message}`;
    console.log(logMsg);
    this.logs.push(logMsg);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  async generateQuiz(topic: string, mastery: MasteryLevel): Promise<Quiz> {
    this.log(`Previous Mastery: ${mastery}`);
    
    let difficulty: Difficulty = 'Easy';
    if (mastery === 'Moderate') difficulty = 'Medium';
    if (mastery === 'Strong') difficulty = 'Hard';

    this.log(`Difficulty Selected: ${difficulty}`);
    this.log(`Generating adaptive quiz`);
    
    const topicQuizzes = this.questionBank[topic] || this.questionBank['Coding'];
    const pool = topicQuizzes[difficulty];

    // Randomly select 5 questions without repeats
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const questions = shuffled.slice(0, 5);

    this.log('Quiz generated successfully from adaptive bank');
    return { questions };
  }

  evaluate(quiz: Quiz, answers: number[]): number {
    this.log('Evaluating answers');
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (q.correctIndex === answers[i]) {
        correct++;
      }
    });
    const score = (correct / quiz.questions.length) * 100;
    this.log(`Evaluation complete. Score: ${score}%`);
    return score;
  }
}

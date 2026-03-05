import fs from 'fs';
import path from 'path';
import { StudentProfile, MasteryLevel, TopicData } from '../types';

const DATA_PATH = path.join(process.cwd(), 'data', 'learner_profiles.json');

export class LearnerAgent {
  private logs: string[] = [];

  private log(message: string) {
    const logMsg = `[Learner Agent] ${message}`;
    console.log(logMsg);
    this.logs.push(logMsg);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  private readData(): Record<string, StudentProfile> {
    try {
      if (!fs.existsSync(DATA_PATH)) return {};
      const content = fs.readFileSync(DATA_PATH, 'utf-8');
      return JSON.parse(content || '{}');
    } catch (e) {
      return {};
    }
  }

  private saveData(data: Record<string, StudentProfile>) {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    this.log('Database Saved');
  }

  getProfile(name: string): StudentProfile {
    const data = this.readData();
    if (!data[name]) {
      data[name] = { name, topics: {} };
      this.saveData(data);
    }
    if (!data[name].topics) {
      data[name].topics = {};
    }
    this.log(`Student Profile Loaded: ${name}`);
    return data[name];
  }

  updateScore(name: string, topic: string, score: number, conceptResults: Record<string, { correct: number; total: number }>) {
    const data = this.readData();
    if (!data[name]) data[name] = { name, topics: {} };
    
    if (!data[name].topics[topic]) {
      data[name].topics[topic] = { scores: [], mastery: 'Weak', attempts: 0, concepts: {} };
    }

    const topicData = data[name].topics[topic];
    topicData.scores.push(score);
    topicData.attempts += 1;

    // Update concept performance
    if (!topicData.concepts) topicData.concepts = {};
    
    Object.entries(conceptResults).forEach(([concept, result]) => {
      if (!topicData.concepts![concept]) {
        topicData.concepts![concept] = { concept, attempts: 0, correct: 0, accuracy: 0 };
      }
      
      const cp = topicData.concepts![concept];
      cp.attempts += result.total;
      cp.correct += result.correct;
      cp.accuracy = Math.round((cp.correct / cp.attempts) * 100);
    });

    const avg = topicData.scores.reduce((a, b) => a + b, 0) / topicData.scores.length;
    
    let newMastery: MasteryLevel = 'Weak';
    if (avg >= 80) newMastery = 'Strong';
    else if (avg >= 60) newMastery = 'Moderate';

    topicData.mastery = newMastery;

    this.log(`Student: ${name}`);
    this.log(`Topic: ${topic}`);
    this.log(`Score: ${score}`);
    this.log(`Mastery Updated: ${newMastery}`);
    this.log(`Concepts Updated: ${Object.keys(conceptResults).join(', ')}`);
    
    this.saveData(data);
    return topicData;
  }

  getAllStudents(): string[] {
    return Object.keys(this.readData());
  }
}

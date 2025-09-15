import type { Problem, DifficultyLevel, ProblemCategory } from '$types/problem';
import { ProblemParser } from './problemParser';
import { problemContents } from '$lib/problems';

export class ProblemLoader {
  private static problems: Map<string, Problem> = new Map();
  private static loaded = false;
  
  static async loadAllProblems(): Promise<void> {
    if (this.loaded) return;
    
    const entries = Object.entries(problemContents);
    console.log('Loading problems from:', entries.length, 'files');
    
    for (const [id, content] of entries) {
      try {
        const problem = ProblemParser.parseToml(content);
        this.problems.set(problem.id, problem);
        console.log('Loaded problem:', problem.id);
      } catch (error) {
        console.error(`Failed to load problem ${id}:`, error);
      }
    }
    
    console.log('Total problems loaded:', this.problems.size);
    this.loaded = true;
  }
  
  static async getProblem(id: string): Promise<Problem | null> {
    await this.loadAllProblems();
    return this.problems.get(id) || null;
  }
  
  static async getAllProblems(): Promise<Problem[]> {
    await this.loadAllProblems();
    return Array.from(this.problems.values());
  }
  
  static async getProblemsByDifficulty(difficulty: DifficultyLevel): Promise<Problem[]> {
    const all = await this.getAllProblems();
    return all.filter(p => p.difficulty === difficulty);
  }
  
  static async getProblemsByCategory(category: ProblemCategory): Promise<Problem[]> {
    const all = await this.getAllProblems();
    return all.filter(p => p.category === category);
  }
  
  static async getCategories(): Promise<ProblemCategory[]> {
    const all = await this.getAllProblems();
    const categories = new Set<ProblemCategory>();
    all.forEach(p => categories.add(p.category));
    return Array.from(categories);
  }
  
  static async getDifficulties(): Promise<DifficultyLevel[]> {
    return ['easy', 'medium', 'hard'];
  }
  
  static async searchProblems(query: string): Promise<Problem[]> {
    const all = await this.getAllProblems();
    const lowerQuery = query.toLowerCase();
    
    return all.filter(p => 
      p.title.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
    );
  }
}
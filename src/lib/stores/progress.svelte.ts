import type { 
  UserProgress, 
  CompletedProblemsData, 
  CompletedProblem,
  CurrentProblemData,
  Achievement
} from '$types/storage';
import type { TestResult, DifficultyLevel, ProblemCategory } from '$types/problem';
import { storage } from '$types/storage';

/**
 * 進捗管理ストア
 * Svelte 5 Runesを使用
 */
class ProgressStore {
  private userProgress = $state<UserProgress>({
    userId: this.generateUserId(),
    totalScore: 0,
    level: 1,
    experience: 0,
    streakDays: 0,
    lastActiveDate: new Date(),
    achievements: []
  });
  
  private completedProblems = $state<CompletedProblemsData>({
    problems: [],
    totalCompleted: 0,
    byDifficulty: {
      easy: 0,
      medium: 0,
      hard: 0
    },
    byCategory: new Map()
  });
  
  private currentProblem = $state<CurrentProblemData | null>(null);
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }
  
  /**
   * ユーザー進捗を取得
   */
  get progress(): UserProgress {
    return this.userProgress;
  }
  
  /**
   * 完了した問題データを取得
   */
  get completed(): CompletedProblemsData {
    return this.completedProblems;
  }
  
  /**
   * 現在の問題を取得
   */
  get current(): CurrentProblemData | null {
    return this.currentProblem;
  }
  
  /**
   * 問題を開始
   */
  startProblem(problemId: string, initialCode: string): void {
    this.currentProblem = {
      problemId,
      startedAt: new Date(),
      code: initialCode,
      attempts: 0,
      hintsViewed: [],
      lastSaved: new Date()
    };
    
    this.saveCurrentProblem();
  }
  
  /**
   * コードを保存
   */
  saveCode(code: string): void {
    if (!this.currentProblem) return;
    
    this.currentProblem = {
      ...this.currentProblem,
      code,
      lastSaved: new Date()
    };
    
    this.saveCurrentProblem();
  }
  
  /**
   * ヒントを表示
   */
  viewHint(hintIndex: number): void {
    if (!this.currentProblem) return;
    
    const hintsViewed = [...this.currentProblem.hintsViewed];
    if (!hintsViewed.includes(hintIndex)) {
      hintsViewed.push(hintIndex);
    }
    
    this.currentProblem = {
      ...this.currentProblem,
      hintsViewed
    };
    
    this.saveCurrentProblem();
  }
  
  /**
   * 問題を完了
   */
  completeProblem(
    problemId: string,
    solution: string,
    difficulty: DifficultyLevel,
    category: ProblemCategory
  ): void {
    if (!this.currentProblem || this.currentProblem.problemId !== problemId) {
      return;
    }
    
    const timeSpent = Date.now() - this.currentProblem.startedAt.getTime();
    const score = this.calculateScore(
      difficulty,
      timeSpent,
      this.currentProblem.attempts,
      this.currentProblem.hintsViewed.length
    );
    
    // 完了した問題を追加
    const completedProblem: CompletedProblem = {
      problemId,
      completedAt: new Date(),
      attempts: this.currentProblem.attempts + 1,
      solution,
      timeSpent,
      hintsUsed: this.currentProblem.hintsViewed.length,
      score
    };
    
    // 完了データを更新
    const problems = [...this.completedProblems.problems, completedProblem];
    const byDifficulty = { ...this.completedProblems.byDifficulty };
    byDifficulty[difficulty]++;
    
    const byCategory = new Map(this.completedProblems.byCategory);
    byCategory.set(category, (byCategory.get(category) || 0) + 1);
    
    this.completedProblems = {
      problems,
      totalCompleted: problems.length,
      byDifficulty,
      byCategory
    };
    
    // ユーザー進捗を更新
    this.updateUserProgress(score);
    
    // 現在の問題をクリア
    this.currentProblem = null;
    
    // 保存
    this.saveAll();
  }
  
  /**
   * 問題の完了状態をチェック
   */
  isProblemCompleted(problemId: string): boolean {
    return this.completedProblems.problems.some(p => p.problemId === problemId);
  }
  
  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalCompleted: number;
    totalScore: number;
    averageScore: number;
    completionRate: Record<DifficultyLevel, number>;
  } {
    const problems = this.completedProblems.problems;
    const totalScore = problems.reduce((sum, p) => sum + p.score, 0);
    
    return {
      totalCompleted: problems.length,
      totalScore,
      averageScore: problems.length > 0 ? totalScore / problems.length : 0,
      completionRate: this.completedProblems.byDifficulty
    };
  }
  
  /**
   * 初期化
   */
  private initialize(): void {
    // ローカルストレージから読み込み
    const progress = storage.get('progress');
    if (progress) {
      this.userProgress = progress;
    }
    
    const completed = storage.get('completedProblems');
    if (completed) {
      // Mapの復元
      const byCategory = new Map(
        Object.entries(completed.byCategory as unknown as Record<string, number>)
      );
      this.completedProblems = {
        ...completed,
        byCategory
      };
    }
    
    const current = storage.get('currentProblem');
    if (current) {
      this.currentProblem = current;
    }
    
    // ストリークのチェック
    this.checkStreak();
  }
  
  /**
   * スコアを計算
   */
  private calculateScore(
    difficulty: DifficultyLevel,
    timeSpent: number,
    attempts: number,
    hintsUsed: number
  ): number {
    // 基本スコア
    const baseScore = {
      easy: 100,
      medium: 200,
      hard: 300
    }[difficulty];
    
    // 時間ボーナス（10分以内で完了したら追加点）
    const timeBonus = Math.max(0, 50 - Math.floor(timeSpent / 60000));
    
    // ペナルティ
    const attemptPenalty = Math.max(0, (attempts - 1) * 10);
    const hintPenalty = hintsUsed * 20;
    
    return Math.max(10, baseScore + timeBonus - attemptPenalty - hintPenalty);
  }
  
  /**
   * ユーザー進捗を更新
   */
  private updateUserProgress(score: number): void {
    const experience = this.userProgress.experience + score;
    const level = Math.floor(experience / 1000) + 1;
    
    this.userProgress = {
      ...this.userProgress,
      totalScore: this.userProgress.totalScore + score,
      experience,
      level,
      lastActiveDate: new Date()
    };
  }
  
  /**
   * ストリークをチェック
   */
  private checkStreak(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastActive = new Date(this.userProgress.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // 今日すでにアクティブ
      return;
    } else if (daysDiff === 1) {
      // ストリーク継続
      this.userProgress = {
        ...this.userProgress,
        streakDays: this.userProgress.streakDays + 1,
        lastActiveDate: new Date()
      };
    } else {
      // ストリークリセット
      this.userProgress = {
        ...this.userProgress,
        streakDays: 1,
        lastActiveDate: new Date()
      };
    }
    
    this.saveProgress();
  }
  
  /**
   * ユーザーIDを生成
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 進捗を保存
   */
  private saveProgress(): void {
    storage.set('progress', this.userProgress);
  }
  
  /**
   * 完了データを保存
   */
  private saveCompletedProblems(): void {
    // Mapをオブジェクトに変換
    const byCategory = Object.fromEntries(this.completedProblems.byCategory);
    storage.set('completedProblems', {
      ...this.completedProblems,
      byCategory: byCategory as unknown as Map<string, number>
    });
  }
  
  /**
   * 現在の問題を保存
   */
  private saveCurrentProblem(): void {
    if (this.currentProblem) {
      storage.set('currentProblem', this.currentProblem);
    } else {
      storage.remove('currentProblem');
    }
  }
  
  /**
   * すべてを保存
   */
  private saveAll(): void {
    this.saveProgress();
    this.saveCompletedProblems();
    this.saveCurrentProblem();
  }
}

/**
 * 進捗ストアのシングルトンインスタンス
 */
export const progressStore = new ProgressStore();
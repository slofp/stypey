import { parse as parseToml } from 'smol-toml';
import type { Problem, ProblemTest, TypeAssertion } from '$types/problem';
import { isProblem } from '$types/problem';

export interface ProblemToml {
  problem: {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    initialCode?: string;
    solution?: string;
    hints?: string[];
    tags?: string[];
  };
  tests?: Array<{
    input: string;
    expected: string;
    description?: string;
  }>;
}

export class ProblemParser {
  static parseToml(content: string): Problem {
    try {
      const parsed = parseToml(content) as any;
      
      // smol-toml correctly parses TOML with sections
      if (!parsed.problem) {
        throw new Error('Invalid TOML: missing "problem" section');
      }
      
      const problemData = parsed.problem;
      
      if (!problemData.id || !problemData.title) {
        throw new Error('Invalid TOML: missing required fields (id, title)');
      }
      
      const tests: ProblemTest[] = (parsed.tests || [])
        .map((test: any): ProblemTest => ({
          input: test.input,
          expected: test.expected,
          ...(test.description !== undefined && { description: test.description }),
        }));
      
      // 型推論要件をパース
      const typeAssertions: TypeAssertion[] = (parsed.typeAssertions || [])
        .map((assertion: any): TypeAssertion => ({
          symbol: assertion.symbol,
          expectedType: assertion.expectedType,
          kind: assertion.kind || 'variable',
          ...(assertion.description !== undefined && { description: assertion.description }),
        }));
      
      const result: Problem = {
        id: problemData.id,
        title: problemData.title,
        description: problemData.description || '',
        difficulty: problemData.difficulty || 'easy',
        category: (problemData.category || 'basics') as Problem['category'],
        initialCode: problemData.initialCode || '',
        solution: problemData.solution || '',
        hints: problemData.hints || [],
        tags: problemData.tags || [],
        tests,
        ...(typeAssertions.length > 0 && { typeAssertions }),
      };
      
      if (!isProblem(result)) {
        throw new Error('Parsed TOML does not match Problem schema');
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to parse TOML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  static toToml(problem: Problem): string {
    const lines: string[] = [];
    
    lines.push('[problem]');
    lines.push(`id = "${problem.id}"`);
    lines.push(`title = "${problem.title}"`);
    lines.push(`description = """${problem.description}"""`);
    lines.push(`difficulty = "${problem.difficulty}"`);
    lines.push(`category = "${problem.category}"`);
    
    if (problem.initialCode) {
      lines.push(`initialCode = """${problem.initialCode}"""`);
    }
    
    if (problem.solution) {
      lines.push(`solution = """${problem.solution}"""`);
    }
    
    if (problem.hints.length > 0) {
      lines.push(`hints = [${problem.hints.map((h: string) => `"${h}"`).join(', ')}]`);
    }
    
    if (problem.tags.length > 0) {
      lines.push(`tags = [${problem.tags.map((t: string) => `"${t}"`).join(', ')}]`);
    }
    
    if (problem.tests.length > 0) {
      lines.push('');
      problem.tests.forEach((test: ProblemTest, index: number) => {
        lines.push(`[[tests]]`);
        lines.push(`input = """${test.input}"""`);
        lines.push(`expected = """${test.expected}"""`);
        if (test.description) {
          lines.push(`description = "${test.description}"`);
        }
        if (index < problem.tests.length - 1) {
          lines.push('');
        }
      });
    }
    
    return lines.join('\n');
  }
}
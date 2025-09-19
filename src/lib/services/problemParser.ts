import { parse as parseToml } from 'smol-toml';
import type { Problem, TypeAssertion, ASTTypeAssertion } from '$types/problem';
import { isProblem } from '$types/problem';
import type { TypePattern, SymbolKind, ComparisonMode } from '$types/astSchema';

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
  typeAssertions?: Array<{
    symbol: string;
    expectedType: string;
    kind?: string;
    description?: string;
    comparisonMode?: 'exact' | 'structural' | 'assignable';
    allowSubtypes?: boolean;
    ignoreOptional?: boolean;
  }>;
}

export class ProblemParser {
  /**
   * Parse a type pattern from TOML structure
   */
  private static parseTypePattern(pattern: any): TypePattern {
    if (!pattern || typeof pattern !== 'object') {
      throw new Error('Invalid type pattern');
    }

    const basePattern: any = {
      kind: pattern.kind,
      ...(pattern.optional !== undefined && { optional: pattern.optional }),
      ...(pattern.nullable !== undefined && { nullable: pattern.nullable }),
      ...(pattern.readonly !== undefined && { readonly: pattern.readonly }),
    };

    switch (pattern.kind) {
      case 'primitive':
        return { ...basePattern, type: pattern.type };
      
      case 'literal':
        return { ...basePattern, value: pattern.value };
      
      case 'array':
        return {
          ...basePattern,
          elementType: this.parseTypePattern(pattern.elementType),
          ...(pattern.minLength !== undefined && { minLength: pattern.minLength }),
          ...(pattern.maxLength !== undefined && { maxLength: pattern.maxLength }),
          ...(pattern.exactLength !== undefined && { exactLength: pattern.exactLength }),
        };
      
      case 'tuple':
        return {
          ...basePattern,
          elements: (pattern.elements || []).map((e: any) => this.parseTypePattern(e)),
          ...(pattern.restType && { restType: this.parseTypePattern(pattern.restType) }),
        };
      
      case 'object':
        return {
          ...basePattern,
          properties: (pattern.properties || []).map((p: any) => ({
            name: p.name,
            type: this.parseTypePattern(p.type),
            ...(p.optional !== undefined && { optional: p.optional }),
            ...(p.readonly !== undefined && { readonly: p.readonly }),
            ...(p.description !== undefined && { description: p.description }),
          })),
          ...(pattern.indexSignature && { indexSignature: pattern.indexSignature }),
          ...(pattern.allowExtraProperties !== undefined && { allowExtraProperties: pattern.allowExtraProperties }),
        };
      
      case 'union':
        return {
          ...basePattern,
          types: (pattern.types || []).map((t: any) => this.parseTypePattern(t)),
          ...(pattern.discriminator !== undefined && { discriminator: pattern.discriminator }),
        };
      
      case 'intersection':
        return {
          ...basePattern,
          types: (pattern.types || []).map((t: any) => this.parseTypePattern(t)),
        };
      
      case 'function':
        return {
          ...basePattern,
          parameters: (pattern.parameters || []).map((p: any) => ({
            type: this.parseTypePattern(p.type),
            ...(p.name !== undefined && { name: p.name }),
            ...(p.optional !== undefined && { optional: p.optional }),
            ...(p.defaultValue !== undefined && { defaultValue: p.defaultValue }),
          })),
          returnType: this.parseTypePattern(pattern.returnType),
          ...(pattern.typeParameters && {
            typeParameters: pattern.typeParameters.map((tp: any) => ({
              name: tp.name,
              ...(tp.constraint && { constraint: this.parseTypePattern(tp.constraint) }),
              ...(tp.default && { default: this.parseTypePattern(tp.default) }),
            })),
          }),
          ...(pattern.restParameter && { restParameter: pattern.restParameter }),
          ...(pattern.isAsync !== undefined && { isAsync: pattern.isAsync }),
          ...(pattern.isGenerator !== undefined && { isGenerator: pattern.isGenerator }),
        };
      
      case 'generic':
        return {
          ...basePattern,
          typeName: pattern.typeName,
          ...(pattern.typeArguments && {
            typeArguments: pattern.typeArguments.map((ta: any) => this.parseTypePattern(ta)),
          }),
        };
      
      case 'typeReference':
        return { ...basePattern, name: pattern.name };
      
      case 'interface':
        return {
          ...basePattern,
          name: pattern.name,
          properties: (pattern.properties || []).map((p: any) => ({
            name: p.name,
            type: this.parseTypePattern(p.type),
            ...(p.optional !== undefined && { optional: p.optional }),
            ...(p.readonly !== undefined && { readonly: p.readonly }),
          })),
          ...(pattern.typeParameters && {
            typeParameters: pattern.typeParameters.map((tp: any) => ({
              name: tp.name,
              ...(tp.constraint && { constraint: this.parseTypePattern(tp.constraint) }),
            })),
          }),
          ...(pattern.methods && { methods: pattern.methods }),
        };
      
      case 'class':
        return {
          ...basePattern,
          name: pattern.name,
          ...(pattern.typeParameters && {
            typeParameters: pattern.typeParameters.map((tp: any) => ({
              name: tp.name,
              ...(tp.constraint && { constraint: this.parseTypePattern(tp.constraint) }),
            })),
          }),
          ...(pattern.properties && { properties: pattern.properties }),
          ...(pattern.methods && { methods: pattern.methods }),
        };
      
      case 'wildcard':
        return {
          ...basePattern,
          ...(pattern.constraint && { constraint: this.parseTypePattern(pattern.constraint) }),
          ...(pattern.description !== undefined && { description: pattern.description }),
        };
      
      default:
        // For other complex types, return as-is
        return basePattern;
    }
  }

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
      
      // 型推論要件をパース（新旧両形式対応）
      const typeAssertions: (TypeAssertion | ASTTypeAssertion)[] = (parsed.typeAssertions || [])
        .map((assertion: any): TypeAssertion | ASTTypeAssertion => {
          // Check if this is an AST-based assertion
          if (assertion.pattern && assertion.symbolKind && assertion.mode) {
            // Parse AST-based assertion
            return {
              symbol: assertion.symbol,
              symbolKind: assertion.symbolKind as SymbolKind,
              pattern: this.parseTypePattern(assertion.pattern),
              mode: assertion.mode as ComparisonMode,
              ...(assertion.description !== undefined && { description: assertion.description }),
              ...(assertion.errorMessage !== undefined && { errorMessage: assertion.errorMessage }),
              ...(assertion.allowSubtypes !== undefined && { allowSubtypes: assertion.allowSubtypes }),
              ...(assertion.ignoreOptional !== undefined && { ignoreOptional: assertion.ignoreOptional }),
              ...(assertion.checkExcessProperties !== undefined && { checkExcessProperties: assertion.checkExcessProperties }),
            } as ASTTypeAssertion;
          } else {
            // Parse legacy string-based assertion
            return {
              symbol: assertion.symbol,
              expectedType: assertion.expectedType,
              kind: assertion.kind || 'variable',
              ...(assertion.description !== undefined && { description: assertion.description }),
              ...(assertion.comparisonMode !== undefined && { comparisonMode: assertion.comparisonMode }),
              ...(assertion.allowSubtypes !== undefined && { allowSubtypes: assertion.allowSubtypes }),
              ...(assertion.ignoreOptional !== undefined && { ignoreOptional: assertion.ignoreOptional }),
            } as TypeAssertion;
          }
        });
      
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
        typeAssertions,
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
    
    if (problem.typeAssertions.length > 0) {
      lines.push('');
      lines.push('# 型推論要件');
      problem.typeAssertions.forEach((assertion: TypeAssertion, index: number) => {
        lines.push(`[[typeAssertions]]`);
        lines.push(`symbol = "${assertion.symbol}"`);
        lines.push(`expectedType = "${assertion.expectedType}"`);
        lines.push(`kind = "${assertion.kind}"`);
        if (assertion.description) {
          lines.push(`description = "${assertion.description}"`);
        }
        if (index < problem.typeAssertions.length - 1) {
          lines.push('');
        }
      });
    }
    
    return lines.join('\n');
  }
}
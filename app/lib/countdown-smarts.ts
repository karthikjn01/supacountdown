interface IntermediateResult {
    value: number;
    path: string;
    usedIndices: Set<number>;
}

interface SolutionAnalysis {
    target: number;
    numberOfPaths: number;
    averageDifficulty: number;
    easiestPath: string;
    hardestPath: string;
    allPaths: string[];
}

interface AnalysisStatistics {
    averagePathsPerTarget: number;
    medianPaths: number;
    targetRange: {
        min: number;
        max: number;
    };
}

interface FullAnalysis {
    totalTargets: number;
    easiestTarget: SolutionAnalysis;
    hardestTarget: SolutionAnalysis;
    allTargets: SolutionAnalysis[];
    statistics: AnalysisStatistics;
}

interface Solution {
    value: number;
    paths: string[];
}

type Operation = [string, (a: number, b: number) => number | null];

class CountdownSolver {
    private numbers: number[];
    private solutions: Map<number, Set<string>>;
    private intermediate: Map<string, IntermediateResult>;

    constructor(numbers: number[]) {
        this.numbers = numbers;
        this.solutions = new Map();
        this.intermediate = new Map();
    }

    solve(): void {
        // Add initial numbers as intermediates
        this.numbers.forEach((num, idx) => {
            this.addIntermediate(num, num.toString(), [idx]);
        });

        // Keep combining until we can't create any new results
        let newResultsFound = true;
        let iteration = 0;

        while (newResultsFound && iteration < this.numbers.length) {
            newResultsFound = this.combineIntermediates();
            iteration++;
        }
    }

    private addIntermediate(value: number, path: string, usedIndices: number[]): boolean {
        if (value <= 0 || !Number.isInteger(value)) return false;

        // Store all intermediates
        const key = this.getKey(value, usedIndices);
        if (!this.intermediate.has(key)) {
            this.intermediate.set(key, { value, path, usedIndices: new Set(usedIndices) });
        }

        // Store valid solutions (100-999)
        if (value >= 100 && value <= 999) {
            if (!this.solutions.has(value)) {
                this.solutions.set(value, new Set());
            }
            this.solutions.get(value)?.add(path);
        }

        return true;
    }

    private getKey(value: number, usedIndices: number[] | Set<number>): string {
        return `${value}-${Array.from(usedIndices).sort().join(',')}`;
    }

    private hasOverlap(indices1: Set<number>, indices2: Set<number>): boolean {
        for (const idx of indices1) {
            if (indices2.has(idx)) return true;
        }
        return false;
    }

    private combineIntermediates(): boolean {
        const entries = Array.from(this.intermediate.values());
        let newResults = false;

        for (let i = 0; i < entries.length; i++) {
            for (let j = 0; j < entries.length; j++) {
                if (i === j) continue;

                const result1 = entries[i];
                const result2 = entries[j];

                // Skip if indices overlap
                if (this.hasOverlap(result1.usedIndices, result2.usedIndices)) continue;

                // Combined indices
                const combinedIndices = new Set([...result1.usedIndices, ...result2.usedIndices]);
                if (combinedIndices.size > this.numbers.length) continue;

                // Try all operations
                const ops: Operation[] = [
                    ['+', (a, b) => a + b],
                    ['×', (a, b) => a * b],
                    ['-', (a, b) => a - b],
                    ['÷', (a, b) => b !== 0 && a % b === 0 ? a / b : null]
                ];

                for (const [op, func] of ops) {
                    if (op === '+' || op === '×') {
                        const result = func(result1.value, result2.value);
                        if (result && result <= 999) {
                            const newPath = `(${result1.path} ${op} ${result2.path})`;
                            if (this.addIntermediate(result, newPath, Array.from(combinedIndices))) {
                                newResults = true;
                            }
                        }
                    } else {
                        // Try both orderings for non-commutative operations
                        const result = func(result1.value, result2.value);
                        if (result && result <= 999) {
                            const newPath = `(${result1.path} ${op} ${result2.path})`;
                            if (this.addIntermediate(result, newPath, Array.from(combinedIndices))) {
                                newResults = true;
                            }
                        }

                        const resultReverse = func(result2.value, result1.value);
                        if (resultReverse && resultReverse <= 999) {
                            const newPath = `(${result2.path} ${op} ${result1.path})`;
                            if (this.addIntermediate(resultReverse, newPath, Array.from(combinedIndices))) {
                                newResults = true;
                            }
                        }
                    }
                }
            }
        }

        return newResults;
    }

    getPathsToTarget(target: number): string[] {
        return this.solutions.has(target) ?
            Array.from(this.solutions.get(target) || []) :
            [];
    }

    getAllSolutions(): Solution[] {
        return Array.from(this.solutions.entries())
            .sort(([a], [b]) => a - b)
            .map(([value, paths]) => ({
                value,
                paths: Array.from(paths)
            }));
    }

    private calculateDifficulty(path: string): number {
        // Assign weights to operations (lower = easier)
        const weights: Record<string, number> = {
            '+': 1,
            '-': 2,
            '×': 3,
            '÷': 4
        };

        let difficulty = 0;
        for (const op of Object.keys(weights)) {
            // Count occurrences of each operator
            const count = (path.match(new RegExp(`\\${op}`, 'g')) || []).length;
            difficulty += count * weights[op];
        }

        // Add complexity for nested operations (count parentheses pairs)
        const nestedLevel = (path.match(/\(/g) || []).length;
        difficulty += nestedLevel;

        return difficulty;
    }

    getTargetAnalysis(target: number): SolutionAnalysis | null {
        const paths = this.getPathsToTarget(target);
        if (paths.length === 0) {
            return null;
        }

        const difficulties = paths.map(path => this.calculateDifficulty(path));
        const avgDifficulty = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;

        return {
            target,
            numberOfPaths: paths.length,
            averageDifficulty: avgDifficulty,
            easiestPath: paths[difficulties.indexOf(Math.min(...difficulties))],
            hardestPath: paths[difficulties.indexOf(Math.max(...difficulties))],
            allPaths: paths
        };
    }

    analyzeAllSolutions(): FullAnalysis {
        const targets = Array.from(this.solutions.keys());
        const analyses = targets.map(target => this.getTargetAnalysis(target)).filter((a): a is SolutionAnalysis => a !== null);

        // Sort by number of paths (ascending) and then by average difficulty (descending)
        analyses.sort((a, b) => {
            if (a.numberOfPaths === b.numberOfPaths) {
                return b.averageDifficulty - a.averageDifficulty;
            }
            return a.numberOfPaths - b.numberOfPaths;
        });

        return {
            totalTargets: targets.length,
            easiestTarget: analyses.sort((a, b) =>
                b.numberOfPaths - a.numberOfPaths ||
                a.averageDifficulty - b.averageDifficulty
            )[0],
            hardestTarget: analyses.sort((a, b) =>
                a.numberOfPaths - b.numberOfPaths ||
                b.averageDifficulty - a.averageDifficulty
            )[0],
            allTargets: analyses,
            statistics: {
                averagePathsPerTarget: analyses.reduce((sum, a) => sum + a.numberOfPaths, 0) / analyses.length,
                medianPaths: this.calculateMedian(analyses.map(a => a.numberOfPaths)),
                targetRange: {
                    min: Math.min(...targets),
                    max: Math.max(...targets)
                }
            }
        };
    }

    private calculateMedian(numbers: number[]): number {
        const sorted = numbers.slice().sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }
        return sorted[middle];
    }
}

function findSolutions(numbers: number[]): CountdownSolver {
    const solver = new CountdownSolver(numbers);
    solver.solve();
    return solver;
}

export { CountdownSolver, findSolutions };

const solver = findSolutions([1, 2, 3, 4, 5, 6]);
console.log(solver.analyzeAllSolutions());
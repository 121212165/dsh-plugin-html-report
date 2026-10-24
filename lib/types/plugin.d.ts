/**
 * dsh wiring for html-report: renders the transcript sidecars (same JSONL
 * contract and default dataDir as dsh-plugin-transcript) into self-contained
 * HTML files. Read-only on the sidecars.
 */
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export declare const name = "html-report";
export declare const inject: string[];
export interface Config {
    enabled: boolean;
    dataDir?: string;
    outDir?: string;
    title: string;
}
export declare const Config: Schema<Schemastery.ObjectS<{
    enabled: Schema<boolean, boolean>;
    dataDir: Schema<string, string>;
    outDir: Schema<string, string>;
    title: Schema<string, string>;
}>, Schemastery.ObjectT<{
    enabled: Schema<boolean, boolean>;
    dataDir: Schema<string, string>;
    outDir: Schema<string, string>;
    title: Schema<string, string>;
}>>;
export declare function expandHome(path: string): string;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=plugin.d.ts.map
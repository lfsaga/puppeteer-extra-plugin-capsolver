export interface SolverPluginOptions {
  apiKey: string | null;
  useExtension: boolean;
  availableFeatures: Set<string>;
  enabledFeatures: Set<string>;
}

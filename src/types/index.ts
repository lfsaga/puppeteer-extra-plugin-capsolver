export interface SolverPluginOptions {
  apiKey: string | null;
  useExtension: boolean;
  useExtensionProxy: string | null;
  useExtensionReCaptchaMode: "click" | "token";
  availableFeatures: Set<string>;
  enabledFeatures: Set<string>;
}

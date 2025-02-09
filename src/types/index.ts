export interface ExtensionConfig {
  useCapsolver?: boolean;
  manualSolving?: boolean;
  solvedCallback?: string;
  useProxy?: boolean;
  proxyType?: string;
  hostOrIp?: string;
  port?: string;
  proxyLogin?: string;
  proxyPassword?: string;
  enabledForBlacklistControl?: boolean;
  blackUrlList?: string[];
  enabledForRecaptcha?: boolean;
  enabledForRecaptchaV3?: boolean;
  enabledForImageToText?: boolean;
  enabledForAwsCaptcha?: boolean;
  enabledForCloudflare?: boolean;
  reCaptchaMode?: string;
  hCaptchaMode?: string;
  reCaptchaDelayTime?: number;
  hCaptchaDelayTime?: number;
  textCaptchaDelayTime?: number;
  awsDelayTime?: number;
  reCaptchaRepeatTimes?: number;
  reCaptcha3RepeatTimes?: number;
  hCaptchaRepeatTimes?: number;
  funCaptchaRepeatTimes?: number;
  textCaptchaRepeatTimes?: number;
  awsRepeatTimes?: number;
  reCaptcha3TaskType?: string;
  textCaptchaSourceAttribute?: string;
  textCaptchaResultAttribute?: string;
  textCaptchaModule?: string;
}

export interface SolverPluginOptions {
  apiKey: string | null;
  extensionConfig: ExtensionConfig | null;
  availableFeatures: Set<string>;
  enabledFeatures: Set<string>;
}

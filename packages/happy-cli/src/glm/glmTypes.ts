/**
 * GLM (Zhipu AI) constants and types
 */

export const GLM_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';
export const GLM_DEFAULT_MODEL = 'glm-4.6';
export const GLM_VALID_MODELS = ['glm-4.6', 'glm-4-plus', 'glm-4-flash', 'glm-z1-plus', 'glm-z1-flash'] as const;

export type GlmModel = typeof GLM_VALID_MODELS[number];

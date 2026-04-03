/**
 * GLM (Zhipu AI) authentication helper
 *
 * Prompts the user for their Zhipu AI API key.
 * GLM uses API key authentication — no OAuth or browser flow needed.
 */

import inquirer from 'inquirer';
import { GlmAuthTokens } from './types';

/**
 * Prompt the user for their Zhipu AI API key and return it.
 *
 * @returns Promise resolving to GlmAuthTokens with the provided API key
 */
export async function authenticateGlm(): Promise<GlmAuthTokens> {
    console.log('🔑 GLM uses API key authentication.');
    console.log('   Get your key at: https://open.bigmodel.cn/usercenter/apikeys\n');

    const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
        {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your Zhipu AI API key:',
            mask: '*',
            validate: (input: string) => {
                if (!input || input.trim().length === 0) {
                    return 'API key cannot be empty';
                }
                return true;
            },
        },
    ]);

    return { apiKey: apiKey.trim() };
}

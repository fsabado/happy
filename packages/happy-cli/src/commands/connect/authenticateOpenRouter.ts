/**
 * OpenRouter authentication helper
 *
 * Prompts the user for their OpenRouter API key.
 * OpenRouter uses API key authentication — no OAuth or browser flow needed.
 */

import inquirer from 'inquirer';
import { OpenRouterAuthTokens } from './types';

/**
 * Prompt the user for their OpenRouter API key and return it.
 *
 * @returns Promise resolving to OpenRouterAuthTokens with the provided API key
 */
export async function authenticateOpenRouter(): Promise<OpenRouterAuthTokens> {
    console.log('🔑 OpenRouter uses API key authentication.');
    console.log('   Get your key at: https://openrouter.ai/settings/keys\n');

    const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
        {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your OpenRouter API key:',
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

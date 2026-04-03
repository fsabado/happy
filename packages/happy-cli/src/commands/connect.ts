import chalk from 'chalk';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { readCredentials } from '@/persistence';
import { ApiClient } from '@/api/api';
import { authenticateCodex } from './connect/authenticateCodex';
import { authenticateClaude } from './connect/authenticateClaude';
import { authenticateGemini } from './connect/authenticateGemini';
import { authenticateGlm } from './connect/authenticateGlm';
import { authenticateOpenRouter } from './connect/authenticateOpenRouter';
import { decodeJwtPayload } from './connect/utils';
import { saveLocalVendorToken, getLocalVendorToken } from '@/utils/localVendorTokens';

/**
 * Handle connect subcommand
 * 
 * Implements connect subcommands for storing AI vendor API keys:
 * - connect codex: Store OpenAI API key in Happy cloud
 * - connect claude: Store Anthropic API key in Happy cloud
 * - connect gemini: Store Gemini API key in Happy cloud
 * - connect help: Show help for connect command
 */
export async function handleConnectCommand(args: string[]): Promise<void> {
    const subcommand = args[0];

    if (!subcommand || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
        showConnectHelp();
        return;
    }

    switch (subcommand.toLowerCase()) {
        case 'codex':
            await handleConnectVendor('codex', 'OpenAI');
            break;
        case 'claude':
            await handleConnectVendor('claude', 'Anthropic');
            break;
        case 'gemini':
            await handleConnectVendor('gemini', 'Gemini');
            break;
        case 'glm':
            await handleConnectVendor('glm', 'GLM (Zhipu AI)');
            break;
        case 'openrouter':
            await handleConnectVendor('openrouter', 'OpenRouter');
            break;
        case 'status':
            await handleConnectStatus();
            break;
        default:
            console.error(chalk.red(`Unknown connect target: ${subcommand}`));
            showConnectHelp();
            process.exit(1);
    }
}

function showConnectHelp(): void {
    console.log(`
${chalk.bold('happy connect')} - Connect AI vendor API keys to Happy cloud

${chalk.bold('Usage:')}
  happy connect codex        Store your Codex API key in Happy cloud
  happy connect claude       Store your Anthropic API key in Happy cloud
  happy connect gemini       Store your Gemini API key in Happy cloud
  happy connect glm          Store your Zhipu AI (GLM) API key in Happy cloud
  happy connect openrouter   Store your OpenRouter API key in Happy cloud
  happy connect status       Show connection status for all vendors
  happy connect help         Show this help message

${chalk.bold('Description:')}
  The connect command allows you to securely store your AI vendor API keys
  in Happy cloud. This enables you to use these services through Happy
  without exposing your API keys locally.

${chalk.bold('Examples:')}
  happy connect codex
  happy connect claude
  happy connect gemini
  happy connect glm
  happy connect openrouter
  happy connect status

${chalk.bold('Notes:')} 
  • You must be authenticated with Happy first (run 'happy auth login')
  • API keys are encrypted and stored securely in Happy cloud
  • You can manage your stored keys at app.happy.engineering
`);
}

async function handleConnectVendor(vendor: 'codex' | 'claude' | 'gemini' | 'glm' | 'openrouter', displayName: string): Promise<void> {
    console.log(chalk.bold(`\n🔌 Connecting ${displayName} to Happy cloud\n`));

    // Check if authenticated
    const credentials = await readCredentials();
    if (!credentials) {
        console.log(chalk.yellow('⚠️  Not authenticated with Happy'));
        console.log(chalk.gray('  Please run "happy auth login" first'));
        process.exit(1);
    }

    // Create API client
    const api = await ApiClient.create(credentials);

    // Handle vendor authentication
    if (vendor === 'codex') {
        console.log('🚀 Registering Codex token with server');
        const codexAuthTokens = await authenticateCodex();
        await api.registerVendorToken('openai', { oauth: codexAuthTokens });
        console.log('✅ Codex token registered with server');
        process.exit(0);
    } else if (vendor === 'claude') {
        console.log('🚀 Registering Anthropic token with server');
        const anthropicAuthTokens = await authenticateClaude();
        await api.registerVendorToken('anthropic', { oauth: anthropicAuthTokens });
        console.log('✅ Anthropic token registered with server');
        process.exit(0);
    } else if (vendor === 'gemini') {
        console.log('🚀 Registering Gemini token with server');
        const geminiAuthTokens = await authenticateGemini();
        await api.registerVendorToken('gemini', { oauth: geminiAuthTokens });
        console.log('✅ Gemini token registered with server');

        // Also update local Gemini config to keep tokens in sync
        updateLocalGeminiCredentials(geminiAuthTokens);

        process.exit(0);
    } else if (vendor === 'glm') {
        const glmTokens = await authenticateGlm();
        saveLocalVendorToken('zhipu', glmTokens.apiKey);
        console.log('✅ Zhipu AI (GLM) API key saved locally');
        process.exit(0);
    } else if (vendor === 'openrouter') {
        const openRouterTokens = await authenticateOpenRouter();
        saveLocalVendorToken('openrouter', openRouterTokens.apiKey);
        console.log('✅ OpenRouter API key saved locally');
        process.exit(0);
    } else {
        throw new Error(`Unsupported vendor: ${vendor}`);
    }
}

/**
 * Show connection status for all vendors
 */
async function handleConnectStatus(): Promise<void> {
    console.log(chalk.bold('\n🔌 Connection Status\n'));

    // Check if authenticated
    const credentials = await readCredentials();
    if (!credentials) {
        console.log(chalk.yellow('⚠️  Not authenticated with Happy'));
        console.log(chalk.gray('  Please run "happy auth login" first'));
        process.exit(1);
    }

    // Create API client
    const api = await ApiClient.create(credentials);

    // Cloud-stored vendors (OAuth-based)
    const cloudVendors: Array<{ key: 'openai' | 'anthropic' | 'gemini'; display: string }> = [
        { key: 'gemini', display: 'Google Gemini' },
        { key: 'openai', display: 'OpenAI Codex' },
        { key: 'anthropic', display: 'Anthropic Claude' },
    ];

    for (const vendor of cloudVendors) {
        try {
            const token = await api.getVendorToken(vendor.key);
            const tokenData = token as Record<string, unknown> | null;
            if (tokenData?.oauth) {
                const oauth = tokenData.oauth as Record<string, unknown>;
                let userInfo = '';
                if (typeof oauth.id_token === 'string') {
                    const payload = decodeJwtPayload(oauth.id_token);
                    if (payload?.email) userInfo = chalk.gray(` (${payload.email})`);
                }
                const expiresAt = (oauth.expires_at as number | undefined)
                    || (typeof oauth.expires_in === 'number' ? Date.now() + oauth.expires_in * 1000 : null);
                const isExpired = expiresAt && expiresAt < Date.now();
                if (isExpired) {
                    console.log(`  ${chalk.yellow('⚠️')}  ${vendor.display}: ${chalk.yellow('expired')}${userInfo}`);
                } else {
                    console.log(`  ${chalk.green('✓')}  ${vendor.display}: ${chalk.green('connected')}${userInfo}`);
                }
            } else {
                console.log(`  ${chalk.gray('○')}  ${vendor.display}: ${chalk.gray('not connected')}`);
            }
        } catch {
            console.log(`  ${chalk.gray('○')}  ${vendor.display}: ${chalk.gray('not connected')}`);
        }
    }

    // Locally-stored vendors (API key-based)
    const localVendors: Array<{ key: string; display: string }> = [
        { key: 'zhipu', display: 'Zhipu AI (GLM)' },
        { key: 'openrouter', display: 'OpenRouter' },
    ];

    for (const vendor of localVendors) {
        const token = getLocalVendorToken(vendor.key);
        if (token?.apiKey) {
            console.log(`  ${chalk.green('✓')}  ${vendor.display}: ${chalk.green('connected')} ${chalk.gray('(local)')}`);
        } else {
            console.log(`  ${chalk.gray('○')}  ${vendor.display}: ${chalk.gray('not connected')}`);
        }
    }

    console.log('');
    console.log(chalk.gray('To connect a vendor, run: happy connect <vendor>'));
    console.log(chalk.gray('Example: happy connect gemini'));
    console.log('');
}

/**
 * Update local Gemini credentials file to keep in sync with Happy cloud
 * This ensures the Gemini SDK uses the same account as Happy
 */
function updateLocalGeminiCredentials(tokens: {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
}): void {
    try {
        const geminiDir = join(homedir(), '.gemini');
        const credentialsPath = join(geminiDir, 'oauth_creds.json');
        
        // Create directory if it doesn't exist
        if (!existsSync(geminiDir)) {
            mkdirSync(geminiDir, { recursive: true });
        }
        
        // Write credentials in the format Gemini CLI expects
        const credentials = {
            access_token: tokens.access_token,
            token_type: tokens.token_type || 'Bearer',
            scope: tokens.scope || 'https://www.googleapis.com/auth/cloud-platform',
            ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
            ...(tokens.id_token && { id_token: tokens.id_token }),
            ...(tokens.expires_in && { expires_in: tokens.expires_in }),
        };
        
        writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), 'utf-8');
        console.log(chalk.gray(`  Updated local credentials: ${credentialsPath}`));
    } catch (error) {
        // Non-critical error - server tokens will still work
        console.log(chalk.yellow(`  ⚠️ Could not update local credentials: ${error}`));
    }
}
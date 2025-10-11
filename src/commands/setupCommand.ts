import { loadConfiguration } from '../utils/config';

export async function setupCommand(
    options: {
        config?: string;
        silent?: boolean;
        verbose?: boolean;
    }
): Promise<void> {
    await loadConfiguration(options);
}
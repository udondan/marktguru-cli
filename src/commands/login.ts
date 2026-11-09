import { saveConfig, getConfig } from '../config.js';
import { extractApiKey } from '../auth.js';

interface LoginOptions {
  json?: boolean;
}

interface LoginResult {
  success: boolean;
  apiKey?: string;
  error?: string;
}

function printJson(result: LoginResult): void {
  console.log(JSON.stringify(result));
}

function printText(result: LoginResult): void {
  if (result.success) {
    console.log('\n✓ API key extracted and saved!');
    console.log('  Key:', `${result.apiKey!.substring(0, 15)}...`);
  } else {
    console.error('\n✗', result.error);
  }
}

export async function login(options: LoginOptions): Promise<void> {
  const json = options.json ?? false;
  const output = json ? printJson : printText;
  const log = (msg: string) => !json && console.log(msg);

  log('Extracting Marktguru API key (HTTP-only)...\n');

  try {
    const config = await getConfig();
    const apiKey = await extractApiKey({
      log: json ? undefined : log,
      country: config.country,
    });
    await saveConfig({ apiKey });
    output({ success: true, apiKey });
  } catch (e) {
    output({ success: false, error: (e as Error).message });
    process.exit(1);
  }
}

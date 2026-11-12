import {
  getConfig,
  saveConfig,
  DEFAULT_ZIP_CODE,
  VALID_COUNTRIES,
  type LoadedConfig,
} from '../config.js';

interface JsonOption {
  json?: boolean;
}

function truncateKey(apiKey: string): string {
  return `${apiKey.substring(0, 10)}...`;
}

export async function setZipCommand(
  code: string,
  options: JsonOption,
): Promise<void> {
  await saveConfig({ zipCode: code });
  if (options.json) {
    console.log(JSON.stringify({ success: true, zipCode: code }));
  } else {
    console.log(`✓ Default ZIP code set to: ${code}`);
  }
}

export async function setCountryCommand(
  code: string,
  options: JsonOption,
): Promise<void> {
  const normalized = code.toLowerCase();
  if (!(VALID_COUNTRIES as readonly string[]).includes(normalized)) {
    console.error(
      `Error: Invalid country "${code}". Valid options: ${VALID_COUNTRIES.join(', ')}`,
    );
    process.exit(1);
  }
  const existing = await getConfig();
  const countryChanged = existing.country !== normalized;
  await saveConfig({
    country: normalized,
    ...(countryChanged && { apiKey: undefined }),
  });
  const apiKeyCleared = countryChanged && !!existing.apiKey;
  if (options.json) {
    console.log(
      JSON.stringify({ success: true, country: normalized, apiKeyCleared }),
    );
    return;
  }
  console.log(`✓ Default country set to: ${normalized}`);
  if (apiKeyCleared) {
    console.log(
      "  API key cleared — run 'marktguru login' to fetch a matching key.",
    );
  }
}

function printConfigJson(config: LoadedConfig): void {
  console.log(
    JSON.stringify({
      apiKey: config.apiKey ? truncateKey(config.apiKey) : null,
      apiKeySet: !!config.apiKey,
      zipCode: config.zipCode ?? DEFAULT_ZIP_CODE,
      country: config.country,
      configPath: config.configPath,
    }),
  );
}

function printConfigText(config: LoadedConfig): void {
  console.log('Configuration:');
  console.log(
    '  API Key:',
    config.apiKey ? truncateKey(config.apiKey) : '(not set)',
  );
  console.log(
    '  ZIP Code:',
    config.zipCode ?? `(default: ${DEFAULT_ZIP_CODE})`,
  );
  console.log('  Country:', config.country);
  console.log('  Config file:', config.configPath);
}

export async function configCommand(options: JsonOption): Promise<void> {
  const config = await getConfig();
  const print = options.json ? printConfigJson : printConfigText;
  print(config);
}

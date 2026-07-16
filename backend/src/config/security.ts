type Environment = Record<string, string | undefined>;

const BOOLEAN_FLAGS = [
  'PHONEPE_ENABLED',
  'PAYMENT_MOCK_ENABLED',
  'EMAIL_NOTIFICATIONS_ENABLED',
  'WHATSAPP_NOTIFICATIONS_ENABLED',
  'MEDICAL_DOCUMENTS_ENABLED',
  'CLINICAL_RECORD_WRITES_ENABLED',
  'CLINICAL_OBSERVATIONS_ENABLED',
  'DEVICE_IMPORTS_ENABLED',
] as const;

const enabled = (environment: Environment, name: string) => environment[name] === 'true';
const present = (environment: Environment, name: string) => Boolean(environment[name]?.trim());

function requireVariables(environment: Environment, names: string[], errors: string[]) {
  const missing = names.filter((name) => !present(environment, name));
  if (missing.length) errors.push(`Missing required variables: ${missing.join(', ')}`);
}

function requireStrongSecret(environment: Environment, name: string, errors: string[]) {
  const value = environment[name]?.trim() || '';
  if (value.length < 32 || /(change|replace|example|admin123|staff123)/i.test(value)) {
    errors.push(`${name} must be a non-placeholder secret of at least 32 characters`);
  }
}

function requireKeyVersion(environment: Environment, name: string, errors: string[]) {
  if (!/^v[1-9]\d*$/.test(environment[name] || '')) {
    errors.push(`${name} must use the format v1, v2, ...`);
  }
}

function requireHttpUrl(
  environment: Environment,
  name: string,
  errors: string[],
  httpsOnly = false
) {
  try {
    const parsed = new URL(environment[name] || '');
    if (httpsOnly ? parsed.protocol !== 'https:' : !['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('invalid protocol');
    }
    if (parsed.username || parsed.password)
      throw new Error('credentials are not allowed in this URL');
  } catch {
    errors.push(
      `${name} must be a valid ${httpsOnly ? 'https' : 'http(s)'} URL without embedded credentials`
    );
  }
}

export function validateSecurityConfiguration(environment: Environment = process.env): void {
  const errors: string[] = [];
  for (const flag of BOOLEAN_FLAGS) {
    if (environment[flag] !== undefined && !['true', 'false'].includes(environment[flag] || '')) {
      errors.push(`${flag} must be true or false`);
    }
  }

  const deployment =
    environment.DEPLOYMENT_ENV || (environment.NODE_ENV === 'test' ? 'test' : 'development');
  const hosted = deployment === 'staging' || deployment === 'production';

  if (hosted) {
    requireVariables(
      environment,
      [
        'DATABASE_URL',
        'JWT_SECRET',
        'JWT_SECRET_VERSION',
        'INTAKE_ENCRYPTION_KEY',
        'INTAKE_ENCRYPTION_KEY_VERSION',
        'CORS_ORIGIN',
        'FRONTEND_URL',
        'DEPLOYMENT_ENV',
        'ENVIRONMENT_NAME',
        'SUPABASE_PROJECT_REF',
        'DATA_POLICY',
        'METRICS_BEARER_TOKEN',
      ],
      errors
    );
    requireStrongSecret(environment, 'JWT_SECRET', errors);
    requireStrongSecret(environment, 'INTAKE_ENCRYPTION_KEY', errors);
    requireStrongSecret(environment, 'METRICS_BEARER_TOKEN', errors);
    requireKeyVersion(environment, 'JWT_SECRET_VERSION', errors);
    requireKeyVersion(environment, 'INTAKE_ENCRYPTION_KEY_VERSION', errors);
    requireHttpUrl(environment, 'FRONTEND_URL', errors, true);
    for (const origin of (environment.CORS_ORIGIN || '').split(',').filter(Boolean)) {
      requireHttpUrl({ CORS_ORIGIN: origin.trim() }, 'CORS_ORIGIN', errors, true);
    }
    if (environment.JWT_SECRET && environment.JWT_SECRET === environment.INTAKE_ENCRYPTION_KEY) {
      errors.push('JWT_SECRET and INTAKE_ENCRYPTION_KEY must be different');
    }
  }

  if (enabled(environment, 'PAYMENT_MOCK_ENABLED')) {
    if (!['development', 'test'].includes(deployment))
      errors.push('PAYMENT_MOCK_ENABLED is forbidden outside development/test');
    if (enabled(environment, 'PHONEPE_ENABLED'))
      errors.push('PAYMENT_MOCK_ENABLED and PHONEPE_ENABLED cannot both be true');
  }

  if (enabled(environment, 'PHONEPE_ENABLED')) {
    requireVariables(
      environment,
      [
        'PHONEPE_MERCHANT_ID',
        'PHONEPE_CLIENT_ID',
        'PHONEPE_CLIENT_VERSION',
        'PHONEPE_CLIENT_SECRET',
        'PHONEPE_WEBHOOK_USERNAME',
        'PHONEPE_WEBHOOK_PASSWORD',
        'PHONEPE_AUTH_BASE_URL',
        'PHONEPE_PG_BASE_URL',
      ],
      errors
    );
    requireHttpUrl(environment, 'PHONEPE_AUTH_BASE_URL', errors, hosted);
    requireHttpUrl(environment, 'PHONEPE_PG_BASE_URL', errors, hosted);
  }

  if (enabled(environment, 'EMAIL_NOTIFICATIONS_ENABLED')) {
    requireVariables(
      environment,
      ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'NOTIFICATION_EMAIL'],
      errors
    );
  }

  if (enabled(environment, 'WHATSAPP_NOTIFICATIONS_ENABLED')) {
    const provider = environment.WHATSAPP_PROVIDER || 'meta';
    if (environment.WHATSAPP_WEBHOOK_URL) {
      requireVariables(environment, ['WHATSAPP_WEBHOOK_TOKEN'], errors);
      requireHttpUrl(environment, 'WHATSAPP_WEBHOOK_URL', errors, hosted);
    } else if (provider === 'meta') {
      requireVariables(
        environment,
        ['WHATSAPP_API_URL', 'WHATSAPP_API_TOKEN', 'WHATSAPP_TO'],
        errors
      );
      requireHttpUrl(environment, 'WHATSAPP_API_URL', errors, hosted);
    } else if (provider === 'twilio') {
      requireVariables(
        environment,
        [
          'WHATSAPP_API_URL',
          'WHATSAPP_ACCOUNT_SID',
          'WHATSAPP_AUTH_TOKEN',
          'WHATSAPP_FROM',
          'WHATSAPP_TO',
        ],
        errors
      );
      requireHttpUrl(environment, 'WHATSAPP_API_URL', errors, hosted);
    } else {
      errors.push('WHATSAPP_PROVIDER must be meta or twilio');
    }
  }

  if (enabled(environment, 'MEDICAL_DOCUMENTS_ENABLED')) {
    requireVariables(
      environment,
      ['DOCUMENT_ENCRYPTION_KEY', 'DOCUMENT_ENCRYPTION_KEY_VERSION', 'DOCUMENT_STORAGE_DIR'],
      errors
    );
    requireStrongSecret(environment, 'DOCUMENT_ENCRYPTION_KEY', errors);
    requireKeyVersion(environment, 'DOCUMENT_ENCRYPTION_KEY_VERSION', errors);
    if (hosted && environment.DOCUMENT_SCANNER_MODE !== 'clamav') {
      errors.push('Hosted medical document handling requires DOCUMENT_SCANNER_MODE=clamav');
    }
    const applicationKeys = [
      environment.JWT_SECRET,
      environment.INTAKE_ENCRYPTION_KEY,
      environment.DOCUMENT_ENCRYPTION_KEY,
    ].filter(Boolean);
    if (new Set(applicationKeys).size !== applicationKeys.length) {
      errors.push('JWT, intake, and document encryption keys must all be different');
    }
  }

  if (hosted) {
    const secretNames = [
      'JWT_SECRET',
      'INTAKE_ENCRYPTION_KEY',
      'METRICS_BEARER_TOKEN',
      ...(enabled(environment, 'MEDICAL_DOCUMENTS_ENABLED') ? ['DOCUMENT_ENCRYPTION_KEY'] : []),
      ...(enabled(environment, 'PHONEPE_ENABLED')
        ? ['PHONEPE_CLIENT_SECRET', 'PHONEPE_WEBHOOK_PASSWORD']
        : []),
      ...(enabled(environment, 'EMAIL_NOTIFICATIONS_ENABLED') ? ['SMTP_PASS'] : []),
      ...(enabled(environment, 'WHATSAPP_NOTIFICATIONS_ENABLED')
        ? ['WHATSAPP_WEBHOOK_TOKEN', 'WHATSAPP_API_TOKEN', 'WHATSAPP_AUTH_TOKEN']
        : []),
    ];
    const configuredSecrets = secretNames
      .map((name) => [name, environment[name]?.trim()] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
    const duplicatedValues = configuredSecrets.filter(
      ([, value], index) =>
        configuredSecrets.findIndex(([, candidate]) => candidate === value) !== index
    );
    if (duplicatedValues.length) {
      errors.push(
        `Hosted application/provider secrets must be unique; duplicates include ${duplicatedValues.map(([name]) => name).join(', ')}`
      );
    }
  }

  if (errors.length) {
    throw new Error(`Configuration security validation failed:\n- ${errors.join('\n- ')}`);
  }
}

/**
 * Security-focused error handler
 * Shows generic messages in production while logging detailed errors in development
 */

const ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'Invalid login credentials': 'E-mail ou senha incorretos',
  'Email not confirmed': 'E-mail ainda não confirmado. Verifique sua caixa de entrada.',
  'User already registered': 'Este e-mail já está cadastrado.',
  'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
  'Signup is disabled': 'Novos cadastros estão desabilitados.',
  
  // Generic errors
  'duplicate key': 'Este registro já existe.',
  'foreign key violation': 'Este registro está vinculado a outros dados.',
  'row-level security': 'Você não tem permissão para esta ação.',
  'JWT expired': 'Sua sessão expirou. Faça login novamente.',
  
  // Network errors
  'Failed to fetch': 'Erro de conexão. Verifique sua internet.',
  'Network request failed': 'Erro de conexão. Verifique sua internet.',
};

/**
 * Get a user-friendly error message
 * Logs detailed error in development, returns generic message in production
 */
export function getErrorMessage(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Always log in development
  if (import.meta.env.DEV) {
    console.error('[Error]', error);
  }
  
  // Try to match known error patterns
  for (const [pattern, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return message;
    }
  }
  
  // Generic fallback - don't expose internal details
  return 'Ocorreu um erro. Tente novamente.';
}

/**
 * Get error message with custom fallback
 */
export function getErrorMessageWithFallback(error: unknown, fallback: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (import.meta.env.DEV) {
    console.error('[Error]', error);
  }
  
  for (const [pattern, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return message;
    }
  }
  
  return fallback;
}

export function mapSignupError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("already been registered") || m.includes("already registered")) {
    return "Este email já está cadastrado. Tente entrar ou use outro email.";
  }
  if (m.includes("invalid email")) {
    return "Email inválido.";
  }
  if (m.includes("password") && m.includes("least")) {
    return "A senha deve ter no mínimo 6 caracteres.";
  }
  if (m.includes("signup is disabled")) {
    return "Cadastro temporariamente indisponível. Contate o suporte.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  }

  return message || "Não foi possível criar a conta. Tente novamente.";
}

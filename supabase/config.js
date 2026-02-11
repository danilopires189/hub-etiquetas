/**
 * Configuração do Supabase para Hub de Etiquetas
 */

const RUNTIME_GLOBAL = typeof window !== 'undefined' ? window : globalThis;

// Configurações do Supabase
export const SUPABASE_CONFIG = {
  url: 'https://esaomlrwutuwqmztxsat.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzYW9tbHJ3dXR1d3FtenR4c2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDIxNzQsImV4cCI6MjA4NjM3ODE3NH0.oPutmXC7S2kewHZkjPsceo0pUPx4TSgqKnsfoSt2OVA'
};

// Configurações de autenticação admin (opcional)
// Para habilitar, defina no runtime:
// window.__HUB_ADMIN_EMAIL = 'admin@empresa.com'
// window.__HUB_ADMIN_PASSWORD = 'senha-forte'
export const ADMIN_CONFIG = {
  email: String(RUNTIME_GLOBAL.__HUB_ADMIN_EMAIL || '').trim(),
  password: String(RUNTIME_GLOBAL.__HUB_ADMIN_PASSWORD || ''),
  sessionDuration: 24 * 60 * 60 * 1000 // 24 horas em millisegundos
};

// Configurações da aplicação
export const APP_CONFIG = {
  offlineQueueKey: 'hub_etiquetas_offline_queue',
  syncIntervalMs: 30000, // 30 segundos
  maxRetries: 3,
  retryDelayMs: 1000
};

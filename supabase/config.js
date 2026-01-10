/**
 * Configuração do Supabase para Hub de Etiquetas
 */

// Configurações do Supabase
export const SUPABASE_CONFIG = {
  url: 'https://jomwkkhhhekbyanftpoc.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvbXdra2hoaGVrYnlhbmZ0cG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0NTU0NzQsImV4cCI6MjA1MjAzMTQ3NH0.MhG-apUJHKOJCijFDecR1A_Q_hfNtHL',
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvbXdra2hoaGVrYnlhbmZ0cG9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjQ1NTQ3NCwiZXhwIjoyMDUyMDMxNDc0fQ.oGSzd-o_VmGfXVUc-X9EUw_MNf6TRS-'
};

// Configurações de autenticação admin
export const ADMIN_CONFIG = {
  email: 'danilo_pires189@hotmail.com',
  password: 'Danilo189',
  sessionDuration: 24 * 60 * 60 * 1000 // 24 horas em millisegundos
};

// Configurações da aplicação
export const APP_CONFIG = {
  offlineQueueKey: 'hub_etiquetas_offline_queue',
  syncIntervalMs: 30000, // 30 segundos
  maxRetries: 3,
  retryDelayMs: 1000
};
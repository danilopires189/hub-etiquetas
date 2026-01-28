/**
 * Main entry point for Hub de Etiquetas
 * This file orchestrates the loading of all modules with optimizations
 * Works with ES modules for Vercel deployment
 */

console.log('🚀 Hub de Etiquetas - Carregando módulos otimizados...');

// MODO EMERGÊNCIA - Cached Egress Crítico!
import '../shared/emergency-optimization.js';
import '../shared/supabase-plan-checker.js';
import '../shared/console-commands.js';

// Import core optimizations first
import '../shared/cache-manager.js';
import '../shared/lazy-loader.js';
import '../shared/database-optimizer.js';
import '../shared/sync-optimizer.js';
import '../shared/supabase-batch-processor.js';
import '../shared/supabase-debouncer.js';
import '../shared/contador-migration.js';

// Import contador global OTIMIZADO (side-effect - creates window.contadorGlobal)
import './contador-global-otimizado.js';

// Import utils (side-effect - adds functions to window)
import '../shared/utils.js';

// Import landing page logic (side-effect - self-initializing)
import './landing.js';

// Import Supabase integration (non-blocking, async) with optimization
// Using dynamic import to prevent blocking if it fails
setTimeout(() => {
    import('../supabase/init.js')
        .then(() => {
            console.log('✅ Supabase integration loaded');

            // Integrar com otimizadores
            if (window.syncOptimizer && window.supabaseManager) {
                console.log('🔗 Integrando Supabase com Sync Optimizer');
            }

            if (window.supabaseBatchProcessor) {
                console.log('📦 Batch Processor integrado');
            }

            if (window.supabaseDebouncer) {
                console.log('⏱️ Debouncer integrado');
            }
        })
        .catch(err => console.warn('⚠️ Supabase init falhou (não crítico):', err.message));
}, 100);

// Configurar lazy loading para elementos da página
document.addEventListener('DOMContentLoaded', () => {
    // EMERGÊNCIA: Logs no console apenas (sem alerta visual)
    if (window.emergencyOptimization) {
        const stats = window.emergencyOptimization.getEmergencyStats();
        console.log('🚨 MODO EMERGÊNCIA ATIVO:', stats);
        console.log(`📊 Taxa de bloqueio: ${stats.blockRate} - Cached egress sendo reduzido`);
    }

    // Observar cards de aplicações para lazy loading
    const appCards = document.querySelectorAll('.app-card');
    appCards.forEach(card => {
        const appName = card.dataset.app;
        if (appName) {
            window.lazyLoader.observe(card, `${appName}-module`);
        }
    });

    // Configurar limpeza automática de cache a cada 15 minutos (mais frequente)
    setInterval(() => {
        if (window.cacheManager) {
            window.cacheManager.clearExpiredCache();
        }
        if (window.databaseOptimizer) {
            window.databaseOptimizer.clearUnusedData();
        }
    }, 15 * 60 * 1000);

    // Mostrar estatísticas de otimização no console (sempre ativo em emergência)
    setTimeout(() => {
        console.log('📊 Estatísticas de Otimização (EMERGÊNCIA):');
        console.log('Cache:', window.cacheManager?.getStats());
        console.log('Database:', window.databaseOptimizer?.getStats());
        console.log('Sync:', window.syncOptimizer?.getStats());
        console.log('Lazy Loading:', window.lazyLoader?.getStats());
        console.log('Batch Processor:', window.supabaseBatchProcessor?.getStats());
        console.log('Debouncer:', window.supabaseDebouncer?.getStats());
        console.log('Emergência:', window.emergencyOptimization?.getEmergencyStats());
    }, 2000);
});

console.log('✅ Módulos principais carregados com otimizações EMERGENCIAIS');

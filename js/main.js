/**
 * Main entry point for Hub de Etiquetas
 * Orchestrates loading of all modules with performance optimizations
 * Works with ES modules for Vercel deployment
 * @version 2.0.0
 */

// Core optimizations (loaded first for performance)
import '../shared/cache-manager.js';
import '../shared/lazy-loader.js';
import '../shared/database-optimizer.js';
import '../shared/sync-optimizer.js';
import '../shared/supabase-batch-processor.js';
import '../shared/supabase-debouncer.js';
import '../shared/contador-migration.js';

// Global counter (creates window.contadorGlobal)
import './contador-global-otimizado.js';

// Utilities (adds functions to window)
import '../shared/utils.js';

// Landing page logic (self-initializing)
import './landing.js';

// Supabase integration (non-blocking, async)
setTimeout(() => {
    import('../supabase/init.js')
        .then(() => {
            // Integrate with optimizers
            if (window.syncOptimizer && window.supabaseManager) {
                window.syncOptimizer.setSupabaseManager(window.supabaseManager);
            }
        })
        .catch(() => {
            // Silent fail - Supabase is not critical for basic functionality
        });
}, 100);

// Page initialization
document.addEventListener('DOMContentLoaded', () => {
    // Configure lazy loading for app cards
    const appCards = document.querySelectorAll('.app-card');
    appCards.forEach(card => {
        const appName = card.dataset.app;
        if (appName && window.lazyLoader) {
            window.lazyLoader.observe(card, `${appName}-module`);
        }
    });

    // Automatic cache cleanup every 15 minutes
    setInterval(() => {
        if (window.cacheManager) {
            window.cacheManager.clearExpiredCache();
        }
        if (window.databaseOptimizer) {
            window.databaseOptimizer.clearUnusedData();
        }
    }, 15 * 60 * 1000);
});

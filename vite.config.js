import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // Build configuration
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
                adminLogin: resolve(__dirname, 'admin/login.html'),
                avulso: resolve(__dirname, 'avulso/index.html'),
                caixa: resolve(__dirname, 'caixa/index.html'),
                enderec: resolve(__dirname, 'enderec/index.html'),
                enderecamentoFraldas: resolve(__dirname, 'enderecamento-fraldas/index.html'),
                enderecamentoFraldasLogin: resolve(__dirname, 'enderecamento-fraldas/login.html'),
                etiquetaMercadoria: resolve(__dirname, 'etiqueta-mercadoria/index.html'),
                inventario: resolve(__dirname, 'inventario/index.html'),
                pedidoDireto: resolve(__dirname, 'pedido-direto/index.html'),
                placas: resolve(__dirname, 'placas/index.html'),
                termo: resolve(__dirname, 'termo/index.html'),
                transferencia: resolve(__dirname, 'transferencia/index.html'),
            }
        },
        // Copy public assets
        copyPublicDir: true,
    },

    // Public directory for static assets (assets folder)
    publicDir: 'assets',

    // Base URL for deployment - relative paths
    base: './',

    // Server configuration for development
    server: {
        port: 3000,
        open: true
    },

    // Assure external scripts are not bundled
    optimizeDeps: {
        exclude: ['@supabase/supabase-js']
    }
});

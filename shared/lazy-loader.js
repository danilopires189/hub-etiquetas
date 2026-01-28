/**
 * Sistema de Lazy Loading
 * Carrega recursos apenas quando necessário
 */

class LazyLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
        this.observers = new Map();
        
        console.log('🔄 Lazy Loader inicializado');
        this.setupIntersectionObserver();
    }

    /**
     * Configurar observer para elementos visíveis
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        const moduleToLoad = element.dataset.lazyModule;
                        
                        if (moduleToLoad) {
                            this.loadModule(moduleToLoad);
                            this.intersectionObserver.unobserve(element);
                        }
                    }
                });
            }, {
                rootMargin: '50px' // Carregar 50px antes de ficar visível
            });
        }
    }

    /**
     * Carregar módulo sob demanda
     */
    async loadModule(moduleName) {
        if (this.loadedModules.has(moduleName)) {
            return true;
        }

        if (this.loadingPromises.has(moduleName)) {
            return await this.loadingPromises.get(moduleName);
        }

        console.log(`📦 Carregando módulo: ${moduleName}`);

        const loadPromise = this.loadModuleScript(moduleName);
        this.loadingPromises.set(moduleName, loadPromise);

        try {
            await loadPromise;
            this.loadedModules.add(moduleName);
            this.loadingPromises.delete(moduleName);
            
            console.log(`✅ Módulo carregado: ${moduleName}`);
            return true;
        } catch (error) {
            console.error(`❌ Erro ao carregar módulo ${moduleName}:`, error);
            this.loadingPromises.delete(moduleName);
            return false;
        }
    }

    /**
     * Carregar script do módulo
     */
    async loadModuleScript(moduleName) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = this.getModulePath(moduleName);
            
            script.onload = () => {
                resolve();
            };
            
            script.onerror = () => {
                reject(new Error(`Falha ao carregar ${moduleName}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Obter caminho do módulo
     */
    getModulePath(moduleName) {
        const modulePaths = {
            'database-optimizer': '/shared/database-optimizer.js',
            'cache-manager': '/shared/cache-manager.js',
            'sync-optimizer': '/shared/sync-optimizer.js',
            'barcode-generator': '/shared/barcode.js',
            'user-validation': '/shared/user-validation.js',
            'supabase-client': '/supabase/client.js'
        };

        return modulePaths[moduleName] || `/modules/${moduleName}.js`;
    }

    /**
     * Observar elemento para lazy loading
     */
    observe(element, moduleName) {
        if (this.intersectionObserver) {
            element.dataset.lazyModule = moduleName;
            this.intersectionObserver.observe(element);
        } else {
            // Fallback para navegadores sem IntersectionObserver
            this.loadModule(moduleName);
        }
    }

    /**
     * Pré-carregar módulos críticos
     */
    async preloadCritical() {
        const criticalModules = [
            'cache-manager',
            'database-optimizer'
        ];

        console.log('🚀 Pré-carregando módulos críticos...');
        
        const promises = criticalModules.map(module => 
            this.loadModule(module).catch(error => {
                console.warn(`⚠️ Falha ao pré-carregar ${module}:`, error);
                return false;
            })
        );

        await Promise.all(promises);
        console.log('✅ Pré-carregamento de módulos críticos concluído');
    }

    /**
     * Carregar módulo quando necessário (com cache)
     */
    async loadWhenNeeded(moduleName, condition = () => true) {
        if (!condition()) {
            return false;
        }

        return await this.loadModule(moduleName);
    }

    /**
     * Descarregar módulo (liberar memória)
     */
    unloadModule(moduleName) {
        if (this.loadedModules.has(moduleName)) {
            // Remover scripts relacionados
            const scripts = document.querySelectorAll(`script[src*="${moduleName}"]`);
            scripts.forEach(script => script.remove());
            
            this.loadedModules.delete(moduleName);
            console.log(`🗑️ Módulo descarregado: ${moduleName}`);
        }
    }

    /**
     * Verificar se módulo está carregado
     */
    isLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }

    /**
     * Obter estatísticas
     */
    getStats() {
        return {
            loadedModules: Array.from(this.loadedModules),
            loadingModules: Array.from(this.loadingPromises.keys()),
            totalLoaded: this.loadedModules.size,
            observedElements: this.intersectionObserver ? 
                document.querySelectorAll('[data-lazy-module]').length : 0
        };
    }
}

// Instância global
window.lazyLoader = new LazyLoader();

// Pré-carregar módulos críticos
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.lazyLoader.preloadCritical();
    });
} else {
    window.lazyLoader.preloadCritical();
}

export default window.lazyLoader;
/**
 * Sistema de Lazy Loading para Hub de Etiquetas
 * Carrega recursos apenas quando necessário
 * @version 2.0.0
 */

class LazyLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
        this.observers = new Map();
        this.setupIntersectionObserver();
    }

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
                rootMargin: '50px'
            });
        }
    }

    async loadModule(moduleName) {
        if (this.loadedModules.has(moduleName)) {
            return true;
        }

        if (this.loadingPromises.has(moduleName)) {
            return await this.loadingPromises.get(moduleName);
        }

        const loadPromise = this.loadModuleScript(moduleName);
        this.loadingPromises.set(moduleName, loadPromise);

        try {
            await loadPromise;
            this.loadedModules.add(moduleName);
            this.loadingPromises.delete(moduleName);
            return true;
        } catch (error) {
            this.loadingPromises.delete(moduleName);
            return false;
        }
    }

    async loadModuleScript(moduleName) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = this.getModulePath(moduleName);

            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Falha ao carregar ${moduleName}`));

            document.head.appendChild(script);
        });
    }

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

    observe(element, moduleName) {
        if (this.intersectionObserver) {
            element.dataset.lazyModule = moduleName;
            this.intersectionObserver.observe(element);
        } else {
            this.loadModule(moduleName);
        }
    }

    async preloadCritical() {
        const criticalModules = [
            'cache-manager',
            'database-optimizer'
        ];

        const promises = criticalModules.map(module =>
            this.loadModule(module).catch(() => false)
        );

        await Promise.all(promises);
    }

    async loadWhenNeeded(moduleName, condition = () => true) {
        if (!condition()) {
            return false;
        }
        return await this.loadModule(moduleName);
    }

    unloadModule(moduleName) {
        if (this.loadedModules.has(moduleName)) {
            const scripts = document.querySelectorAll(`script[src*="${moduleName}"]`);
            scripts.forEach(script => script.remove());
            this.loadedModules.delete(moduleName);
        }
    }

    isLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }

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

window.lazyLoader = new LazyLoader();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.lazyLoader.preloadCritical();
    });
} else {
    window.lazyLoader.preloadCritical();
}

export default window.lazyLoader;
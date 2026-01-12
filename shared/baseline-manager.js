/**
 * Baseline Manager for Screenshot Testing
 * Manages baseline images for visual regression testing
 * Provides utilities for creating, updating, and comparing baselines
 */

class BaselineManager {
    constructor() {
        this.baselines = new Map();
        this.storageKey = 'screenshot-baselines';
        this.metadataKey = 'baseline-metadata';
        this.initialized = false;
    }

    /**
     * Initialize the baseline manager
     */
    async initialize() {
        console.log('📐 Initializing Baseline Manager...');
        
        try {
            this.loadBaselines();
            this.loadMetadata();
            this.initialized = true;
            
            console.log(`✅ Baseline Manager initialized with ${this.baselines.size} baselines`);
        } catch (error) {
            console.error('❌ Failed to initialize Baseline Manager:', error);
            throw error;
        }
    }

    /**
     * Create a new baseline from a screenshot
     */
    createBaseline(name, screenshot, metadata = {}) {
        if (!this.initialized) {
            throw new Error('Baseline Manager not initialized');
        }

        const baseline = {
            name,
            dataURL: screenshot.dataURL,
            width: screenshot.width,
            height: screenshot.height,
            scale: screenshot.scale,
            timestamp: Date.now(),
            created: new Date().toISOString(),
            metadata: {
                module: metadata.module || 'unknown',
                viewport: metadata.viewport || 'default',
                state: metadata.state || 'normal',
                ...metadata
            }
        };

        this.baselines.set(name, baseline);
        this.saveBaselines();
        
        console.log(`📐 Baseline created: ${name}`);
        return baseline;
    }

    /**
     * Update an existing baseline
     */
    updateBaseline(name, screenshot, metadata = {}) {
        if (!this.baselines.has(name)) {
            throw new Error(`Baseline '${name}' does not exist`);
        }

        const existingBaseline = this.baselines.get(name);
        const updatedBaseline = {
            ...existingBaseline,
            dataURL: screenshot.dataURL,
            width: screenshot.width,
            height: screenshot.height,
            scale: screenshot.scale,
            timestamp: Date.now(),
            updated: new Date().toISOString(),
            metadata: {
                ...existingBaseline.metadata,
                ...metadata
            }
        };

        this.baselines.set(name, updatedBaseline);
        this.saveBaselines();
        
        console.log(`📐 Baseline updated: ${name}`);
        return updatedBaseline;
    }

    /**
     * Get a baseline by name
     */
    getBaseline(name) {
        return this.baselines.get(name);
    }

    /**
     * Get all baselines
     */
    getAllBaselines() {
        return Array.from(this.baselines.values());
    }

    /**
     * Get baselines by criteria
     */
    getBaselinesByCriteria(criteria = {}) {
        return this.getAllBaselines().filter(baseline => {
            return Object.entries(criteria).every(([key, value]) => {
                if (key === 'module' || key === 'viewport' || key === 'state') {
                    return baseline.metadata[key] === value;
                }
                return baseline[key] === value;
            });
        });
    }

    /**
     * Delete a baseline
     */
    deleteBaseline(name) {
        if (this.baselines.has(name)) {
            this.baselines.delete(name);
            this.saveBaselines();
            console.log(`🗑️ Baseline deleted: ${name}`);
            return true;
        }
        return false;
    }

    /**
     * Clear all baselines
     */
    clearAllBaselines() {
        this.baselines.clear();
        this.saveBaselines();
        this.clearMetadata();
        console.log('🗑️ All baselines cleared');
    }

    /**
     * Export baselines to JSON
     */
    exportBaselines() {
        const exportData = {
            version: '1.0',
            exported: new Date().toISOString(),
            baselines: Array.from(this.baselines.entries()).map(([name, baseline]) => ({
                name,
                ...baseline
            }))
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import baselines from JSON
     */
    importBaselines(jsonData, options = {}) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            if (!data.baselines || !Array.isArray(data.baselines)) {
                throw new Error('Invalid baseline data format');
            }

            let imported = 0;
            let skipped = 0;

            data.baselines.forEach(baselineData => {
                const { name, ...baseline } = baselineData;
                
                if (this.baselines.has(name) && !options.overwrite) {
                    skipped++;
                    return;
                }

                this.baselines.set(name, baseline);
                imported++;
            });

            this.saveBaselines();
            
            console.log(`📥 Import completed: ${imported} imported, ${skipped} skipped`);
            return { imported, skipped };

        } catch (error) {
            console.error('❌ Import failed:', error);
            throw error;
        }
    }

    /**
     * Compare a screenshot with its baseline
     */
    compareWithBaseline(name, screenshot) {
        const baseline = this.getBaseline(name);
        
        if (!baseline) {
            return {
                status: 'no_baseline',
                message: `No baseline found for '${name}'`
            };
        }

        // Simple comparison based on data URL
        if (baseline.dataURL === screenshot.dataURL) {
            return {
                status: 'identical',
                message: 'Screenshot matches baseline exactly',
                baseline: baseline.timestamp,
                current: screenshot.timestamp
            };
        }

        // Calculate basic differences
        const sizeDiff = Math.abs(baseline.dataURL.length - screenshot.dataURL.length);
        const sizeDiffPercent = (sizeDiff / baseline.dataURL.length) * 100;

        return {
            status: 'different',
            message: 'Screenshot differs from baseline',
            baseline: baseline.timestamp,
            current: screenshot.timestamp,
            difference: {
                sizeDifference: sizeDiff,
                sizeDifferencePercent: sizeDiffPercent.toFixed(2)
            }
        };
    }

    /**
     * Get baseline statistics
     */
    getStatistics() {
        const baselines = this.getAllBaselines();
        
        const stats = {
            total: baselines.length,
            byModule: {},
            byViewport: {},
            byState: {},
            oldest: null,
            newest: null,
            totalSize: 0
        };

        baselines.forEach(baseline => {
            // Count by module
            const module = baseline.metadata.module || 'unknown';
            stats.byModule[module] = (stats.byModule[module] || 0) + 1;

            // Count by viewport
            const viewport = baseline.metadata.viewport || 'default';
            stats.byViewport[viewport] = (stats.byViewport[viewport] || 0) + 1;

            // Count by state
            const state = baseline.metadata.state || 'normal';
            stats.byState[state] = (stats.byState[state] || 0) + 1;

            // Track oldest and newest
            if (!stats.oldest || baseline.timestamp < stats.oldest.timestamp) {
                stats.oldest = baseline;
            }
            if (!stats.newest || baseline.timestamp > stats.newest.timestamp) {
                stats.newest = baseline;
            }

            // Calculate total size
            stats.totalSize += baseline.dataURL.length;
        });

        return stats;
    }

    /**
     * Validate baseline integrity
     */
    validateBaselines() {
        const results = {
            valid: [],
            invalid: [],
            warnings: []
        };

        this.baselines.forEach((baseline, name) => {
            const validation = this.validateBaseline(baseline, name);
            
            if (validation.isValid) {
                results.valid.push({ name, baseline });
            } else {
                results.invalid.push({ name, baseline, errors: validation.errors });
            }

            if (validation.warnings.length > 0) {
                results.warnings.push({ name, baseline, warnings: validation.warnings });
            }
        });

        return results;
    }

    /**
     * Validate a single baseline
     */
    validateBaseline(baseline, name) {
        const errors = [];
        const warnings = [];

        // Check required fields
        if (!baseline.dataURL) {
            errors.push('Missing dataURL');
        } else if (!baseline.dataURL.startsWith('data:image/')) {
            errors.push('Invalid dataURL format');
        }

        if (!baseline.width || !baseline.height) {
            errors.push('Missing dimensions');
        }

        if (!baseline.timestamp) {
            errors.push('Missing timestamp');
        }

        // Check for warnings
        if (!baseline.metadata || !baseline.metadata.module) {
            warnings.push('Missing module metadata');
        }

        if (baseline.dataURL && baseline.dataURL.length > 1000000) { // 1MB
            warnings.push('Large baseline size (>1MB)');
        }

        const age = Date.now() - baseline.timestamp;
        if (age > 30 * 24 * 60 * 60 * 1000) { // 30 days
            warnings.push('Baseline is older than 30 days');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Clean up old or invalid baselines
     */
    cleanup(options = {}) {
        const {
            maxAge = 90 * 24 * 60 * 60 * 1000, // 90 days
            removeInvalid = false,
            maxSize = 100 // Maximum number of baselines
        } = options;

        const cleaned = {
            removed: [],
            kept: []
        };

        const now = Date.now();
        const baselines = Array.from(this.baselines.entries());

        // Sort by timestamp (newest first)
        baselines.sort(([, a], [, b]) => b.timestamp - a.timestamp);

        baselines.forEach(([name, baseline], index) => {
            let shouldRemove = false;
            let reason = '';

            // Check age
            if (now - baseline.timestamp > maxAge) {
                shouldRemove = true;
                reason = 'too old';
            }

            // Check validity
            if (removeInvalid) {
                const validation = this.validateBaseline(baseline, name);
                if (!validation.isValid) {
                    shouldRemove = true;
                    reason = 'invalid';
                }
            }

            // Check count limit
            if (index >= maxSize) {
                shouldRemove = true;
                reason = 'exceeds limit';
            }

            if (shouldRemove) {
                this.baselines.delete(name);
                cleaned.removed.push({ name, reason });
            } else {
                cleaned.kept.push({ name });
            }
        });

        if (cleaned.removed.length > 0) {
            this.saveBaselines();
            console.log(`🧹 Cleanup completed: ${cleaned.removed.length} removed, ${cleaned.kept.length} kept`);
        }

        return cleaned;
    }

    /**
     * Save baselines to localStorage
     */
    saveBaselines() {
        try {
            const data = Object.fromEntries(this.baselines);
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            
            // Save metadata
            const metadata = {
                lastSaved: Date.now(),
                count: this.baselines.size,
                version: '1.0'
            };
            localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
            
        } catch (error) {
            console.error('❌ Failed to save baselines:', error);
            throw error;
        }
    }

    /**
     * Load baselines from localStorage
     */
    loadBaselines() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                this.baselines = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.error('❌ Failed to load baselines:', error);
            this.baselines = new Map();
        }
    }

    /**
     * Load metadata from localStorage
     */
    loadMetadata() {
        try {
            const data = localStorage.getItem(this.metadataKey);
            if (data) {
                this.metadata = JSON.parse(data);
            } else {
                this.metadata = {};
            }
        } catch (error) {
            console.error('❌ Failed to load metadata:', error);
            this.metadata = {};
        }
    }

    /**
     * Clear metadata
     */
    clearMetadata() {
        localStorage.removeItem(this.metadataKey);
        this.metadata = {};
    }

    /**
     * Get storage usage information
     */
    getStorageInfo() {
        try {
            const baselineData = localStorage.getItem(this.storageKey) || '';
            const metadataData = localStorage.getItem(this.metadataKey) || '';
            
            return {
                baselineSize: baselineData.length,
                metadataSize: metadataData.length,
                totalSize: baselineData.length + metadataData.length,
                baselineCount: this.baselines.size,
                formattedSize: this.formatBytes(baselineData.length + metadataData.length)
            };
        } catch (error) {
            return {
                error: error.message
            };
        }
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaselineManager;
} else {
    window.BaselineManager = BaselineManager;
}

// Auto-initialize for browser usage
if (typeof window !== 'undefined') {
    window.baselineManager = new BaselineManager();
    console.log('✅ Baseline Manager loaded and ready');
}
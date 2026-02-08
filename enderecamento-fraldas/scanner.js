/* ===== Sistema de Scanner para Dispositivos Móveis ===== */

// Prevent scanner functionality on mobile devices for this specific implementation
(function() {
  if (window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    // Mobile device detected - disable all scanner functionality
    console.log('Scanner functionality disabled on mobile devices');
    
    // Override scanner functions to prevent execution
    window.mobileScanner = {
      isMobileDevice: () => true,
      isSupported: () => false,
      openScanner: () => console.log('Scanner disabled on mobile'),
      closeScanner: () => {},
      destroy: () => {}
    };
    
    // Prevent adding scanner buttons
    window.addScannerButtons = function() {
      console.log('Scanner buttons disabled on mobile');
      return;
    };
    
    window.addScannerButton = function() {
      console.log('Scanner button disabled on mobile');
      return;
    };
    
    // Exit early - don't load the rest of the scanner code
    return;
  }
  
  // Continue with scanner initialization for desktop...
  initializeScanner();
})();

function initializeScanner() {

class MobileScanner {
    constructor() {
        this.isScanning = false;
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.scannerModal = null;
        this.onScanCallback = null;
        this.scanType = 'barcode'; // 'barcode' ou 'qr'
        this.lastScanTime = 0;
        this.scanCooldown = 2000; // 2 segundos entre scans
        this.quaggaInitialized = false;
    }

    // Detectar se é dispositivo móvel
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
               ('ontouchstart' in window);
    }

    // Verificar se o navegador suporta getUserMedia
    isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    // Carregar biblioteca QuaggaJS dinamicamente
    async loadQuagga() {
        if (window.Quagga) {
            return true;
        }

        try {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js';
            
            return new Promise((resolve, reject) => {
                script.onload = () => resolve(true);
                script.onerror = () => reject(false);
                document.head.appendChild(script);
            });
        } catch (error) {
            console.error('Erro ao carregar QuaggaJS:', error);
            return false;
        }
    }

    // Criar modal do scanner
    createScannerModal() {
        const modal = document.createElement('div');
        modal.className = 'scanner-modal';
        modal.innerHTML = `
            <div class="scanner-overlay">
                <div class="scanner-container">
                    <div class="scanner-header">
                        <h3 class="scanner-title">
                            <span class="scanner-icon">📱</span>
                            Scanner de Código
                        </h3>
                        <button class="scanner-close" onclick="mobileScanner.closeScanner()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="scanner-content">
                        <div class="scanner-video-container">
                            <div id="scannerTarget" class="scanner-target"></div>
                            <div class="scanner-overlay-frame">
                                <div class="scanner-frame"></div>
                                <div class="scanner-instructions">
                                    <p>Posicione o código dentro da moldura</p>
                                    <div class="scanner-status" id="scannerStatus">Iniciando câmera...</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="scanner-controls">
                            <button class="btn btn-ghost" onclick="mobileScanner.switchCamera()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                    <circle cx="12" cy="13" r="4"/>
                                </svg>
                                Trocar Câmera
                            </button>
                            
                            <button class="btn btn-ghost" onclick="mobileScanner.toggleFlash()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                                </svg>
                                Flash
                            </button>
                            
                            <button class="btn btn-primary" onclick="mobileScanner.manualInput()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 20h9"/>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                </svg>
                                Digitar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.scannerModal = modal;
        
        return modal;
    }

    // Abrir scanner
    async openScanner(type = 'barcode', callback = null) {
        if (!this.isSupported()) {
            alert('Seu navegador não suporta acesso à câmera');
            return;
        }

        this.scanType = type;
        this.onScanCallback = callback;

        // Criar modal se não existir
        if (!this.scannerModal) {
            this.createScannerModal();
        }

        // Mostrar modal
        this.scannerModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        try {
            if (this.scanType === 'barcode') {
                await this.initQuaggaScanner();
            } else {
                await this.initBasicScanner();
            }
        } catch (error) {
            console.error('Erro ao iniciar scanner:', error);
            this.updateStatus('Erro ao acessar câmera. Verifique as permissões.', 'error');
        }
    }

    // Inicializar scanner QuaggaJS para códigos de barras
    async initQuaggaScanner() {
        this.updateStatus('Carregando scanner...', 'info');
        
        const quaggaLoaded = await this.loadQuagga();
        if (!quaggaLoaded) {
            throw new Error('Não foi possível carregar o scanner de códigos de barras');
        }

        const config = {
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#scannerTarget'),
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: "environment"
                }
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            },
            numOfWorkers: 2,
            frequency: 10,
            decoder: {
                readers: [
                    "code_128_reader",
                    "ean_reader",
                    "ean_8_reader",
                    "code_39_reader",
                    "code_39_vin_reader",
                    "codabar_reader",
                    "upc_reader",
                    "upc_e_reader",
                    "i2of5_reader"
                ]
            },
            locate: true
        };

        return new Promise((resolve, reject) => {
            window.Quagga.init(config, (err) => {
                if (err) {
                    console.error('Erro ao inicializar Quagga:', err);
                    reject(err);
                    return;
                }

                window.Quagga.start();
                this.updateStatus('Scanner ativo. Posicione o código na moldura.', 'success');
                
                // Listener para detecção de códigos
                window.Quagga.onDetected((result) => {
                    const code = result.codeResult.code;
                    if (this.isValidCode(code)) {
                        this.onCodeDetected(code);
                    }
                });

                this.quaggaInitialized = true;
                resolve();
            });
        });
    }

    // Inicializar scanner básico para QR codes - Melhorado para iPhone
    async initBasicScanner() {
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Criar elemento de vídeo se não existir
            let video = document.querySelector('#scannerTarget video');
            if (!video) {
                video = document.createElement('video');
                video.autoplay = true;
                video.muted = true;
                video.playsInline = true;
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'cover';
                document.querySelector('#scannerTarget').appendChild(video);
            }
            
            video.srcObject = this.stream;
            this.video = video;
            
            video.onloadedmetadata = () => {
                this.updateStatus('Scanner ativo. Posicione o QR Code na moldura.', 'success');
                this.startBasicScanning();
                
                // Verificar se flash está disponível e atualizar botão
                this.checkFlashAvailability();
            };
            
        } catch (error) {
            throw new Error('Não foi possível acessar a câmera: ' + error.message);
        }
    }

    // Verificar disponibilidade do flash
    checkFlashAvailability() {
        if (!this.stream) return;
        
        const videoTrack = this.stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities();
        
        const flashBtn = document.querySelector('.scanner-controls button:nth-child(2)');
        if (flashBtn) {
            if (capabilities.torch || capabilities.flashMode) {
                flashBtn.style.opacity = '1';
                flashBtn.title = 'Flash disponível';
            } else {
                flashBtn.style.opacity = '0.5';
                flashBtn.title = 'Flash não disponível neste dispositivo';
            }
        }
    }

    // Scanner básico para QR codes (simulado)
    startBasicScanning() {
        this.isScanning = true;
        
        // Simular detecção de QR code para teste
        const simulateDetection = () => {
            if (!this.isScanning) return;
            
            // Simular 1% de chance de detecção por segundo
            if (Math.random() < 0.01) {
                const testCodes = [
                    'PF01.001.001.A0T',
                    'PF02.001.005.A02',
                    'PF03.001.010.A04'
                ];
                const randomCode = testCodes[Math.floor(Math.random() * testCodes.length)];
                this.onCodeDetected(randomCode);
                return;
            }
            
            setTimeout(simulateDetection, 100);
        };
        
        setTimeout(simulateDetection, 1000);
    }

    // Validar código detectado
    isValidCode(code) {
        if (!code || code.length < 3) return false;
        
        const now = Date.now();
        if (now - this.lastScanTime < this.scanCooldown) {
            return false;
        }
        
        return true;
    }

    // Código detectado
    onCodeDetected(code) {
        this.lastScanTime = Date.now();
        
        // Feedback visual e sonoro
        this.showScanSuccess();
        this.playBeep();
        
        // Callback
        if (this.onScanCallback) {
            this.onScanCallback(code);
        }
        
        // Fechar scanner após sucesso
        setTimeout(() => {
            this.closeScanner();
        }, 1000);
    }

    // Feedback visual de sucesso
    showScanSuccess() {
        const frame = document.querySelector('.scanner-frame');
        if (frame) {
            frame.classList.add('scan-success');
            setTimeout(() => {
                frame.classList.remove('scan-success');
            }, 1000);
        }
        
        this.updateStatus('✅ Código detectado!', 'success');
    }

    // Som de beep
    playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'square';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Não foi possível reproduzir som');
        }
    }

    // Atualizar status
    updateStatus(message, type = 'info') {
        const statusEl = document.getElementById('scannerStatus');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `scanner-status ${type}`;
        }
    }

    // Trocar câmera (frontal/traseira)
    async switchCamera() {
        if (this.quaggaInitialized) {
            // Para QuaggaJS, precisamos reinicializar
            this.closeScanner();
            setTimeout(() => {
                this.openScanner(this.scanType, this.onScanCallback);
            }, 500);
            return;
        }

        if (!this.stream) return;
        
        const videoTrack = this.stream.getVideoTracks()[0];
        const currentFacingMode = videoTrack.getSettings().facingMode;
        const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        
        try {
            this.stopCamera();
            await this.initBasicScanner();
        } catch (error) {
            console.error('Erro ao trocar câmera:', error);
            this.updateStatus('Erro ao trocar câmera', 'error');
        }
    }

    // Toggle flash (se suportado) - Melhorado para iPhone
    async toggleFlash() {
        if (!this.stream) return;
        
        const videoTrack = this.stream.getVideoTracks()[0];
        
        try {
            // Método 1: Tentar usar torch constraint (padrão)
            const capabilities = videoTrack.getCapabilities();
            
            if (capabilities.torch) {
                const settings = videoTrack.getSettings();
                const newTorchState = !settings.torch;
                
                await videoTrack.applyConstraints({
                    advanced: [{ torch: newTorchState }]
                });
                
                this.updateStatus(newTorchState ? '🔦 Flash ligado' : '💡 Flash desligado', 'info');
                return;
            }
            
            // Método 2: Tentar usar flashMode para iPhone/Safari
            if (capabilities.flashMode) {
                const settings = videoTrack.getSettings();
                const currentFlash = settings.flashMode || 'off';
                const newFlashMode = currentFlash === 'off' ? 'torch' : 'off';
                
                await videoTrack.applyConstraints({
                    flashMode: newFlashMode
                });
                
                this.updateStatus(newFlashMode === 'torch' ? '🔦 Flash ligado' : '💡 Flash desligado', 'info');
                return;
            }
            
            // Método 3: Tentar recriar stream com torch (para dispositivos mais antigos)
            const currentConstraints = videoTrack.getConstraints();
            this.stopCamera();
            
            const newConstraints = {
                video: {
                    ...currentConstraints.video,
                    facingMode: 'environment',
                    torch: true,
                    advanced: [{ torch: true }]
                }
            };
            
            try {
                this.stream = await navigator.mediaDevices.getUserMedia(newConstraints);
                
                if (this.video) {
                    this.video.srcObject = this.stream;
                }
                
                this.updateStatus('🔦 Flash ligado', 'info');
            } catch (torchError) {
                // Se falhar, voltar ao stream normal
                const fallbackConstraints = {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                };
                
                this.stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                
                if (this.video) {
                    this.video.srcObject = this.stream;
                }
                
                throw new Error('Flash não suportado');
            }
            
        } catch (error) {
            console.error('Erro ao controlar flash:', error);
            this.updateStatus('⚠️ Flash não disponível neste dispositivo', 'error');
        }
    }

    // Input manual
    manualInput() {
        const placeholder = this.scanType === 'barcode' ? 
            'Digite o código de barras ou CODDV' : 
            'Digite o endereço (ex: PF01.001.001.A0T)';
            
        const code = prompt(placeholder + ':');
        if (code && code.trim()) {
            this.onCodeDetected(code.trim());
        }
    }

    // Parar câmera
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    // Fechar scanner
    closeScanner() {
        this.isScanning = false;
        
        if (this.quaggaInitialized && window.Quagga) {
            window.Quagga.stop();
            this.quaggaInitialized = false;
        }
        
        this.stopCamera();
        
        if (this.scannerModal) {
            this.scannerModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Destruir scanner
    destroy() {
        this.closeScanner();
        if (this.scannerModal) {
            this.scannerModal.remove();
            this.scannerModal = null;
        }
    }
}

// Instância global
window.mobileScanner = new MobileScanner();

// Função para adicionar botões de scanner aos campos de input
function addScannerButtons() {
    if (!window.mobileScanner.isMobileDevice()) {
        return; // Não adicionar em desktop
    }

    // Campo de código do produto
    const codigoProdutoField = document.getElementById('codigoProduto');
    if (codigoProdutoField) {
        addScannerButton(codigoProdutoField, 'barcode', (code) => {
            codigoProdutoField.value = code;
            codigoProdutoField.focus();
            
            // Disparar evento de busca automaticamente
            setTimeout(() => {
                if (window.buscarProdutoHandler) {
                    window.buscarProdutoHandler();
                }
            }, 100);
        });
    }

    // Campo de busca de endereços (se existir)
    const campoBusca = document.getElementById('campoBusca');
    if (campoBusca) {
        addScannerButton(campoBusca, 'qr', (code) => {
            campoBusca.value = code;
            campoBusca.focus();
            
            // Disparar busca automaticamente
            setTimeout(() => {
                if (window.enderecoApp && window.enderecoApp.buscarEnderecos) {
                    window.enderecoApp.buscarEnderecos();
                }
            }, 100);
        });
    }
}

// Adicionar botão de scanner a um campo específico
function addScannerButton(inputElement, scanType, callback) {
    // Permitir que páginas controlem scanner manualmente sem injeção automática
    if (inputElement.dataset && inputElement.dataset.noAutoScanner === 'true') {
        return;
    }

    const container = inputElement.parentElement;

    // Se o campo já possui UI própria de scanner, não injetar wrapper/botão extra
    if (!container) return;
    if (container.querySelector('#btnScan') || container.classList.contains('search-input-wrapper')) {
        return;
    }
    
    // Criar wrapper se não existir
    if (!container.classList.contains('input-with-scanner')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'input-with-scanner';
        
        container.insertBefore(wrapper, inputElement);
        wrapper.appendChild(inputElement);
        
        // Criar botão scanner
        const scannerBtn = document.createElement('button');
        scannerBtn.type = 'button';
        scannerBtn.className = 'scanner-btn';
        scannerBtn.title = scanType === 'barcode' ? 'Escanear código de barras' : 'Escanear QR Code';
        scannerBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${scanType === 'barcode' ? 
                    '<path d="M3 7v4a1 1 0 0 0 1 1h4m0-6V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3m0 0v4a1 1 0 0 0 1 1h4V7m-4 8v4a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-4m8 0H8m8 0v-2H8v2"/>' :
                    '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M7 7h.01M7 17h.01M17 7h.01M17 17h.01M7 12h10M12 7v10"/>'
                }
            </svg>
        `;
        
        scannerBtn.onclick = () => {
            window.mobileScanner.openScanner(scanType, callback);
        };
        
        wrapper.appendChild(scannerBtn);
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar um pouco para garantir que outros scripts carregaram
    setTimeout(addScannerButtons, 500);
});

// Limpar ao sair da página
window.addEventListener('beforeunload', () => {
    if (window.mobileScanner) {
        window.mobileScanner.destroy();
    }
});

} // Fechamento da função initializeScanner()

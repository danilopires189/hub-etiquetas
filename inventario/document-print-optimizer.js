/**
 * Document Print Optimizer - Sistema de otimização de documentos para impressão
 * Gera documentos com layout de 2 produtos por página, incluindo códigos de barras,
 * endereços e quantidades totais.
 */

// Configuração padrão do sistema
const DEFAULT_CONFIG = {
  productsPerPage: 1, // Mudando para 1 produto por página para melhor layout
  logoPath: 'pm.png',
  pageMargins: '10mm', // Reduzindo margens para mais espaço
  fontSizes: {
    title: '16px', // Reduzindo tamanhos de fonte
    subtitle: '12px',
    body: '10px',
    small: '9px'
  },
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#10b981'
  }
};

// Funções utilitárias para endereços excluídos
function filterEmptyFieldsPrint(excludedAddress) {
  const filtered = {
    endereco: excludedAddress.endereco,
    displayFields: ['endereco']
  };

  // Adicionar data de exclusão se não for vazia
  if (excludedAddress.exclusao && excludedAddress.exclusao !== '-' && excludedAddress.exclusao.trim() !== '') {
    filtered.exclusao = excludedAddress.exclusao;
    filtered.displayFields.push('exclusao');
  }

  // Adicionar motivo se não for vazio
  if (excludedAddress.motivo && excludedAddress.motivo !== '-' && excludedAddress.motivo.trim() !== '') {
    filtered.motivo = excludedAddress.motivo;
    filtered.displayFields.push('motivo');
  }

  return filtered;
}

function shouldUseColumnLayoutPrint(excludedAddresses) {
  // Usar layout de colunas quando houver mais de 1 endereço
  return excludedAddresses && excludedAddresses.length > 1;
}

// Função para distribuir endereços alternadamente entre três colunas - versão para impressão
function distributeAlternatelyPrint(addresses) {
  const leftColumn = [];
  const centerColumn = [];
  const rightColumn = [];
  
  addresses.forEach((address, index) => {
    const columnIndex = index % 3;
    if (columnIndex === 0) {
      leftColumn.push(address);
    } else if (columnIndex === 1) {
      centerColumn.push(address);
    } else {
      rightColumn.push(address);
    }
  });
  
  return { leftColumn, centerColumn, rightColumn };
}

/**
 * Classe principal para otimização de documentos
 */
class DocumentPrintOptimizer {
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.layoutEngine = new LayoutEngine(this.config);
    this.dataAggregator = null; // Será inicializado com dataIndexer
  }

  /**
   * Inicializa o otimizador com o indexador de dados
   */
  initialize(dataIndexer) {
    this.dataAggregator = new DataAggregator(dataIndexer);
  }

  /**
   * Gera documento otimizado para impressão
   */
  generateOptimizedDocument(productList, cd) {
    if (!this.dataAggregator) {
      throw new Error('DocumentPrintOptimizer não foi inicializado com dataIndexer');
    }

    if (!productList || productList.size === 0) {
      throw new Error('Lista de produtos não pode estar vazia');
    }

    if (!cd) {
      throw new Error('CD deve ser especificado');
    }

    // Converter Map para Array se necessário
    const products = Array.isArray(productList) ? productList : Array.from(productList.values());

    // Agregar dados completos para cada produto
    const aggregatedProducts = products.map(product => 
      this.dataAggregator.aggregateProductData(product, cd)
    );

    // Calcular layout otimizado
    const layout = this.layoutEngine.calculateLayout(aggregatedProducts);

    // Gerar documento HTML
    const documentHTML = this.generateDocumentHTML(layout, cd);

    return {
      html: documentHTML,
      totalPages: layout.totalPages,
      totalProducts: products.length,
      timestamp: new Date(),
      cd: cd
    };
  }

  /**
   * Gera HTML completo do documento
   */
  generateDocumentHTML(layout, cd) {
    const timestamp = new Date().toLocaleString('pt-BR');
    
    // Validar layout antes de gerar
    const validation = this.layoutEngine.validateLayout(layout);
    if (!validation.isValid) {
      console.warn('Layout validation issues:', validation.issues);
    }
    
    let html = `
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Inventário - ${layout.totalPages} Páginas</title>
        ${this.generatePrintStyles(layout)}
      </head>
      <body>
    `;

    // Gerar cada página
    layout.pages.forEach((page, index) => {
      html += this.generatePageHTML(page, index + 1, layout.totalPages, cd, timestamp);
    });

    html += `
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Gera HTML de uma página individual
   */
  generatePageHTML(page, pageNumber, totalPages, cd, timestamp) {
    const logoHTML = this.generateLogoHTML();
    const headerHTML = this.generatePageHeader(pageNumber, totalPages, cd, timestamp, logoHTML);
    
    // Pegar o primeiro produto da página para o rodapé (sistema usa 1 produto por página)
    const firstProduct = page.products && page.products.length > 0 ? page.products[0] : null;
    const footerHTML = this.generatePageFooter(firstProduct);
    
    console.log(`📄 Gerando página ${pageNumber} - Rodapé incluído:`, footerHTML.includes('page-footer'));
    
    let pageHTML = `
      <div class="page" data-page="${pageNumber}">
        ${headerHTML}
        <div class="page-content">
    `;

    // Gerar cada produto na página
    page.products.forEach((product, index) => {
      pageHTML += this.generateProductHTML(product, index);
    });

    pageHTML += `
        </div>
        ${footerHTML}
      </div>
    `;

    return pageHTML;
  }

  /**
   * Gera HTML do cabeçalho da página
   */
  generatePageHeader(pageNumber, totalPages, cd, timestamp, logoHTML) {
    // Usar CDMapper se disponível para obter nome completo
    const cdDisplayName = (typeof window !== 'undefined' && window.CDMapper) 
      ? window.CDMapper.getCDReportName(cd)
      : `Centro de Distribuição ${cd}`;
      
    return `
      <div class="page-header">
        <div class="header-logo">
          ${logoHTML}
        </div>
        <div class="header-content">
          <h1 class="page-title">RELATÓRIO DE INVENTÁRIO</h1>
          <div class="page-subtitle">${cdDisplayName}</div>
          <div class="page-info">
            <span>Página ${pageNumber} de ${totalPages}</span>
            <span>${timestamp}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Gera HTML do logo
   */
  generateLogoHTML() {
    return `<img src="${this.config.logoPath}" alt="Logo" class="page-logo" onerror="this.style.display='none'">`;
  }

  /**
   * Gera HTML do rodapé da página
   */
  generatePageFooter(product = null) {
    console.log('🦶 Gerando rodapé da página...');
    
    // Formatar estoque virtual com separador de milhares (ponto)
    let virtualStockFormatted = '';
    if (product && product.virtualStock) {
      const stockValue = parseInt(product.virtualStock);
      if (!isNaN(stockValue)) {
        virtualStockFormatted = stockValue.toLocaleString('pt-BR').replace(/,/g, '.');
      } else {
        virtualStockFormatted = product.virtualStock;
      }
    }
    
    const footerHTML = `
      <div class="page-footer" style="position: relative; bottom: 0; margin-top: auto; padding: 15px 10px; border-top: 3px solid #000; background: #f8f9fa; min-height: 60px; flex-shrink: 0; page-break-inside: avoid; break-inside: avoid; display: block; visibility: visible; opacity: 1; z-index: 999;">
        <div class="footer-section" style="display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 5px 0; width: 100%; visibility: visible;">
          <div class="footer-field" style="display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; visibility: visible;">
            <label class="footer-label" style="font-size: 11px; font-weight: bold; color: #000; text-align: center; display: block; visibility: visible; margin-bottom: 3px;">Conferido por:</label>
            <div class="footer-input-box" style="border: 2px solid #000; height: 35px; width: 100%; max-width: 150px; background: white; border-radius: 3px; display: block; visibility: visible;"></div>
          </div>
          <div class="footer-field" style="display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; visibility: visible;">
            <label class="footer-label" style="font-size: 11px; font-weight: bold; color: #000; text-align: center; display: block; visibility: visible; margin-bottom: 3px;">Data:</label>
            <div class="footer-input-box footer-date-box" style="border: 2px solid #000; height: 35px; width: 100%; max-width: 120px; background: white; border-radius: 3px; display: block; visibility: visible;"></div>
          </div>
          <div class="footer-field" style="display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; visibility: visible;">
            <label class="footer-label" style="font-size: 11px; font-weight: bold; color: #000; text-align: center; display: block; visibility: visible; margin-bottom: 3px;">Estoque Virtual:</label>
            <div class="footer-input-box footer-virtual-stock-box" style="border: 2px solid #000; height: 35px; width: 100%; max-width: 100px; background: white; border-radius: 3px; display: flex !important; align-items: center !important; justify-content: center !important; font-weight: bold; font-size: 16px; text-align: center; line-height: 1; padding: 0 5px; box-sizing: border-box; visibility: visible;">${virtualStockFormatted}</div>
          </div>
        </div>
      </div>
    `;
    console.log('✅ Rodapé gerado com estilos inline para garantir impressão');
    return footerHTML;
  }

  /**
   * Gera HTML de um produto
   */
  generateProductHTML(product, index) {
    const addressHTML = this.generateAddressHTML(product.addresses);
    const excludedAddressHTML = this.generateExcludedAddressHTML(product.excludedAddresses);

    return `
      <div class="product-card" data-product="${index}">
        <div class="product-header">
          <h2 class="product-title">${this.escapeHtml(product.description)}</h2>
          <div class="product-code">CODDV: ${this.escapeHtml(product.coddv)}</div>
          <div class="product-barcodes">
            <strong>Códigos de Barras${product.barcodes && product.barcodes.length > 1 ? ` (${product.barcodes.length} códigos)` : product.barcodes && product.barcodes.length === 1 ? ' (1 código)' : ' (0 códigos)'}:</strong>
            ${product.barcodes && product.barcodes.length > 0 
              ? product.barcodes.map(barcode => `<span class="barcode-code">${this.escapeHtml(barcode)}</span>`).join(' • ')
              : '<span class="no-barcode">N/A</span>'
            }
          </div>
        </div>
        
        <div class="product-content">
          <div class="product-section">
            <h3>Endereços para Inventário (${product.addresses.length})</h3>
            ${addressHTML}
          </div>
          
          ${excludedAddressHTML}
        </div>
      </div>
    `;
  }

  /**
   * Gera HTML dos endereços
   */
  generateAddressHTML(addresses) {
    if (!addresses || addresses.length === 0) {
      return '<div class="no-data">Nenhum endereço encontrado</div>';
    }

    return `
      <div class="address-table-container">
        <table class="address-inventory-table">
          <thead>
            <tr>
              <th class="col-number">#</th>
              <th class="col-address">Endereço</th>
              <th class="col-type">Tipo</th>
              <th class="col-quantity">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            ${addresses.map((address, index) => `
              <tr>
                <td class="col-number">${index + 1}</td>
                <td class="col-address">${this.escapeHtml(address.endereco || address.ENDERECO || 'N/A')}</td>
                <td class="col-type">${this.escapeHtml(address.tipo || address.TIPO || 'N/A')}</td>
                <td class="col-quantity">
                  <div class="quantity-input-box"></div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total-section">
          <div class="total-label">TOTAL GERAL:</div>
          <div class="total-input-box"></div>
        </div>
      </div>
    `;
  }

  /**
   * Gera HTML dos endereços excluídos
   */
  generateExcludedAddressHTML(excludedAddresses) {
    if (!excludedAddresses || excludedAddresses.length === 0) {
      return `
        <div class="product-section excluded-section positive">
          <h3>✅ Histórico de Exclusões</h3>
          <div class="no-exclusions">Nenhum endereço excluído para este produto</div>
        </div>
      `;
    }

    // Filtrar campos vazios
    const filteredAddresses = excludedAddresses.map(filterEmptyFieldsPrint);
    
    // Determinar layout
    const useColumnLayout = shouldUseColumnLayoutPrint(excludedAddresses);

    if (useColumnLayout) {
      // Layout de três colunas para impressão - distribuição alternada
      const { leftColumn, centerColumn, rightColumn } = distributeAlternatelyPrint(filteredAddresses);

      return `
        <div class="product-section excluded-section warning">
          <h3>⚠️ Endereços Excluídos (${excludedAddresses.length})</h3>
          <div class="excluded-grid-print">
            <div class="excluded-column-print">
              ${leftColumn.map(excluded => this.generateExcludedItemPrint(excluded)).join('')}
            </div>
            <div class="excluded-column-print">
              ${centerColumn.map(excluded => this.generateExcludedItemPrint(excluded)).join('')}
            </div>
            <div class="excluded-column-print">
              ${rightColumn.map(excluded => this.generateExcludedItemPrint(excluded)).join('')}
            </div>
          </div>
        </div>
      `;
    } else {
      // Layout tradicional
      return `
        <div class="product-section excluded-section warning">
          <h3>⚠️ Endereços Excluídos (${excludedAddresses.length})</h3>
          <div class="excluded-list">
            ${filteredAddresses.map(excluded => this.generateExcludedItemPrint(excluded)).join('')}
          </div>
        </div>
      `;
    }
  }

  /**
   * Gera item individual de endereço excluído para impressão
   */
  generateExcludedItemPrint(excluded) {
    let html = `
      <div class="excluded-item">
        <div class="excluded-address">${this.escapeHtml(excluded.endereco)}</div>
    `;

    if (excluded.exclusao) {
      html += `<div class="excluded-date">Data: ${this.escapeHtml(excluded.exclusao)}</div>`;
    }

    if (excluded.motivo) {
      html += `<div class="excluded-reason">Motivo: ${this.escapeHtml(excluded.motivo)}</div>`;
    }

    html += `</div>`;
    return html;
  }

  /**
   * Gera HTML da quantidade total
   */
  generateQuantityHTML(totalQuantity) {
    return `
      <div class="quantity-display">
        <div class="quantity-value">${totalQuantity || 0}</div>
        <div class="quantity-label">unidades</div>
        <div class="quantity-manual">
          <label>Contado: <input type="number" class="count-input"></label>
          <label>Conferido: <input type="checkbox" class="verify-input"></label>
        </div>
      </div>
    `;
  }

  /**
   * Gera estilos CSS para impressão
   */
  generatePrintStyles(layout) {
    const layoutCSS = layout ? this.layoutEngine.generateLayoutCSS(layout) : '';
    
    return `
      <style>
        @page {
          size: A4;
          margin: ${this.config.pageMargins};
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          line-height: 1.4;
          font-size: ${this.config.fontSizes?.body || '12px'};
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 100vh;
          background: #f5f5f5;
        }
        
        .page {
          page-break-after: always;
          height: 277mm;
          width: 190mm;
          padding: 10mm;
          position: relative;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          min-height: 277mm;
          max-height: 277mm;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          margin: 20px;
        }
        
        .page:last-child {
          page-break-after: avoid;
        }
        
        .page-content {
          flex: 1;
          overflow: hidden;
          max-height: calc(277mm - 60mm - 80px);
          min-height: 0;
        }
        
        .page-header {
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 2px solid #333;
          padding-bottom: 8px;
          margin-bottom: 15px;
        }
        
        .header-logo {
          flex-shrink: 0;
        }
        
        .page-logo {
          height: 70px;
          width: auto;
        }
        
        .header-content {
          flex: 1;
          text-align: center;
        }
        
        .page-title {
          font-size: ${this.config.fontSizes?.title || '18px'};
          font-weight: bold;
          margin: 0 0 5px 0;
          color: ${this.config.colors?.primary || '#2563eb'};
        }
        
        .page-subtitle {
          font-size: ${this.config.fontSizes?.subtitle || '14px'};
          color: ${this.config.colors?.secondary || '#64748b'};
          margin: 0 0 5px 0;
        }
        
        .page-info {
          font-size: ${this.config.fontSizes?.small || '22px'};
          color: ${this.config.colors?.secondary || '#64748b'};
          display: flex;
          justify-content: space-between;
        }
        
        ${layoutCSS}
        
        .product-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 12px;
          background: #fafafa;
          height: auto;
          min-height: 200mm;
          break-inside: avoid;
          overflow: hidden;
          margin-bottom: 10mm;
          width: 100%;
          flex: 1;
        }
        
        .product-header {
          border-bottom: 1px solid #ccc;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        
        .product-title {
          font-size: ${this.config.fontSizes?.subtitle || '13px'};
          font-weight: bold;
          margin: 0 0 6px 0;
          color: ${this.config.colors?.primary || '#2563eb'};
        }
        
        .product-code {
          font-size: ${this.config.fontSizes?.small || '10px'};
          color: ${this.config.colors?.secondary || '#64748b'};
          font-weight: bold;
          margin-bottom: 3px;
        }
        
        .product-barcodes {
          font-size: ${this.config.fontSizes?.small || '10px'};
          color: ${this.config.colors?.secondary || '#64748b'};
          font-weight: bold;
          margin-top: 3px;
        }
        
        .product-barcodes .barcode-code {
          background: #f0f9ff;
          padding: 2px 6px;
          border-radius: 3px;
          border: 1px solid #e0f2fe;
          margin: 0 2px;
          font-family: 'Courier New', monospace;
          font-weight: normal;
        }
        
        .product-barcodes .no-barcode {
          color: #ef4444;
          font-style: italic;
        }
        
        .product-section {
          margin-bottom: 12px;
        }
        
        .product-section h3 {
          font-size: 12px;
          font-weight: bold;
          margin: 0 0 6px 0;
          color: ${this.config.colors?.primary || '#2563eb'};
        }
        
        .excluded-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        
        .excluded-item {
          padding: 4px 8px;
          background: white;
          border: 1px solid #e0f2fe;
          border-radius: 4px;
          font-size: ${this.config.fontSizes?.small || '11px'};
        }

        /* Estilos para layout de três colunas dos endereços excluídos - impressão */
        .excluded-grid-print {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          margin-top: 6px;
        }

        .excluded-column-print {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .excluded-address {
          font-weight: bold;
          color: #991b1b;
          margin-bottom: 2px;
        }

        .excluded-date,
        .excluded-reason {
          font-size: ${this.config.fontSizes?.small || '10px'};
          color: #7f1d1d;
          margin-bottom: 1px;
        }
        
        .barcode-code {
          font-family: 'Courier New', monospace;
          font-weight: bold;
          color: #0369a1;
        }
        
        /* Tabela de endereços para inventário */
        .address-table-container {
          margin: 10px 0;
        }
        
        .address-inventory-table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #333;
          margin-bottom: 15px;
          background: white;
        }
        
        .address-inventory-table th {
          background: #f5f5f5;
          border: 1px solid #333;
          padding: 6px 4px;
          text-align: center;
          font-weight: bold;
          font-size: ${this.config.fontSizes?.small || '10px'};
        }
        
        .address-inventory-table td {
          border: 1px solid #333;
          padding: 4px;
          text-align: center;
          font-size: ${this.config.fontSizes?.small || '10px'};
          vertical-align: middle;
        }
        
        .col-number {
          width: 8%;
          font-weight: bold;
        }
        
        .col-address {
          width: 45%;
          text-align: left !important;
          font-weight: bold;
        }
        
        .col-type {
          width: 22%;
          color: #059669;
          font-weight: bold;
        }
        
        .col-quantity {
          width: 25%;
        }
        
        .quantity-input-box {
          border: 2px solid #333;
          height: 30px;
          margin: 1px;
          background: white;
          border-radius: 3px;
        }
        
        .total-section {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 8px;
          border: 2px solid #333;
          background: #f9f9f9;
          font-weight: bold;
          font-size: 12px;
        }
        
        .total-label {
          color: #333;
        }
        
        .total-input-box {
          border: 2px solid #333;
          height: 35px;
          width: 100px;
          background: white;
          border-radius: 3px;
        }
        
        .excluded-section.warning {
          border: 1px solid #f59e0b;
          background: #fef3c7;
          padding: 8px;
          border-radius: 4px;
        }
        
        .excluded-section.positive {
          border: 1px solid ${this.config.colors?.accent || '#10b981'};
          background: #dcfce7;
          padding: 8px;
          border-radius: 4px;
        }
        
        .quantity-section {
          border: 2px solid ${this.config.colors?.primary || '#2563eb'};
          background: #e0f2fe;
          padding: 10px;
          border-radius: 6px;
        }
        
        .quantity-display {
          text-align: center;
        }
        
        .quantity-value {
          font-size: 24px;
          font-weight: bold;
          color: ${this.config.colors?.primary || '#2563eb'};
          margin-bottom: 5px;
        }
        
        .quantity-label {
          font-size: ${this.config.fontSizes?.small || '11px'};
          color: ${this.config.colors?.secondary || '#64748b'};
          margin-bottom: 10px;
        }
        
        .quantity-manual {
          display: flex;
          justify-content: space-around;
          gap: 10px;
          font-size: ${this.config.fontSizes?.small || '11px'};
        }
        
        .count-input {
          width: 60px;
          padding: 2px 4px;
          border: 1px solid #ccc;
          border-radius: 3px;
        }
        
        .no-data {
          font-style: italic;
          color: ${this.config.colors?.secondary || '#64748b'};
          text-align: center;
          padding: 10px;
        }
        
        /* Rodapé da página */
        .page-footer {
          margin-top: auto;
          padding: 15px 10px;
          border-top: 2px solid #333;
          background: #f8f9fa;
          min-height: 60px;
          max-height: 80px;
          flex-shrink: 0;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .footer-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 10px;
        }
        
        .footer-field {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          flex: 1;
        }
        
        .footer-label {
          font-size: ${this.config.fontSizes?.small || '10px'};
          font-weight: bold;
          color: #333;
          text-align: center;
        }
        
        .footer-input-box {
          border: 2px solid #333;
          height: 35px;
          width: 100%;
          max-width: 150px;
          background: white;
          border-radius: 3px;
        }
        
        .footer-date-box {
          max-width: 120px;
        }
        
        .footer-virtual-stock-box {
          max-width: 100px;
        }
        
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body { 
            margin: 0 !important; 
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            display: block !important;
            background: white !important;
          }
          
          .page { 
            margin: 0 auto !important; 
            border: none !important; 
            height: auto !important;
            min-height: 277mm !important;
            max-height: 277mm !important;
            page-break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            overflow: hidden !important;
            box-shadow: none !important;
            background: white !important;
          }
          
          .page-content {
            flex: 1 !important;
            overflow: hidden !important;
            max-height: calc(277mm - 120px) !important;
            min-height: 0 !important;
          }
          
          .count-input, .verify-input { 
            border: 1px solid #000 !important; 
          }
          
          .footer-input-box { 
            border: 2px solid #000 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            height: 35px !important;
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            visibility: visible !important;
          }
          
          .page-footer {
            position: relative !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            margin-top: auto !important;
            padding: 15px 10px !important;
            border-top: 3px solid #000 !important;
            background: #f8f9fa !important;
            min-height: 60px !important;
            max-height: 80px !important;
            flex-shrink: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 999 !important;
          }
          
          .footer-section {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 20px !important;
            padding: 5px 0 !important;
            width: 100% !important;
            visibility: visible !important;
          }
          
          .footer-field {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 5px !important;
            flex: 1 !important;
            visibility: visible !important;
          }
          
          .footer-label {
            font-size: 11px !important;
            font-weight: bold !important;
            color: #000 !important;
            text-align: center !important;
            display: block !important;
            visibility: visible !important;
            margin-bottom: 3px !important;
          }
          
          .footer-date-box {
            max-width: 120px !important;
          }
          
          .footer-virtual-stock-box {
            max-width: 100px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            font-weight: bold !important;
            font-size: 16px !important;
            line-height: 1 !important;
            padding: 0 5px !important;
            box-sizing: border-box !important;
          }
          
          /* Force footer to always appear */
          .page::after {
            content: "" !important;
            display: block !important;
            height: 0 !important;
            clear: both !important;
          }
        }
      </style>
    `;
  }

  /**
   * Escapa HTML para prevenir XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  /**
   * Atualiza configuração
   */
  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.layoutEngine.updateConfiguration(this.config);
  }
}

/**
 * Engine de layout para gerenciar páginas e posicionamento
 */
class LayoutEngine {
  constructor(config) {
    this.config = config;
    this.productsPerPage = config.productsPerPage || 2;
    this.pageSize = config.pageSize || 'A4';
    this.margins = config.pageMargins || '15mm';
  }

  /**
   * Calcula layout otimizado para os produtos
   */
  calculateLayout(products) {
    const pages = [];
    const totalProducts = products.length;
    const totalPages = Math.ceil(totalProducts / this.productsPerPage);

    // Criar páginas com exatamente 2 produtos (exceto possivelmente a última)
    for (let i = 0; i < totalProducts; i += this.productsPerPage) {
      const pageProducts = products.slice(i, i + this.productsPerPage);
      const pageNumber = Math.floor(i / this.productsPerPage) + 1;
      
      pages.push({
        pageNumber: pageNumber,
        products: pageProducts,
        isLastPage: pageNumber === totalPages,
        hasOptimalLayout: pageProducts.length === this.productsPerPage,
        spacing: this.calculateOptimalSpacing(pageProducts.length)
      });
    }

    return {
      pages: pages,
      totalPages: totalPages,
      totalProducts: totalProducts,
      layoutOptimized: true,
      averageProductsPerPage: totalProducts / totalPages
    };
  }

  /**
   * Calcula espaçamento ótimo baseado no número de produtos na página
   */
  calculateOptimalSpacing(productCount) {
    if (productCount === 2) {
      return {
        gridColumns: '1fr 1fr',
        gap: '15mm',
        productHeight: 'auto',
        optimal: true
      };
    } else if (productCount === 1) {
      return {
        gridColumns: '1fr',
        gap: '0',
        productHeight: 'auto',
        optimal: false,
        note: 'Single product on page - suboptimal layout'
      };
    } else {
      // Mais de 2 produtos - não deveria acontecer, mas tratamos
      return {
        gridColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10mm',
        productHeight: 'auto',
        optimal: false,
        note: `${productCount} products on page - exceeds optimal layout`
      };
    }
  }

  /**
   * Otimiza espaçamento entre elementos
   */
  optimizeSpacing(elements) {
    return elements.map((element, index) => ({
      ...element,
      optimizedSpacing: true,
      position: this.calculateElementPosition(index, elements.length),
      spacing: this.calculateOptimalSpacing(elements.length),
      dimensions: this.calculateOptimalDimensions(element, elements.length)
    }));
  }

  /**
   * Calcula dimensões ótimas para um elemento
   */
  calculateOptimalDimensions(element, totalElements) {
    const baseWidth = totalElements <= 2 ? '100%' : `${Math.floor(100 / Math.ceil(Math.sqrt(totalElements)))}%`;
    
    // Calcular altura baseada no conteúdo estimado
    const estimatedHeight = this.estimateContentHeight(element);
    
    return {
      width: baseWidth,
      minHeight: `${estimatedHeight}mm`,
      maxHeight: totalElements <= 2 ? '45vh' : '30vh',
      padding: '10px',
      margin: '0'
    };
  }

  /**
   * Estima altura do conteúdo baseado nos dados do produto
   */
  estimateContentHeight(element) {
    let baseHeight = 40; // Altura base para cabeçalho
    
    // Adicionar altura para códigos de barras
    if (element.barcodes && element.barcodes.length > 0) {
      baseHeight += 20 + (element.barcodes.length * 8);
    }
    
    // Adicionar altura para endereços
    if (element.addresses && element.addresses.length > 0) {
      baseHeight += 20 + (element.addresses.length * 12);
    }
    
    // Adicionar altura para endereços excluídos
    if (element.excludedAddresses && element.excludedAddresses.length > 0) {
      baseHeight += 25 + (element.excludedAddresses.length * 10);
    }
    
    // Adicionar altura para seção de quantidade
    baseHeight += 35;
    
    return Math.min(baseHeight, 120); // Limitar altura máxima
  }

  /**
   * Algoritmo de otimização de espaço responsivo
   */
  optimizeResponsiveLayout(products, pageConstraints = {}) {
    const maxWidth = pageConstraints.maxWidth || 210; // A4 width in mm
    const maxHeight = pageConstraints.maxHeight || 297; // A4 height in mm
    const margins = pageConstraints.margins || 15;
    
    const availableWidth = maxWidth - (margins * 2);
    const availableHeight = maxHeight - (margins * 2) - 60; // Subtract header space
    
    // Calcular layout ótimo baseado no espaço disponível
    const optimizedLayout = this.calculateOptimalGrid(products, availableWidth, availableHeight);
    
    return {
      ...optimizedLayout,
      spaceUtilization: this.calculateSpaceUtilization(optimizedLayout, availableWidth, availableHeight),
      recommendations: this.generateSpaceOptimizationRecommendations(optimizedLayout)
    };
  }

  /**
   * Calcula grid ótimo para os produtos
   */
  calculateOptimalGrid(products, availableWidth, availableHeight) {
    const productCount = products.length;
    
    if (productCount <= 2) {
      return {
        columns: productCount,
        rows: 1,
        columnWidth: availableWidth / productCount,
        rowHeight: availableHeight,
        gap: productCount === 2 ? 15 : 0,
        layout: 'optimal'
      };
    }
    
    // Para mais de 2 produtos, calcular melhor arranjo
    const possibleLayouts = this.generatePossibleLayouts(productCount);
    let bestLayout = possibleLayouts[0];
    let bestScore = 0;
    
    possibleLayouts.forEach(layout => {
      const score = this.scoreLayout(layout, availableWidth, availableHeight);
      if (score > bestScore) {
        bestScore = score;
        bestLayout = layout;
      }
    });
    
    return {
      ...bestLayout,
      columnWidth: (availableWidth - (bestLayout.gap * (bestLayout.columns - 1))) / bestLayout.columns,
      rowHeight: (availableHeight - (bestLayout.gap * (bestLayout.rows - 1))) / bestLayout.rows,
      layout: productCount <= 2 ? 'optimal' : 'suboptimal'
    };
  }

  /**
   * Gera possíveis layouts para um número de produtos
   */
  generatePossibleLayouts(productCount) {
    const layouts = [];
    
    for (let cols = 1; cols <= Math.min(productCount, 4); cols++) {
      const rows = Math.ceil(productCount / cols);
      layouts.push({
        columns: cols,
        rows: rows,
        gap: cols > 2 ? 10 : 15,
        efficiency: productCount / (cols * rows)
      });
    }
    
    return layouts.sort((a, b) => b.efficiency - a.efficiency);
  }

  /**
   * Pontua um layout baseado em critérios de otimização
   */
  scoreLayout(layout, availableWidth, availableHeight) {
    const { columns, rows, gap, efficiency } = layout;
    
    // Calcular dimensões resultantes
    const columnWidth = (availableWidth - (gap * (columns - 1))) / columns;
    const rowHeight = (availableHeight - (gap * (rows - 1))) / rows;
    
    // Critérios de pontuação
    const efficiencyScore = efficiency * 100; // 0-100
    const aspectRatioScore = this.scoreAspectRatio(columnWidth, rowHeight); // 0-100
    const readabilityScore = this.scoreReadability(columnWidth, rowHeight); // 0-100
    
    // Peso dos critérios
    return (efficiencyScore * 0.4) + (aspectRatioScore * 0.3) + (readabilityScore * 0.3);
  }

  /**
   * Pontua a proporção (aspect ratio) do layout
   */
  scoreAspectRatio(width, height) {
    const ratio = width / height;
    const idealRatio = 0.7; // Proporção ideal para cards de produto
    
    const deviation = Math.abs(ratio - idealRatio) / idealRatio;
    return Math.max(0, 100 - (deviation * 100));
  }

  /**
   * Pontua a legibilidade baseada nas dimensões
   */
  scoreReadability(width, height) {
    const minReadableWidth = 80; // mm
    const minReadableHeight = 60; // mm
    
    const widthScore = Math.min(100, (width / minReadableWidth) * 100);
    const heightScore = Math.min(100, (height / minReadableHeight) * 100);
    
    return (widthScore + heightScore) / 2;
  }

  /**
   * Calcula utilização do espaço
   */
  calculateSpaceUtilization(layout, availableWidth, availableHeight) {
    const usedWidth = (layout.columnWidth * layout.columns) + (layout.gap * (layout.columns - 1));
    const usedHeight = (layout.rowHeight * layout.rows) + (layout.gap * (layout.rows - 1));
    
    const widthUtilization = (usedWidth / availableWidth) * 100;
    const heightUtilization = (usedHeight / availableHeight) * 100;
    
    return {
      width: Math.round(widthUtilization),
      height: Math.round(heightUtilization),
      overall: Math.round((widthUtilization + heightUtilization) / 2),
      efficiency: layout.efficiency * 100
    };
  }

  /**
   * Gera recomendações para otimização de espaço
   */
  generateSpaceOptimizationRecommendations(layout) {
    const recommendations = [];
    
    if (layout.layout === 'suboptimal') {
      recommendations.push('Layout não otimizado: considere ajustar o número de produtos por página');
    }
    
    if (layout.efficiency < 0.75) {
      recommendations.push(`Eficiência baixa (${Math.round(layout.efficiency * 100)}%): muito espaço desperdiçado`);
    }
    
    if (layout.columns > 2) {
      recommendations.push('Muitas colunas podem reduzir a legibilidade');
    }
    
    if (layout.rows > 3) {
      recommendations.push('Muitas linhas podem não caber bem na página');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Layout otimizado para melhor aproveitamento do espaço');
    }
    
    return recommendations;
  }

  /**
   * Calcula posição ótima de um elemento
   */
  calculateElementPosition(index, totalElements) {
    if (totalElements <= 2) {
      return {
        column: index + 1,
        row: 1,
        width: '100%',
        height: 'auto'
      };
    } else {
      // Layout para mais elementos (caso excepcional)
      const columns = Math.ceil(Math.sqrt(totalElements));
      return {
        column: (index % columns) + 1,
        row: Math.floor(index / columns) + 1,
        width: '100%',
        height: 'auto'
      };
    }
  }

  /**
   * Valida se o layout está otimizado
   */
  validateLayout(layout) {
    const issues = [];
    
    // Verificar se há páginas com mais de 2 produtos
    const overloadedPages = layout.pages.filter(page => page.products.length > this.productsPerPage);
    if (overloadedPages.length > 0) {
      issues.push(`${overloadedPages.length} página(s) com mais de ${this.productsPerPage} produtos`);
    }
    
    // Verificar se há páginas vazias
    const emptyPages = layout.pages.filter(page => page.products.length === 0);
    if (emptyPages.length > 0) {
      issues.push(`${emptyPages.length} página(s) vazia(s)`);
    }
    
    // Verificar eficiência do layout
    const efficiency = (layout.totalProducts / (layout.totalPages * this.productsPerPage)) * 100;
    if (efficiency < 50) {
      issues.push(`Eficiência baixa do layout: ${efficiency.toFixed(1)}%`);
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues,
      efficiency: efficiency,
      recommendation: this.getLayoutRecommendation(layout)
    };
  }

  /**
   * Gera recomendação para melhorar o layout
   */
  getLayoutRecommendation(layout) {
    const lastPage = layout.pages[layout.pages.length - 1];
    
    if (lastPage && lastPage.products.length === 1) {
      return 'Considere adicionar mais um produto para otimizar a última página';
    }
    
    if (layout.totalPages === 1 && layout.totalProducts === 1) {
      return 'Layout com produto único - considere aguardar mais produtos para otimização';
    }
    
    return 'Layout otimizado para impressão';
  }

  /**
   * Gera CSS específico para o layout calculado
   */
  generateLayoutCSS(layout) {
    // Otimizar layout responsivo se disponível
    const optimizedLayout = this.optimizeResponsiveLayout(
      layout.pages.reduce((acc, page) => acc.concat(page.products), [])
    );
    
    let css = `
      .page-content {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10mm;
        height: auto;
        min-height: calc(100vh - 100px);
        align-items: start;
        justify-content: center;
      }
      
      .product-card {
        height: auto;
        min-height: 200mm;
        overflow: hidden;
        width: 100%;
        page-break-inside: avoid;
        margin-bottom: 5mm;
        flex: 1;
      }
      
      /* Otimizações responsivas */
      @media print {
        .page-content {
          grid-template-columns: 1fr;
          gap: 5mm;
          height: auto;
        }
        
        .product-card {
          height: auto;
          min-height: 200mm;
          overflow: hidden;
          page-break-inside: avoid;
          margin-bottom: 5mm;
          flex: 1;
        }
      }
    `;
    
    // CSS específico para páginas com layout não-ótimo
    layout.pages.forEach((page, index) => {
      if (!page.hasOptimalLayout) {
        const pageOptimization = this.optimizeResponsiveLayout(page.products);
        css += `
          .page[data-page="${page.pageNumber}"] .page-content {
            grid-template-columns: ${this.generateGridColumns(pageOptimization)};
            gap: ${pageOptimization.gap || 10}mm;
          }
        `;
      }
    });
    
    // Adicionar comentários de otimização
    if (optimizedLayout.recommendations) {
      css += `
        /* Recomendações de Otimização:
         * ${optimizedLayout.recommendations.join('\n         * ')}
         */
      `;
    }
    
    return css;
  }

  /**
   * Gera string de colunas CSS Grid baseada no layout otimizado
   */
  generateGridColumns(optimizedLayout) {
    if (optimizedLayout.columns === 1) {
      return '1fr';
    } else if (optimizedLayout.columns === 2) {
      return '1fr 1fr';
    } else {
      return `repeat(${optimizedLayout.columns}, 1fr)`;
    }
  }

  /**
   * Atualiza configuração do layout
   */
  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.productsPerPage = newConfig.productsPerPage || this.productsPerPage;
    this.pageSize = newConfig.pageSize || this.pageSize;
    this.margins = newConfig.pageMargins || this.margins;
  }
}

/**
 * Agregador de dados para coletar informações dos produtos
 */
class DataAggregator {
  constructor(dataIndexer) {
    this.dataIndexer = dataIndexer;
  }

  /**
   * Agrega todos os dados de um produto
   */
  aggregateProductData(originalProduct, cd) {
    // Se receber um produto original com dados completos, usar seus dados
    const coddv = originalProduct.CODDV || originalProduct.coddv || originalProduct;
    const product = typeof originalProduct === 'object' ? originalProduct : this.getProductDetails(coddv);
    const barcodes = this.getAllBarcodes(coddv);
    const addresses = this.getAddresses(coddv, cd);
    const excludedAddresses = this.getExcludedAddresses(coddv, cd);
    const totalQuantity = this.calculateTotalQuantity(addresses);

    return {
      coddv: coddv,
      description: product?.DESC || product?.desc || 'Descrição não disponível',
      barcodes: barcodes,
      addresses: addresses,
      excludedAddresses: excludedAddresses,
      totalQuantity: totalQuantity,
      virtualStock: originalProduct.virtualStock || null // Incluir estoque virtual se disponível
    };
  }

  /**
   * Obtém detalhes do produto
   */
  getProductDetails(coddv) {
    if (this.dataIndexer && typeof this.dataIndexer.getProductDetails === 'function') {
      return this.dataIndexer.getProductDetails(coddv);
    }
    return null;
  }

  /**
   * Obtém TODOS os códigos de barras do produto - CORRIGIDO para estrutura real da base
   * Na base BARRAS, cada código está em um registro separado com o mesmo CODDV
   */
  getAllBarcodes(coddv) {
    console.log(`🔍 [DocumentPrintOptimizer] Iniciando busca de códigos de barras para CODDV: ${coddv}`);
    
    const barcodes = [];
    
    if (!coddv) {
      console.warn(`⚠️ [DocumentPrintOptimizer] CODDV não fornecido`);
      return [];
    }
    
    // MÉTODO 1: Usar dataIndexer se disponível
    if (this.dataIndexer && typeof this.dataIndexer.getAllProductBarcodes === 'function') {
      console.log(`🔍 [DocumentPrintOptimizer] Usando dataIndexer.getAllProductBarcodes()`);
      const indexerBarcodes = this.dataIndexer.getAllProductBarcodes(coddv);
      if (indexerBarcodes && indexerBarcodes.length > 0) {
        barcodes.push(...indexerBarcodes);
        console.log(`✅ [DocumentPrintOptimizer] DataIndexer encontrou ${indexerBarcodes.length} códigos:`, indexerBarcodes);
      }
    }
    
    // MÉTODO 2: Buscar diretamente na base DATA_CADASTRO (fallback)
    if (barcodes.length === 0 && typeof DATA_CADASTRO !== 'undefined' && DATA_CADASTRO.length > 0) {
      console.log(`🔍 [DocumentPrintOptimizer] Buscando diretamente na DATA_CADASTRO...`);
      
      // Filtrar TODOS os registros com o mesmo CODDV
      const allProductRecords = DATA_CADASTRO.filter(record => 
        record && record.CODDV === coddv
      );
      
      console.log(`📋 [DocumentPrintOptimizer] Encontrados ${allProductRecords.length} registros para CODDV ${coddv}`);
      
      // Extrair códigos de barras de TODOS os registros
      allProductRecords.forEach((record, index) => {
        console.log(`🔍 [DocumentPrintOptimizer] Analisando registro ${index + 1}:`, record);
        
        if (record.BARRAS && typeof record.BARRAS === 'string' && record.BARRAS.trim() !== '') {
          barcodes.push(record.BARRAS.trim());
          console.log(`➕ [DocumentPrintOptimizer] Código adicionado do registro ${index + 1}: ${record.BARRAS.trim()}`);
        }
      });
    }
    
    // MÉTODO 3: Buscar usando getProductDetails (método antigo como fallback)
    if (barcodes.length === 0) {
      console.log(`🔍 [DocumentPrintOptimizer] Usando método fallback getProductDetails...`);
      const product = this.getProductDetails(coddv);
      
      if (product && product.BARRAS) {
        if (typeof product.BARRAS === 'string' && product.BARRAS.trim() !== '') {
          barcodes.push(product.BARRAS.trim());
          console.log(`➕ [DocumentPrintOptimizer] Código adicionado do produto: ${product.BARRAS.trim()}`);
        }
      }
    }
    
    // Remover duplicatas e valores vazios
    const uniqueBarcodes = [...new Set(barcodes.filter(barcode => {
      if (!barcode) return false;
      if (typeof barcode !== 'string') return false;
      if (barcode.trim() === '') return false;
      if (barcode.length < 3) return false; // Códigos muito curtos provavelmente são inválidos
      return true;
    }))];
    
    console.log(`📊 [DocumentPrintOptimizer] RESULTADO FINAL - CODDV ${coddv}:`);
    console.log(`   • Registros encontrados na base: ${typeof DATA_CADASTRO !== 'undefined' ? DATA_CADASTRO.filter(r => r && r.CODDV === coddv).length : 'N/A'}`);
    console.log(`   • Códigos brutos coletados: ${barcodes.length}`);
    console.log(`   • Códigos únicos válidos: ${uniqueBarcodes.length}`);
    console.log(`   • Códigos finais:`, uniqueBarcodes);
    
    if (uniqueBarcodes.length === 0) {
      console.warn(`⚠️ [DocumentPrintOptimizer] ATENÇÃO: Nenhum código de barras válido encontrado para CODDV ${coddv}`);
    } else if (uniqueBarcodes.length > 1) {
      console.log(`✅ [DocumentPrintOptimizer] SUCESSO: ${uniqueBarcodes.length} códigos de barras encontrados para CODDV ${coddv}`);
    }
    
    return uniqueBarcodes;
  }

  /**
   * Obtém endereços do produto
   */
  getAddresses(coddv, cd) {
    if (this.dataIndexer && typeof this.dataIndexer.getProductAddresses === 'function') {
      return this.dataIndexer.getProductAddresses(coddv, cd) || [];
    }
    return [];
  }

  /**
   * Obtém endereços excluídos
   */
  getExcludedAddresses(coddv, cd) {
    if (this.dataIndexer && typeof this.dataIndexer.getExcludedAddresses === 'function') {
      return this.dataIndexer.getExcludedAddresses(coddv, cd) || [];
    }
    return [];
  }

  /**
   * Calcula quantidade total baseada nos endereços
   */
  calculateTotalQuantity(addresses) {
    if (!addresses || addresses.length === 0) {
      return 0;
    }
    
    // Por enquanto, retorna o número de endereços
    // Pode ser expandido para calcular quantidades reais se disponível
    return addresses.length;
  }
}

// Exportar classes para uso global
if (typeof window !== 'undefined') {
  window.DocumentPrintOptimizer = DocumentPrintOptimizer;
  window.LayoutEngine = LayoutEngine;
  window.DataAggregator = DataAggregator;
}

// Exportar para Node.js se disponível
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DocumentPrintOptimizer: DocumentPrintOptimizer,
    LayoutEngine: LayoutEngine,
    DataAggregator: DataAggregator,
    DEFAULT_CONFIG: DEFAULT_CONFIG
  };
}
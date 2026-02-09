
/**
 * Validade Print Optimizer
 * Gerador de Relatório PDF estilo Inventário
 */

export class ValidadePrintOptimizer {
    constructor() {
        this.config = {
            logoPath: '../assets/pm.png',
            pageSize: 'A4',
            margins: '10mm',
            // A4 comporta mais linhas; 20 quebrava cedo e gerava páginas com muito vazio
            rowsPerPage: 36
        };
    }

    /**
     * Gera o HTML completo para impressão
     * @param {Array} dados Lista de registros
     * @param {Object} filtros { inicio, fim }
     */
    generatePrintDocument(dados, filtros) {
        const pages = this.paginateData(dados);
        const timestamp = new Date().toLocaleString('pt-BR');

        let html = `
            <!DOCTYPE html>
            <html lang="pt-br">
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Validades</title>
                ${this.getStyles()}
            </head>
            <body>
        `;

        pages.forEach((pageData, index) => {
            html += this.generatePage(pageData, index + 1, pages.length, filtros, timestamp);
        });

        html += '</body></html>';
        return html;
    }

    paginateData(dados) {
        const rowsPerPage = this.calculateRowsPerPage();
        const pages = [];
        for (let i = 0; i < dados.length; i += rowsPerPage) {
            pages.push(dados.slice(i, i + rowsPerPage));
        }
        return pages;
    }

    calculateRowsPerPage() {
        // Cálculo simples para evitar paginação conservadora demais.
        // Mantém faixa segura entre 30 e 40 linhas.
        const pageHeightMm = 296; // altura útil da página usada no CSS
        const pagePaddingMm = 20; // 10mm top + 10mm bottom
        const headerApproxMm = 38;
        const footerApproxMm = 30;
        const thApproxMm = 8;
        const rowApproxMm = 5.4;

        const usableMm = pageHeightMm - pagePaddingMm - headerApproxMm - footerApproxMm - thApproxMm;
        const estimated = Math.floor(usableMm / rowApproxMm);
        return Math.min(40, Math.max(30, estimated || this.config.rowsPerPage));
    }

    generatePage(rows, pageNum, totalPages, filtros, timestamp) {
        return `
            <div class="page">
                ${this.generateHeader(pageNum, totalPages, timestamp, filtros)}
                <div class="page-content">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th style="width: 10%">CODDV</th>
                                <th style="width: 35%">Descrição</th>
                                <th style="width: 12%">Validade</th>
                                <th style="width: 13%">Endereço</th>
                                <th style="width: 15%">Barras</th>
                                <th style="width: 15%">Etiqueta</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(row => this.generateRow(row)).join('')}
                        </tbody>
                    </table>
                </div>
                ${this.generateFooter()}
            </div>
        `;
    }

    generateHeader(pageNum, totalPages, timestamp, filtros) {
        // Formatar período para extenso (Dez/2023)
        const formatarPeriodoExtenso = (mmaa) => {
            if (!mmaa || mmaa.length !== 4) return mmaa || '-';
            const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const mesIndex = parseInt(mmaa.substring(0, 2)) - 1;
            const ano = mmaa.substring(2, 4);
            if (mesIndex >= 0 && mesIndex < 12) return `${meses[mesIndex]}/20${ano}`;
            return mmaa;
        };

        const iniFmt = formatarPeriodoExtenso(filtros.inicio);
        const fimFmt = formatarPeriodoExtenso(filtros.fim);

        const periodoTxt = `Período: ${iniFmt} a ${fimFmt}`;
        const depositoTxt = filtros.deposito ? `• ${filtros.deposito}` : '';

        return `
            <div class="page-header">
                <div class="header-logo">
                    <img src="${this.config.logoPath}" alt="Logo" class="page-logo" onerror="this.style.display='none'">
                </div>
                <div class="header-content">
                    <h1 class="page-title">RELATÓRIO DE VALIDADES</h1>
                    <div class="page-subtitle">Controle de Vencimentos ${depositoTxt} • ${periodoTxt}</div>
                    <div class="page-info">
                        <span class="page-number">Página ${pageNum} de ${totalPages}</span>
                        <span class="page-timestamp">${timestamp}</span>
                    </div>
                </div>
            </div>
        `;
    }

    generateRow(row) {
        // Formatar validade MMAA -> MM/YYYY (se possível)
        let validadeFmt = row.validade;
        if (row.validade && row.validade.length === 4) {
            validadeFmt = `${row.validade.substring(0, 2)}/20${row.validade.substring(2, 4)}`;
        }

        const desc = row.descricao_produto || row.DESC || 'Produto sem descrição';

        let barras = row.barras || row.BARRAS || '-';
        let etiqueta = row.etiqueta || '-';

        // CORREÇÃO: Se etiqueta tiver EAN (longo) e barras vazio, move para barras
        if (String(etiqueta).length > 6 && (barras === '-' || barras === '--')) {
            barras = etiqueta;
            etiqueta = '-';
        }

        return `
            <tr>
                <td class="text-center font-mono bold">${row.coddv}</td>
                <td class="text-left">${this.escapeHtml(desc)}</td>
                <td class="text-center font-mono bold validade-highlight">${validadeFmt}</td>
                <td class="text-center font-mono bold">${row.endereco}</td>
                <td class="text-center font-mono bold">${this.escapeHtml(barras)}</td>
                <td class="text-center font-mono bold">${this.escapeHtml(etiqueta)}</td>
            </tr>
        `;
    }

    generateFooter() {
        return `
            <div class="page-footer">
                <div class="footer-field">
                    <label>Conferido por:</label>
                    <div class="footer-line"></div>
                </div>
                <div class="footer-field">
                    <label>Data:</label>
                    <div class="footer-line"></div>
                </div>
                <div class="footer-info">
                    Hub Etiquetas • Pague Menos
                </div>
            </div>
        `;
    }

    getStatusIcon(validade) {
        // Lógica simples de status visual
        // Se precisar de logica complexa de data, importar do sistema
        return '';
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    getStyles() {
        return `
            <style>
                @page { size: A4; margin: 10mm; }
                * { box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #eee; margin: 0; padding: 0; }
                
                .page {
                    width: 210mm;
                    height: 296mm; /* A4 height aprox */
                    padding: 10mm;
                    background: white;
                    margin: 20px auto;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    display: flex;
                    flex-direction: column;
                    page-break-after: always;
                    position: relative;
                }
                
                @media print {
                    body { background: white; }
                    .page { margin: 0; box-shadow: none; page-break-after: always; height: auto; min-height: 290mm;}
                }

                /* Header (Copiado/Adaptado do Inventario) */
                .page-header {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    border-bottom: 2px solid #0b3a88;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                
                .page-logo { height: 100px; width: auto; }
                .header-content { flex: 1; text-align: center; }
                
                .page-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #0b3a88;
                    margin: 0;
                    text-transform: uppercase;
                }
                
                .page-subtitle {
                    font-size: 14px;
                    color: #64748b;
                    margin: 4px 0;
                }
                
                .page-info {
                    font-size: 10px;
                    color: #64748b;
                    display: flex;
                    justify-content: space-between;
                    margin-top: 5px;
                    border-top: 1px dashed #ccc;
                    padding-top: 2px;
                }

                /* Content */
                .page-content { flex: 1; }

                /* Table */
                .report-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                }
                
                .report-table th {
                    background: #f1f5f9;
                    color: #0b3a88;
                    font-weight: bold;
                    padding: 8px 4px;
                    border: 1px solid #cbd5e1;
                    text-transform: uppercase;
                }
                
                .report-table td {
                    border: 1px solid #e2e8f0;
                    padding: 6px 4px;
                    vertical-align: middle;
                }
                
                .report-table tr:nth-child(even) { background: #f8fafc; }

                /* Utils */
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .font-mono { font-family: 'Courier New', monospace; }
                .bold { font-weight: 700; }
                .small { font-size: 9px; color: #64748b; }
                .validade-highlight { color: #dc2626; font-size: 12px; }

                /* Footer */
                .page-footer {
                    margin-top: auto;
                    padding-top: 15px;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    gap: 20px;
                }
                
                .footer-field {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                
                .footer-field label { font-size: 10px; font-weight: bold; color: #0b3a88; }
                .footer-line { border-bottom: 1px solid #0b3a88; height: 20px; }
                
                .footer-info {
                    position: absolute;
                    bottom: 10mm;
                    right: 10mm;
                    font-size: 9px;
                    color: #ccc;
                }
            </style>
        `;
    }
}

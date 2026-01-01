/**
 * CD Names Mapper - Sistema de mapeamento de Centros de Distribuição
 * Mapeia códigos numéricos para nomes completos dos depósitos
 */

// Mapeamento central dos CDs
const CD_NAMES_MAP = {
  '1': 'CD01 - Fortaleza/CE',
  '2': 'CD02 - Hidrolândia/GO', 
  '3': 'CD03 - Jaboatão/PE',
  '4': 'CD04 - Simões Filho/BA',
  '5': 'CD05 - Contagem/MG',
  '6': 'CD06 - Benevides/PA',
  '7': 'CD07 - São Luís/MA',
  '8': 'CD08 - Guarulhos/SP',
  '9': 'CD09 - Aquiraz/CE'
};

/**
 * Obtém o nome completo de exibição para um código de CD
 * @param {string|number} cdCode - Código do CD (1-9)
 * @returns {string} Nome completo formatado ou valor padrão
 */
function getCDDisplayName(cdCode) {
  if (!cdCode) {
    console.warn('⚠️ [CDMapper] Código de CD não fornecido');
    return '--';
  }
  
  const normalizedCode = String(cdCode).trim();
  
  if (CD_NAMES_MAP[normalizedCode]) {
    return CD_NAMES_MAP[normalizedCode];
  }
  
  console.warn(`⚠️ [CDMapper] Código de CD não mapeado: ${normalizedCode}`);
  return `CD${normalizedCode.padStart(2, '0')} - Desconhecido`;
}

/**
 * Extrai o código numérico de um nome de exibição
 * @param {string} displayName - Nome de exibição completo
 * @returns {string|null} Código numérico ou null se inválido
 */
function getCDCodeFromDisplay(displayName) {
  if (!displayName || typeof displayName !== 'string') {
    return null;
  }
  
  // Buscar no mapeamento reverso
  for (const [code, name] of Object.entries(CD_NAMES_MAP)) {
    if (name === displayName) {
      return code;
    }
  }
  
  // Tentar extrair código do formato "CD0X - ..."
  const match = displayName.match(/^CD0?(\d+)/);
  if (match) {
    const extractedCode = match[1];
    if (CD_NAMES_MAP[extractedCode]) {
      return extractedCode;
    }
  }
  
  console.warn(`⚠️ [CDMapper] Nome de exibição não reconhecido: ${displayName}`);
  return null;
}

/**
 * Verifica se um código de CD é válido
 * @param {string|number} cdCode - Código do CD
 * @returns {boolean} True se válido
 */
function isValidCDCode(cdCode) {
  if (!cdCode) return false;
  const normalizedCode = String(cdCode).trim();
  return CD_NAMES_MAP.hasOwnProperty(normalizedCode);
}

/**
 * Obtém todos os CDs disponíveis
 * @returns {Array} Array de objetos com code e displayName
 */
function getAllCDs() {
  return Object.entries(CD_NAMES_MAP).map(([code, displayName]) => ({
    code: code,
    displayName: displayName,
    shortCode: `CD${code.padStart(2, '0')}`,
    city: displayName.split(' - ')[1]?.split('/')[0] || 'Desconhecido',
    state: displayName.split('/')[1] || 'XX'
  }));
}

/**
 * Obtém informações detalhadas de um CD
 * @param {string|number} cdCode - Código do CD
 * @returns {Object|null} Objeto com informações detalhadas ou null
 */
function getCDInfo(cdCode) {
  if (!isValidCDCode(cdCode)) {
    return null;
  }
  
  const normalizedCode = String(cdCode).trim();
  const displayName = CD_NAMES_MAP[normalizedCode];
  const parts = displayName.split(' - ');
  const locationParts = parts[1]?.split('/') || [];
  
  return {
    code: normalizedCode,
    displayName: displayName,
    shortCode: parts[0] || `CD${normalizedCode.padStart(2, '0')}`,
    city: locationParts[0] || 'Desconhecido',
    state: locationParts[1] || 'XX',
    fullLocation: parts[1] || 'Desconhecido'
  };
}

/**
 * Formata o nome do CD para uso em relatórios
 * @param {string|number} cdCode - Código do CD
 * @returns {string} Nome formatado para relatórios
 */
function getCDReportName(cdCode) {
  const info = getCDInfo(cdCode);
  if (!info) {
    return `Centro de Distribuição ${cdCode || 'Desconhecido'}`;
  }
  
  return `Centro de Distribuição ${info.displayName}`;
}

// Exportar para uso em outros módulos
if (typeof window !== 'undefined') {
  window.CDMapper = {
    getCDDisplayName,
    getCDCodeFromDisplay,
    isValidCDCode,
    getAllCDs,
    getCDInfo,
    getCDReportName,
    CD_NAMES_MAP
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCDDisplayName,
    getCDCodeFromDisplay,
    isValidCDCode,
    getAllCDs,
    getCDInfo,
    getCDReportName,
    CD_NAMES_MAP
  };
}

console.log('✅ [CDMapper] Sistema de mapeamento de CDs carregado com', Object.keys(CD_NAMES_MAP).length, 'depósitos');
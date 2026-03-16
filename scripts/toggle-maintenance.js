const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'shared', 'maintenance-config.js');
const action = (process.argv[2] || '').toLowerCase();

function readConfig() {
  return fs.readFileSync(configPath, 'utf8');
}

function getCurrentStatus(content) {
  const match = content.match(/enabled:\s*(true|false)/);
  if (!match) {
    throw new Error('Nao foi possivel localizar "enabled" em shared/maintenance-config.js');
  }

  return match[1] === 'true';
}

function writeStatus(nextStatus) {
  const content = readConfig();
  const updated = content.replace(/enabled:\s*(true|false)/, `enabled: ${nextStatus}`);

  if (content === updated) {
    throw new Error('Nenhuma alteracao foi aplicada no arquivo de configuracao.');
  }

  fs.writeFileSync(configPath, updated, 'utf8');
  console.log(`Maintenance ${nextStatus ? 'ON' : 'OFF'}`);
}

function printStatus() {
  const current = getCurrentStatus(readConfig());
  console.log(`Maintenance is ${current ? 'ON' : 'OFF'}`);
}

if (!['on', 'off', 'status'].includes(action)) {
  console.error('Uso: node scripts/toggle-maintenance.js <on|off|status>');
  process.exit(1);
}

if (action === 'status') {
  printStatus();
  process.exit(0);
}

writeStatus(action === 'on');

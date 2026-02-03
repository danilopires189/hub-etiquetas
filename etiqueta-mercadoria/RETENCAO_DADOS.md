# ⏱️ Tempo de Retenção dos Dados

## 📍 Onde os dados são salvos?

### 1. **IndexedDB** (Principal)
- **Capacidade:** ~50MB a 250MB
- **Persistência:** **PERMANENTE** (não expira)
- **Local:** Navegador do computador
- **Duração:** Enquanto o usuário não limpar os dados do navegador

### 2. **localStorage** (Backup)
- **Capacidade:** ~5MB
- **Persistência:** **PERMANENTE**
- **Limitação:** Apenas últimos 100 registros

---

## 🗓️ Quanto tempo ficam salvos?

| Tipo | Tempo | Limite |
|------|-------|--------|
| **IndexedDB** | **PARA SEMPRE** (até limpar navegador) | ~250MB |
| **localStorage** | **PARA SEMPRE** (até limpar navegador) | 100 registros |
| **Memória (RAM)** | Apenas enquanto página está aberta | Ilimitado |

---

## ⚠️ Quando os dados SÃO APAGADOS?

Os dados são perdidos apenas se:

1. **Usuário limpar dados do navegador** (Ctrl+Shift+Del)
2. **Limpar cache e cookies**
3. **Reinstalar o navegador**
4. **Trocar de computador**
5. **Usar modo anônimo/privado**

---

## 💾 Configurações de Retenção

### Padrão atual:
```javascript
// IndexedDB: Mantém TUDO (até encher ~250MB)
// localStorage: Mantém últimos 100 registros
// Filtro de 60 dias: Remove registros antigos da visualização
```

### Para limitar a quantidade (ex: manter apenas 90 dias):

**Opção 1 - Manual (quando quiser limpar):**
```javascript
// No console (F12), execute:
await window.storageManager.idb.cleanupHistory(90);
// Remove registros com mais de 90 dias
```

**Opção 2 - Automático (a cada abertura):**
O sistema já filtra automaticamente na visualização (últimos 60 dias), mas **mantém todos no IndexedDB**.

---

## 📊 Quanto tempo dura o espaço?

| Uso | Tempo estimado |
|-----|---------------|
| 100 etiquetas/dia | ~5 anos para encher 250MB |
| 500 etiquetas/dia | ~1 ano para encher 250MB |
| 1000 etiquetas/dia | ~6 meses para encher 250MB |

---

## 🔒 Backup Recomendado

### Exportar mensalmente:
1. Abra o **Histórico**
2. Clique em **"📥 Exportar CSV"**
3. Salve o arquivo em local seguro

### Ou configure backup automático:
Adicione no `app.js` para exportar automaticamente a cada mês.

---

## ✅ Resposta Direta

> **"Os dados ficam salvos para sempre, até o usuário limpar o navegador ou o computador trocar."**

**Não há data de expiração automática.** O IndexedDB mantém os dados permanentemente no disco do computador.

# 🚀 Configuração Rápida: Anexos via Google Apps Script

**Tempo estimado: 5 minutos** | **Custo: R$ 0** | **Sem cartão de crédito**

---

## 📋 Passo a Passo

### 1️⃣ Criar pasta no Google Drive

1. Acesse [drive.google.com](https://drive.google.com)
2. Clique em **Novo** → **Nova pasta**
3. Nome: `Blog URE Marília - Anexos`
4. Abra a pasta e copie o **ID da URL**:
   ```
   https://drive.google.com/drive/folders/1ABC123xyzDef456
                                                ^^^^^^^^^^^^^^^
                                                Este é o ID
   ```

---

### 2️⃣ Criar Google Apps Script

1. Acesse [script.google.com](https://script.google.com)
2. Clique em **Novo projeto**
3. Apague o código existente
4. Cole o código de `scripts/google-apps-script.js` (está neste repositório)
5. **Substitua** a linha:
   ```javascript
   const PASTA_ID = 'COLE_AQUI_O_ID_DA_PASTA';
   ```
   pelo ID que você copiou no passo anterior:
   ```javascript
   const PASTA_ID = '1ABC123xyzDef456';
   ```
6. Clique em **Salvar** (ícone 💾)
7. Dê um nome ao projeto (ex: "Upload Anexos Blog")

---

### 3️⃣ Fazer Deploy como Web App

1. Clique em **Implantar** (canto superior direito)
2. Clique em **Nova implantação**
3. Clique na engrenagem ⚙️ e selecione **App da Web**
4. Preencha:
   - **Descrição**: `Upload de anexos`
   - **Executar como**: `Eu`
   - **Quem tem acesso**: `Qualquer pessoa`
5. Clique em **Implantar**
6. **Copie a URL gerada**:
   ```
   https://script.google.com/macros/s/AKfycbz.../exec
   ```

---

### 4️⃣ Colar URL no Admin do Blog

Edite o arquivo `src/admin/index.njk` e localize esta linha (por volta da linha 460):

```javascript
var APPS_SCRIPT_URL = "";
```

Cole a URL do Apps Script:

```javascript
var APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz.../exec";
```

**Commit e push:**
```bash
git add src/admin/index.njk
git commit -m "config: adiciona URL do Google Apps Script para anexos"
git push origin main
```

---

### 5️⃣ Testar!

1. Acesse `/admin/index.html` no seu blog
2. Faça login como admin
3. Crie ou edite uma postagem
4. Clique em **📎 Adicionar arquivo**
5. Selecione um arquivo (PDF, DOC, imagem, etc.)
6. Aguarde o upload (barra de progresso)
7. Salve a postagem
8. Visualize o post público — os anexos aparecem na seção "📎 Anexos"

---

## ✅ Pronto!

Agora qualquer admin pode anexar arquivos nos posts e eles ficam públicos automaticamente no Google Drive.

---

## 📊 Limites Gratuitos

| Recurso | Limite |
|---------|--------|
| Armazenamento | 15 GB (compartilhado com Gmail/Drive) |
| Requisições/dia | ~20.000 |
| Tamanho máx. arquivo | 50 MB (limitado no código) |
| Execuções simultâneas | ~10 |

---

## 🔧 Troubleshooting

### Erro "URL do Apps Script não configurada"
- Verifique se a variável `APPS_SCRIPT_URL` foi preenchida em `src/admin/index.njk`
- Faça commit e push das alterações

### Erro "Nenhum arquivo recebido"
- Verifique se o deploy foi feito como **App da Web**
- Confirme que "Quem tem acesso" está como **Qualquer pessoa**

### Erro "Não é possível encontrar a pasta"
- Verifique se o `PASTA_ID` no Apps Script está correto
- Confirme que a pasta existe no seu Google Drive

### Upload lento
- Arquivos grandes (>10MB) podem demorar alguns segundos
- O Apps Script tem limite de 6 minutos por execução

---

## 📝 Resumo

```
1. Criar pasta no Drive → Copiar ID
2. Apps Script → Colar código → Substituir PASTA_ID
3. Deploy como Web App → Copiar URL
4. Admin (src/admin/index.njk) → Colar URL em APPS_SCRIPT_URL
5. Testar!
```

**Total: 5 minutos, R$ 0, sem cartão de crédito!** 🎉

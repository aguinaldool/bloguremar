/**
 * Google Apps Script - Upload de Anexos para Google Drive
 * 
 * COMO USAR:
 * 1. Acesse https://script.google.com
 * 2. Clique em "Novo projeto"
 * 3. Cole este código
 * 4. Clique em "Implantar" > "Nova implantação"
 * 5. Tipo: "App da Web"
 * 6. Executar como: "Eu"
 * 7. Quem tem acesso: "Qualquer pessoa"
 * 8. Copie a URL gerada
 * 9. Cole no admin do blog (variável EDGE_FUNCTION_URL)
 */

// ID da pasta no Google Drive onde os anexos serão salvos
// Crie uma pasta no Drive e copie o ID da URL
// Exemplo: https://drive.google.com/drive/folders/1ABC123xyz
// O ID é: 1ABC123xyz
const PASTA_ID = 'COLE_AQUI_O_ID_DA_PASTA';

/**
 * Processa POST requests com upload de arquivo
 */
function doPost(e) {
  try {
    // Verifica se há arquivo
    if (!e.postData || !e.postData.contents) {
      return jsonResponse({ error: 'Nenhum arquivo recebido' }, 400);
    }

    // Parse do arquivo recebido (formato base64 do admin)
    const data = JSON.parse(e.postData.contents);
    
    if (!data.file || !data.fileName) {
      return jsonResponse({ error: 'Dados do arquivo inválidos' }, 400);
    }

    // Decodifica o arquivo base64
    const fileBytes = Utilities.base64Decode(data.file);
    const blob = Utilities.newBlob(fileBytes, data.fileType || 'application/octet-stream', data.fileName);

    // Obtém a pasta de destino
    const pasta = DriveApp.getFolderById(PASTA_ID);

    // Salva o arquivo no Drive
    const arquivo = pasta.createFile(blob);

    // Define permissão pública (qualquer pessoa com o link pode visualizar)
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Monta URL pública de download
    const fileId = arquivo.getId();
    const urlPublica = 'https://drive.google.com/uc?export=download&id=' + fileId;

    // Retorna dados do arquivo
    return jsonResponse({
      success: true,
      anexo: {
        id: fileId,
        nome: data.fileName,
        tamanho: data.fileSize || arquivo.getSize(),
        tipo: data.fileType || arquivo.getMimeType(),
        url: urlPublica,
        driveId: fileId
      }
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    return jsonResponse({ 
      error: 'Erro ao processar arquivo', 
      details: error.toString() 
    }, 500);
  }
}

/**
 * Processa GET requests (para teste)
 */
function doGet(e) {
  return jsonResponse({ 
    status: 'ok', 
    message: 'Upload de anexos ativo',
    pastaId: PASTA_ID
  });
}

/**
 * Helper para retornar JSON
 */
function jsonResponse(data, status) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

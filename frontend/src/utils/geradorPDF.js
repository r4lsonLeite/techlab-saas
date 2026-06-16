import { API_BASE_URL } from '../services/api';

// ============================================================================
// 1. GERADOR DO PDF A4 (ORDEM DE SERVIÇO COMPLETA E DETALHADA)
// ============================================================================
export const gerarOrcamentoPDF = (configLoja, osAtiva, pecasNegociacao, valorDigitado, telefoneTela) => {
  const win = window.open('', '_blank');
  
  // Tratamento da Imagem da Logo e Dados da Loja
  const urlLogo = configLoja?.logo_url ? 
    (configLoja.logo_url.startsWith('http') ? configLoja.logo_url : `${API_BASE_URL}${configLoja.logo_url}`) 
    : null;
    
  const nomeLoja = configLoja?.nome || 'Assistência Técnica';
  const cnpjLoja = configLoja?.cnpj ? `CNPJ: ${configLoja.cnpj}` : '';
  const telLoja = configLoja?.telefone ? `Tel: ${configLoja.telefone}` : '';
  const endLoja = configLoja?.endereco || '';
  const termosGarantia = configLoja?.termos_garantia || '1. O prazo de garantia para serviços é de 90 dias.\n2. A garantia não cobre mau uso, quedas ou contato com líquidos.\n3. Aparelhos não retirados em 90 dias poderão ser vendidos para custear o serviço.';

  const telefoneCliente = telefoneTela || 'Não informado';
  const dataEntrada = osAtiva.data_entrada ? new Date(osAtiva.data_entrada).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

  // Construção da Tabela de Peças
  let linhasTabela = '';
  if (pecasNegociacao && pecasNegociacao.length > 0) {
    pecasNegociacao.forEach(p => {
      const sub = p.quantidade * p.preco_unitario;
      linhasTabela += `
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; font-weight:bold; text-align:center;">${p.quantidade}x</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${p.nome_produto}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right;">R$ ${Number(p.preco_unitario).toFixed(2)}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:bold;">R$ ${sub.toFixed(2)}</td>
        </tr>`;
    });
  } else {
    linhasTabela = `<tr><td colspan="4" style="padding:8px; text-align:center; color:#64748b;">Nenhum item lançado no orçamento ainda.</td></tr>`;
  }

  const valorFinalFormatado = Number(valorDigitado || 0).toFixed(2);

  const html = `
    <html>
      <head>
        <title>Ordem de Serviço #${osAtiva.id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px 40px; color: #1e293b; max-width: 900px; margin: auto; font-size: 14px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 20px; }
          .header-info { text-align: center; flex: 1; padding: 0 20px; }
          .header-info h2 { margin: 0 0 5px 0; color: #0f172a; font-size: 20px; }
          .header-info p { margin: 2px 0; font-size: 12px; color: #475569; }
          .header-os { text-align: right; min-width: 150px; }
          .header-os h1 { margin: 0; color: #3b82f6; font-size: 24px; }
          .header-os p { margin: 5px 0 0 0; font-weight: bold; color: #64748b; }
          
          .section { margin-bottom: 20px; }
          .section-title { font-size: 14px; font-weight: bold; background: #e2e8f0; padding: 6px 12px; margin-bottom: 10px; color: #334155; border-radius: 4px; text-transform: uppercase; }
          
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
          .data-box { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; }
          .data-box p { margin: 4px 0; }
          .label { font-weight: bold; color: #475569; font-size: 12px; }
          .value { font-weight: bold; color: #0f172a; }

          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th { background-color: #f8fafc; padding: 10px 8px; border-bottom: 2px solid #cbd5e1; color: #475569; text-align: left; }
          
          .total-box { margin-top: 20px; text-align: right; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; }
          .total-box h2 { margin: 0; color: #10b981; font-size: 26px; }
          
          .termos { font-size: 11px; color: #64748b; margin-top: 30px; text-align: justify; padding: 15px; border: 1px dashed #cbd5e1; background: #f8fafc; }
          .assinaturas { display: flex; justify-content: space-between; margin-top: 50px; }
          .assinatura-box { text-align: center; width: 45%; }
          .linha-assinatura { border-top: 1px solid #000; margin-bottom: 5px; }
          
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        
        <div class="header">
          <div style="width: 200px;">
            ${urlLogo ? `<img src="${urlLogo}" id="logoLoja" style="max-width: 100%; max-height: 80px; object-fit: contain;" />` : ''}
          </div>
          <div class="header-info">
            <h2>${nomeLoja}</h2>
            ${cnpjLoja ? `<p>${cnpjLoja}</p>` : ''}
            ${endLoja ? `<p>${endLoja}</p>` : ''}
            ${telLoja ? `<p>${telLoja}</p>` : ''}
          </div>
          <div class="header-os">
            <h1>OS #${osAtiva.id}</h1>
            <p>Data: ${dataEntrada}</p>
          </div>
        </div>
        
        <div class="grid-2 section">
          <div class="data-box">
            <div class="section-title" style="margin: -10px -10px 10px -10px;">👤 DADOS DO CLIENTE</div>
            <p><span class="label">Nome:</span> <span class="value">${osAtiva.cliente_nome}</span></p>
            <p><span class="label">Telefone:</span> <span class="value">${telefoneCliente}</span></p>
          </div>
          <div class="data-box">
            <div class="section-title" style="margin: -10px -10px 10px -10px;">📱 DADOS DO APARELHO</div>
            <p><span class="label">Aparelho:</span> <span class="value">${osAtiva.marca} ${osAtiva.modelo}</span></p>
            <p><span class="label">IMEI/Série:</span> <span class="value">${osAtiva.imei || 'Não informado'}</span></p>
            <p><span class="label">Senha:</span> <span class="value">${osAtiva.senha_aparelho || 'Sem senha'}</span></p>
          </div>
        </div>

        <div class="section data-box">
          <div class="section-title" style="margin: -10px -10px 10px -10px;">⚠️ RELATO E CONDIÇÕES DE ENTRADA</div>
          <p style="margin-bottom: 10px;"><span class="label">Defeito Relatado:</span> <br/>${osAtiva.defeito || 'Nenhum defeito detalhado.'}</p>
          <div class="grid-2" style="margin-top:10px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
            <p><span class="label">Acessórios Deixados:</span> <br/>${osAtiva.acessorios || 'Nenhum acessório.'}</p>
            <p><span class="label">Checklist / Avarias:</span> <br/>${osAtiva.checklist || 'Sem avarias visíveis registradas.'}</p>
          </div>
        </div>

        ${osAtiva.laudo_tecnico ? `
          <div class="section data-box" style="border-color: #3b82f6; background-color: #eff6ff;">
            <div class="section-title" style="margin: -10px -10px 10px -10px; background-color: #bfdbfe; color: #1e3a8a;">👨‍🔧 LAUDO TÉCNICO</div>
            <p>${osAtiva.laudo_tecnico}</p>
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">🔧 ORÇAMENTO - PEÇAS E SERVIÇOS</div>
          <table>
            <thead>
              <tr>
                <th style="width: 10%; text-align:center;">Qtd</th>
                <th style="width: 50%;">Descrição do Serviço/Peça</th>
                <th style="width: 20%; text-align:right;">V. Unitário</th>
                <th style="width: 20%; text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${linhasTabela}
            </tbody>
          </table>
          
          <div class="total-box">
            <span style="font-weight: bold; color: #64748b; font-size: 16px;">VALOR TOTAL DO SERVIÇO:</span><br/>
            <h2>R$ ${valorFinalFormatado}</h2>
          </div>
        </div>
        
        <div class="termos">
          <strong style="color: #334155; font-size: 12px;">TERMOS DE GARANTIA E CONDIÇÕES:</strong><br/>
          ${termosGarantia.replace(/\n/g, '<br/>')}
        </div>

        <div class="assinaturas">
          <div class="assinatura-box">
            <div class="linha-assinatura"></div>
            <strong>${nomeLoja}</strong><br/>
            <span style="font-size: 11px; color: #64748b;">Assinatura do Técnico/Responsável</span>
          </div>
          <div class="assinatura-box">
            <div class="linha-assinatura"></div>
            <strong>${osAtiva.cliente_nome}</strong><br/>
            <span style="font-size: 11px; color: #64748b;">Assinatura do Cliente / Ciente</span>
          </div>
        </div>

        <script>
          window.onload = function() {
            var logo = document.getElementById('logoLoja');
            if (logo) {
              logo.onload = function() { window.print(); }
              // Fallback caso a imagem dê erro ou demore muito
              setTimeout(function(){ window.print(); }, 800);
            } else {
              window.print();
            }
          };
        </script>
      </body>
    </html>
  `;
  win.document.write(html);
  win.document.close();
};


// ============================================================================
// 2. CUPOM TÉRMICO (TALÃO) - COM DUAS VIAS (CLIENTE E LOJA) E LINHA DE CORTE
// ============================================================================
export const imprimirComprovanteOS = (configLoja, dadosOs) => {
  const win = window.open('', '_blank');
  const idOs = dadosOs.id;
  const nomeLoja = configLoja?.nome || 'Assistência Técnica';
  const telLoja = configLoja?.telefone ? `Tel: ${configLoja.telefone}` : '';
  const dataEntrada = dadosOs.data_entrada ? new Date(dadosOs.data_entrada).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
  const valorCobrado = Number(dadosOs.valor_orcamento || 0).toFixed(2);

  // Layout comum para ambas as vias para evitar repetição
  const gerarVia = (tituloVia, isViaLoja = false) => `
    <div style="margin-bottom: 20px;">
      <div class="center">
        <h2 style="margin:0; padding:0; font-size:16px;">${nomeLoja}</h2>
        ${telLoja ? `<p style="margin:2px 0;">${telLoja}</p>` : ''}
        <p style="margin:2px 0; font-weight:bold;">${tituloVia}</p>
      </div>
      
      <div class="center bold" style="font-size: 16px; margin: 10px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0;">
        ORDEM DE SERVIÇO #${idOs}
      </div>
      
      <p style="margin:2px 0;"><b>Data:</b> ${dataEntrada}</p>
      <p style="margin:2px 0;"><b>Cliente:</b> ${dadosOs.cliente_nome || '---'}</p>
      <p style="margin:2px 0;"><b>Telefone:</b> ${dadosOs.cliente_telefone || dadosOs.telefone || '---'}</p>
      <hr style="border-top: 1px dashed #000; border-bottom: none; margin: 5px 0;">
      <p style="margin:2px 0;"><b>Aparelho:</b> ${dadosOs.marca} ${dadosOs.modelo}</p>
      ${dadosOs.senha_aparelho ? `<p style="margin:2px 0;"><b>Senha:</b> ${dadosOs.senha_aparelho}</p>` : ''}
      <p style="margin:5px 0 2px 0;"><b>Defeito Relatado:</b></p>
      <p style="margin:0 0 5px 0; font-size: 11px;">${dadosOs.defeito || '---'}</p>
      
      <div style="margin-top:10px; border-top: 1px dashed #000; padding-top: 5px;">
        <p style="margin:2px 0; text-align:right; font-size:14px;"><b>Total: R$ ${valorCobrado}</b></p>
      </div>

      ${isViaLoja ? `
        <div style="margin-top: 30px; text-align:center;">
          <div style="border-top: 1px solid #000; width: 80%; margin: 0 auto;"></div>
          <p style="margin:2px 0; font-size:10px;">Assinatura do Cliente</p>
        </div>
      ` : `
        <p style="text-align:justify; font-size: 10px; margin-top:10px;">Aparelhos não retirados em 90 dias poderão ser descartados/vendidos. Garantia balcão: 90 dias sobre o serviço prestado.</p>
      `}
    </div>
  `;

  const htmlRecibo = `
    <html>
      <head>
        <title>Cupom OS #${idOs}</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            padding: 10px; 
            font-size: 12px; 
            max-width: 300px; /* Largura padrão de impressora 80mm */
            margin: 0 auto;
            color: #000;
          } 
          .center { text-align: center; } 
          .bold { font-weight: bold; }
          .tesoura { text-align: center; font-size: 14px; margin: 20px 0; border-bottom: 1px dashed #000; line-height: 0.1em; }
          .tesoura span { background: #fff; padding: 0 10px; }
        </style>
      </head>
      <body>
        
        ${gerarVia("VIA DO CLIENTE", false)}

        <div class="tesoura"><span>✂️</span></div>

        ${gerarVia("VIA DA LOJA (Controle Interno)", true)}

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          }
        </script>
      </body>
    </html>
  `;
  win.document.write(htmlRecibo); 
  win.document.close(); 
};
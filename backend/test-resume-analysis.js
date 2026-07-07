#!/usr/bin/env node

/**
 * Test Script - Resume Analysis API
 * Testa o endpoint POST /api/resumes/:id/analyze
 * 
 * Uso: node backend/test-resume-analysis.js <resumeId> <authToken>
 * Exemplo: node backend/test-resume-analysis.js "550e8400-e29b-41d4-a716-446655440000" "eyJhbG..."
 */

const https = require('https');
const http = require('http');
const url = require('url');

const API_BASE = process.env.API_URL || 'http://localhost:3001';
const resumeId = process.argv[2];
const authToken = process.argv[3];

if (!resumeId || !authToken) {
  console.error('❌ Uso: node backend/test-resume-analysis.js <resumeId> <authToken>');
  console.error('Exemplo: node backend/test-resume-analysis.js "550e8400-e29b-41d4-a716-446655440000" "eyJhbG..."');
  process.exit(1);
}

function makeRequest(urlStr, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new url.URL(urlStr);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method,
      headers: options.headers
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, statusText: res.statusMessage, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, statusText: res.statusMessage, data: { raw: data } });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function testAnalysis() {
  console.log(`🚀 Testando análise de currículo...`);
  console.log(`📝 Resume ID: ${resumeId}`);
  console.log(`🔐 Token: ${authToken.substring(0, 20)}...`);
  console.log(`📡 URL: POST ${API_BASE}/api/resumes/${resumeId}/analyze`);
  console.log('---\n');

  try {
    console.log('⏳ Enviando requisição...');
    const startTime = Date.now();

    const response = await makeRequest(
      `${API_BASE}/api/resumes/${resumeId}/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      },
      '{}'
    );

    const duration = Date.now() - startTime;

    console.log(`✅ Resposta recebida em ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    if (response.status !== 200) {
      console.error('❌ Erro na resposta:');
      console.error(JSON.stringify(response.data, null, 2));
      process.exit(1);
    }

    const data = response.data;

    console.log('✨ Análise Completa:\n');
    console.log('📈 Scores:');
    console.log(`   • Geral: ${data.analysis?.score || data.score}/100`);
    console.log(`   • Completude: ${data.analysis?.completeness_score || 'N/A'}/100`);
    console.log(`   • Qualidade: ${data.analysis?.quality_score || 'N/A'}/100`);
    console.log(`   • Relevância: ${data.analysis?.relevance_score || 'N/A'}/100`);
    console.log(`   • Impacto: ${data.analysis?.impact_score || 'N/A'}/100\n`);

    console.log('📝 Resumo:');
    console.log(`   ${data.analysis?.summary || data.summary || 'N/A'}\n`);

    if (data.analysis?.suggestions?.length > 0) {
      console.log(`💡 Sugestões (${data.analysis.suggestions.length}):`);
      data.analysis.suggestions.slice(0, 5).forEach((s, i) => {
        console.log(`   ${i + 1}. [${s.priority.toUpperCase()}] ${s.title}`);
        console.log(`      ${s.description}`);
      });
      if (data.analysis.suggestions.length > 5) {
        console.log(`   ... e mais ${data.analysis.suggestions.length - 5} sugestões\n`);
      } else {
        console.log('');
      }
    }

    if (data.analysis?.key_strengths?.length > 0) {
      console.log(`✅ Pontos Fortes:`);
      data.analysis.key_strengths.slice(0, 3).forEach(s => {
        console.log(`   • ${s}`);
      });
      console.log('');
    }

    if (data.analysis?.keywords_suggested?.length > 0) {
      console.log(`🔑 Keywords Sugeridas:`);
      console.log(`   ${data.analysis.keywords_suggested.slice(0, 10).join(', ')}`);
      if (data.analysis.keywords_suggested.length > 10) {
        console.log(`   ... e mais ${data.analysis.keywords_suggested.length - 10}`);
      }
      console.log('');
    }

    console.log('✅ Teste concluído com sucesso!\n');
    console.log('📊 Dados completos:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Erro ao conectar:');
    console.error(`   ${error.message}`);
    console.error('\n💡 Verifique:');
    console.error('   • O servidor está rodando em ' + API_BASE + '?');
    console.error('   • O token é válido?');
    console.error('   • O resumeId existe?');
    console.error('   • OPENAI_API_KEY está configurada no .env?');
    process.exit(1);
  }
}

testAnalysis();

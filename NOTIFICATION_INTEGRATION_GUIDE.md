/**
 * GUIA DE INTEGRAÇÃO: Notificações com Job Alerts
 * 
 * Este arquivo explica como integrar o serviço de notificações com o jobAlerts.js
 * 
 * LOCALIZAÇÃO DOS ARQUIVOS:
 * - Frontend: src/lib/jobAlerts.js
 * - Backend: backend/routes/jobAlerts.js
 * 
 * INTEGRAÇÃO NECESSÁRIA:
 * Quando o jobAlerts encontra novas vagas com matching alto, disparar notificação
 */

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTAÇÃO NO BACKEND: backend/routes/jobAlerts.js
// ═══════════════════════════════════════════════════════════════════════════

/*
ADICIONAR NO INÍCIO DO ARQUIVO:
```javascript
import { notifyNewJobAlert } from '../services/notificationService.js';
```

MODIFICAR O ENDPOINT QUE ENCONTRA NOVAS VAGAS:
```javascript
// Após encontrar novas vagas com matching alto
const newJobs = [...]; // vagas encontradas

// Para cada vaga encontrada, enviar notificação
for (const job of newJobs) {
  // Calcular matching score
  const matchingScore = calculateMatching(alertFilters, job);
  
  if (matchingScore >= 75) { // Apenas se matching > 75%
    // Buscar dados do candidato
    const candidateResult = await pool.query(
      'SELECT id, name, email, phone, consent_privacy_policy, consent_whatsapp FROM users WHERE id = $1',
      [userId]
    );
    
    if (candidateResult.rows.length > 0) {
      const candidate = candidateResult.rows[0];
      
      // Enviar notificação
      await notifyNewJobAlert({
        candidateEmail: candidate.email,
        candidateName: candidate.name,
        jobTitle: job.title,
        companyName: job.company_name,
        matchingScore: Math.round(matchingScore),
        user: candidate,
        jobUrl: `${process.env.FRONTEND_URL}/jobs/${job.id}`,
      });
    }
  }
}
```

EXEMPLO COMPLETO DE ROTA:
```javascript
// GET /api/job-alerts/:id/trigger (simular busca manual)
router.get('/:id/trigger', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // 1. Obter alert preferences
    const alertResult = await pool.query(
      'SELECT * FROM job_alerts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (alertResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }
    
    const alert = alertResult.rows[0];
    
    // 2. Buscar vagas que combinam com os filtros
    const jobsResult = await pool.query(`
      SELECT j.id, j.title, j.company_id, c.name as company_name, j.location, j.contract_type,
             j.experience_level, j.salary_min, j.salary_max
      FROM jobs j
      JOIN users c ON j.company_id = c.id
      WHERE j.location ILIKE $1
        AND (j.contract_type = $2 OR j.contract_type IS NULL)
        AND j.created_at > NOW() - INTERVAL '7 days'
      ORDER BY j.created_at DESC
      LIMIT 20
    `, [alert.filters.location || '%', alert.filters.contract_type || '%']);
    
    // 3. Calcular matching e notificar
    let notificationsCount = 0;
    
    for (const job of jobsResult.rows) {
      const matchingScore = calculateMatching(alert.filters, job);
      
      if (matchingScore >= 75) {
        // Buscar candidato
        const candidate = await pool.query(
          'SELECT name, email, phone, consent_privacy_policy FROM users WHERE id = $1',
          [userId]
        );
        
        if (candidate.rows.length > 0) {
          const result = await notifyNewJobAlert({
            candidateEmail: candidate.rows[0].email,
            candidateName: candidate.rows[0].name,
            jobTitle: job.title,
            companyName: job.company_name,
            matchingScore: Math.round(matchingScore),
            user: candidate.rows[0],
            jobUrl: \`\${process.env.FRONTEND_URL}/jobs/\${job.id}\`,
          });
          
          if (result.success) {
            notificationsCount++;
          }
        }
      }
    }
    
    res.json({
      success: true,
      message: \`\${notificationsCount} notificações de vagas enviadas\`,
      jobsFound: jobsResult.rows.length,
      notificationsSent: notificationsCount,
    });
  } catch (error) {
    console.error('Erro ao disparar alertas:', error);
    res.status(500).json({ error: error.message });
  }
});
```
*/

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTAÇÃO NO FRONTEND: src/lib/jobAlerts.js
// ═══════════════════════════════════════════════════════════════════════════

/*
ADICIONAR FUNÇÃO PARA DISPARAR ALERTAS:
```javascript
// Chamar endpoint que dispara notificações
export async function triggerJobAlert(alertId, token) {
  try {
    const response = await api.get(`/job-alerts/\${alertId}/trigger`, {
      headers: { Authorization: \`Bearer \${token}\` }
    });
    
    console.log('Alertas disparados:', response.data.notificationsSent);
    return response.data;
  } catch (error) {
    console.error('Erro ao disparar alertas:', error);
    throw error;
  }
}
```

USAR EM COMPONENTE REACT:
```javascript
const handleTriggerAlerts = async () => {
  try {
    const result = await triggerJobAlert(alertId, token);
    toast.success(\`\${result.notificationsSent} vagas encontradas!\`);
  } catch (error) {
    toast.error('Erro ao buscar novas vagas');
  }
};

return (
  <button
    onClick={handleTriggerAlerts}
    className="px-4 py-2 bg-blue-600 text-white rounded"
  >
    🔔 Buscar Novas Vagas Agora
  </button>
);
```
*/

// ═══════════════════════════════════════════════════════════════════════════
// FLUXO AUTOMÁTICO (Cron Job - FUTURO)
// ═══════════════════════════════════════════════════════════════════════════

/*
IMPLEMENTAR MAIS TARDE COM AGENDA OU NODE-CRON:

```javascript
import cron from 'node-cron';

// Executar a cada 6 horas
cron.schedule('0 */6 * * *', async () => {
  console.log('🔄 Disparando job alerts automáticos...');
  
  try {
    // Buscar todos os alertas ativos
    const alerts = await pool.query(
      'SELECT * FROM job_alerts WHERE active = true'
    );
    
    for (const alert of alerts.rows) {
      // Chamar lógica de busca e notificação
      const newJobs = await searchJobsForAlert(alert);
      
      for (const job of newJobs) {
        if (job.matchingScore >= 75) {
          await notifyNewJobAlert({
            candidateEmail: alert.user_email,
            candidateName: alert.user_name,
            jobTitle: job.title,
            companyName: job.company_name,
            matchingScore: job.matchingScore,
            user: alert.user,
            jobUrl: \`\${process.env.FRONTEND_URL}/jobs/\${job.id}\`,
          });
        }
      }
    }
    
    console.log('✅ Job alerts automáticos concluídos');
  } catch (error) {
    console.error('❌ Erro em job alerts automáticos:', error);
  }
});
```
*/

// ═══════════════════════════════════════════════════════════════════════════
// VARIÁVEIS DE AMBIENTE NECESSÁRIAS
// ═══════════════════════════════════════════════════════════════════════════

/*
ADICIONAR NO .env:
```
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-senha-app-google

# Ou use outro serviço:
# EMAIL_SERVICE=outlook
# EMAIL_SERVICE=sendgrid

# Frontend URL (para links nos e-mails)
FRONTEND_URL=http://localhost:5173

# WhatsApp (configurar quando integrar)
WHATSAPP_PROVIDER=           # evolution, zapi, twilio
WHATSAPP_API_KEY=
WHATSAPP_INSTANCE_ID=
```
*/

// ═══════════════════════════════════════════════════════════════════════════
// EXEMPLO DE TESTE
// ═══════════════════════════════════════════════════════════════════════════

/*
TESTAR COM CURL:

1. Enviar e-mail de teste:
```bash
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json"
```

2. Obter consentimentos:
```bash
curl -X GET http://localhost:3001/api/notifications/consent \
  -H "Authorization: Bearer SEU_TOKEN"
```

3. Atualizar consentimentos:
```bash
curl -X PATCH http://localhost:3001/api/notifications/consent \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "consent_privacy_policy": true,
    "consent_whatsapp": false
  }'
```

4. Exportar dados (LGPD):
```bash
curl -X GET http://localhost:3001/api/notifications/profile/export \
  -H "Authorization: Bearer SEU_TOKEN" \
  -o dados.json
```
*/

export default {
  // Esta é apenas documentação
};

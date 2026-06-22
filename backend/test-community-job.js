// Quick test to login as admin and create a community job
(async () => {
  try {
    const argPort = process.argv[2] && Number(process.argv[2]);
    const envPort = process.env.PORT && Number(process.env.PORT);
    const candidates = [argPort, envPort, 3010, 3001].filter(Boolean);
    let base = `http://localhost:${candidates[0]}/api`;
    const loginRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@curriculoja.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      console.error('Login failed:', loginData);
      process.exit(1);
    }
    const token = loginData.token;

    const payload = {
      company_name: 'Loja Boa Vizinhança',
      title: 'Atendente de Loja Júnior',
      area: 'administracao',
      subarea: 'assistente_administrativo',
      location: 'Ribeirão Preto, SP',
      description: 'Atendimento ao cliente, operação de caixa e organização de prateleiras.',
      requirements: 'Boa comunicação, proatividade e disponibilidade de horário.',
      no_experience_required: true,
      salary_type: 'fixed',
      salary_fixed: 1800,
      contract_type: 'clt',
      experience_level: 'junior',
      work_type: 'presencial',
      benefits: 'VR, VT, Plano de Saúde',
      submission_methods: ['+5516987654321', 'contato@lojaboavizinhanca.com'],
      contact_methods: ['+5516999998888', 'rh@lojaboavizinhanca.com']
    };

    let createRes = await fetch(base + '/jobs/community', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    // Fallback: if 404 on first port, try the next candidate port
    let createData = await createRes.json();
    if (createRes.status === 404 && candidates.length > 1) {
      for (let i = 1; i < candidates.length; i++) {
        base = `http://localhost:${candidates[i]}/api`;
        console.log(`Retrying on port ${candidates[i]}...`);
        createRes = await fetch(base + '/jobs/community', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        try { createData = await createRes.json(); } catch { createData = {}; }
        if (createRes.ok || createRes.status !== 404) break;
      }
    }
    console.log('Status:', createRes.status);
    console.log('Response:', createData);
    if (!createRes.ok) process.exit(1);
    console.log('\nCreated community job id:', createData?.job?.id);
  } catch (e) {
    console.error('Test error:', e);
    process.exit(1);
  }
})();

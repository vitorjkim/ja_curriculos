/*
  Test script: upload a small dummy PDF (generated) to /api/resumes/upload
  and then create an application using the returned resume id.

  Usage: node tools/test-upload.js
  Ensure backend is running at http://localhost:3001 and you have a valid
  user token in the TOK variable below. You can set process.env.TOK or edit the file.
*/

import fs from 'fs';
import path from 'path';
import { request, FormData } from 'undici';

const API = process.env.API_BASE || 'http://localhost:3001/api';

// If you want to re-use an existing token, set process.env.TOK.
const PROVIDED_TOKEN = process.env.TOK || '';

async function generateDummyPdf(filePath) {
  const content = '%PDF-1.4\n%Dummy PDF\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 50 100 Td (Hello PDF) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000210 00000 n \ntrailer\n<< /Root 1 0 R >>\nstartxref\n300\n%%EOF';
  fs.writeFileSync(filePath, content);
}

async function run() {
  try {
    const tmpDir = path.join(process.cwd(), 'tools', 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const pdfPath = path.join(tmpDir, 'dummy.pdf');
    await generateDummyPdf(pdfPath);

  const form = new FormData();
  form.append('resumeFile', fs.createReadStream(pdfPath));
  form.append('extractedText', 'Dummy extracted text');
  form.append('parsedData', JSON.stringify({ name: 'Teste', email: 'teste@example.com' }));

    // If no token provided, register/login a test candidate
    let token = PROVIDED_TOKEN;
    if (!token) {
      const unique = Date.now();
      const email = `test.user.${unique}@example.com`;
      const password = 'Test@1234';
      console.log('Registering test user:', email);
      const reg = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Teste', email, password, type: 'candidate' })
      });
      const regJson = await reg.json().catch(() => null);
      console.log('Register status:', reg.status, regJson);

      // Login
      const login = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const loginJson = await login.json();
      token = loginJson.token || loginJson.accessToken || '';
      if (!token) {
        console.error('Unable to obtain token from login:', loginJson);
        process.exit(1);
      }
      console.log('Obtained token for test user');
    }

    // If job id not provided, fetch jobs and pick first
    let jobId = process.env.JOB_ID || '';
    if (!jobId) {
      const jobsRes = await fetch(`${API}/jobs`);
      const jobsJson = await jobsRes.json().catch(() => null);
      jobId = jobsJson?.jobs?.[0]?.id || jobsJson?.jobs?.[0]?.id || '';
      if (!jobId) {
        console.error('No job id available; please create a job or set JOB_ID env var');
        process.exit(1);
      }
      console.log('Using job id:', jobId);
    }

    console.log('Uploading PDF to', `${API}/resumes/upload`);
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // undici FormData will set proper headers automatically when used as body
    };

    const { statusCode, body } = await request(`${API}/resumes/upload`, {
      method: 'POST',
      body: form,
      headers
    });

    const text = await body.text();
    let uploadJson = null;
    try { uploadJson = JSON.parse(text); } catch (e) { uploadJson = text; }
    console.log('Upload status:', statusCode, 'body:', uploadJson);

    if (!uploadJson || statusCode >= 400) {
      console.error('Upload failed');
      process.exit(1);
    }

    const resumeId = uploadJson?.resume?.id;
    if (!resumeId) {
      console.error('No resume id returned');
      process.exit(1);
    }

    console.log('Resume created with id:', resumeId);

    // Try create application (requires candidate auth token)
    if (!TOK) {
      console.log('No token provided; skipping application creation');
      return;
    }

    const applicationRes = await fetch(`${API}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOK}`
      },
      body: JSON.stringify({ job_id: process.env.JOB_ID || '', resume_id: resumeId })
    });

    const appJson = await applicationRes.json().catch(() => null);
    console.log('Application create status:', applicationRes.status, 'body:', appJson);

  } catch (err) {
    console.error('Error in test script', err);
  }
}

run();

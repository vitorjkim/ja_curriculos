import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { applicationsAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Briefcase, UserCheck, Users, Phone, Mail, Calendar, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const CompanyApprovedByJob = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [grouped, setGrouped] = useState({});

  useEffect(() => {
    const load = async () => {
      if (!user || user.type !== 'company') return;
      setLoading(true);
      try {
        const resp = await applicationsAPI.getCompanyApplications();
        const apps = resp.applications || [];
        const map = {};
        apps.forEach(a => {
          if (!map[a.job_id]) map[a.job_id] = { job: { id: a.job_id, title: a.job_title }, approved: [], interview: [], rejected: [] };
          if (a.status === 'approved') map[a.job_id].approved.push(a);
          else if (a.status === 'interview') map[a.job_id].interview.push(a);
          else if (a.status === 'rejected') map[a.job_id].rejected.push(a);
        });
        setGrouped(map);
      } catch (e) {
        console.error('Erro carregando aprovados por vaga', e);
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  if (!user || user.type !== 'company') return <div className='p-10 text-center text-gray-600'>Acesso restrito.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-10 px-4">
      <Helmet><title>Aprovados & Entrevistas - CurrículoJá</title></Helmet>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Vagas • Aprovados & Entrevistas</h1>
        {loading ? <div className='py-20 text-center'>Carregando...</div> : (
          Object.keys(grouped).length === 0 ? <div className='py-24 text-center text-gray-500'>Nenhuma aprovação ainda.</div> : (
            <div className='space-y-8'>
              {Object.values(grouped).map(block => (
                <motion.div key={block.job.id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{duration:.4}}>
                  <Card className='border border-gray-200'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='flex items-center gap-2 text-lg'><Briefcase className='w-5 h-5 text-blue-600'/>{block.job.title}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      <Section title='Aprovados' items={block.approved} empty='Nenhum aprovado.' color='green'/>
                      <Section title='Entrevista' items={block.interview} empty='Nenhuma entrevista.' color='indigo'/>
                      <div className='pt-4 border-t'>
                        <Section title='Reprovados' items={block.rejected} empty='Nenhum reprovado.' color='red' collapsed />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

const Section = ({ title, items, empty, color='gray', collapsed=false }) => {
  const [open, setOpen] = useState(!collapsed);
  const palette = {
    green: 'bg-green-50 border-green-200 text-green-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700'
  }[color];
  return (
    <div>
      <div className='flex items-center justify-between mb-2'>
        <h3 className='font-semibold text-gray-800'>{title} ({items.length})</h3>
        {collapsed && (
          <button onClick={()=>setOpen(o=>!o)} className='text-xs text-blue-600 hover:underline'>{open ? 'Esconder' : 'Mostrar'}</button>
        )}
      </div>
      {open && (
        items.length === 0 ? <p className='text-sm text-gray-500'>{empty}</p> : (
          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-3'>
            {items.map(app => (
              <div key={app.id} className={`p-4 rounded-xl border ${palette} space-y-2`}>                
                <p className='font-medium text-sm flex items-center gap-1'><UserCheck className='w-4 h-4'/>{app.candidate_name}</p>
                <p className='text-xs text-gray-600 flex items-center gap-1'><Mail className='w-3 h-3'/>{app.candidate_email}</p>
                {app.candidate_phone && <p className='text-xs text-gray-600 flex items-center gap-1'><Phone className='w-3 h-3'/>{app.candidate_phone}</p>}
                <div className='flex gap-2 pt-1'>
                  <Link to={`/resume/${app.resume_id}`} className='text-xs bg-white border rounded-md px-2 py-1 hover:bg-gray-50'>Currículo</Link>
                  <Button size='sm' variant='outline' className='h-7 text-xs px-2'>WhatsApp</Button>
                  <Link to={`/company-messages`} className='text-xs bg-white border rounded-md px-2 py-1 hover:bg-gray-50 flex items-center gap-1'><MessageCircle className='w-3 h-3'/>Msg</Link>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default CompanyApprovedByJob;
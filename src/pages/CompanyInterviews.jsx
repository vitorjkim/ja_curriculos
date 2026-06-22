import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { applicationsAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Briefcase, Search, Loader2, ChevronRight, Filter, Users, CalendarCheck, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Link } from 'react-router-dom';

// Nova versão: apenas listagem de vagas com contagens. Cada card leva a uma página detalhada.

const CompanyInterviews = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [grouped, setGrouped] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user || user.type !== 'company') return;
      setLoading(true);
      try {
        const resp = await applicationsAPI.getCompanyApplications();
        const apps = resp.applications || [];
        const map = {};
        apps.forEach(a => {
          // Entrevista válida: tem data e não foi cancelada pela empresa nem rejeitada pelo candidato
          const isInterview = !!a.interview_date && !a.interview_canceled_by_company && !a.interview_rejected_by_candidate && !a.final_approved;
          const isRejected = a.status === 'rejected';
          // Pré-aprovados: status approved ou interested, não final_approved, e sem entrevista ativa (ou entrevista cancelada/rejeitada)
          const isPreApproved = (a.status === 'approved' || a.status === 'interested') && !a.final_approved && (!a.interview_date || a.interview_canceled_by_company || a.interview_rejected_by_candidate);
          // Aprovados finais
          const isFinalApproved = a.status === 'approved' && !!a.final_approved;
          if (!(isInterview || isRejected || isPreApproved || isFinalApproved)) return; // ignorar outros statuses
          if (!map[a.job_id]) map[a.job_id] = { job: { id: a.job_id, title: a.job_title }, preApproved: 0, interview: 0, finalApproved: 0, rejected: 0, latestPreApprovedAt: null };
          if (isInterview) map[a.job_id].interview += 1;
          else if (isPreApproved) {
            map[a.job_id].preApproved += 1;
            // Guardar a data do pré-aprovado mais recente
            const preApprovedAt = new Date(a.pre_approved_at || a.decision_at || a.updated_at || a.created_at);
            if (!map[a.job_id].latestPreApprovedAt || preApprovedAt > map[a.job_id].latestPreApprovedAt) {
              map[a.job_id].latestPreApprovedAt = preApprovedAt;
            }
          }
          else if (isFinalApproved) map[a.job_id].finalApproved += 1;
          else if (isRejected) map[a.job_id].rejected += 1;
        });
        setGrouped(map);
        
        // Marcar como visto ao abrir a página
        const preApprovedLastSeenKey = `company_preapproved_last_seen_${user.id}`;
        localStorage.setItem(preApprovedLastSeenKey, new Date().toISOString());
        // Disparar evento para atualizar navbar
        window.dispatchEvent(new CustomEvent('applicationsViewed'));
      } catch (e) {
        console.error('Erro carregando vagas pipeline', e);
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  if (!user || user.type !== 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/80 px-4">
        <Card className="max-w-md border-2 border-slate-200 bg-white/95 shadow-sm">
          <CardContent className="p-6 text-center text-slate-700">
            Acesso restrito a empresas.
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobs = Object.values(grouped)
    .filter(b => !search || b.job.title?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // Primeiro: ordenar pelo pré-aprovado mais recente (último a receber pré-aprovação fica no topo)
      const aLatest = a.latestPreApprovedAt ? new Date(a.latestPreApprovedAt).getTime() : 0;
      const bLatest = b.latestPreApprovedAt ? new Date(b.latestPreApprovedAt).getTime() : 0;
      if (bLatest !== aLatest) return bLatest - aLatest;
      // Segundo: vagas com mais pré-aprovados
      if (b.preApproved !== a.preApproved) return b.preApproved - a.preApproved;
      // Terceiro: vagas com mais entrevistas
      if (b.interview !== a.interview) return b.interview - a.interview;
      // Quarto: vagas com mais aprovados finais
      if (b.finalApproved !== a.finalApproved) return b.finalApproved - a.finalApproved;
      // Por último: alfabético
      return a.job.title.localeCompare(b.job.title);
    });

  return (
    <>
      <Helmet>
        <title>Vagas • Pipelines - CurrículoJá</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50/80 py-10 px-4">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex flex-col items-start justify-between gap-6 rounded-[24px] border-2 border-slate-200 bg-white/90 px-8 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm md:flex-row md:items-center"
          >
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Pipeline de Candidatos
              </p>
              <h1 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
                <span className="text-slate-900">Vagas com </span>
                <span className="text-[#2563eb]">Pipeline</span>
              </h1>
              <p className="text-sm text-slate-500">
                Acompanhe o funil de pré-aprovações, entrevistas e aprovações em cada vaga.
              </p>
            </div>
          </motion.div>

          <div className="mb-8 rounded-[22px] border-2 border-slate-200 bg-white/95 px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar vaga pelo título"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-10 rounded-full border-slate-200 bg-slate-50 pl-9 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700 ring-1 ring-sky-100">
                  <Users className="h-3.5 w-3.5" />
                  Pré-aprov.: candidatos já filtrados
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700 ring-1 ring-indigo-100">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Entrev.: entrevistas marcadas
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 ring-1 ring-emerald-100">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Aprov.: aprovações finais
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700 ring-1 ring-rose-100">
                  <ThumbsDown className="h-3.5 w-3.5" />
                  Reprov.: candidatos não aprovados
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-slate-500" />
              <p className="text-sm">Carregando pipeline de vagas...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-[22px] border-2 border-dashed border-slate-300 bg-white/95 px-8 py-14 text-center text-slate-500">
              <p className="mb-1 text-sm font-medium text-slate-700">
                Nenhuma vaga com interações ainda.
              </p>
              <p className="text-xs text-slate-500">
                Assim que começarem as pré-aprovações, entrevistas e resultados, elas aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map(b => (
                <Link key={b.job.id} to={`/company-interviews/${b.job.id}`} className="group">
                  <Card className="h-full rounded-[22px] border-2 border-slate-200 bg-white/95 shadow-[0_14px_30px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-[2px] hover:border-indigo-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span className="rounded-2xl bg-indigo-50 p-1.5 text-indigo-600 ring-2 ring-indigo-100">
                          <Briefcase className="h-4 w-4" />
                        </span>
                        <span className="line-clamp-2">{b.job.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 text-xs text-slate-600">
                      <div className="flex flex-wrap gap-2">
                        <Pill color="sky" icon={Users} label="Pré-aprov." value={b.preApproved} />
                        <Pill color="indigo" icon={CalendarCheck} label="Entrev." value={b.interview} />
                        <Pill color="emerald" icon={ThumbsUp} label="Aprov." value={b.finalApproved} />
                        <Pill color="rose" icon={ThumbsDown} label="Reprov." value={b.rejected} />
                      </div>
                      <div className="mt-2 flex items-center text-[11px] font-semibold text-indigo-700 group-hover:translate-x-[1px] group-hover:underline">
                        Ver pipeline
                        <ChevronRight className="ml-1 h-3 w-3" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const Pill = ({ color, label, value, icon: Icon }) => {
  const map = {
    sky: 'bg-sky-50 text-sky-700 ring-sky-100',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${
        map[color]
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span>
        {label}: {value}
      </span>
    </span>
  );
};

export default CompanyInterviews;
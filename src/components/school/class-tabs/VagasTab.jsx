import React, { useState, useMemo } from 'react';
import { Building2, Search, ChevronDown, ArrowUpDown, Filter, Trophy, TrendingUp, Users, CheckCircle2, XCircle, Clock, CalendarDays, Handshake } from 'lucide-react';
import { Link } from 'react-router-dom';

const SORT_OPTIONS = [
  { key: 'most-applied', label: 'Mais candidaturas', icon: TrendingUp },
  { key: 'most-hired', label: 'Mais contratados', icon: CheckCircle2 },
  { key: 'alpha', label: 'Alfabética', icon: ArrowUpDown },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'Todos os status', icon: Filter },
  { key: 'inAnalysis', label: 'Em análise', icon: Clock, color: 'amber' },
  { key: 'interview', label: 'Entrevista ativa', icon: CalendarDays, color: 'purple' },
  { key: 'hired', label: 'Contratados', icon: CheckCircle2, color: 'emerald' },
  { key: 'rejected', label: 'Rejeitados', icon: XCircle, color: 'red' },
];

const PARTNER_FILTERS = [
  { key: 'all', label: 'Todas empresas', icon: Building2 },
  { key: 'partner', label: 'Empresas parceiras', icon: Handshake },
  { key: 'non-partner', label: 'Não parceiras', icon: Building2 },
];

function Dropdown({ options, value, onChange, icon: TriggerIcon }) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.key === value) || options[0];
  const Icon = current.icon;
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
      >
        <Icon className="w-3.5 h-3.5 text-gray-500" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-52 bg-white rounded-xl border border-gray-200 shadow-xl py-1 overflow-hidden">
            {options.map(opt => {
              const OptIcon = opt.icon;
              const isSelected = value === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => { onChange(opt.key); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-blue-500' : 'border-gray-300'}`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <OptIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-xs font-medium ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const MEDAL_COLORS = [
  'from-amber-400 to-yellow-500 text-amber-900 ring-amber-300',
  'from-gray-300 to-gray-400 text-gray-700 ring-gray-300',
  'from-orange-300 to-orange-400 text-orange-800 ring-orange-300',
];

export default function VagasTab({ data, realData, globalStudentFilter, partnerships }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState('most-applied');
  const [statusFilter, setStatusFilter] = useState('all');
  const [partnerFilter, setPartnerFilter] = useState('all');

  // Build a set of partner company IDs from accepted partnerships
  const partnerCompanyIds = useMemo(() => {
    const ids = new Set();
    (partnerships || []).forEach(p => {
      if (p.status === 'accepted' && p.company_id) ids.add(String(p.company_id));
    });
    return ids;
  }, [partnerships]);

  const applications = globalStudentFilter
    ? (realData.applications || []).filter(app => app.user_id === globalStudentFilter.user_id)
    : (realData.applications || []);
  
  const jobStats = useMemo(() => {
    const stats = {};
    applications.forEach(app => {
      const jobId = app.job_id || (app.source === 'external' && app.job_title ? `ext:${app.job_title}` : null);
      if (!jobId) return;
      
      if (!stats[jobId]) {
        stats[jobId] = {
          job_id: jobId,
          title: app.job_title || 'Vaga sem título',
          company: app.company_name || 'Empresa',
          company_avatar: null,
          company_id: app.company_id || null,
          is_partner: false,
          total: 0,
          inAnalysis: 0,
          interview: 0,
          hired: 0,
          rejected: 0,
        };
      }
      if (!stats[jobId].company_avatar && app.company_avatar) {
        stats[jobId].company_avatar = app.company_avatar;
      }
      if (app.company_id && partnerCompanyIds.has(String(app.company_id))) {
        stats[jobId].is_partner = true;
      }
      
      stats[jobId].total++;
      if (app.rejected_by_company || app.rejected_by_candidate) {
        stats[jobId].rejected++;
      } else if (app.final_approved) {
        stats[jobId].hired++;
      } else if (
        app.interview_date &&
        !app.interview_canceled_by_company &&
        !app.interview_rejected_by_candidate &&
        !app.final_approved
      ) {
        stats[jobId].interview++;
      } else {
        stats[jobId].inAnalysis++;
      }
    });
    return stats;
  }, [applications, partnerCompanyIds]);

  const filteredJobs = useMemo(() => {
    let jobs = Object.values(jobStats);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      jobs = jobs.filter(j => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q));
    }

    if (statusFilter === 'inAnalysis') jobs = jobs.filter(j => j.inAnalysis > 0);
    else if (statusFilter === 'interview') jobs = jobs.filter(j => j.interview > 0);
    else if (statusFilter === 'hired') jobs = jobs.filter(j => j.hired > 0);
    else if (statusFilter === 'rejected') jobs = jobs.filter(j => j.rejected > 0);

    if (partnerFilter === 'partner') jobs = jobs.filter(j => j.is_partner);
    else if (partnerFilter === 'non-partner') jobs = jobs.filter(j => !j.is_partner);

    if (sortMode === 'most-applied') jobs.sort((a, b) => b.total - a.total);
    else if (sortMode === 'most-hired') jobs.sort((a, b) => b.hired - a.hired || b.total - a.total);
    else if (sortMode === 'alpha') jobs.sort((a, b) => a.title.localeCompare(b.title));

    return jobs;
  }, [jobStats, searchQuery, sortMode, statusFilter, partnerFilter]);

  if (applications.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-white border-2 border-gray-200 shadow-md">
        <h3 className="font-bold text-gray-900 text-sm mb-4">Vagas mais disputadas</h3>
        <div className="bg-gray-50 rounded-xl p-10 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">{globalStudentFilter ? 'Este aluno não tem candidaturas' : 'Nenhuma candidatura ainda'}</p>
        </div>
      </div>
    );
  }

  const totalApps = applications.length;
  const uniqueCompanies = new Set(applications.map(a => a.company_name).filter(Boolean)).size;

  return (
    <div className="p-5 rounded-2xl bg-white border-2 border-gray-200 shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Vagas mais disputadas</h3>
          <p className="text-gray-400 text-[11px] mt-0.5">
            {Object.keys(jobStats).length} vagas · {totalApps} candidaturas · {uniqueCompanies} empresas
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-[10px] text-gray-500">Análise</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500" /><span className="text-[10px] text-gray-500">Entrevista</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-gray-500">Contratado</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[10px] text-gray-500">Rejeitado</span></div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar vaga ou empresa..."
            className="w-full pl-8 pr-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
          />
        </div>
        <Dropdown options={SORT_OPTIONS} value={sortMode} onChange={setSortMode} />
        <Dropdown options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
        <Dropdown options={PARTNER_FILTERS} value={partnerFilter} onChange={setPartnerFilter} />
      </div>

      {/* Job list */}
      <div className="space-y-2">
        {filteredJobs.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Nenhuma vaga encontrada</p>
          </div>
        ) : filteredJobs.map((job, idx) => {
          const isMedal = idx < 3 && sortMode === 'most-applied' && !searchQuery.trim() && statusFilter === 'all' && partnerFilter === 'all';
          const pctAnalysis = job.total > 0 ? (job.inAnalysis / job.total) * 100 : 0;
          const pctInterview = job.total > 0 ? (job.interview / job.total) * 100 : 0;
          const pctHired = job.total > 0 ? (job.hired / job.total) * 100 : 0;
          const pctRejected = job.total > 0 ? (job.rejected / job.total) * 100 : 0;

          return (
            <div key={job.job_id} className="group flex items-center gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100 hover:border-gray-200 hover:bg-white transition-all">
              {/* Rank badge */}
              <div className="flex-shrink-0 w-7 text-center">
                {isMedal ? (
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${MEDAL_COLORS[idx]} ring-1 flex items-center justify-center`}>
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <span className="text-xs font-bold text-gray-400">{idx + 1}º</span>
                )}
              </div>

              {/* Company logo */}
              <div className="flex-shrink-0">
                {job.company_avatar ? (
                  <img
                    src={job.company_avatar}
                    alt={job.company}
                    className="w-10 h-10 rounded-xl object-cover border border-gray-200 bg-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Job info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {job.job_id && !String(job.job_id).startsWith('ext:') ? (
                    <Link to={`/vagas/${job.job_id}`} className="font-semibold text-[13px] text-gray-900 leading-tight hover:text-blue-600 transition-colors truncate" title={job.title}>{job.title}</Link>
                  ) : (
                    <span className="font-semibold text-[13px] text-gray-900 leading-tight truncate" title={job.title}>{job.title}</span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 truncate flex items-center gap-1.5">
                  {job.company_id ? (
                    <Link to={`/company/${job.company_id}`} className="hover:text-blue-500 transition-colors">{job.company}</Link>
                  ) : job.company}
                  {job.is_partner && (
                    <span className="inline-flex items-center text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                      <Handshake className="w-2.5 h-2.5 mr-0.5" />Parceira
                    </span>
                  )}
                </div>
              </div>

              {/* Status bar + counts */}
              <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0 w-36">
                <div className="flex gap-0.5 h-1.5 w-full rounded-full overflow-hidden bg-gray-200">
                  {pctAnalysis > 0 && <div className="bg-amber-400" style={{ width: `${pctAnalysis}%` }} />}
                  {pctInterview > 0 && <div className="bg-purple-500" style={{ width: `${pctInterview}%` }} />}
                  {pctHired > 0 && <div className="bg-emerald-500" style={{ width: `${pctHired}%` }} />}
                  {pctRejected > 0 && <div className="bg-red-400" style={{ width: `${pctRejected}%` }} />}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  {job.inAnalysis > 0 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />{job.inAnalysis}</span>}
                  {job.interview > 0 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />{job.interview}</span>}
                  {job.hired > 0 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{job.hired}</span>}
                  {job.rejected > 0 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />{job.rejected}</span>}
                </div>
              </div>

              {/* Total count */}
              <div className="flex-shrink-0 text-right pl-2">
                <div className="text-base font-bold text-gray-900 leading-none">{job.total}</div>
                <div className="text-[9px] text-gray-400 font-medium mt-0.5">candidatura{job.total !== 1 ? 's' : ''}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

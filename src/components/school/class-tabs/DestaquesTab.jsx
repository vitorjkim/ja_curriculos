import React from 'react';
import { Star, CheckCircle2, CalendarDays, Send, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function DestaquesTab({ data, studentFilter, setStudentFilter, realData, avatarTick }) {
  const items = studentFilter.activity || [];
  const hiredData = realData.hired || [];
  const interviewsData = [...(realData.interviews?.upcoming || []), ...(realData.interviews?.history || []), ...(Array.isArray(realData.interviews) ? realData.interviews : [])];
  const applicationsData = realData.applications || [];

  if (!items || items.length === 0) {
    return (
      <div className="p-6 rounded-2xl border-2 border-gray-200 bg-white shadow-md">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Destaques para empresas</h3>
        <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 text-center">Carregando alunos…</div>
      </div>
    );
  }

  const score = (s) => (s.final_approved ? 100 : 0) + (s.pre_approved ? 50 : 0) + (s.has_interview ? 20 : 0) + Math.min(10, s.applications_count || 0);
  const top = items
    .filter(s => s.final_approved || s.pre_approved || s.has_interview || (s.applications_count || 0) > 0)
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
    .slice(0, 8);

  if (top.length === 0) {
    return (
      <div className="p-6 rounded-2xl border-2 border-gray-200 bg-white shadow-md">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Destaques para empresas</h3>
        <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 text-center">Ainda não há destaques para empresas nesta turma.</div>
      </div>
    );
  }

  const enrichedTop = top.map(s => {
    const hiredInfo = hiredData.find(h => h.user_id === s.user_id);
    const interviewInfo = interviewsData.find(i => i.user_id === s.user_id && !i.interview_canceled_by_company && !i.interview_rejected_by_candidate);
    const applicationsCount = applicationsData.filter(a => a.user_id === s.user_id).length;
    const latestApplication = applicationsData.filter(a => a.user_id === s.user_id).sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))[0];
    return { ...s, hiredInfo, interviewInfo, latestApplication, totalApplications: applicationsCount };
  });

  const generateHighlightsPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text('Relatório de Destaques para Empresas', margin, y);
      y += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Turma: ${data?.class?.name || 'Turma'} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, margin, y);
      y += 15;

      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      for (const s of enrichedTop) {
        if (y > 250) { pdf.addPage(); y = 20; }

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text(s.name || 'Aluno', margin, y);
        y += 5;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text(s.email || '', margin, y);
        y += 7;

        pdf.setFontSize(10);
        if (s.hiredInfo) {
          pdf.setTextColor(16, 185, 129);
          pdf.setFont('helvetica', 'bold');
          pdf.text('[APROVADO FINAL]', margin, y);
          y += 5;
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(55, 65, 81);
          pdf.text(`Empresa: ${s.hiredInfo.company_name || 'Não informada'}`, margin + 5, y);
          y += 4;
          pdf.text(`Vaga: ${s.hiredInfo.job_title || 'Não informada'}`, margin + 5, y);
          y += 4;
          const dataAprov = s.hiredInfo.final_approved_at ? new Date(s.hiredInfo.final_approved_at).toLocaleDateString('pt-BR') : 'Não informada';
          pdf.text(`Data da aprovação: ${dataAprov}`, margin + 5, y);
          y += 6;
        } else if (s.interviewInfo) {
          pdf.setTextColor(59, 130, 246);
          pdf.setFont('helvetica', 'bold');
          pdf.text('[EM ENTREVISTA]', margin, y);
          y += 5;
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(55, 65, 81);
          pdf.text(`Empresa: ${s.interviewInfo.company_name || 'Não informada'}`, margin + 5, y);
          y += 4;
          pdf.text(`Vaga: ${s.interviewInfo.job_title || 'Não informada'}`, margin + 5, y);
          y += 4;
          const dataEntrevista = s.interviewInfo.interview_date ? new Date(s.interviewInfo.interview_date).toLocaleDateString('pt-BR') : 'A definir';
          pdf.text(`Data da entrevista: ${dataEntrevista}`, margin + 5, y);
          y += 6;
        } else if (s.totalApplications > 0) {
          pdf.setTextColor(245, 158, 11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`[${s.totalApplications} CANDIDATURA(S)]`, margin, y);
          y += 5;
          if (s.latestApplication) {
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(55, 65, 81);
            pdf.text(`Última candidatura: ${s.latestApplication.company_name || 'Empresa'} - ${s.latestApplication.job_title || 'Vaga'}`, margin + 5, y);
            y += 4;
            const dataApp = s.latestApplication.applied_at ? new Date(s.latestApplication.applied_at).toLocaleDateString('pt-BR') : '';
            if (dataApp) { pdf.text(`Data: ${dataApp}`, margin + 5, y); y += 4; }
          }
          y += 2;
        }

        pdf.setDrawColor(243, 244, 246);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 8;
      }

      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pdf.internal.pageSize.getHeight() - 10);
      }

      pdf.save(`destaques-empresas-${data?.class?.name || 'turma'}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const getAvatar = (stu) => stu?.profileImage || stu?.profile_image || stu?.avatar || null;

  return (
    <div className="p-6 rounded-2xl border-2 border-gray-200 bg-white shadow-md">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Destaques para empresas</h3>
          <div className="text-xs text-gray-500 font-medium">Com base em aprovações, entrevistas e candidaturas</div>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={generateHighlightsPDF}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <FileText className="w-4 h-4" />
          Baixar PDF dos Destaques
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {enrichedTop.map(s => {
          let avatar = getAvatar(s);
          if (avatar && typeof avatar === 'string' && /^https?:\/\//i.test(avatar) && avatarTick > 0) {
            const sep = avatar.includes('?') ? '&' : '?';
            avatar = `${avatar}${sep}v=${avatarTick}`;
          }
          const initials = (s.name || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';

          return (
            <button key={s.user_id} onClick={() => setStudentFilter(p => ({ ...p, selected: s }))} className="group text-left bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center shrink-0">
                  {avatar ? (
                    <img src={avatar} alt={s.name || 'Aluno'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-emerald-700">{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-gray-900 truncate">{s.name}</div>
                  <div className="text-xs text-gray-500 truncate">{s.email}</div>
                </div>
                <Star className={`w-5 h-5 shrink-0 ${s.is_featured ? 'text-amber-400' : 'text-gray-300'}`} fill={s.is_featured ? 'currentColor' : 'none'} />
              </div>

              <div className="mt-3 space-y-2">
                {s.hiredInfo && (
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700">APROVADO FINAL</span>
                    </div>
                    <div className="text-xs text-gray-700 space-y-0.5">
                      <div className="truncate"><span className="font-medium">Empresa:</span> {s.hiredInfo.company_name || 'Não informada'}</div>
                      <div className="truncate"><span className="font-medium">Vaga:</span> {s.hiredInfo.job_title || 'Não informada'}</div>
                      <div><span className="font-medium">Data:</span> {s.hiredInfo.final_approved_at ? new Date(s.hiredInfo.final_approved_at).toLocaleDateString('pt-BR') : 'N/A'}</div>
                    </div>
                  </div>
                )}

                {!s.hiredInfo && s.interviewInfo && (
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarDays className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-700">EM ENTREVISTA</span>
                    </div>
                    <div className="text-xs text-gray-700 space-y-0.5">
                      <div className="truncate"><span className="font-medium">Empresa:</span> {s.interviewInfo.company_name || 'Não informada'}</div>
                      <div className="truncate"><span className="font-medium">Vaga:</span> {s.interviewInfo.job_title || 'Não informada'}</div>
                      <div><span className="font-medium">Data:</span> {s.interviewInfo.interview_date ? new Date(s.interviewInfo.interview_date).toLocaleDateString('pt-BR') : 'A definir'}</div>
                    </div>
                  </div>
                )}

                {!s.hiredInfo && !s.interviewInfo && s.totalApplications > 0 && (
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Send className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-amber-700">{s.totalApplications} CANDIDATURA{s.totalApplications > 1 ? 'S' : ''}</span>
                    </div>
                    {s.latestApplication && (
                      <div className="text-xs text-gray-700 space-y-0.5">
                        <div className="truncate"><span className="font-medium">Última:</span> {s.latestApplication.company_name || 'Empresa'}</div>
                        <div className="truncate"><span className="font-medium">Vaga:</span> {s.latestApplication.job_title || 'Vaga'}</div>
                        {s.latestApplication.applied_at && (
                          <div><span className="font-medium">Data:</span> {new Date(s.latestApplication.applied_at).toLocaleDateString('pt-BR')}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

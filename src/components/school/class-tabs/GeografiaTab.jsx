import React from 'react';
import { MapPin, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function GeografiaTab({ data, realData, globalStudentFilter, studentFilter, pct }) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* Distribuição da Turma - Gráfico de Pizza */}
      <div className="p-5 rounded-2xl bg-white border-2 border-gray-200 shadow-md md:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              {globalStudentFilter ? `Status de ${globalStudentFilter.name}` : 'Distribuição da Turma'}
            </h3>
            <p className="text-gray-400 text-[11px] mt-0.5">
              {globalStudentFilter ? 'Situação atual do aluno' : 'Status dos alunos'}
            </p>
          </div>
        </div>
        {(() => {
          if (globalStudentFilter) {
            const student = studentFilter.activity.find(s => s.user_id === globalStudentFilter.user_id);
            const filteredHired = (realData.hired || []).filter(h => h.user_id === globalStudentFilter.user_id);
            const filteredInterviews = (realData.interviews || []).filter(i => i.user_id === globalStudentFilter.user_id && !i.interview_canceled_by_company && !i.interview_rejected_by_candidate);
            const filteredApplications = (realData.applications || []).filter(app => app.user_id === globalStudentFilter.user_id);
            
            const isHired = filteredHired.length > 0;
            const hasActiveInterview = filteredInterviews.length > 0;
            const hasApplications = filteredApplications.length > 0;
            
            let statusLabel = 'Inativo';
            let statusColor = '#6b7280';
            if (isHired) {
              statusLabel = 'Contratado';
              statusColor = '#10b981';
            } else if (hasActiveInterview) {
              statusLabel = 'Em entrevista';
              statusColor = '#f59e0b';
            } else if (hasApplications) {
              statusLabel = 'Buscando';
              statusColor = '#3b82f6';
            }
            
            return (
              <div className="flex flex-col items-center justify-center h-48">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: statusColor }}>
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{statusLabel}</div>
                <div className="text-sm text-gray-500 mt-2">
                  {filteredApplications.length} candidatura(s) • {filteredInterviews.length} entrevista(s)
                </div>
              </div>
            );
          }
          
          const pieData = [
            { name: 'Contratados', value: data.employability.counts.hired_students, color: '#10b981' },
            { name: 'Em processo', value: data.employability.counts.in_process, color: '#f59e0b' },
            { name: 'Buscando', value: data.employability.counts.searching, color: '#3b82f6' },
            { name: 'Inativos', value: data.employability.counts.inactive, color: '#6b7280' }
          ].filter(item => item.value > 0);
          
          const total = pieData.reduce((s, i) => s + i.value, 0);
          
          return (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{total}</div>
                    <div className="text-xs text-gray-500">alunos</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {pieData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{item.value}</span>
                      <span className="text-xs text-gray-400">({pct(item.value, total)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Cidades das Vagas */}
      <div className="p-5 rounded-2xl bg-white border-2 border-gray-200 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              {globalStudentFilter 
                ? `Cidades de ${globalStudentFilter.name.split(' ')[0]}` 
                : 'Cidades mais candidatadas'}
            </h3>
            <p className="text-gray-400 text-[11px] mt-0.5">Distribuição geográfica</p>
          </div>
        </div>
        {(() => {
          const applications = globalStudentFilter
            ? (realData.applications || []).filter(app => app.user_id === globalStudentFilter.user_id)
            : (realData.applications || []);
          
          if (applications.length === 0) {
            return (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nenhuma candidatura encontrada</p>
              </div>
            );
          }

          const extractCity = (location) => {
            if (!location) return null;
            let city = location.split(/[,\-\/]/)[0].trim();
            city = city.replace(/^(Rua|Av|Avenida|R\.|Av\.) /i, '').trim();
            city = city.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            return city;
          };

          const locationCount = {};
          applications.forEach(app => {
            const city = extractCity(app.job_location);
            if (city) {
              locationCount[city] = (locationCount[city] || 0) + 1;
            }
          });

          const cities = Object.entries(locationCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

          if (cities.length === 0) {
            return (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Sem dados de localização</p>
              </div>
            );
          }

          const maxCount = Math.max(...cities.map(c => c.count), 1);
          const colors = [
            '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', 
            '#10b981', '#06b6d4', '#f43f5e', '#a855f7'
          ];

          return (
            <div className="space-y-3">
              {cities.map((city, idx) => (
                <div key={idx} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div 
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0" 
                        style={{ backgroundColor: colors[idx] }}
                      ></div>
                      <span className="text-sm font-semibold text-gray-700 truncate">{city.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 ml-2">{city.count}</span>
                  </div>
                  <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        width: `${(city.count/maxCount)*100}%`,
                        backgroundColor: colors[idx]
                      }}
                    ></div>
                  </div>
                </div>
              ))}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Total de candidaturas</span>
                  <span className="font-bold text-gray-900">{applications.length}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

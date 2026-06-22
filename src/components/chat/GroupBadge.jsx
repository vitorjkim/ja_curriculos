import React from 'react';

export function GroupBadge({ type }) {
  const label = type === 'school' ? 'Escola' : 'Turma';
  const colors = type === 'school'
    ? 'from-indigo-500 to-blue-500'
    : 'from-emerald-500 to-green-500';
  return (
    <div className={`inline-flex w-fit text-[10px] uppercase tracking-wide font-semibold text-white px-2 py-0.5 rounded-full bg-gradient-to-r ${colors}`}>{label}</div>
  );
}

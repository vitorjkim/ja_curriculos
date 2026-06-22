// Taxonomia de Áreas e Subáreas de Vagas
// Convenção: nomes em minúsculo, snake_case e sem acentos
export const JOB_TAXONOMY = {
  // ==== NOVA TAXONOMIA COM FOCO EM INICIANTES ====
  saude: [
    'medicina',
    'enfermagem',
    'odontologia',
    'fisioterapia',
    'psicologia',
    'farmacia',
    'nutricao',
    // vagas para iniciantes
    'auxiliar_enfermagem',
    'tecnico_enfermagem',
    'atendente_farmacia',
    'estagio_saude'
  ],
  educacao: [
    'pedagogia',
    'licenciaturas',
    'educacao_fisica',
    'ciencias_da_educacao',
    // vagas para iniciantes
    'monitor_escolar',
    'auxiliar_pedagogico',
    'estagio_educacao'
  ],
  engenharia: [
    'engenharia_civil',
    'engenharia_eletrica',
    'engenharia_de_producao',
    'engenharia_mecanica',
    'engenharia_da_computacao',
    'engenharia_quimica',
    'outras_engenharias',
    // vagas para iniciantes
    'estagio_engenharia',
    'assistente_tecnico',
    'auxiliar_producao'
  ],
  administracao: [
    'administracao_de_empresas',
    'gestao_publica',
    'gestao_comercial',
    'gestao_hospitalar',
    // vagas para iniciantes
    'assistente_administrativo',
    'auxiliar_de_escritorio',
    'recepcao',
    'secretariado',
    'jovem_aprendiz_administrativo'
  ],
  vendas_marketing: [
    'marketing',
    'publicidade_propaganda',
    'comercio_exterior',
    'relacoes_internacionais',
    // vagas para iniciantes
    'assistente_de_marketing',
    'social_media_junior',
    'vendedor_iniciante',
    'atendente_comercial',
    'estagio_marketing'
  ],
  recursos_humanos: [
    'gestao_de_rh',
    'psicologia_organizacional',
    // vagas para iniciantes
    'assistente_de_rh',
    'auxiliar_rh',
    'estagio_rh'
  ],
  financas: [
    'ciencias_contabeis',
    'economia',
    'gestao_financeira',
    // vagas para iniciantes
    'assistente_financeiro',
    'auxiliar_contabil',
    'estagio_financas'
  ],
  design: [
    'design_grafico',
    'design_de_interiores',
    'moda',
    'arquitetura_urbanismo',
    // vagas para iniciantes
    'designer_junior',
    'assistente_de_criacao',
    'estagio_design'
  ],
  logistica: [
    'logistica',
    'comercio_exterior',
    // vagas para iniciantes
    'auxiliar_logistica',
    'estoquista',
    'ajudante_de_carga',
    'estagio_logistica'
  ],
  producao: [
    'engenharia_de_producao',
    'gestao_da_producao_industrial',
    'tecnologia_em_producao_audiovisual',
    // vagas para iniciantes
    'operador_de_producao',
    'auxiliar_de_producao',
    'tecnico_de_processos'
  ],
  mecanica: [
    'tecnico_em_mecanica',
    'engenharia_mecanica',
    'manutencao_industrial',
    // vagas para iniciantes
    'auxiliar_mecanico',
    'estagio_mecanica',
    'assistente_manutencao'
  ],
  automacao: [
    'engenharia_de_controle_e_automacao',
    'mecatronica',
    'robotica',
    'tecnico_em_automacao_industrial',
    // vagas para iniciantes
    'estagio_automacao',
    'assistente_tecnico',
    'montador_eletrico'
  ],

  // ==== NOVAS ÁREAS (antes dentro de “outros”) ====
  direito: [
    'direito',
    'advocacia',
    'estagio_direito',
    'assistente_juridico',
    'auxiliar_cartorio'
  ],
  jornalismo: [
    'jornalismo',
    'comunicacao_social',
    'redacao',
    'reportagem',
    'estagio_jornalismo'
  ],
  relacoes_publicas: [
    'relacoes_publicas',
    'comunicacao_institucional',
    'eventos',
    'estagio_rp'
  ],
  artes_visuais: [
    'artes_visuais',
    'ilustracao',
    'pintura',
    'escultura',
    'estagio_artes'
  ],
  musica: [
    'musica',
    'producao_musical',
    'instrumentista',
    'estagio_musica'
  ],
  gastronomia: [
    'gastronomia',
    'cozinha',
    'confeitaria',
    'atendente_restaurante',
    'estagio_gastronomia'
  ],

  // ==== LEGADO (mantido para compatibilidade com vagas antigas) ====
  tecnologia: [
    'desenvolvimento_backend',
    'desenvolvimento_frontend',
    'desenvolvimento_fullstack',
    'qa_testes',
    'devops_infra',
    'seguranca',
    'dados_analise',
    'ciencia_de_dados',
    'ia_ml',
    'produto_ux_ui',
    // vagas para iniciantes
    'estagio_ti',
    'suporte_tecnico',
    'assistente_de_desenvolvimento'
  ],
  administrativo: [
    'assistente_administrativo',
    'recepcao',
    'secretariado',
    'suporte_operacional',
    // vagas para iniciantes
    'auxiliar_administrativo',
    'jovem_aprendiz_administrativo'
  ],
  financeiro: [
    'contas_a_pagar',
    'contas_a_receber',
    'controladoria',
    'fiscal',
    'contabil',
    // vagas para iniciantes
    'assistente_financeiro',
    'estagio_contabilidade'
  ],
  marketing: [
    'social_media',
    'conteudo',
    'performance',
    'seo',
    'design',
    // vagas para iniciantes
    'assistente_de_marketing',
    'estagio_marketing'
  ],
  vendas: [
    'inside_sales',
    'field_sales',
    'pre_vendas',
    'pos_vendas_cs',
    // vagas para iniciantes
    'vendedor_loja',
    'atendente',
    'promotor'
  ],
  operacional: [
    'logistica',
    'producao',
    'manutencao',
    'qualidade',
    // vagas para iniciantes
    'auxiliar_operacional',
    'ajudante_geral',
    'operador_basico'
  ]
};



export const ALL_AREAS = Object.keys(JOB_TAXONOMY);
export const isValidArea = (area) => ALL_AREAS.includes(area);
export const isValidSubarea = (area, subarea) => {
  const list = JOB_TAXONOMY[area];
  return Array.isArray(list) && list.includes(subarea);
};

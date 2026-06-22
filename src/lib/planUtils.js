// Utilities para verificar recursos e limites por plano
export const PLAN_LIMITS = {
  free: { jobs: 2, applications: 10 },
  pro: { jobs: 5, applications: 200 },
  premium: { jobs: 10, applications: Infinity }
};

export const PLAN_FEATURES = {
  free: [],
  pro: ['favorites', 'companyPhoto', 'verifiedBadge'],
  premium: ['favorites', 'companyPhoto', 'verifiedBadge', 'goldBadge', 'boostedAds']
};

export const hasFeature = (plan, feature) => {
  const planFeatures = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
  return planFeatures.includes(feature);
};

export const getPlanLimits = (plan) => {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
};

export const getPlanName = (plan) => {
  const names = {
    free: 'Gratuito',
    pro: 'Pro',
    premium: 'Premium'
  };
  return names[plan] || names.free;
};

export const getPlanPrice = (plan) => {
  const prices = {
    free: 'R$ 0',
    pro: 'R$ 19',
    premium: 'R$ 29'
  };
  return prices[plan] || prices.free;
};

export const canCreateJobs = (plan, currentJobsThisMonth) => {
  const limits = getPlanLimits(plan);
  return currentJobsThisMonth < limits.jobs;
};

export const canReceiveApplications = (plan, currentApplicationsThisMonth) => {
  const limits = getPlanLimits(plan);
  return limits.applications === Infinity || currentApplicationsThisMonth < limits.applications;
};

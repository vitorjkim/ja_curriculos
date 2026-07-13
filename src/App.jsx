import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { createDefaultAdmin } from '@/lib/initAdmin';
import Navbar from '@/components/Navbar';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import PublicRegister from '@/pages/PublicRegister';
import Dashboard from '@/pages/Dashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminDashboardSimple from '@/pages/AdminDashboardSimple';
import AdminCreateCommunityJob from '@/pages/AdminCreateCommunityJob';
import AdminJobs from '@/pages/AdminJobs';
import CreateResume from '@/pages/CreateResume';
import MyResumes from '@/pages/MyResumes';
import SearchJobs from '@/pages/SearchJobs';
import SearchJobsResults from '@/pages/SearchJobsResults';
import Social from '@/pages/Social';
import CompanyProfile from '@/pages/CompanyProfile';
import CompanySchools from '@/pages/CompanySchools';
import CompanySchoolProfile from '@/pages/CompanySchoolProfile';
import CompanyClassView from '@/pages/CompanyClassView';
import CompanyDashboard from '@/pages/CompanyDashboard';
import CreateJob from '@/pages/CreateJob';
import MyJobs from '@/pages/MyJobs';
import ViewResume from '@/pages/ViewResume';
import ViewJob from '@/pages/ViewJob';
import EditResume from '@/pages/EditResume';
import EditJob from '@/pages/EditJob';
import ViewCandidates from '@/pages/ViewCandidates';
import CompanyInterviews from './pages/CompanyInterviews';
import CompanyApprovedByJob from './pages/CompanyApprovedByJob';
import CompanyJobPipeline from './pages/CompanyJobPipeline';
import UploadResume from '@/pages/UploadResume';
import CandidateJourney from '@/pages/CandidateJourney';
import CandidateMessages from '@/pages/CandidateMessages';
import CompanyMessages from '@/pages/CompanyMessages';
import DinoGamePage from '@/pages/journey/DinoGamePage';
import MemoryGamePage from '@/pages/journey/MemoryGamePage';
import WordSearchGamePage from '@/pages/journey/WordSearchGamePage';
import TipPage from '@/pages/journey/TipPage';
import JourneyStage0 from '@/pages/journey/JourneyStage0';
import JourneyStage1 from '@/pages/journey/JourneyStage1';
import JourneyStage2 from '@/pages/journey/JourneyStage2';
import JourneyStage3 from '@/pages/journey/JourneyStage3';
import JourneyStage4 from '@/pages/journey/JourneyStage4';
import JourneyStage5 from '@/pages/journey/JourneyStage5';
import JourneyStage6 from '@/pages/journey/JourneyStage6';
import CompanyLanding from '@/pages/CompanyLanding';
import CompanyRegister from '@/pages/CompanyRegister';
import StudentRegister from '@/pages/StudentRegister';
import SubscriptionPlans from '@/pages/SubscriptionPlans';
import PaymentPremium from '@/pages/PaymentPremium';
import PaymentPro from '@/pages/PaymentPro';
import PaymentPage from '@/pages/PaymentPage';
import LogoShowcase from '@/pages/LogoShowcase';
import Applications from '@/pages/Applications';
import Profile from '@/pages/Profile';
import AdminSchools from '@/pages/AdminSchools';
import SchoolDashboard from '@/pages/SchoolDashboard';
import SchoolStudents from '@/pages/SchoolStudents';
import SchoolClasses from '@/pages/SchoolClasses';
import SchoolCourses from '@/pages/SchoolCourses';
import SchoolClassStats from '@/pages/SchoolClassStats';
import SchoolEvaluations from '@/pages/SchoolEvaluations';
import SchoolMessages from '@/pages/SchoolMessages';
import CandidateMessagesGroups from '@/pages/CandidateMessagesGroups';
import SchoolMessagesGroups from '@/pages/SchoolMessagesGroups';
import SchoolHighlightRequests from '@/pages/SchoolHighlightRequests';
import SchoolProfile from '@/pages/SchoolProfile';
import SchoolPartnerships from '@/pages/SchoolPartnerships';
import CompanyPartnerships from '@/pages/CompanyPartnerships';
import AgencyPortal from '@/pages/AgencyPortal';
import SmartJobSearch from '@/pages/SmartJobSearch';
import SearchResults from '@/pages/SearchResults';
import SchoolPostView from '@/pages/SchoolPostView';
import CandidatePostView from '@/pages/CandidatePostView';
import CompanyPostView from '@/pages/CompanyPostView';
import StudentAssistant from '@/components/assistant/StudentAssistant';
import TesteCompatibilidade from '@/pages/TesteCompatibilidade';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  useEffect(() => {
    // Criar usuário administrador padrão se não existir
    createDefaultAdmin();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <LoadingProvider>
          <ScrollToTop />
          <div className="min-h-screen bg-white">
            <Helmet>
              <title>CurrículoJá - Conectando Talentos e Oportunidades</title>
              <meta name="description" content="Plataforma completa para criação de currículos, busca de vagas e conexão entre candidatos e empresas. Crie seu currículo em 2 minutos!" />
            </Helmet>
            
            <Navbar />
            
            {/* Container das páginas - padding-top para compensar navbar fixed */}
            <div className="pt-16">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<PublicRegister />} />
              <Route path="/company-landing" element={<CompanyLanding />} />
            <Route path="/company-register" element={<CompanyRegister />} />
            <Route path="/student-register" element={<StudentRegister />} />
            <Route path="/subscription-plans" element={<SubscriptionPlans />} />
            <Route path="/payment-premium" element={<PaymentPremium />} />
            <Route path="/payment-pro" element={<PaymentPro />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/admin/register" element={<Register />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin/create-community-job" element={<AdminCreateCommunityJob />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
            <Route path="/admin/schools" element={<AdminSchools />} />
            {/* Rotas Escola */}
            <Route path="/school-dashboard" element={<SchoolDashboard />} />
            <Route path="/school/profile" element={<SchoolProfile />} />
            <Route path="/school/students" element={<SchoolStudents />} />
            <Route path="/school/classes" element={<SchoolClasses />} />
            <Route path="/school/classes/:id/stats" element={<SchoolClassStats />} />
            <Route path="/school/courses" element={<SchoolCourses />} />
            <Route path="/school/evaluations" element={<SchoolEvaluations />} />
            <Route path="/school-messages" element={<SchoolMessages />} />
            <Route path="/my-groups" element={<CandidateMessagesGroups />} />
            <Route path="/school-groups" element={<SchoolMessagesGroups />} />
            <Route path="/school/highlight-requests" element={<SchoolHighlightRequests />} />
            <Route path="/school/partnerships" element={<SchoolPartnerships />} />
            <Route path="/company/partnerships" element={<CompanyPartnerships />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-resume" element={<CreateResume />} />
            <Route path="/upload-resume" element={<UploadResume />} />
            <Route path="/my-resumes" element={<MyResumes />} />
            <Route path="/my-resume" element={<MyResumes />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/profile" element={<Profile />} />
            {/* Rota para escolas visualizarem/editem o perfil de um aluno */}
            <Route path="/alunos/:id" element={<Profile />} />
            <Route path="/school/student/:id" element={<Profile />} />
            <Route path="/search-jobs" element={<SearchJobs />} />
            <Route path="/search-jobs/resultados" element={<SearchJobsResults />} />
            <Route path="/social" element={<Social />} />
            <Route path="/smart-search" element={<SmartJobSearch />} />
            <Route path="/search-results" element={<SearchResults />} />
            <Route path="/jobs" element={<SearchJobs />} />
            <Route path="/jobs/results" element={<SearchJobsResults />} />
            <Route path="/candidate-journey" element={<CandidateJourney />} />
            <Route path="/my-messages" element={<CandidateMessages />} />
            <Route path="/company-messages" element={<CompanyMessages />} />
            <Route path="/company/:id" element={<CompanyProfile />} />
            <Route path="/company/:companyId/post/:postId" element={<CompanyPostView />} />
            <Route path="/company/schools" element={<CompanySchools />} />
            <Route path="/company/schools/:id" element={<CompanySchoolProfile />} />
            <Route path="/school/:schoolId/post/:postId" element={<SchoolPostView />} />
            <Route path="/alunos/:candidateId/post/:postId" element={<CandidatePostView />} />
            <Route path="/turmas/:id" element={<CompanyClassView />} />
            <Route path="/company-dashboard" element={<CompanyDashboard />} />
            <Route path="/agency-portal" element={<AgencyPortal />} />
            <Route path="/create-job" element={<CreateJob />} />
            <Route path="/my-jobs" element={<MyJobs />} />
            <Route path="/resume/:id" element={<ViewResume />} />
            <Route path="/job/:id" element={<ViewJob />} />
            <Route path="/edit-resume/:id" element={<EditResume />} />
            <Route path="/edit-job/:id" element={<EditJob />} />
            <Route path="/job/:id/candidates" element={<ViewCandidates />} />
            <Route path="/view-candidates/:id" element={<ViewCandidates />} />
            <Route path="/journey/dino-game" element={<DinoGamePage />} />
            <Route path="/journey/memory-game" element={<MemoryGamePage />} />
            <Route path="/journey/word-search" element={<WordSearchGamePage />} />
            <Route path="/journey/tip" element={<TipPage />} />
            <Route path="/journey/stage/0" element={<JourneyStage0 />} />
            <Route path="/journey/stage/1" element={<JourneyStage1 />} />
            <Route path="/journey/stage/2" element={<JourneyStage2 />} />
            <Route path="/journey/stage/3" element={<JourneyStage3 />} />
            <Route path="/journey/stage/4" element={<JourneyStage4 />} />
            <Route path="/journey/stage/5" element={<JourneyStage5 />} />
            <Route path="/journey/stage/6" element={<JourneyStage6 />} />
            <Route path="/logo-showcase" element={<LogoShowcase />} />
            <Route path="/company-interviews" element={<CompanyInterviews />} />
            <Route path="/company-interviews/:jobId" element={<CompanyJobPipeline />} />
            <Route path="/company-approved" element={<CompanyApprovedByJob />} />
            <Route path="/teste-compatibilidade" element={<TesteCompatibilidade />} />
          </Routes>
            </div>
          
          <Toaster />
          {/* Assistente flutuante para candidatos */}
          <StudentAssistant />
        </div>
        </LoadingProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
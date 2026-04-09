import AppShell from '@/components/layout/AppShell';
import AgentDetail from '@/pages/AgentDetail';
import Agents from '@/pages/Agents';
import Dashboard from '@/pages/Dashboard';
import ExecutionDetail from '@/pages/ExecutionDetail';
import Executions from '@/pages/Executions';
import ExpertDetail from '@/pages/ExpertDetail';
import Experts from '@/pages/Experts';
import Mails from '@/pages/Mails';
import Settings from '@/pages/Settings';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate replace to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/experts" element={<Experts />} />
          <Route path="/experts/:id" element={<ExpertDetail />} />
          <Route path="/executions" element={<Executions />} />
          <Route path="/executions/:id" element={<ExecutionDetail />} />
          <Route path="/mails" element={<Mails />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

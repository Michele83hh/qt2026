import { useState } from 'react';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import Home from './components/Home';
import ExamMode from './components/ExamMode/ExamMode';
import PracticeMode from './components/PracticeMode/PracticeMode';
import SubnettingPractice from './components/SubnettingPractice/SubnettingPractice';
import SmartPractice from './components/SmartPractice/SmartPractice';
import Progress from './components/Progress/Progress';
import ErrorReports from './components/Admin/ErrorReports';
import QuestionDatabase from './components/Admin/QuestionDatabase';
import NotificationContainer from './components/UI/NotificationContainer';
import ConfirmDialog from './components/UI/ConfirmDialog';

type View = 'home' | 'exam' | 'practice' | 'subnetting' | 'smartPractice' | 'progress' | 'questionDatabase' | 'admin';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Home
          onStartExam={() => setCurrentView('exam')}
          onStartPractice={() => setCurrentView('practice')}
          onStartSubnetting={() => setCurrentView('subnetting')}
          onStartSmartPractice={() => setCurrentView('smartPractice')}
        />;
      case 'exam':
        return <ExamMode onExit={() => setCurrentView('home')} />;
      case 'practice':
        return <PracticeMode onExit={() => setCurrentView('home')} />;
      case 'subnetting':
        return <SubnettingPractice onExit={() => setCurrentView('home')} />;
      case 'smartPractice':
        return <SmartPractice onExit={() => setCurrentView('home')} />;
      case 'progress':
        return <Progress />;
      case 'questionDatabase':
        return <QuestionDatabase />;
      case 'admin':
        return <ErrorReports />;
      default:
        return <Home
          onStartExam={() => setCurrentView('exam')}
          onStartPractice={() => setCurrentView('practice')}
          onStartSubnetting={() => setCurrentView('subnetting')}
          onStartSmartPractice={() => setCurrentView('smartPractice')}
        />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-800">
          {renderView()}
        </main>
      </div>
      <NotificationContainer />
      <ConfirmDialog />
    </div>
  );
}

export default App;

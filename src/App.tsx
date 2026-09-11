import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { ProcedureShell } from '@/components/layout/ProcedureShell'
import { PatientPage } from '@/pages/PatientPage'
import { AccessPage } from '@/pages/AccessPage'
import { AngiogramPage } from '@/pages/AngiogramPage'
import { TimelinePage } from '@/pages/TimelinePage'
import { ResultPage } from '@/pages/ResultPage'
import { PreviewPage } from '@/pages/PreviewPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/procedure/:id" element={<ProcedureShell />}>
        <Route index element={<Navigate to="timeline" replace />} />
        <Route path="patient" element={<PatientPage />} />
        <Route path="access" element={<AccessPage />} />
        <Route path="angiogram" element={<AngiogramPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="result" element={<ResultPage />} />
        <Route path="preview" element={<PreviewPage />} />
      </Route>
    </Routes>
  )
}

import { Outlet } from 'react-router-dom'
import ParentSidebar from './ParentSidebar'
import ParentTopbar from './ParentTopbar'

export default function ParentLayout() {
  return (
    <div className="flex min-h-screen bg-primary-50">
      <ParentSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ParentTopbar />
        <Outlet />
      </div>
    </div>
  )
}

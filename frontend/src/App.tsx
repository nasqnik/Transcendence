export default function App() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-primary-50">
      <h1 className="font-heading text-4xl font-bold text-primary-700">KiddoPath</h1>
      <p className="font-body text-gray-700">Design system loaded.</p>
      <div className="flex gap-2">
        <div className="w-8 h-8 rounded-full bg-primary-500" />
        <div className="w-8 h-8 rounded-full bg-teal-500" />
        <div className="w-8 h-8 rounded-full bg-amber-500" />
        <div className="w-8 h-8 rounded-full bg-danger-500" />
      </div>
    </div>
  )
}

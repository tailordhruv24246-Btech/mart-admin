import React from 'react'
export default function Loader({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="bg-white border border-slate-200 rounded-2xl px-8 py-7 shadow-sm flex flex-col items-center">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-medium">{text}</p>
      </div>
    </div>
  )
}

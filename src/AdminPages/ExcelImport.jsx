import React, { useState } from 'react'
import Header from '../Components/Header'
import { importProducts } from '../api/endpoints'
import { RiFileExcel2Line, RiUploadLine, RiDownloadLine, RiCheckLine, RiCloseLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

export default function ExcelImport() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)

  const parseExcel = async (f) => {
    const XLSX = await import('xlsx')
    const buf = await f.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_json(ws)
  }

  const handleFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    try {
      const rows = await parseExcel(f)
      setPreview(rows.slice(0, 5))
    } catch { toast.error('Failed to read file') }
  }

  const doImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const rows = await parseExcel(file)
      const { data } = await importProducts({ products: rows })
      setResults(data)
      toast.success(`Imported ${data.success} products!`)
    } catch { toast.error('Import failed') } finally { setImporting(false) }
  }

  const downloadTemplate = () => {
    import('xlsx').then(XLSX => {
      const headers = [[
        'name','sku','barcode','category','subcategory','unit','brand','description',
        'hsn_code','reorder_level','is_active',
        'attributes_json','attribute_color','attribute_size','attribute_weight'
      ]]
      const sample = [
        ['Samsung Galaxy S24','SAM-S24','8901001001','Electronics','Smartphones','pcs','Samsung','Latest flagship','85171300',5,1,'{"ram":"12GB","storage":"256GB"}','Black','256GB','167g'],
        ['Amul Milk 1L','AMUL-MLK-1L','8901234567890','Groceries','Dairy','packet','Amul','Full cream milk','04012000',30,1,'{"fat":"6%"}','','1L','1000ml'],
        ['Parle G 250g','PARLE-G-250','8901719000012','Groceries','Biscuits','pack','Parle','Tea time biscuit','19053100',40,1,'{"flavor":"classic"}','','250g','250g'],
      ]
      const ws = XLSX.utils.aoa_to_sheet([...headers, ...sample])

      const instructionRows = [
        ['Field', 'Required', 'Rule'],
        ['name', 'Yes', 'Product name'],
        ['sku', 'Yes', 'Must be unique'],
        ['barcode', 'No', 'If provided, should be unique'],
        ['category', 'No', 'Auto-created if not found'],
        ['subcategory', 'No', 'Auto-created when category is given'],
        ['unit', 'No', 'Default is pcs if empty'],
        ['brand', 'No', 'Stored in description'],
        ['description', 'No', 'Free text'],
        ['hsn_code', 'No', 'HSN code'],
        ['reorder_level', 'No', 'Low stock alert level'],
        ['is_active', 'No', '1/0 or true/false'],
        ['attributes_json', 'No', 'JSON object like {"color":"Black"}'],
        ['attribute_*', 'No', 'Any column with attribute_ prefix is saved as attribute'],
        ['price/cost/stock/mrp/gstRate', 'Ignored', 'Use Purchase Entry Excel for inventory and pricing'],
      ]
      const guideSheet = XLSX.utils.aoa_to_sheet(instructionRows)

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Products')
      XLSX.utils.book_append_sheet(wb, guideSheet, 'Instructions')
      XLSX.writeFile(wb, 'product_import_template.xlsx')
    })
  }

  return (
    <div className="page-enter">
      <Header title="Excel Import" subtitle="Bulk import product master only" />
      <div className="p-6 space-y-6">

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Instructions</h3>
            <button onClick={downloadTemplate} className="btn-secondary text-sm">
              <RiDownloadLine /> Download Template
            </button>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
            <li>Download the Excel template above</li>
            <li>Fill product master columns like name, sku, category, description</li>
            <li>Pricing and stock fields are ignored in this import</li>
            <li>Use Purchase Entry (Excel/Form) to add stock, cost, selling price, mrp and tax</li>
            <li>Use attributes_json or any attribute_ columns like attribute_color</li>
            <li>Upload the file and verify preview, then click Import</li>
          </ol>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['name','Required'],['sku','Required'],['category','Optional'],['unit','Optional'],
              ['description','Optional'],['hsn_code','Optional'],['is_active','Optional'],['attribute_*','Optional']].map(([f,r]) => (
              <div key={f} className="bg-slate-50 rounded-xl p-3">
                <p className="font-mono text-xs font-bold text-indigo-600">{f}</p>
                <p className="text-xs text-slate-400 mt-0.5">{r}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-900 mb-4">Upload File</h3>
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
            <RiFileExcel2Line className="text-5xl text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm font-medium">{file ? file.name : 'Click to upload .xlsx file'}</p>
            <p className="text-slate-400 text-xs mt-1">Excel (.xlsx, .xls) files only</p>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
          </label>

          {preview.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-slate-700 mb-3">Preview (first 5 rows)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>{Object.keys(preview[0]).map(k => <th key={k} className="table-th">{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        {Object.values(row).map((v, j) => <td key={j} className="table-td">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {file && (
            <div className="mt-4 flex gap-3">
              <button onClick={() => {setFile(null);setPreview([]);setResults(null)}} className="btn-secondary">
                <RiCloseLine />Clear
              </button>
              <button onClick={doImport} disabled={importing} className="btn-primary">
                <RiUploadLine />{importing ? 'Importing...' : 'Import Products'}
              </button>
            </div>
          )}
        </div>

        {results && (
          <div className="card">
            <h3 className="font-bold text-slate-900 mb-3">Import Results</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-emerald-600">{results.success || 0}</p>
                <p className="text-xs text-emerald-700">Imported</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-red-600">{results.failed || 0}</p>
                <p className="text-xs text-red-700">Failed</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-amber-600">{results.skipped || 0}</p>
                <p className="text-xs text-amber-700">Skipped (duplicate)</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-blue-600">{(results.success||0)+(results.failed||0)+(results.skipped||0)}</p>
                <p className="text-xs text-blue-700">Total Rows</p>
              </div>
            </div>
            {results.errors?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-red-600 mb-2">Errors:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {results.errors.map((e, i) => <p key={i} className="text-xs text-red-500">Row {e.row}: {e.message}</p>)}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

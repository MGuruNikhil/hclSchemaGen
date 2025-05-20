import { useState, useMemo, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'

type SchemaRow = {
  name: string
  type: string
  isNullable: boolean
  isPrimary: boolean
  isUnique: boolean
  defaultValue: string
}

type SchemaTableProps = {
  schemas?: string[]
  dataTypes?: string[]
}

export default function SchemaTable({
  schemas = ['public', 'application'],
  dataTypes = [
    'bigint', 'boolean', 'char', 'date', 'decimal', 'float', 'integer',
    'json', 'jsonb', 'numeric', 'real', 'smallint', 'text', 'time',
    'timestamp', 'timestamptz', 'uuid', 'varchar',
  ],
}: SchemaTableProps) {
  const [schema, setSchema] = useState(schemas[0])
  const [modelName, setModelName] = useState('')
  const [rows, setRows] = useState<SchemaRow[]>([
    { name: '', type: '', isNullable: false, isPrimary: false, isUnique: false, defaultValue: '' },
  ])
  const [hclOutput, setHclOutput] = useState('')

  const handleAddRow = useCallback(() => {
    setRows(rows => [
      ...rows,
      { name: '', type: '', isNullable: false, isPrimary: false, isUnique: false, defaultValue: '' },
    ])
  }, [])

  const handleRemoveRow = useCallback((idx: number) => {
    setRows(rows => rows.filter((_, i) => i !== idx))
  }, [])

  const columnHelper = createColumnHelper<SchemaRow>()
  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'field name',
      cell: ({ row, getValue }) => (
        <input
          value={getValue() || ''}
          onChange={e => {
            const val = e.target.value
            setRows(rs => rs.map((r, i) => i === row.index ? { ...r, name: val } : r))
          }}
          className='border border-gray-700 p-1 w-full bg-gray-800 text-white'
          placeholder='field name'
        />
      ),
    }),
    columnHelper.accessor('type', {
      header: 'type',
      cell: ({ row, getValue }) => (
        <select
          value={getValue() || ''}
          onChange={e => {
            const val = e.target.value
            setRows(rs => rs.map((r, i) => i === row.index ? { ...r, type: val } : r))
          }}
          className='border border-gray-700 p-1 w-full bg-gray-800 text-white'
        >
          <option value=''>select type</option>
          {dataTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      ),
    }),
    columnHelper.accessor('isNullable', {
      header: 'nullable',
      cell: ({ row, getValue }) => (
        <input
          type='checkbox'
          checked={getValue()}
          onChange={e => {
            const chk = e.target.checked
            setRows(rs => rs.map((r, i) => i === row.index ? { ...r, isNullable: chk } : r))
          }}
          className='w-4 h-4'
        />
      ),
    }),
    columnHelper.accessor('isPrimary', {
      header: 'primary',
      cell: ({ row, getValue }) => (
        <input
          type='checkbox'
          checked={getValue()}
          onChange={e => {
            const chk = e.target.checked
            setRows(rs => rs.map((r, i) => i === row.index ? { ...r, isPrimary: chk } : r))
          }}
          className='w-4 h-4'
        />
      ),
    }),
    columnHelper.accessor('isUnique', {
      header: 'unique',
      cell: ({ row, getValue }) => (
        <input
          type='checkbox'
          checked={getValue()}
          onChange={e => {
            const chk = e.target.checked
            setRows(rs => rs.map((r, i) => i === row.index ? { ...r, isUnique: chk } : r))
          }}
          className='w-4 h-4'
        />
      ),
    }),
    columnHelper.accessor('defaultValue', {
      header: 'default value',
      cell: ({ row, getValue }) => (
        <input
          value={getValue() || ''}
          onChange={e => {
            const val = e.target.value
            setRows(rs => rs.map((r, i) => i === row.index ? { ...r, defaultValue: val } : r))
          }}
          className='border border-gray-700 p-1 w-full bg-gray-800 text-white'
          placeholder='default'
        />
      ),
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => (
        <button
          onClick={() => handleRemoveRow(row.index)}
          className='px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50'
          disabled={rows.length === 1}
        >remove</button>
      ),
    }),
  ], [columnHelper, dataTypes, handleRemoveRow, rows.length])

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const generateHCL = useCallback(() => {
    let hcl = `schema \"${schema}\" {\n`
    hcl += `  table \"${modelName}\" {\n`
    rows.forEach(r => {
      hcl += `    column \"${r.name}\" {\n`
      hcl += `      type = ${r.type}\n`
      hcl += `      null = ${r.isNullable}\n`
      if (r.defaultValue) hcl += `      default = \"${r.defaultValue}\"\n`
      hcl += `    }\n`
    })
    const pkCols = rows.filter(r => r.isPrimary).map(r => `column.${r.name}`)
    if (pkCols.length) {
      hcl += `    primary_key {\n`
      hcl += `      columns = [${pkCols.join(', ')}]\n`
      hcl += `    }\n`
    }
    rows.filter(r => r.isUnique).forEach(r => {
      hcl += `    index \"idx_${r.name}\" {\n`
      hcl += `      columns = [column.${r.name}]\n`
      hcl += `      unique = true\n`
      hcl += `    }\n`
    })
    hcl += `  }\n` + `}\n`
    setHclOutput(hcl)
  }, [schema, modelName, rows])

  return (
    <div className='space-y-6 max-w-5xl mx-auto p-6'>
      <div className='flex space-x-4'>
        <label className='block text-sm font-medium text-white'>
          schema
          <select
            value={schema}
            onChange={e => setSchema(e.target.value)}
            className='ml-2 border rounded p-1 bg-gray-800 text-white'
          >
            {schemas.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className='block text-sm font-medium text-white'>
          model name
          <input
            value={modelName}
            onChange={e => setModelName(e.target.value)}
            className='ml-2 border rounded p-1 bg-gray-800 text-white'
            placeholder='enter model'
          />
        </label>
      </div>
      <div className='overflow-x-auto'>
        <table className='min-w-full border border-gray-700'>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} className='border border-gray-700 p-2 font-semibold text-white'>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(r => (
              <tr key={r.id}>
                {r.getVisibleCells().map(c => (
                  <td key={c.id} className='border border-gray-700 p-2 bg-gray-900'>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='space-x-4'>
        <button onClick={handleAddRow} className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>add field</button>
        <button onClick={generateHCL} className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'>generate schema</button>
      </div>
      {hclOutput && (
        <div className='mt-6'>
          <h3 className='text-lg font-medium mb-2 text-white'>generated hcl schema</h3>
          <pre className='p-4 rounded overflow-x-auto border border-gray-700 bg-gray-800 text-white'>{hclOutput}</pre>
        </div>
      )}
    </div>
  )
}
